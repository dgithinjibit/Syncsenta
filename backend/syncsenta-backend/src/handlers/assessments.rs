//! Assessment handlers — Task 11
//!
//! Routes:
//! - POST   /api/assessments                            create assessment
//! - POST   /api/assessments/:id/start                  mark a student started (server records start time)
//! - POST   /api/assessments/:id/submit                 submit answers (server enforces time limit)
//! - GET    /api/assessments/grading-queue              list submissions awaiting grading by the caller
//! - PATCH  /api/assessments/submissions/:id/grade      apply final score + feedback

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
    services::assessment::{
        create_assessment, grade_submission, list_grading_queue, mark_started, submit_assessment,
        AssessmentError, CreateAssessmentRequest, GradeSubmissionRequest, Question,
        SubmitAssessmentRequest,
    },
};
use syncsenta_common::models::{CBCGradeLevel, UserRole};

#[derive(Clone)]
pub struct AssessmentState {
    pub db: PgPool,
    pub config: AppConfig,
}

pub fn router(db: PgPool, cfg: AppConfig) -> Router {
    let state = AssessmentState { db, config: cfg };
    Router::new()
        .route("/", post(create_assessment_handler))
        .route("/grading-queue", get(grading_queue_handler))
        .route("/:id/start", post(start_handler))
        .route("/:id/submit", post(submit_handler))
        .route("/submissions/:id/grade", patch(grade_handler))
        .with_state(state)
}

fn err_status(e: &AssessmentError) -> StatusCode {
    match e {
        AssessmentError::NotFound => StatusCode::NOT_FOUND,
        AssessmentError::AlreadySubmitted => StatusCode::CONFLICT,
        AssessmentError::TimeLimitExceeded => StatusCode::GONE,
        AssessmentError::InvalidCurriculum(_) | AssessmentError::Validation(_) => {
            StatusCode::BAD_REQUEST
        }
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

// ─── POST /api/assessments ────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct CreateBody {
    class_id: Uuid,
    title: String,
    subject: String,
    grade_level: CBCGradeLevel,
    strand: String,
    sub_strand: String,
    questions: Vec<Question>,
    time_limit_minutes: Option<i32>,
}

async fn create_assessment_handler(
    State(s): State<AssessmentState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
    Json(body): Json<CreateBody>,
) -> (StatusCode, Json<Value>) {
    if !matches!(claims.role, UserRole::Teacher | UserRole::SchoolHead | UserRole::SchoolAdmin) {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({"error": "only teachers may create assessments"})),
        );
    }
    let teacher_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "invalid subject claim"})),
            )
        }
    };

    let req = CreateAssessmentRequest {
        teacher_id,
        class_id: body.class_id,
        title: body.title,
        subject: body.subject,
        grade_level: body.grade_level,
        strand: body.strand,
        sub_strand: body.sub_strand,
        questions: body.questions,
        time_limit_minutes: body.time_limit_minutes,
    };

    match create_assessment(&s.db, req).await {
        Ok(rec) => (
            StatusCode::CREATED,
            Json(json!({
                "id": rec.id,
                "teacher_id": rec.teacher_id,
                "class_id": rec.class_id,
                "title": rec.title,
                "curriculum_ref": rec.curriculum_ref,
                "time_limit_minutes": rec.time_limit_minutes,
                "total_points": rec.total_points,
            })),
        ),
        Err(e) => (err_status(&e), Json(json!({"error": e.to_string()}))),
    }
}

// ─── POST /api/assessments/:id/start ──────────────────────────────────────────

async fn start_handler(
    State(s): State<AssessmentState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
    Path(assessment_id): Path<Uuid>,
) -> (StatusCode, Json<Value>) {
    let student_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "invalid subject claim"})),
            )
        }
    };

    let row = sqlx::query!(
        "SELECT time_limit_minutes FROM assessments WHERE id = $1",
        assessment_id
    )
    .fetch_optional(&s.db)
    .await;

    let limit = match row {
        Ok(Some(r)) => r.time_limit_minutes,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "assessment not found"})),
            )
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
        }
    };

    match mark_started(&s.config, student_id, assessment_id, limit).await {
        Ok(started_at) => (
            StatusCode::OK,
            Json(json!({"started_at": started_at, "time_limit_minutes": limit})),
        ),
        Err(e) => (err_status(&e), Json(json!({"error": e.to_string()}))),
    }
}

// ─── POST /api/assessments/:id/submit ─────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct SubmitBody {
    answers: Value,
}

async fn submit_handler(
    State(s): State<AssessmentState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
    Path(assessment_id): Path<Uuid>,
    Json(body): Json<SubmitBody>,
) -> (StatusCode, Json<Value>) {
    let student_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "invalid subject claim"})),
            )
        }
    };

    let req = SubmitAssessmentRequest {
        student_id,
        answers: body.answers,
    };
    match submit_assessment(&s.db, &s.config, assessment_id, req).await {
        Ok(rec) => (
            StatusCode::CREATED,
            Json(json!({
                "submission_id": rec.id,
                "auto_score": rec.auto_score,
                "total_points": rec.total_points,
                "fully_graded": rec.fully_graded,
                "pending_question_ids": rec.pending_question_ids,
            })),
        ),
        Err(e) => (err_status(&e), Json(json!({"error": e.to_string()}))),
    }
}

// ─── GET /api/assessments/grading-queue ───────────────────────────────────────

async fn grading_queue_handler(
    State(s): State<AssessmentState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
) -> (StatusCode, Json<Value>) {
    if !matches!(claims.role, UserRole::Teacher | UserRole::SchoolHead | UserRole::SchoolAdmin) {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({"error": "grading queue is teacher-only"})),
        );
    }
    let teacher_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "invalid subject claim"})),
            )
        }
    };

    match list_grading_queue(&s.db, &s.config, teacher_id).await {
        Ok(items) => (StatusCode::OK, Json(json!({"items": items}))),
        Err(e) => (err_status(&e), Json(json!({"error": e.to_string()}))),
    }
}

// ─── PATCH /api/assessments/submissions/:id/grade ─────────────────────────────

#[derive(Debug, Deserialize)]
struct GradeBody {
    score: f64,
    feedback: Option<String>,
}

async fn grade_handler(
    State(s): State<AssessmentState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
    Path(submission_id): Path<Uuid>,
    Json(body): Json<GradeBody>,
) -> (StatusCode, Json<Value>) {
    if !matches!(claims.role, UserRole::Teacher | UserRole::SchoolHead | UserRole::SchoolAdmin) {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({"error": "grading is teacher-only"})),
        );
    }
    let teacher_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "invalid subject claim"})),
            )
        }
    };

    let req = GradeSubmissionRequest {
        teacher_id,
        score: body.score,
        feedback: body.feedback,
    };

    match grade_submission(&s.db, &s.config, submission_id, req).await {
        Ok(()) => (StatusCode::OK, Json(json!({"submission_id": submission_id}))),
        Err(e) => (err_status(&e), Json(json!({"error": e.to_string()}))),
    }
}
