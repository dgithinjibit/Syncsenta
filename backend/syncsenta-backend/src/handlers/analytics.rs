use axum::{Router, routing::get};
use sqlx::PgPool;
use crate::config::AppConfig;

pub fn router(_db: PgPool, _cfg: AppConfig) -> Router {
    Router::new()
        .route("/students/:id", get(student_analytics))
        .route("/classes/:id", get(class_analytics))
}

async fn student_analytics() -> &'static str {
    "Analytics: student endpoint (TODO)"
}

async fn class_analytics() -> &'static str {
    "Analytics: class endpoint (TODO)"
}
