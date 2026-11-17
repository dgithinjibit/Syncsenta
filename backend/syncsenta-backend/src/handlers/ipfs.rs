//! IPFS content handlers
//!
//! Routes:
//! - GET  /api/ipfs/:cid        — retrieve content by CID (with Redis caching)
//! - POST /api/ipfs/upload      — upload content to IPFS
//! - GET  /api/ipfs/:cid/info   — get metadata for a CID

use axum::{
    body::Body,
    extract::{Extension, Multipart, Path, State},
    http::{header, StatusCode},
    response::Response,
    routing::{get, post},
    Json, Router,
};
use serde_json::{json, Value};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    config::AppConfig,
    middleware::auth::AuthUser,
    services::ipfs::{
        compute_content_hash, retrieve_from_ipfs, store_ipfs_record, upload_to_ipfs, IPFSConfig,
    },
};

#[derive(Clone)]
pub struct IPFSState {
    pub db: PgPool,
    pub config: AppConfig,
}

pub fn router(db: PgPool, cfg: AppConfig) -> Router {
    let state = IPFSState { db, config: cfg };
    Router::new()
        .route("/:cid", get(retrieve_content))
        .route("/:cid/info", get(get_content_info))
        .route("/upload", post(upload_content))
        .with_state(state)
}

// ─── GET /api/ipfs/:cid ───────────────────────────────────────────────────────

async fn retrieve_content(
    State(s): State<IPFSState>,
    Path(cid): Path<String>,
) -> Response {
    let ipfs_config = IPFSConfig::from_env();
    match retrieve_from_ipfs(&ipfs_config, &cid).await {
        Ok(data) => Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, "application/octet-stream")
            .header("X-IPFS-CID", &cid)
            .body(Body::from(data))
            .unwrap_or_else(|_| Response::new(Body::empty())),
        Err(e) => Response::builder()
            .status(StatusCode::NOT_FOUND)
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(
                serde_json::to_string(&json!({"error": format!("Content not found: {}", e)}))
                    .unwrap_or_default(),
            ))
            .unwrap_or_else(|_| Response::new(Body::empty())),
    }
}

// ─── GET /api/ipfs/:cid/info ──────────────────────────────────────────────────

async fn get_content_info(
    State(s): State<IPFSState>,
    Path(cid): Path<String>,
) -> (StatusCode, Json<Value>) {
    let result = sqlx::query!(
        r#"
        SELECT id, cid, filename, mime_type, size_bytes,
               uploaded_by, pinned, pinning_service, created_at
        FROM ipfs_content
        WHERE cid = $1
        "#,
        cid
    )
    .fetch_optional(&s.db)
    .await;

    match result {
        Ok(Some(row)) => (
            StatusCode::OK,
            Json(json!({
                "id": row.id,
                "cid": row.cid,
                "filename": row.filename,
                "mime_type": row.mime_type,
                "size_bytes": row.size_bytes,
                "uploaded_by": row.uploaded_by,
                "pinned": row.pinned,
                "pinning_service": row.pinning_service,
                "created_at": row.created_at,
                "gateway_url": format!("https://ipfs.io/ipfs/{}", row.cid),
            })),
        ),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(json!({"error": "Content not found in registry"})),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}

// ─── POST /api/ipfs/upload ────────────────────────────────────────────────────

async fn upload_content(
    State(s): State<IPFSState>,
    Extension(AuthUser(claims)): Extension<AuthUser>,
    mut multipart: Multipart,
) -> (StatusCode, Json<Value>) {
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid token"}))),
    };

    let mut file_data: Option<Vec<u8>> = None;
    let mut filename = "upload".to_string();
    let mut mime_type = "application/octet-stream".to_string();

    while let Ok(Some(field)) = multipart.next_field().await {
        if field.name() == Some("file") {
            filename = field.file_name().unwrap_or("upload").to_string();
            mime_type = field
                .content_type()
                .unwrap_or("application/octet-stream")
                .to_string();
            match field.bytes().await {
                Ok(bytes) => file_data = Some(bytes.to_vec()),
                Err(e) => {
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(json!({"error": format!("Failed to read file: {}", e)})),
                    )
                }
            }
        }
    }

    let data = match file_data {
        Some(d) => d,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "No file provided"})),
            )
        }
    };

    let content_hash = compute_content_hash(&data);
    let ipfs_config = IPFSConfig::from_env();

    match upload_to_ipfs(&ipfs_config, data, &filename, &mime_type).await {
        Ok(result) => {
            match store_ipfs_record(&s.db, user_id, &result, &filename, &mime_type).await {
                Ok(record_id) => (
                    StatusCode::CREATED,
                    Json(json!({
                        "id": record_id,
                        "cid": result.cid,
                        "filename": filename,
                        "mime_type": mime_type,
                        "size_bytes": result.size_bytes,
                        "pinned": result.pinned,
                        "gateway_url": result.gateway_url,
                        "content_hash": content_hash,
                    })),
                ),
                Err(e) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"error": e.to_string()})),
                ),
            }
        }
        Err(e) => (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error": format!("IPFS upload failed: {}", e)})),
        ),
    }
}
