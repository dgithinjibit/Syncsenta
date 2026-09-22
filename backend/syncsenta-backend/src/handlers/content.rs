use axum::{Router, routing::{get, post}};
use sqlx::PgPool;
use crate::config::AppConfig;

pub fn router(_db: PgPool, _cfg: AppConfig) -> Router {
    Router::new()
        .route("/upload", post(upload_content))
        .route("/search", get(search_content))
}

async fn upload_content() -> &'static str {
    "Content: upload endpoint (TODO - S3 storage)"
}

async fn search_content() -> &'static str {
    "Content: search endpoint (TODO - full-text search)"
}
