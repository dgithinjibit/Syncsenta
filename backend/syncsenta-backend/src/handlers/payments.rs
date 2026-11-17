use axum::{Router, routing::post};
use sqlx::PgPool;
use crate::config::AppConfig;

pub fn router(_db: PgPool, _cfg: AppConfig) -> Router {
    Router::new()
        .route("/mpesa/initiate", post(initiate_mpesa))
        .route("/mpesa/callback", post(mpesa_callback))
}

async fn initiate_mpesa() -> &'static str {
    "Payments: M-Pesa initiate endpoint (TODO - Daraja STK Push)"
}

async fn mpesa_callback() -> &'static str {
    "Payments: M-Pesa callback endpoint (TODO)"
}
