use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

use crate::services::auth::{validate_token, Claims};

/// Axum extension type carrying validated JWT claims
#[derive(Clone, Debug)]
pub struct AuthUser(pub Claims);

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
