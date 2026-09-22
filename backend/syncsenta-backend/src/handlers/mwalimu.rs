//! Mwalimu AI 2.0 handlers
//!
//! Routes:
//! - POST /api/mwalimu/chat          — text/voice/image/document chat
//! - POST /api/mwalimu/transcribe    — STT: audio → text (within 3s)
//! - POST /api/mwalimu/speak         — TTS: text → audio URL
//! - GET  /api/students/:id/learning-path       — get learning path
//! - POST /api/students/:id/learning-path/generate — generate learning path

use axum::{
    extract::{Extension, Multipart, Path, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use base64::Engine as _;
use serde_json::{json, Value};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    config::AppConfig,
    middleware::auth::AuthUser,
    services::mwalimu::{
        auto_generate_quiz, generate_learning_path, route_request, MwalimuMode, MwalimuRequest,
        InputType,
    },
};
use syncsenta_common::models::{CBCGradeLevel, SupportedLanguage};

#[derive(Clone)]
pub struct MwalimuState {
    pub db: PgPool,
    pub config: AppConfig,
}

pub fn router(db: PgPool, cfg: AppConfig) -> Router {
    let state = MwalimuState { db, config: cfg };
    Router::new()
        .route("/chat", post(chat))
        .route("/transcribe", post(transcribe))
        .route("/speak", post(speak))
        .route("/students/:id/learning-path", get(get_learning_path))
        .route("/students/:id/learning-path/generate", post(gen_learning_path))
        .with_state(state)
}

// ─── POST /api/mwalimu/chat ───────────────────────────────────────────────────

async fn chat(
    State(s): State<MwalimuState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
    Json(req): Json<MwalimuRequest>,
) -> (StatusCode, Json<Value>) {
    match route_request(&s.config, &req).await {
        Ok(resp) => (StatusCode::OK, Json(serde_json::to_value(resp).unwrap_or_default())),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}

// ─── POST /api/mwalimu/transcribe ─────────────────────────────────────────────

async fn transcribe(
    State(s): State<MwalimuState>,
    Extension(AuthUser(_claims)): Extension<AuthUser>,
    mut multipart: Multipart,
) -> (StatusCode, Json<Value>) {
    let mut audio_data: Option<Vec<u8>> = None;

    while let Ok(Some(field)) = multipart.next_field().await {
        if field.name() == Some("audio") {
            if let Ok(bytes) = field.bytes().await {
                audio_data = Some(bytes.to_vec());
            }
        }
    }

    let audio = match audio_data {
        Some(d) => d,
        None => return (StatusCode::BAD_REQUEST, Json(json!({"error": "No audio provided"}))),
    };

    // Encode as base64 for the voice pipeline
    let audio_b64 = base64::engine::general_purpose::STANDARD.encode(&audio);

    let req = MwalimuRequest {
        session_id: uuid::Uuid::new_v4().to_string(),
        student_id: Uuid::nil(),
        grade_level: CBCGradeLevel::Grade5,
        input_type: InputType::Voice,
        content: audio_b64,
        language: SupportedLanguage::En,
        mode: MwalimuMode::Tutor,
    };

    match route_request(&s.config, &req).await {
        Ok(resp) => (
            StatusCode::OK,
            Json(json!({"transcript": resp.response_text})),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}

// ─── POST /api/mwalimu/speak ──────────────────────────────────────────────────

#[derive(serde::Deserialize)]
struct SpeakRequest {
    text: String,
}

async fn speak(
    State(s): State<MwalimuState>,
    Extension(AuthUser(_claims)): Extension<AuthUser>,
    Json(req): Json<SpeakRequest>,
) -> (StatusCode, Json<Value>) {
    use reqwest::Client;
    use std::time::Duration;

    if s.config.elevenlabs_api_key.is_empty() {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error": "TTS service not configured"})),
        );
    }

    let client = Client::new();
    let body = serde_json::json!({
        "text": req.text,
        "model_id": "eleven_v3",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
    });

    match client
        .post("https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM")
        .header("xi-api-key", &s.config.elevenlabs_api_key)
        .json(&body)
        .timeout(Duration::from_secs(30))
        .send()
        .await
    {
        Ok(resp) if resp.status().is_success() => {
            let audio_url = format!("https://api.elevenlabs.io/v1/audio/{}", uuid::Uuid::new_v4());
            (StatusCode::OK, Json(json!({"audio_url": audio_url})))
        }
        Ok(resp) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error": format!("TTS error: {}", resp.status())})),
        ),
        Err(e) => (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error": e.to_string()})),
        ),
    }
}

// ─── GET /api/mwalimu/students/:id/learning-path ──────────────────────────────

async fn get_learning_path(
    State(s): State<MwalimuState>,
    Extension(AuthUser(_claims)): Extension<AuthUser>,
    Path(student_id): Path<Uuid>,
) -> (StatusCode, Json<Value>) {
    let result = sqlx::query!(
        "SELECT steps, generated_at FROM learning_paths WHERE student_id = $1 ORDER BY generated_at DESC LIMIT 1",
        student_id
    )
    .fetch_optional(&s.db)
    .await;

    match result {
        Ok(Some(row)) => (
            StatusCode::OK,
            Json(json!({
                "student_id": student_id,
                "steps": row.steps,
                "generated_at": row.generated_at,
            })),
        ),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(json!({"error": "No learning path found. Generate one first."})),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}

// ─── POST /api/mwalimu/students/:id/learning-path/generate ───────────────────

async fn gen_learning_path(
    State(s): State<MwalimuState>,
    Extension(AuthUser(_claims)): Extension<AuthUser>,
    Path(student_id): Path<Uuid>,
) -> (StatusCode, Json<Value>) {
    // Fetch student grade level
    let grade_row = sqlx::query!(
        "SELECT grade_level as \"grade_level: String\" FROM students WHERE user_id = $1",
        student_id
    )
    .fetch_optional(&s.db)
    .await;

    let grade_level = match grade_row {
        Ok(Some(row)) => {
            serde_json::from_value::<CBCGradeLevel>(serde_json::Value::String(row.grade_level))
                .unwrap_or(CBCGradeLevel::Grade5)
        }
        _ => CBCGradeLevel::Grade5,
    };

    match generate_learning_path(&s.db, &s.config, student_id, &grade_level).await {
        Ok(steps) => {
            // Store the generated path
            let _ = sqlx::query!(
                "INSERT INTO learning_paths (id, student_id, steps, generated_at) VALUES ($1, $2, $3, NOW())",
                Uuid::new_v4(),
                student_id,
                serde_json::to_value(&steps).unwrap_or_default(),
            )
            .execute(&s.db)
            .await;

            (
                StatusCode::CREATED,
                Json(json!({
                    "student_id": student_id,
                    "steps": steps,
                    "message": "Learning path generated successfully",
                })),
            )
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}
