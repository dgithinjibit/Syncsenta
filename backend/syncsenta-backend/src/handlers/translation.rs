//! Translation API handlers with MeTTa integration
//!
//! Routes:
//! - POST /api/translate        — Translate text with MeTTa reasoning
//! - POST /api/translate/batch  — Batch translate multiple texts
//! - GET  /api/translate/terms  — Get CBC terminology dictionary

use axum::{
    extract::{Extension, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;

use crate::{
    middleware::auth::AuthUser,
    services::translation::{TranslationService, translate_text, batch_translate},
};
use syncsenta_common::models::SupportedLanguage;

#[derive(Clone)]
pub struct TranslationState {
    pub service: Arc<TranslationService>,
}

pub fn router(service: Arc<TranslationService>) -> Router {
    let state = TranslationState { service };
    Router::new()
        .route("/", post(translate_handler))
        .route("/batch", post(batch_translate_handler))
        .route("/terms", get(get_cbc_terms))
        .with_state(state)
}

// ─── POST /api/translate ──────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct TranslateRequest {
    text: String,
    source_language: SupportedLanguage,
    target_language: SupportedLanguage,
    context: Option<String>, // "curriculum", "assessment", "learning", "general"
}

#[derive(Debug, Serialize)]
struct TranslateResponse {
    translated_text: String,
    source: String,
    confidence: f64,
    preserved_terms: Vec<String>,
    metta_reasoning: Option<String>,
    processing_time_ms: u64,
}

async fn translate_handler(
    State(state): State<TranslationState>,
    Extension(AuthUser(_claims)): Extension<AuthUser>,
    Json(payload): Json<TranslateRequest>,
) -> (StatusCode, Json<Value>) {
    let start_time = std::time::Instant::now();

    // Validate input
    if payload.text.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Text cannot be empty"})),
        );
    }

    if payload.text.len() > 10000 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Text too long (max 10,000 characters)"})),
        );
    }

    // Same language check
    if payload.source_language == payload.target_language {
        return (
            StatusCode::OK,
            Json(json!({
                "translated_text": payload.text,
                "source": "same_language",
                "confidence": 1.0,
                "preserved_terms": [],
                "metta_reasoning": null,
                "processing_time_ms": start_time.elapsed().as_millis()
            })),
        );
    }

    match translate_text(
        &state.service,
        payload.text,
        payload.source_language,
        payload.target_language,
        payload.context,
    ).await {
        Ok(response) => {
            let api_response = TranslateResponse {
                translated_text: response.translated_text,
                source: format!("{:?}", response.source),
                confidence: response.confidence,
                preserved_terms: response.preserved_terms,
                metta_reasoning: response.metta_reasoning,
                processing_time_ms: start_time.elapsed().as_millis() as u64,
            };

            (StatusCode::OK, Json(serde_json::to_value(api_response).unwrap()))
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("Translation failed: {}", e)})),
        ),
    }
}

// ─── POST /api/translate/batch ────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct BatchTranslateRequest {
    texts: Vec<String>,
    source_language: SupportedLanguage,
    target_language: SupportedLanguage,
    context: Option<String>,
}

#[derive(Debug, Serialize)]
struct BatchTranslateResponse {
    translations: Vec<TranslateResponse>,
    total_processed: usize,
    total_time_ms: u64,
}

async fn batch_translate_handler(
    State(state): State<TranslationState>,
    Extension(AuthUser(_claims)): Extension<AuthUser>,
    Json(payload): Json<BatchTranslateRequest>,
) -> (StatusCode, Json<Value>) {
    let start_time = std::time::Instant::now();

    // Validate batch size
    if payload.texts.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "No texts provided"})),
        );
    }

    if payload.texts.len() > 100 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Batch size too large (max 100 texts)"})),
        );
    }

    // Validate individual text lengths
    for (i, text) in payload.texts.iter().enumerate() {
        if text.len() > 5000 {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": format!("Text {} too long (max 5,000 characters)", i)})),
            );
        }
    }

    match batch_translate(
        &state.service,
        payload.texts,
        payload.source_language,
        payload.target_language,
        payload.context,
    ).await {
        Ok(responses) => {
            let translations: Vec<TranslateResponse> = responses
                .into_iter()
                .map(|r| TranslateResponse {
                    translated_text: r.translated_text,
                    source: format!("{:?}", r.source),
                    confidence: r.confidence,
                    preserved_terms: r.preserved_terms,
                    metta_reasoning: r.metta_reasoning,
                    processing_time_ms: 0, // Individual timing not tracked in batch
                })
                .collect();

            let response = BatchTranslateResponse {
                total_processed: translations.len(),
                total_time_ms: start_time.elapsed().as_millis() as u64,
                translations,
            };

            (StatusCode::OK, Json(serde_json::to_value(response).unwrap()))
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("Batch translation failed: {}", e)})),
        ),
    }
}

// ─── GET /api/translate/terms ─────────────────────────────────────────────────

#[derive(Debug, Serialize)]
struct CBCTermsResponse {
    terms: serde_json::Value,
    total_terms: usize,
    supported_languages: Vec<String>,
}

async fn get_cbc_terms(
    State(state): State<TranslationState>,
    Extension(AuthUser(_claims)): Extension<AuthUser>,
) -> (StatusCode, Json<Value>) {
    let terms = &state.service.knowledge_base().cbc_terms;
    
    let supported_languages = vec![
        "en".to_string(),
        "sw".to_string(),
        "ki".to_string(),
        "luo".to_string(),
        "luy".to_string(),
    ];

    let response = CBCTermsResponse {
        terms: serde_json::to_value(terms).unwrap_or(json!({})),
        total_terms: terms.len(),
        supported_languages,
    };

    (StatusCode::OK, Json(serde_json::to_value(response).unwrap()))
}