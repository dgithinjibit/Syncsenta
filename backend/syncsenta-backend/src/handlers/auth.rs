use axum::{
    extract::{Extension, State},
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
    services::auth::{
        enable_mfa, generate_totp_secret, get_totp_qr_url, login_user, register_user,
        LoginRequest, RegisterRequest,
    },
    // COMMENTED OUT: Wallet MFA for student-focused build
    // services::wallet_mfa::{
    //     enroll_wallet, generate_wallet_challenge, requires_wallet_mfa, verify_wallet_mfa,
    // },
};

// ─── App State ───────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct AuthState {
    pub db: PgPool,
    pub jwt_secret: String,
}

// ─── Router ──────────────────────────────────────────────────────────────────

pub fn router(db: PgPool, cfg: AppConfig) -> Router {
    let state = AuthState {
        db,
        jwt_secret: cfg.jwt_secret,
    };
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/mfa/setup", post(mfa_setup))
        .route("/mfa/verify", post(mfa_verify))
        // COMMENTED OUT: Wallet MFA routes for student-focused build
        // .route("/wallet/challenge", post(wallet_challenge))
        // .route("/wallet/enroll", post(wallet_enroll))
        // .route("/wallet/verify", post(wallet_verify_mfa))
        .route("/me", get(me))
        .with_state(state)
}

// ─── POST /auth/register ─────────────────────────────────────────────────────

async fn register(
    State(s): State<AuthState>,
    Json(req): Json<RegisterRequest>,
) -> (StatusCode, Json<Value>) {
    match register_user(&s.db, req).await {
        Ok(user) => (
            StatusCode::CREATED,
            Json(json!({
                "message": "Registration successful. Awaiting approval.",
                "user_id": user.id,
                "approval_status": user.approval_status,
            })),
        ),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": e.to_string()})),
        ),
    }
}

// ─── POST /auth/login ────────────────────────────────────────────────────────

async fn login(
    State(s): State<AuthState>,
    Json(req): Json<LoginRequest>,
) -> (StatusCode, Json<Value>) {
    match login_user(&s.db, &s.jwt_secret, req).await {
        Ok(resp) => (StatusCode::OK, Json(serde_json::to_value(resp).unwrap())),
        Err(e) => {
            let msg = e.to_string();
            let status = if msg.contains("not yet approved") {
                StatusCode::FORBIDDEN
            } else {
                StatusCode::UNAUTHORIZED
            };
            (status, Json(json!({"error": msg})))
        }
    }
}

// ─── POST /auth/mfa/setup ────────────────────────────────────────────────────

#[derive(Serialize)]
struct MfaSetupResponse {
    secret: String,
    qr_url: String,
}

async fn mfa_setup(
    State(s): State<AuthState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
) -> (StatusCode, Json<Value>) {
    let secret = generate_totp_secret();
    match get_totp_qr_url(&secret, &claims.sub) {
        Ok(qr_url) => {
            // Persist secret (not yet enabled until verified)
            let user_id = match Uuid::parse_str(&claims.sub) {
                Ok(id) => id,
                Err(_) => {
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(json!({"error": "Invalid user id"})),
                    )
                }
            };
            if let Err(e) = enable_mfa(&s.db, user_id, &secret).await {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"error": e.to_string()})),
                );
            }
            (
                StatusCode::OK,
                Json(serde_json::to_value(MfaSetupResponse { secret, qr_url }).unwrap()),
            )
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}

// ─── POST /auth/mfa/verify ───────────────────────────────────────────────────

#[derive(Deserialize)]
struct MfaVerifyRequest {
    code: String,
}

async fn mfa_verify(
    State(s): State<AuthState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
    Json(req): Json<MfaVerifyRequest>,
) -> (StatusCode, Json<Value>) {
    use crate::services::auth::verify_totp;

    let row = sqlx::query!(
        "SELECT mfa_secret FROM user_profiles WHERE id = $1",
        Uuid::parse_str(&claims.sub).unwrap()
    )
    .fetch_optional(&s.db)
    .await;

    match row {
        Ok(Some(r)) => match r.mfa_secret {
            Some(secret) => match verify_totp(&secret, &req.code) {
                Ok(true) => (StatusCode::OK, Json(json!({"verified": true}))),
                Ok(false) => (
                    StatusCode::UNAUTHORIZED,
                    Json(json!({"error": "Invalid TOTP code"})),
                ),
                Err(e) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"error": e.to_string()})),
                ),
            },
            None => (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "MFA not configured"})),
            ),
        },
        _ => (
            StatusCode::NOT_FOUND,
            Json(json!({"error": "User not found"})),
        ),
    }
}

// ─── GET /auth/me ─────────────────────────────────────────────────────────────

async fn me(
    State(s): State<AuthState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
) -> (StatusCode, Json<Value>) {
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "Invalid token"})),
            )
        }
    };

    match sqlx::query!(
        r#"SELECT id, email, phone, role as "role: String", approval_status as "approval_status: String",
           school_id, county_id, language_preference as "language_preference: String", mfa_enabled, created_at
           FROM user_profiles WHERE id = $1"#,
        user_id
    )
    .fetch_optional(&s.db)
    .await
    {
        Ok(Some(row)) => (
            StatusCode::OK,
            Json(json!({
                "id": row.id,
                "email": row.email,
                "phone": row.phone,
                "role": row.role,
                "approval_status": row.approval_status,
                "school_id": row.school_id,
                "county_id": row.county_id,
                "language_preference": row.language_preference,
                "mfa_enabled": row.mfa_enabled,
                "created_at": row.created_at,
            })),
        ),
        _ => (
            StatusCode::NOT_FOUND,
            Json(json!({"error": "User not found"})),
        ),
    }
}

// ─── POST /auth/wallet/challenge ─────────────────────────────────────────────
// Returns a challenge string for the client to sign with their hardware wallet
// COMMENTED OUT: Wallet MFA for student-focused build

/*
async fn wallet_challenge(
    Extension(AuthUser(claims)): Extension<AuthUser>,
) -> (StatusCode, Json<Value>) {
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid token"}))),
    };

    if !requires_wallet_mfa(&claims.role) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Wallet MFA not required for this role"})),
        );
    }

    let challenge = generate_wallet_challenge(user_id);
    (StatusCode::OK, Json(json!({"challenge": challenge})))
}
*/

// ─── POST /auth/wallet/enroll ─────────────────────────────────────────────────
// Enroll a hardware wallet for MFA (SchoolAdmin, SchoolHead, CountyOfficer, NationalAdmin)
// COMMENTED OUT: Wallet MFA for student-focused build

/*
#[derive(Deserialize)]
struct WalletEnrollRequest {
    wallet_address: String,
    signature: String,
    challenge: String,
}
*/

/*
async fn wallet_enroll(
    State(s): State<AuthState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
    Json(req): Json<WalletEnrollRequest>,
) -> (StatusCode, Json<Value>) {
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid token"}))),
    };

    if !requires_wallet_mfa(&claims.role) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Wallet MFA not required for this role"})),
        );
    }

    match enroll_wallet(&s.db, user_id, &req.wallet_address, &req.signature, &req.challenge).await {
        Ok(_) => (
            StatusCode::OK,
            Json(json!({
                "message": "Hardware wallet enrolled successfully",
                "wallet_address": req.wallet_address,
                "mfa_enabled": true,
            })),
        ),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": e.to_string()})),
        ),
    }
}

// ─── POST /auth/wallet/verify ─────────────────────────────────────────────────
// Verify a wallet signature for MFA during login

#[derive(Deserialize)]
struct WalletVerifyRequest {
    user_id: Uuid,
    signature: String,
    challenge: String,
}

async fn wallet_verify_mfa(
    State(s): State<AuthState>,
    Json(req): Json<WalletVerifyRequest>,
) -> (StatusCode, Json<Value>) {
    match verify_wallet_mfa(&s.db, req.user_id, &req.signature, &req.challenge).await {
        Ok(true) => (StatusCode::OK, Json(json!({"verified": true}))),
        Ok(false) => (
            StatusCode::UNAUTHORIZED,
            Json(json!({"error": "Invalid wallet signature"})),
        ),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": e.to_string()})),
        ),
    }
}
*/
