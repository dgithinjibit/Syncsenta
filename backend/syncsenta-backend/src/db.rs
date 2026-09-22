use sqlx::{postgres::PgPoolOptions, PgPool};
use anyhow::Result;

pub async fn connect(database_url: &str) -> Result<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .connect(database_url)
        .await?;
    tracing::info!("Connected to PostgreSQL");
    Ok(pool)
}
