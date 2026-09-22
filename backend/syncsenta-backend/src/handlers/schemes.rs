//! Scheme CRUD handlers
//!
//! Routes:
//! - POST /api/schemes/generate — Generate a new scheme using AI
//! - POST /api/schemes          — Create a new scheme manually
//! - GET  /api/schemes/:id      — Retrieve a specific scheme by ID
//! - PATCH /api/schemes/:id     — Update an existing scheme

use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    routing::{get, patch, post},
    Json, Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    config::AppConfig,
    middleware::auth::AuthUser,
    services::scheme::{generate_scheme as generate_scheme_service, save_scheme, SchemeGenerationRequest},
};
use syncsenta_common::models::{CBCGradeLevel, SupportedLanguage};

#[derive(Clone)]
pub struct SchemeState {
    pub db: PgPool,
    pub config: AppConfig,
}

pub fn router(db: PgPool, cfg: AppConfig) -> Router {
    let state = SchemeState { db, config: cfg };
    Router::new()
        .route("/generate", post(generate_scheme))
        .route("/", post(create_scheme))
        .route("/:id", get(get_scheme))
        .route("/:id", patch(update_scheme))
        .with_state(state)
}

// ─── POST /api/schemes/generate ───────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct GenerateSchemeRequest {
    subject: String,
    grade_level: CBCGradeLevel,
    strand: String,
    sub_strand: String,
    weeks_count: i32,
    language: SupportedLanguage,
    class_id: Uuid,
}

async fn generate_scheme(
    State(s): State<SchemeState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
    Json(payload): Json<GenerateSchemeRequest>,
) -> (StatusCode, Json<Value>) {
    let teacher_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid token"}))),
    };

    // Validate weeks_count
    if payload.weeks_count < 1 || payload.weeks_count > 52 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "weeks_count must be between 1 and 52"})),
        );
    }

    let req = SchemeGenerationRequest {
        subject: payload.subject,
        grade_level: payload.grade_level,
        strand: payload.strand,
        sub_strand: payload.sub_strand,
        weeks_count: payload.weeks_count,
        language: payload.language,
        teacher_id,
        class_id: payload.class_id,
    };

    match generate_scheme_service(&s.db, &s.config, &req).await {
        Ok(mut scheme) => {
            match save_scheme(&s.db, &mut scheme).await {
                Ok(scheme_id) => (
                    StatusCode::CREATED,
                    Json(json!({
                        "id": scheme_id,
                        "curriculum_ref": scheme.curriculum_ref,
                        "subject": scheme.subject,
                        "grade_level": scheme.grade_level,
                        "strand": scheme.strand,
                        "sub_strand": scheme.sub_strand,
                        "weeks_count": scheme.weeks_count,
                        "language": scheme.language,
                        "learning_objectives": scheme.learning_objectives,
                        "activities": scheme.activities,
                        "assessment_criteria": scheme.assessment_criteria,
                        "resources": scheme.resources,
                        "ipfs_cid": scheme.ipfs_cid,
                        "teacher_id": scheme.teacher_id,
                    })),
                ),
                Err(e) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"error": format!("Failed to save scheme: {}", e)})),
                ),
            }
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("Failed to generate scheme: {}", e)})),
        ),
    }
}

// ─── POST /api/schemes ────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct CreateSchemeRequest {
    subject: String,
    grade_level: CBCGradeLevel,
    strand: String,
    sub_strand: String,
    weeks_count: i32,
    language: SupportedLanguage,
    learning_objectives: Vec<String>,
    activities: Vec<serde_json::Value>,
    assessment_criteria: Vec<serde_json::Value>,
    resources: Vec<serde_json::Value>,
}

async fn create_scheme(
    State(s): State<SchemeState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
    Json(payload): Json<CreateSchemeRequest>,
) -> (StatusCode, Json<Value>) {
    let teacher_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid token"}))),
    };

    let scheme_id = Uuid::new_v4();
    let curriculum_ref = format!(
        "CBC/{}/{:?}/{}/{}",
        payload.subject, payload.grade_level, payload.strand, payload.sub_strand
    );

    let content = json!({
        "learning_objectives": payload.learning_objectives,
        "activities": payload.activities,
        "assessment_criteria": payload.assessment_criteria,
        "resources": payload.resources,
    });

    let lang_str = format!("{:?}", payload.language).to_lowercase();
    let grade_str = format!("{:?}", payload.grade_level);

    let result = sqlx::query!(
        r#"
        INSERT INTO schemes (id, teacher_id, curriculum_ref, subject, grade_level, language, content, created_at)
        VALUES ($1, $2, $3, $4, $5::cbc_grade_level, $6::supported_language, $7, NOW())
        RETURNING id
        "#,
        scheme_id,
        teacher_id,
        curriculum_ref,
        payload.subject,
        grade_str as _,
        lang_str as _,
        content,
    )
    .fetch_one(&s.db)
    .await;

    match result {
        Ok(row) => (
            StatusCode::CREATED,
            Json(json!({
                "id": row.id,
                "curriculum_ref": curriculum_ref,
                "subject": payload.subject,
                "grade_level": grade_str,
                "language": lang_str,
                "message": "Scheme created successfully"
            })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("Failed to create scheme: {}", e)})),
        ),
    }
}

// ─── GET /api/schemes/:id ─────────────────────────────────────────────────────

async fn get_scheme(
    State(s): State<SchemeState>,
    Extension(AuthUser(_claims)): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> (StatusCode, Json<Value>) {
    let result = sqlx::query!(
        r#"
        SELECT id, teacher_id, curriculum_ref, subject,
               grade_level as "grade_level: String",
               language as "language: String",
               content, ipfs_cid, blockchain_tx_hash, created_at
        FROM schemes
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(&s.db)
    .await;

    match result {
        Ok(Some(row)) => (
            StatusCode::OK,
            Json(json!({
                "id": row.id,
                "teacher_id": row.teacher_id,
                "curriculum_ref": row.curriculum_ref,
                "subject": row.subject,
                "grade_level": row.grade_level,
                "language": row.language,
                "content": row.content,
                "ipfs_cid": row.ipfs_cid,
                "blockchain_tx_hash": row.blockchain_tx_hash,
                "created_at": row.created_at,
            })),
        ),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(json!({"error": "Scheme not found"})),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("Database error: {}", e)})),
        ),
    }
}

// ─── PATCH /api/schemes/:id ───────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct UpdateSchemeRequest {
    learning_objectives: Option<Vec<String>>,
    activities: Option<Vec<serde_json::Value>>,
    assessment_criteria: Option<Vec<serde_json::Value>>,
    resources: Option<Vec<serde_json::Value>>,
}

async fn update_scheme(
    State(s): State<SchemeState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateSchemeRequest>,
) -> (StatusCode, Json<Value>) {
    let teacher_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid token"}))),
    };

    // First, verify the scheme exists and belongs to the teacher
    let existing = sqlx::query!(
        r#"
        SELECT teacher_id, content
        FROM schemes
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(&s.db)
    .await;

    let existing_row = match existing {
        Ok(Some(row)) => row,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "Scheme not found"})),
            )
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": format!("Database error: {}", e)})),
            )
        }
    };

    // Verify ownership
    if existing_row.teacher_id != teacher_id {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({"error": "You can only update your own schemes"})),
        );
    }

    // Merge updates with existing content
    let mut content: serde_json::Value = existing_row.content;
    
    if let Some(objectives) = payload.learning_objectives {
        content["learning_objectives"] = json!(objectives);
    }
    if let Some(activities) = payload.activities {
        content["activities"] = json!(activities);
    }
    if let Some(criteria) = payload.assessment_criteria {
        content["assessment_criteria"] = json!(criteria);
    }
    if let Some(resources) = payload.resources {
        content["resources"] = json!(resources);
    }

    let result = sqlx::query!(
        r#"
        UPDATE schemes
        SET content = $1
        WHERE id = $2
        RETURNING id
        "#,
        content,
        id
    )
    .fetch_one(&s.db)
    .await;

    match result {
        Ok(_) => (
            StatusCode::OK,
            Json(json!({
                "id": id,
                "message": "Scheme updated successfully"
            })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("Failed to update scheme: {}", e)})),
        ),
    }
}
