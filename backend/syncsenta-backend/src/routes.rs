use axum::{middleware, Router};
use sqlx::PgPool;
use std::sync::Arc;

use crate::config::AppConfig;
use crate::middleware::auth::require_auth;
use crate::metta_core::{MettaInterpreter, OmegaClawRules};

pub fn all_routes(db: PgPool, cfg: AppConfig) -> Router {
    // MVP slice — no auth, in-memory roster + broadcast + WS. Mounted under
    // /api/v1/mvp so it sits alongside the auth-gated production routes.
    let mvp_state = crate::handlers::mvp::build_state(&cfg);
    let mvp = Router::new().nest("/mvp", crate::handlers::mvp::router(mvp_state));
    let omega_interpreter = MettaInterpreter::new().expect("initialize Omega Claw MeTTa interpreter");
    let omega_rules = Arc::new(OmegaClawRules::with_space(
        omega_interpreter.global_space().clone(),
    ));

    // Public routes (no auth required)
    let public = Router::new()
        .nest("/auth", crate::handlers::auth::router(db.clone(), cfg.clone()));

    // STUDENT-FOCUSED BUILD: Only student-related protected routes
    let protected = Router::new()
        .nest("/assessments", crate::handlers::assessments::router(db.clone(), cfg.clone()))
        .nest("/mwalimu", crate::handlers::mwalimu::router(db.clone(), cfg.clone()))
        .nest("/omega-claw", crate::handlers::omega_claw::router(omega_rules))
        // COMMENTED OUT: Non-student routes for later implementation
        // .nest("/approvals", crate::handlers::approvals::router(db.clone(), cfg.clone()))
        // .nest("/blockchain", crate::handlers::blockchain::router(db.clone(), cfg.clone()))
        // .nest("/tokens", crate::handlers::tokens::router(db.clone(), cfg.clone()))
        // .nest("/ipfs", crate::handlers::ipfs::router(db.clone(), cfg.clone()))
        // .nest("/schemes", crate::handlers::schemes::router(db.clone(), cfg.clone()))
        // .nest("/classrooms", crate::handlers::classrooms::router(db.clone(), cfg.clone()))
        // .nest("/payments", crate::handlers::payments::router(db.clone(), cfg.clone()))
        // .nest("/analytics", crate::handlers::analytics::router(db.clone(), cfg.clone()))
        // .nest("/content", crate::handlers::content::router(db.clone(), cfg.clone()))
        // .nest("/sync", crate::handlers::sync::router(db.clone(), cfg.clone()))
        // .nest("/messages", crate::handlers::messages::router(db.clone(), cfg.clone()))
        .layer(middleware::from_fn_with_state(
            cfg.jwt_secret.clone(),
            require_auth,
        ));

    Router::new()
        .merge(mvp)
        .merge(public)
        .merge(protected)
}
