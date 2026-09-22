use axum::{Router, routing::post};
use sqlx::PgPool;
use crate::config::AppConfig;

pub fn router(_db: PgPool, _cfg: AppConfig) -> Router {
    Router::new()
        .route("/pull", post(sync_pull))
        .route("/push", post(sync_push))
        .route("/flush", post(sync_flush))
}

async fn sync_pull() -> &'static str {
    "Sync: pull endpoint (TODO - integrate Syncsenta_local)"
}

async fn sync_push() -> &'static str {
    "Sync: push endpoint (TODO)"
}

async fn sync_flush() -> &'static str {
    "Sync: flush offline queue (TODO)"
}
