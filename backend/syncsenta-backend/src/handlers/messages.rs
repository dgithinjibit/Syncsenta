use axum::{Router, routing::{get, post}};
use sqlx::PgPool;
use crate::config::AppConfig;

pub fn router(_db: PgPool, _cfg: AppConfig) -> Router {
    Router::new()
        .route("/", post(send_message))
        .route("/:conversation_id", get(get_messages))
}

async fn send_message() -> &'static str {
    "Messages: send endpoint (TODO)"
}

async fn get_messages() -> &'static str {
    "Messages: get conversation endpoint (TODO)"
}
