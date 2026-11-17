use axum::{Router, routing::{get, post}};
use sqlx::PgPool;
use crate::config::AppConfig;

pub fn router(_db: PgPool, _cfg: AppConfig) -> Router {
    Router::new()
        .route("/", post(create_classroom))
        .route("/:id/join", get(join_classroom))
        .route("/webhook", post(jitsi_webhook))
}

async fn create_classroom() -> &'static str {
    "Classrooms: create endpoint (TODO - Jitsi JWT)"
}

async fn join_classroom() -> &'static str {
    "Classrooms: join endpoint (TODO)"
}

async fn jitsi_webhook() -> &'static str {
    "Classrooms: Jitsi webhook (TODO - attendance tracking)"
}
