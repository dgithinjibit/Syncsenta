use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    config::AppConfig, 
    middleware::auth::AuthUser,
    services::approvals::{process_approval_decision, record_approval_on_chain},
    services::notifications::{send_approval_notification, NotificationType},
};
use syncsenta_common::models::{ApprovalStatus, UserRole, get_approver_role};

#[derive(Clone)]
pub struct ApprovalsState {
    pub db: PgPool,
    pub config: AppConfig,
}

pub fn router(db: PgPool, cfg: AppConfig) -> Router {
    let state = ApprovalsState { db, config: cfg };
    Router::new()
        .route("/pending", get(get_pending))
        .route("/:request_id/decide", post(decide))
        .with_state(state)
}

// ─── GET /approvals/pending ───────────────────────────────────────────────────
// Returns users pending approval that the current user is authorized to approve

async fn get_pending(
    State(s): State<ApprovalsState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
) -> (StatusCode, Json<Value>) {
    // Verify user has permission to approve
    match claims.role {
        UserRole::Teacher | UserRole::SchoolHead | UserRole::CountyOfficer | UserRole::NationalAdmin => {},
        _ => {
            return (
                StatusCode::FORBIDDEN,
                Json(json!({"error": "You cannot approve registrations"})),
            )
        }
    }

    let rows = sqlx::query!(
        r#"
        SELECT id, email, phone, role as "role!: UserRole", school_id, county_id, created_at
        FROM user_profiles
        WHERE approval_status = 'pending'
          AND (
            (role = 'student' AND $1::user_role = 'teacher') OR
            (role = 'parent' AND $1::user_role = 'teacher') OR
            (role = 'teacher' AND $1::user_role = 'school_head') OR
            (role = 'school_admin' AND $1::user_role = 'school_head') OR
            (role = 'school_head' AND $1::user_role = 'county_officer') OR
            (role = 'county_officer' AND $1::user_role = 'national_admin')
          )
          AND ($2::uuid IS NULL OR school_id = $2)
        ORDER BY created_at ASC
        "#,
        claims.role as UserRole,
        claims.school_id,
    )
    .fetch_all(&s.db)
    .await;

    match rows {
        Ok(r) => {
            let users: Vec<Value> = r
                .iter()
                .map(|u| {
                    json!({
                        "id": u.id,
                        "email": u.email,
                        "phone": u.phone,
                        "role": u.role,
                        "school_id": u.school_id,
                        "county_id": u.county_id,
                        "created_at": u.created_at,
                    })
                })
                .collect();
            (StatusCode::OK, Json(json!({"pending": users, "count": users.len()})))
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}

// ─── POST /approvals/:request_id/decide ──────────────────────────────────────

#[derive(Deserialize)]
struct DecideRequest {
    decision: String, // "approve" | "reject"
    reason: Option<String>,
}

async fn decide(
    State(s): State<ApprovalsState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
    Path(request_id): Path<Uuid>,
    Json(req): Json<DecideRequest>,
) -> (StatusCode, Json<Value>) {
    if req.decision != "approve" && req.decision != "reject" {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "decision must be 'approve' or 'reject'"})),
        );
    }

    // Fetch the target user
    let target = sqlx::query!(
        r#"SELECT id, email as "email!", phone, role as "role!: UserRole", 
           approval_status as "approval_status!: ApprovalStatus", 
           school_id, wallet_address
           FROM user_profiles WHERE id = $1"#,
        request_id
    )
    .fetch_optional(&s.db)
    .await;

    let target = match target {
        Ok(Some(t)) => t,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "User not found"})),
            )
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
        }
    };

    // Verify current user is the correct approver for this role
    let target_role = &target.role;
    let required_approver = get_approver_role(target_role);

    if claims.role != required_approver {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({
                "error": "You are not authorized to approve this role",
                "required_approver": format!("{:?}", required_approver),
            })),
        );
    }

    // Check target is still pending
    if target.approval_status != ApprovalStatus::Pending {
        return (
            StatusCode::CONFLICT,
            Json(json!({"error": "User is not in pending state"})),
        );
    }

    let approver_id = Uuid::parse_str(&claims.sub).unwrap();
    let approved = req.decision == "approve";

    // Process approval decision (updates status, issues VC if approved)
    match process_approval_decision(
        &s.db,
        request_id,
        approver_id,
        approved,
        req.reason.clone(),
    )
    .await
    {
        Ok(_) => {
            // Record approval on blockchain if both users have wallet addresses
            if let (Some(applicant_wallet), Some(approver_wallet)) = 
                (target.wallet_address.as_ref(), claims.wallet_address.as_ref()) 
            {
                match record_approval_on_chain(
                    &s.db,
                    request_id,
                    applicant_wallet,
                    approver_wallet,
                    target_role,
                    approved,
                )
                .await
                {
                    Ok(tx_hash) => {
                        tracing::info!("Recorded approval on-chain: {}", tx_hash);
                    }
                    Err(e) => {
                        tracing::error!("Failed to record approval on-chain: {}", e);
                        // Don't fail the request if blockchain recording fails
                    }
                }
            }

            // Send SMS and email notifications
            let notification_type = if approved {
                NotificationType::ApprovalApproved
            } else {
                NotificationType::ApprovalRejected
            };

            let role_str = format!("{:?}", target.role);
            tokio::spawn({
                let config = s.config.clone();
                let email = target.email.clone();
                let phone = target.phone.clone();
                async move {
                    if let Err(e) = send_approval_notification(
                        &config,
                        &email,
                        phone.as_deref(),
                        notification_type,
                        &role_str,
                    )
                    .await
                    {
                        tracing::error!("Failed to send notification: {}", e);
                    }
                }
            });

            (
                StatusCode::OK,
                Json(json!({
                    "message": format!("User {} successfully", req.decision),
                    "user_id": request_id,
                    "decision": req.decision,
                })),
            )
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}
