use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde::Deserialize;
use serde_json::json;

use crate::services::auth::{validate_token, Claims};
use syncsenta_common::models::{SupportedLanguage, UserRole};

/// Axum extension type carrying validated JWT claims
#[derive(Clone, Debug)]
pub struct AuthUser(pub Claims);

const OMEGA_PROXY_ISSUER: &str = "syncsenta-studio";
const OMEGA_PROXY_AUDIENCE: &str = "syncsenta-omega-claw";

#[derive(Debug, Deserialize)]
struct OmegaProxyClaims {
    sub: String,
    role: String,
    iss: String,
    aud: String,
    exp: i64,
    iat: i64,
}

/// Tower middleware: extract + validate Bearer JWT from Authorization header.
/// Injects `AuthUser` extension into the request for downstream handlers.
pub async fn require_auth(
    State(jwt_secret): State<String>,
    mut req: Request,
    next: Next,
) -> Response {
    let token = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));

    match token {
        None => (
            StatusCode::UNAUTHORIZED,
            Json(json!({"error": "Missing Authorization header"})),
        )
            .into_response(),
        Some(t) => match validate_token(t, &jwt_secret) {
            Err(_) => (
                StatusCode::UNAUTHORIZED,
                Json(json!({"error": "Invalid or expired token"})),
            )
                .into_response(),
            Ok(claims) => {
                req.extensions_mut().insert(AuthUser(claims));
                next.run(req).await
            }
        },
    }
}

/// Authenticate the short-lived identity assertion minted by Studio after it
/// validates the caller with Supabase. This is intentionally scoped to the
/// Omega Claw router and accepts student assertions only.
pub async fn require_omega_proxy_auth(
    State(secret): State<Option<String>>,
    mut req: Request,
    next: Next,
) -> Response {
    let Some(secret) = secret.filter(|value| value.as_bytes().len() >= 32) else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": "Omega proxy authentication is not configured" })),
        )
            .into_response();
    };

    let token = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "));

    let Some(token) = token else {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "Missing Authorization header" })),
        )
            .into_response();
    };

    match validate_omega_proxy_token(token, &secret) {
        Ok(claims) => {
            req.extensions_mut().insert(AuthUser(claims));
            next.run(req).await
        }
        Err(_) => (
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "Invalid or expired Omega proxy token" })),
        )
            .into_response(),
    }
}

fn validate_omega_proxy_token(token: &str, secret: &str) -> anyhow::Result<Claims> {
    anyhow::ensure!(
        secret.as_bytes().len() >= 32,
        "Omega proxy signing secret is too short"
    );
    let mut validation = Validation::new(Algorithm::HS256);
    validation.leeway = 0;
    validation.set_issuer(&[OMEGA_PROXY_ISSUER]);
    validation.set_audience(&[OMEGA_PROXY_AUDIENCE]);

    let proxy_claims = decode::<OmegaProxyClaims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )?
    .claims;
    anyhow::ensure!(
        proxy_claims.role == "student",
        "Omega proxy token does not represent a student"
    );
    uuid::Uuid::parse_str(&proxy_claims.sub)?;

    Ok(Claims {
        sub: proxy_claims.sub,
        role: UserRole::Student,
        school_id: None,
        county_id: None,
        language: SupportedLanguage::En,
        wallet_address: None,
        mfa_verified: false,
        exp: proxy_claims.exp,
        iat: proxy_claims.iat,
    })
}

#[cfg(test)]
mod tests {
    use jsonwebtoken::{encode, EncodingKey, Header};
    use serde::Serialize;

    use super::*;

    #[derive(Serialize)]
    struct ProxyTokenClaims {
        sub: String,
        role: String,
        iss: String,
        aud: String,
        exp: i64,
        iat: i64,
    }

    fn token(secret: &str, audience: &str, role: &str) -> String {
        encode(
            &Header::default(),
            &ProxyTokenClaims {
                sub: "f58c2e07-a71c-444e-9402-2926caf40b61".to_string(),
                role: role.to_string(),
                iss: "syncsenta-studio".to_string(),
                aud: audience.to_string(),
                exp: chrono::Utc::now().timestamp() + 60,
                iat: chrono::Utc::now().timestamp(),
            },
            &EncodingKey::from_secret(secret.as_bytes()),
        )
        .unwrap()
    }

    #[test]
    fn validates_short_lived_studio_proxy_identity_assertions() {
        let claims = validate_omega_proxy_token(
            &token(
                "synthetic-only-omega-proxy-secret-32-bytes",
                "syncsenta-omega-claw",
                "student",
            ),
            "synthetic-only-omega-proxy-secret-32-bytes",
        )
        .unwrap();

        assert_eq!(claims.sub, "f58c2e07-a71c-444e-9402-2926caf40b61");
        assert_eq!(claims.role, UserRole::Student);
    }

    #[test]
    fn rejects_wrong_audience_and_non_student_proxy_assertions() {
        let secret = "synthetic-only-omega-proxy-secret-32-bytes";
        assert!(validate_omega_proxy_token(
            &token(secret, "another-service", "student"),
            secret,
        )
        .is_err());
        assert!(validate_omega_proxy_token(
            &token(secret, "syncsenta-omega-claw", "teacher"),
            secret,
        )
        .is_err());
    }
}
