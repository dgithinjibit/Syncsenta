//! SyncToken economy handlers
//!
//! Routes:
//! - POST /api/tokens/redeem   — redeem tokens for course/mentorship/hardware
//! - GET  /api/tokens/balance  — get token balance for current user
//! - GET  /api/tokens/history  — get token transaction history

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

use crate::{config::AppConfig, middleware::auth::AuthUser};
use crate::services::token_economy::{get_token_balance, redeem_tokens, RedemptionType};

#[derive(Clone)]
pub struct TokenState {
    pub db: PgPool,
    pub config: AppConfig,
}

pub fn router(db: PgPool, cfg: AppConfig) -> Router {
    let state = TokenState { db, config: cfg };
    Router::new()
        .route("/redeem", post(redeem))
        .route("/balance", get(balance))
        .route("/history", get(history))
        .with_state(state)
}

// ─── POST /api/tokens/redeem ─────────────────────────────────────────────────

#[derive(Deserialize)]
struct RedeemRequest {
    amount: u64,
    redemption_type: RedemptionType,
    reference_id: Option<Uuid>,
}

async fn redeem(
    State(s): State<TokenState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
    Json(req): Json<RedeemRequest>,
) -> (StatusCode, Json<Value>) {
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid token"}))),
    };

    if req.amount == 0 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Redemption amount must be greater than 0"})),
        );
    }

    match redeem_tokens(&s.db, user_id, req.amount, req.redemption_type, req.reference_id).await {
        Ok(tx_hash) => (
            StatusCode::OK,
            Json(json!({
                "message": "Tokens redeemed successfully",
                "amount_burned": req.amount,
                "blockchain_tx_hash": tx_hash,
            })),
        ),
        Err(e) => {
            let msg = e.to_string();
            let status = if msg.contains("Insufficient") {
                StatusCode::PAYMENT_REQUIRED
            } else {
                StatusCode::BAD_REQUEST
            };
            (status, Json(json!({"error": msg})))
        }
    }
}

// ─── GET /api/tokens/balance ─────────────────────────────────────────────────

async fn balance(
    State(s): State<TokenState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
) -> (StatusCode, Json<Value>) {
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid token"}))),
    };

    match get_token_balance(&s.db, user_id).await {
        Ok(bal) => (
            StatusCode::OK,
            Json(json!({
                "learner_id": bal.learner_id,
                "wallet_address": bal.wallet_address,
                "total_minted": bal.total_minted,
                "total_burned": bal.total_burned,
                "available_balance": bal.available_balance,
            })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}

// ─── GET /api/tokens/history ─────────────────────────────────────────────────

async fn history(
    State(s): State<TokenState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
) -> (StatusCode, Json<Value>) {
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid token"}))),
    };

    // Fetch wallet address
    let wallet = sqlx::query_scalar!(
        "SELECT wallet_address FROM users WHERE id = $1",
        user_id
    )
    .fetch_optional(&s.db)
    .await
    .ok()
    .flatten()
    .flatten()
    .unwrap_or_default();

    let transactions = sqlx::query!(
        r#"
        SELECT tx_hash, from_address, to_address, amount, transaction_type,
               metadata, timestamp, created_at
        FROM token_transactions
        WHERE from_address = $1 OR to_address = $1
        ORDER BY created_at DESC
        LIMIT 50
        "#,
        wallet
    )
    .fetch_all(&s.db)
    .await;

    match transactions {
        Ok(rows) => {
            let txs: Vec<Value> = rows
                .iter()
                .map(|r| {
                    json!({
                        "tx_hash": r.tx_hash,
                        "from": r.from_address,
                        "to": r.to_address,
                        "amount": r.amount,
                        "type": r.transaction_type,
                        "metadata": r.metadata,
                        "timestamp": r.timestamp,
                        "created_at": r.created_at,
                    })
                })
                .collect();
            (StatusCode::OK, Json(json!({"transactions": txs, "count": txs.len()})))
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}
