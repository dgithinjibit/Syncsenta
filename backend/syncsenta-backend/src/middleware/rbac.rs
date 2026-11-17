use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};
use base64::Engine;
use syncsenta_common::models::UserRole;

use super::auth::AuthUser;
use crate::auth::middleware::DIDUser;

/// Tower middleware layer checking user role against required roles.
/// Supports both JWT-based (AuthUser) and DID-based (DIDUser) authentication.
/// Returns 403 with structured error for unauthorized access.
pub async fn require_role(allowed: &[UserRole], req: Request, next: Next) -> Response {
    // Try DID-based auth first (Web4)
    if let Some(did_user) = req.extensions().get::<DIDUser>() {
        if allowed.contains(&did_user.role) {
            return next.run(req).await;
        } else {
            return (
                StatusCode::FORBIDDEN,
                Json(json!({
                    "error": "Insufficient permissions",
                    "required_roles": allowed.iter().map(|r| format!("{:?}", r)).collect::<Vec<_>>()
                })),
            )
                .into_response();
        }
    }

    // Fall back to JWT-based auth (backward compatibility)
    match req.extensions().get::<AuthUser>() {
        None => (
            StatusCode::UNAUTHORIZED,
            Json(json!({"error": "Not authenticated"})),
        )
            .into_response(),
        Some(AuthUser(claims)) => {
            if allowed.contains(&claims.role) {
                next.run(req).await
            } else {
                (
                    StatusCode::FORBIDDEN,
                    Json(json!({
                        "error": "Insufficient permissions",
                        "required_roles": allowed.iter()
                            .map(|r| format!("{:?}", r))
                            .collect::<Vec<_>>()
                    })),
                )
                    .into_response()
            }
        }
    }
}

/// Zero-Knowledge Proof claim for privacy-preserving role checks.
///
/// Instead of revealing the exact role, the user proves they satisfy
/// a role predicate (e.g., "is at least SchoolAdmin level") without
/// disclosing their specific role.
///
/// Current implementation: commitment-based ZK simulation.
/// Production: replace with actual ZK proof system (e.g., Groth16, PLONK).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZKRoleClaim {
    /// Commitment: SHA256(role || nonce) — hides the actual role
    pub commitment: String,
    /// Nonce used in commitment (revealed to verifier)
    pub nonce: String,
    /// The predicate being proved (e.g., "min_level:school_admin")
    pub predicate: String,
}

/// Role hierarchy levels for ZK range proofs
fn role_level(role: &UserRole) -> u8 {
    match role {
        UserRole::Student => 0,
        UserRole::Parent => 1,
        UserRole::Teacher => 2,
        UserRole::SchoolAdmin => 3,
        UserRole::SchoolHead => 4,
        UserRole::CountyOfficer => 5,
        UserRole::NationalAdmin => 6,
    }
}

/// Generate a ZK role commitment (commitment = SHA256(role_level || nonce))
pub fn generate_zk_commitment(role: &UserRole, nonce: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(&[role_level(role)]);
    hasher.update(nonce.as_bytes());
    let hash = hasher.finalize();
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&hash[..])
}

/// Verify a ZK role claim against a minimum required level
///
/// The verifier checks:
/// 1. The commitment matches SHA256(claimed_level || nonce)
/// 2. The claimed level satisfies the predicate (e.g., >= min_level)
///
/// This is a simulation — in production use a real ZK proof system.
pub fn verify_zk_role_claim(
    claim: &ZKRoleClaim,
    min_role: &UserRole,
    actual_role: &UserRole,
) -> bool {
    // Verify commitment: SHA256(actual_role_level || nonce) == commitment
    let expected_commitment = generate_zk_commitment(actual_role, &claim.nonce);
    if expected_commitment != claim.commitment {
        return false;
    }

    // Verify predicate: actual role level >= minimum required level
    role_level(actual_role) >= role_level(min_role)
}

/// Convenience function to create an Axum middleware layer for a fixed set of roles.
///
/// # Usage
///
/// ```rust,ignore
/// use axum::{Router, routing::get};
/// use syncsenta_common::models::UserRole;
/// use crate::middleware::rbac::with_roles;
///
/// let app = Router::new()
///     .route("/admin", get(admin_handler))
///     .route_layer(with_roles(vec![UserRole::SchoolAdmin, UserRole::NationalAdmin]));
/// ```
pub fn with_roles(
    roles: Vec<UserRole>,
) -> axum::middleware::FromFnLayer<
    impl FnMut(
            Request,
            Next,
        ) -> std::pin::Pin<Box<dyn std::future::Future<Output = Response> + Send>>
        + Clone,
    (),
    (Request, Next),
> {
    axum::middleware::from_fn(move |req: Request, next: Next| {
        let roles = roles.clone();
        Box::pin(async move { require_role(&roles, req, next).await })
            as std::pin::Pin<Box<dyn std::future::Future<Output = Response> + Send>>
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_role_levels_are_ordered() {
        assert!(role_level(&UserRole::Student) < role_level(&UserRole::Teacher));
        assert!(role_level(&UserRole::Teacher) < role_level(&UserRole::SchoolAdmin));
        assert!(role_level(&UserRole::SchoolAdmin) < role_level(&UserRole::SchoolHead));
        assert!(role_level(&UserRole::SchoolHead) < role_level(&UserRole::CountyOfficer));
        assert!(role_level(&UserRole::CountyOfficer) < role_level(&UserRole::NationalAdmin));
    }

    #[test]
    fn test_zk_commitment_generation() {
        let role = UserRole::Teacher;
        let nonce = "test_nonce_123";
        let commitment = generate_zk_commitment(&role, nonce);
        assert!(!commitment.is_empty());

        // Same inputs produce same commitment (deterministic)
        let commitment2 = generate_zk_commitment(&role, nonce);
        assert_eq!(commitment, commitment2);

        // Different roles produce different commitments
        let commitment3 = generate_zk_commitment(&UserRole::SchoolAdmin, nonce);
        assert_ne!(commitment, commitment3);
    }

    #[test]
    fn test_zk_role_claim_verification() {
        let role = UserRole::SchoolHead;
        let nonce = "secure_nonce_456";
        let commitment = generate_zk_commitment(&role, nonce);

        let claim = ZKRoleClaim {
            commitment,
            nonce: nonce.to_string(),
            predicate: "min_level:school_admin".to_string(),
        };

        // SchoolHead satisfies min SchoolAdmin requirement
        assert!(verify_zk_role_claim(&claim, &UserRole::SchoolAdmin, &role));

        // SchoolHead does NOT satisfy min NationalAdmin requirement
        assert!(!verify_zk_role_claim(&claim, &UserRole::NationalAdmin, &role));
    }

    #[test]
    fn test_zk_claim_tampered_commitment_rejected() {
        let role = UserRole::Teacher;
        let nonce = "nonce_789";

        let claim = ZKRoleClaim {
            commitment: "tampered_commitment".to_string(),
            nonce: nonce.to_string(),
            predicate: "min_level:student".to_string(),
        };

        // Tampered commitment should fail verification
        assert!(!verify_zk_role_claim(&claim, &UserRole::Student, &role));
    }
}
