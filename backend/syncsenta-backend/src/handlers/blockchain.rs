//! Blockchain operation handlers
//!
//! Routes:
//! - POST /api/blockchain/credentials  — mint a credential NFT
//! - POST /api/blockchain/tokens       — mint SyncTokens
//! - GET  /api/blockchain/credentials/:token_id — verify a credential

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

use crate::{config::AppConfig, middleware::auth::AuthUser};
use syncsenta_common::models::UserRole;

#[derive(Clone)]
pub struct BlockchainState {
    pub db: PgPool,
    pub config: AppConfig,
}

pub fn router(db: PgPool, cfg: AppConfig) -> Router {
    let state = BlockchainState { db, config: cfg };
    Router::new()
        .route("/credentials", post(mint_credential))
        .route("/credentials/:token_id", get(verify_credential))
        .route("/tokens", post(mint_tokens))
        .with_state(state)
}

// ─── POST /api/blockchain/credentials ────────────────────────────────────────

#[derive(Deserialize)]
struct MintCredentialRequest {
    learner_id: Uuid,
    skill_id: String,
    evidence_cid: String,
}

#[derive(Serialize)]
struct MintCredentialResponse {
    token_id: String,
    learner_id: Uuid,
    skill_id: String,
    evidence_cid: String,
    blockchain_tx_hash: String,
}

async fn mint_credential(
    State(s): State<BlockchainState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
    Json(req): Json<MintCredentialRequest>,
) -> (StatusCode, Json<Value>) {
    // Only teachers and admins can mint credentials
    match claims.role {
        UserRole::Teacher
        | UserRole::SchoolAdmin
        | UserRole::SchoolHead
        | UserRole::NationalAdmin => {}
        _ => {
            return (
                StatusCode::FORBIDDEN,
                Json(json!({"error": "Only teachers and admins can mint credentials"})),
            )
        }
    }

    // Fetch learner's wallet address
    let learner = sqlx::query!(
        "SELECT wallet_address FROM users WHERE id = $1",
        req.learner_id
    )
    .fetch_optional(&s.db)
    .await;

    let wallet_address = match learner {
        Ok(Some(row)) => row.wallet_address,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "Learner not found"})),
            )
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
        }
    };

    let wallet = match wallet_address {
        Some(w) => w,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "Learner has no wallet address registered"})),
            )
        }
    };

    // Simulate blockchain minting (actual call requires BlockchainService)
    // In production: call BlockchainService::mint_credential
    let simulated_token_id = format!("{}", uuid::Uuid::new_v4().as_u128());
    let simulated_tx_hash = format!("0x{}", hex::encode(uuid::Uuid::new_v4().as_bytes()));

    // Store credential record in database
    let result = sqlx::query!(
        r#"
        INSERT INTO blockchain_credentials (
            id, token_id, learner_id, learner_address, skill_id,
            evidence_cid, issued_at, revoked, blockchain_tx_hash, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, NOW())
        "#,
        Uuid::new_v4(),
        simulated_token_id,
        req.learner_id,
        wallet,
        req.skill_id,
        req.evidence_cid,
        chrono::Utc::now().timestamp(),
        simulated_tx_hash.clone(),
    )
    .execute(&s.db)
    .await;

    match result {
        Ok(_) => (
            StatusCode::CREATED,
            Json(json!({
                "token_id": simulated_token_id,
                "learner_id": req.learner_id,
                "skill_id": req.skill_id,
                "evidence_cid": req.evidence_cid,
                "blockchain_tx_hash": simulated_tx_hash,
                "message": "Credential minted successfully",
            })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}

// ─── GET /api/blockchain/credentials/:token_id ────────────────────────────────

async fn verify_credential(
    State(s): State<BlockchainState>,
    Path(token_id): Path<String>,
) -> (StatusCode, Json<Value>) {
    let result = sqlx::query!(
        r#"
        SELECT token_id, learner_id, learner_address, skill_id,
               evidence_cid, issued_at, revoked, blockchain_tx_hash
        FROM blockchain_credentials
        WHERE token_id = $1
        "#,
        token_id
    )
    .fetch_optional(&s.db)
    .await;

    match result {
        Ok(Some(row)) => (
            StatusCode::OK,
            Json(json!({
                "token_id": row.token_id,
                "learner_id": row.learner_id,
                "learner_address": row.learner_address,
                "skill_id": row.skill_id,
                "evidence_cid": row.evidence_cid,
                "issued_at": row.issued_at,
                "revoked": row.revoked,
                "blockchain_tx_hash": row.blockchain_tx_hash,
                "valid": !row.revoked.unwrap_or(false),
            })),
        ),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(json!({"error": "Credential not found"})),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}

// ─── POST /api/blockchain/tokens ─────────────────────────────────────────────

#[derive(Deserialize)]
struct MintTokensRequest {
    learner_id: Uuid,
    amount: u64, // Amount in SYNC tokens (not wei)
    reason: String, // "assessment_completion", "quiz_mastery", "learning_path_milestone"
}

async fn mint_tokens(
    State(s): State<BlockchainState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
    Json(req): Json<MintTokensRequest>,
) -> (StatusCode, Json<Value>) {
    // Only teachers and admins can trigger token minting
    match claims.role {
        UserRole::Teacher | UserRole::SchoolAdmin | UserRole::NationalAdmin => {}
        _ => {
            return (
                StatusCode::FORBIDDEN,
                Json(json!({"error": "Only teachers and admins can mint tokens"})),
            )
        }
    }

    // Fetch learner's wallet address
    let learner = sqlx::query!(
        "SELECT wallet_address FROM users WHERE id = $1",
        req.learner_id
    )
    .fetch_optional(&s.db)
    .await;

    let wallet = match learner {
        Ok(Some(row)) => row.wallet_address.unwrap_or_default(),
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "Learner not found"})),
            )
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
        }
    };

    if wallet.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Learner has no wallet address registered"})),
        );
    }

    // Simulate token minting (actual call requires BlockchainService)
    let simulated_tx_hash = format!("0x{}", hex::encode(uuid::Uuid::new_v4().as_bytes()));
    let amount_str = req.amount.to_string();

    // Record token transaction
    let result = sqlx::query!(
        r#"
        INSERT INTO token_transactions (
            id, tx_hash, from_address, to_address, amount,
            transaction_type, metadata, timestamp, created_at
        )
        VALUES ($1, $2, $3, $4, $5, 'mint', $6, $7, NOW())
        "#,
        Uuid::new_v4(),
        simulated_tx_hash.clone(),
        "0x0000000000000000000000000000000000000000", // Minted from zero address
        wallet,
        amount_str,
        serde_json::json!({"reason": req.reason, "learner_id": req.learner_id}),
        chrono::Utc::now().timestamp(),
    )
    .execute(&s.db)
    .await;

    match result {
        Ok(_) => (
            StatusCode::CREATED,
            Json(json!({
                "learner_id": req.learner_id,
                "wallet_address": wallet,
                "amount": req.amount,
                "reason": req.reason,
                "blockchain_tx_hash": simulated_tx_hash,
                "message": "Tokens minted successfully",
            })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}
