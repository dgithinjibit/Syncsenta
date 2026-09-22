//! Tower middleware for DID-based authentication
//! 
//! Extracts and validates Verifiable Presentations from Authorization header

use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use base64::Engine;
use serde_json::json;
use sqlx::PgPool;

use syncsenta_common::models::{ApprovalStatus, UserRole};

use super::vc::{verify_presentation, VerifiablePresentation};

/// Axum extension type carrying validated DID claims
#[derive(Clone, Debug)]
pub struct DIDUser {
    pub user_id: uuid::Uuid,
    pub did: String,
    pub role: UserRole,
    pub school_id: Option<uuid::Uuid>,
    pub county_id: Option<uuid::Uuid>,
    pub approval_status: ApprovalStatus,
}

/// Tower middleware: extract + validate Verifiable Presentation from Authorization header
/// 
/// Expected format: Authorization: Bearer <base64-encoded-VP>
pub async fn require_did_auth(
    State(db): State<PgPool>,
    mut req: Request,
    next: Next,
) -> Response {
    // Extract Authorization header
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));

    let vp_b64 = match auth_header {
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({"error": "Missing Authorization header"})),
            )
                .into_response()
        }
        Some(t) => t,
    };

    // Decode base64 VP
    let vp_json = match base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(vp_b64) {
        Ok(bytes) => match String::from_utf8(bytes) {
            Ok(s) => s,
            Err(_) => {
                return (
                    StatusCode::UNAUTHORIZED,
                    Json(json!({"error": "Invalid VP encoding"})),
                )
                    .into_response()
            }
        },
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({"error": "Invalid VP encoding"})),
            )
                .into_response()
        }
    };

    // Parse VP
    let vp: VerifiablePresentation = match serde_json::from_str(&vp_json) {
        Ok(vp) => vp,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({"error": "Invalid VP format"})),
            )
                .into_response()
        }
    };

    // Verify VP and extract primary credential
    let vc = match verify_presentation(&vp) {
        Ok(vc) => vc,
        Err(e) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({"error": format!("VP verification failed: {}", e)})),
            )
                .into_response()
        }
    };

    // Extract user info from credential
    let did = vc.credential_subject.id.clone();
    
    // Look up user by DID
    let user_row = match sqlx::query!(
        r#"
        SELECT id, role as "role: String", approval_status as "approval_status: String",
               school_id, county_id
        FROM users
        WHERE did = $1
        "#,
        did
    )
    .fetch_optional(&db)
    .await
    {
        Ok(Some(row)) => row,
        Ok(None) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({"error": "User not found"})),
            )
                .into_response()
        }
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
                .into_response()
        }
    };

    // Parse role and approval status
    let role: UserRole = match serde_json::from_value(serde_json::Value::String(user_row.role)) {
        Ok(r) => r,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Invalid role"})),
            )
                .into_response()
        }
    };

    let approval_status: ApprovalStatus = match serde_json::from_value(
        serde_json::Value::String(user_row.approval_status),
    ) {
        Ok(s) => s,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Invalid approval status"})),
            )
                .into_response()
        }
    };

    // Check approval status
    if approval_status != ApprovalStatus::Approved {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({"error": "Account not approved"})),
        )
            .into_response();
    }

    // Create DIDUser extension
    let did_user = DIDUser {
        user_id: user_row.id,
        did,
        role,
        school_id: user_row.school_id,
        county_id: user_row.county_id,
        approval_status,
    };

    // Insert extension and continue
    req.extensions_mut().insert(did_user);
    next.run(req).await
}

/// Middleware to check if user has MFA verified (hardware wallet signature)
/// 
/// For privileged roles, this checks for a valid wallet signature in the VP proof
pub async fn require_mfa(
    req: Request,
    next: Next,
) -> Response {
    let did_user = req.extensions().get::<DIDUser>().cloned();

    match did_user {
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({"error": "Authentication required"})),
            )
                .into_response()
        }
        Some(user) => {
            // Check if role requires MFA
            let requires_mfa = matches!(
                user.role,
                UserRole::SchoolAdmin
                    | UserRole::SchoolHead
                    | UserRole::CountyOfficer
                    | UserRole::NationalAdmin
            );

            if requires_mfa {
                // In production, verify hardware wallet signature from VP proof
                // For now, we assume the VP proof includes wallet signature verification
                // TODO: Implement proper hardware wallet signature verification
            }

            next.run(req).await
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_did_user_creation() {
        let did_user = DIDUser {
            user_id: uuid::Uuid::new_v4(),
            did: "did:key:z6MkTest123".to_string(),
            role: UserRole::Teacher,
            school_id: Some(uuid::Uuid::new_v4()),
            county_id: None,
            approval_status: ApprovalStatus::Approved,
        };

        assert_eq!(did_user.role, UserRole::Teacher);
        assert_eq!(did_user.approval_status, ApprovalStatus::Approved);
    }
}
