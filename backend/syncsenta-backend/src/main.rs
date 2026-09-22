mod config;
mod db;
mod routes;
mod middleware;
mod services;
mod handlers;
mod auth;
#[cfg(test)]
mod tests;

use axum::Router;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load .env
    dotenv::dotenv().ok();

    // Init tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "syncsenta_backend=debug,tower_http=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer().json())
        .init();

    // Load config
    let cfg = config::AppConfig::from_env()?;

    // Connect to DB
    let db_pool = db::connect(&cfg.database_url).await?;

    // Run migrations
    sqlx::migrate!("./migrations").run(&db_pool).await?;

    // Build router
    let app = Router::new()
        .nest("/api/v1", routes::all_routes(db_pool.clone(), cfg.clone()))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http());

    let addr = format!("0.0.0.0:{}", cfg.port);
    tracing::info!("SyncSenta backend listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
