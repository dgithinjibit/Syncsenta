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
    metta_core::{OmegaClawRules, TutoringDecisionError},
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
        .route("/tutoring", post(tutoring_handler))
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
        Ok(scope) => {
            // The path travels with the scope because a learner screen needs
            // both and would otherwise make two calls to decide one thing. The
            // list comes from the rule pack's own rows, so nothing downstream
            // has to write the set down again and drift from the gate.
            let activities = match state.rules.activities_for(&grade).await {
                Ok(activities) => activities,
                Err(error) => {
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(json!({ "error": error.to_string() })),
                    )
                }
            };
            (
                StatusCode::OK,
                Json(json!({
                    "grade": grade,
                    "scope": scope,
                    "activities": activities,
                })),
            )
        }
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

#[derive(Debug, Deserialize)]
struct TutoringRequest {
    questions_answered: u32,
    correct_answers: u32,
    mastery_percent: f64,
    hints_used: u32,
    consecutive_wrong: u32,
}

async fn tutoring_handler(
    State(state): State<OmegaClawState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
    Json(body): Json<TutoringRequest>,
) -> (StatusCode, Json<Value>) {
    if !is_allowed_role(&claims.role) {
        return forbidden();
    }
    if let Err(error) = state.rules.load().await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": error.to_string() })),
        );
    }

    match state
        .rules
        .tutoring_decision(
            body.questions_answered,
            body.correct_answers,
            body.mastery_percent,
            body.hints_used,
            body.consecutive_wrong,
        )
        .await
    {
        Ok(decision) => (
            StatusCode::OK,
            Json(json!({
                "scaffolding": decision.scaffolding,
                "nextAction": decision.next_action,
                "hint": decision.hint,
                "rulesetVersion": decision.ruleset_version,
                "evidence": decision.evidence,
                "decidedAt": decision.decided_at,
            })),
        ),
        Err(TutoringDecisionError::InvalidInput(message)) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": message })),
        ),
        Err(TutoringDecisionError::Runtime(error)) => {
            tracing::error!(%error, "Omega tutoring policy evaluation failed");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Unable to evaluate tutoring policy" })),
            )
        },
    }
}

#[cfg(all(test, feature = "metta"))]
mod tests {
    use super::*;
    use crate::services::auth::Claims;
    use syncsenta_common::models::SupportedLanguage;

    #[tokio::test]
    async fn tutoring_handler_returns_bad_request_for_inconsistent_answer_counts() {
        let state = OmegaClawState {
            rules: Arc::new(OmegaClawRules::new().await.unwrap()),
        };
        let claims = Claims {
            sub: "student-1".to_string(),
            role: UserRole::Student,
            school_id: None,
            county_id: None,
            language: SupportedLanguage::En,
            wallet_address: None,
            mfa_verified: true,
            exp: i64::MAX,
            iat: 0,
        };

        let (status, Json(body)) = tutoring_handler(
            State(state),
            Extension(AuthUser(claims)),
            Json(TutoringRequest {
                questions_answered: 2,
                correct_answers: 3,
                mastery_percent: 50.0,
                hints_used: 0,
                consecutive_wrong: 0,
            }),
        )
        .await;

        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert_eq!(
            body["error"],
            "correct answer count cannot exceed questions answered"
        );
    }

    #[tokio::test]
    async fn tutoring_handler_returns_versioned_meTTa_evidence_and_decision_time() {
        let state = OmegaClawState {
            rules: Arc::new(OmegaClawRules::new().await.unwrap()),
        };
        let claims = Claims {
            sub: "student-1".to_string(),
            role: UserRole::Student,
            school_id: None,
            county_id: None,
            language: SupportedLanguage::En,
            wallet_address: None,
            mfa_verified: true,
            exp: i64::MAX,
            iat: 0,
        };

        let (status, Json(body)) = tutoring_handler(
            State(state),
            Extension(AuthUser(claims)),
            Json(TutoringRequest {
                questions_answered: 10,
                correct_answers: 2,
                mastery_percent: 90.0,
                hints_used: 0,
                consecutive_wrong: 0,
            }),
        )
        .await;

        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["scaffolding"], "Intensive");
        assert_eq!(body["rulesetVersion"], "omega-tutoring-v1");
        assert_eq!(body["evidence"], json!(["low-accuracy"]));
        assert!(body["decidedAt"].as_str().is_some_and(|value| {
            chrono::DateTime::parse_from_rfc3339(value).is_ok()
        }));
    }
}
