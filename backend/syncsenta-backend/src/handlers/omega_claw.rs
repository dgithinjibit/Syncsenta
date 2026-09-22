use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use std::sync::Arc;

use crate::{
    metta_core::OmegaClawRules,
    middleware::auth::AuthUser,
};
use syncsenta_common::models::UserRole;

#[derive(Clone)]
pub struct OmegaClawState {
    pub rules: Arc<OmegaClawRules>,
}

pub fn router(rules: Arc<OmegaClawRules>) -> Router {
    Router::new()
        .route("/:grade/scope", get(scope_handler))
        .route("/activity/check", post(activity_check_handler))
        .route("/progression", post(progression_handler))
        .route("/hint", post(hint_handler))
        .with_state(OmegaClawState { rules })
}

fn is_allowed_role(role: &UserRole) -> bool {
    matches!(
        role,
        UserRole::Student
            | UserRole::Teacher
            | UserRole::Parent
            | UserRole::SchoolHead
            | UserRole::SchoolAdmin
    )
}

fn forbidden() -> (StatusCode, Json<Value>) {
    (
        StatusCode::FORBIDDEN,
        Json(json!({ "error": "Omega Claw is not available for this role" })),
    )
}

async fn scope_handler(
    State(state): State<OmegaClawState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
    Path(grade): Path<String>,
) -> (StatusCode, Json<Value>) {
    if !is_allowed_role(&claims.role) {
        return forbidden();
    }
    if let Err(error) = state.rules.load().await {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": error.to_string() })));
    }

    match state.rules.scope_for(&grade).await {
        Ok(scope) => (StatusCode::OK, Json(json!({ "grade": grade, "scope": scope }))),
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": error.to_string() })),
        ),
    }
}

#[derive(Debug, Deserialize)]
struct ActivityCheckRequest {
    grade: String,
    activity: String,
}

async fn activity_check_handler(
    State(state): State<OmegaClawState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
    Json(body): Json<ActivityCheckRequest>,
) -> (StatusCode, Json<Value>) {
    if !is_allowed_role(&claims.role) {
        return forbidden();
    }
    if let Err(error) = state.rules.load().await {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": error.to_string() })));
    }

    let scope = match state.rules.scope_for(&body.grade).await {
        Ok(scope) => scope,
        Err(error) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": error.to_string() })),
            )
        }
    };
    match state
        .rules
        .is_activity_allowed(&body.grade, &body.activity)
        .await
    {
        Ok(allowed) => (
            StatusCode::OK,
            Json(json!({
                "grade": body.grade,
                "activity": body.activity,
                "scope": scope,
                "allowed": allowed
            })),
        ),
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": error.to_string() })),
        ),
    }
}

#[derive(Debug, Deserialize)]
struct ProgressionRequest {
    outcome: String,
    correct: bool,
    explained: bool,
}

async fn progression_handler(
    State(state): State<OmegaClawState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
    Json(body): Json<ProgressionRequest>,
) -> (StatusCode, Json<Value>) {
    if !is_allowed_role(&claims.role) {
        return forbidden();
    }
    if let Err(error) = state.rules.load().await {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": error.to_string() })));
    }

    let next_action = match state.rules.next_action_for_outcome(&body.outcome).await {
        Ok(action) => action,
        Err(error) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": error.to_string() })),
            )
        }
    };
    match state.rules.can_unlock_transfer(body.correct, body.explained).await {
        Ok(unlocks_transfer) => (
            StatusCode::OK,
            Json(json!({
                "outcome": body.outcome,
                "nextAction": next_action,
                "unlocksTransfer": unlocks_transfer
            })),
        ),
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": error.to_string() })),
        ),
    }
}

#[derive(Debug, Deserialize)]
struct HintRequest {
    hint_level: u8,
}

async fn hint_handler(
    State(state): State<OmegaClawState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
    Json(body): Json<HintRequest>,
) -> (StatusCode, Json<Value>) {
    if !is_allowed_role(&claims.role) {
        return forbidden();
    }
    if let Err(error) = state.rules.load().await {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": error.to_string() })));
    }

    match state.rules.hint_for(body.hint_level).await {
        Ok(hint) => (
            StatusCode::OK,
            Json(json!({ "hintLevel": body.hint_level.clamp(1, 4), "hint": hint })),
        ),
        Err(error) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": error.to_string() })),
        ),
    }
}
