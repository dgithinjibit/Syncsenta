/// Example demonstrating RBAC middleware usage
/// This file shows how to use the with_roles() middleware in various scenarios
///
/// Note: This is an example file and not meant to be compiled directly.
/// It demonstrates the patterns for using RBAC middleware in the actual application.

use axum::{
    extract::Extension,
    http::StatusCode,
    middleware,
    response::Json,
    routing::{get, post},
    Router,
};
use serde_json::{json, Value};
use sqlx::PgPool;

// Import the RBAC middleware
use crate::middleware::auth::{require_auth, AuthUser};
use crate::middleware::rbac::with_roles;
use syncsenta_common::models::UserRole;

// ─── Example 1: Single Role Protection ──────────────────────────────────────

async fn teacher_dashboard(Extension(AuthUser(claims)): Extension<AuthUser>) -> Json<Value> {
    Json(json!({
        "message": "Welcome to teacher dashboard",
        "user_id": claims.sub,
        "role": format!("{:?}", claims.role),
    }))
}

pub fn teacher_routes() -> Router {
    Router::new()
        .route("/dashboard", get(teacher_dashboard))
        // Only teachers can access this route
        .route_layer(with_roles(vec![UserRole::Teacher]))
}

// ─── Example 2: Multiple Roles Protection ───────────────────────────────────

async fn admin_panel(Extension(AuthUser(claims)): Extension<AuthUser>) -> Json<Value> {
    Json(json!({
        "message": "Admin panel",
        "user_id": claims.sub,
        "role": format!("{:?}", claims.role),
    }))
}

pub fn admin_routes() -> Router {
    Router::new()
        .route("/panel", get(admin_panel))
        // Multiple admin roles can access
        .route_layer(with_roles(vec![
            UserRole::SchoolAdmin,
            UserRole::SchoolHead,
            UserRole::CountyOfficer,
            UserRole::NationalAdmin,
        ]))
}

// ─── Example 3: Hierarchical Access ─────────────────────────────────────────

async fn view_analytics(Extension(AuthUser(claims)): Extension<AuthUser>) -> Json<Value> {
    // Handler logic here - user is already authorized by middleware
    Json(json!({
        "analytics": "data",
        "scope": match claims.role {
            UserRole::Teacher => "class",
            UserRole::SchoolHead => "school",
            UserRole::CountyOfficer => "county",
            UserRole::NationalAdmin => "national",
            _ => "none",
        },
    }))
}

pub fn analytics_routes() -> Router {
    Router::new()
        .route("/view", get(view_analytics))
        // Teachers and above can view analytics
        .route_layer(with_roles(vec![
            UserRole::Teacher,
            UserRole::SchoolAdmin,
            UserRole::SchoolHead,
            UserRole::CountyOfficer,
            UserRole::NationalAdmin,
        ]))
}

// ─── Example 4: Different Permissions for Different Methods ─────────────────

async fn list_content() -> Json<Value> {
    Json(json!({"content": ["item1", "item2"]}))
}

async fn create_content(Extension(AuthUser(claims)): Extension<AuthUser>) -> Json<Value> {
    Json(json!({
        "message": "Content created",
        "created_by": claims.sub,
    }))
}

async fn delete_content(Extension(AuthUser(claims)): Extension<AuthUser>) -> Json<Value> {
    Json(json!({
        "message": "Content deleted",
        "deleted_by": claims.sub,
    }))
}

pub fn content_routes() -> Router {
    // Anyone authenticated can list content
    let list_routes = Router::new().route("/", get(list_content));

    // Only teachers can create content
    let create_routes = Router::new()
        .route("/", post(create_content))
        .route_layer(with_roles(vec![UserRole::Teacher]));

    // Only admins can delete content
    let delete_routes = Router::new()
        .route("/:id", axum::routing::delete(delete_content))
        .route_layer(with_roles(vec![
            UserRole::SchoolAdmin,
            UserRole::SchoolHead,
            UserRole::NationalAdmin,
        ]));

    Router::new()
        .merge(list_routes)
        .merge(create_routes)
        .merge(delete_routes)
}

// ─── Example 5: Nested Routes with Different Permissions ────────────────────

pub fn school_management_routes() -> Router {
    // Student management - School Head and above
    let student_routes = Router::new()
        .route("/students", get(|| async { "list students" }))
        .route("/students", post(|| async { "enroll student" }))
        .route_layer(with_roles(vec![
            UserRole::SchoolHead,
            UserRole::CountyOfficer,
            UserRole::NationalAdmin,
        ]));

    // Staff management - School Head and above
    let staff_routes = Router::new()
        .route("/staff", get(|| async { "list staff" }))
        .route("/staff", post(|| async { "add staff" }))
        .route_layer(with_roles(vec![
            UserRole::SchoolHead,
            UserRole::CountyOfficer,
            UserRole::NationalAdmin,
        ]));

    // Fee management - School Admin and above
    let fee_routes = Router::new()
        .route("/fees", get(|| async { "list fees" }))
        .route("/fees", post(|| async { "record payment" }))
        .route_layer(with_roles(vec![
            UserRole::SchoolAdmin,
            UserRole::SchoolHead,
            UserRole::CountyOfficer,
            UserRole::NationalAdmin,
        ]));

    Router::new()
        .nest("/students", student_routes)
        .nest("/staff", staff_routes)
        .nest("/fees", fee_routes)
}

// ─── Example 6: Complete Application Structure ──────────────────────────────

pub fn build_app(db: PgPool, jwt_secret: String) -> Router {
    // Public routes (no authentication required)
    let public_routes = Router::new()
        .route("/health", get(|| async { "OK" }))
        .route("/login", post(|| async { "login handler" }));

    // Protected routes (authentication required, no specific role)
    let authenticated_routes = Router::new()
        .route("/profile", get(|| async { "user profile" }))
        .route("/settings", get(|| async { "user settings" }))
        .layer(middleware::from_fn_with_state(
            jwt_secret.clone(),
            require_auth,
        ));

    // Role-specific routes (authentication + specific roles required)
    let teacher_protected = teacher_routes().layer(middleware::from_fn_with_state(
        jwt_secret.clone(),
        require_auth,
    ));

    let admin_protected = admin_routes().layer(middleware::from_fn_with_state(
        jwt_secret.clone(),
        require_auth,
    ));

    let analytics_protected = analytics_routes().layer(middleware::from_fn_with_state(
        jwt_secret.clone(),
        require_auth,
    ));

    // Combine all routes
    Router::new()
        .merge(public_routes)
        .merge(authenticated_routes)
        .nest("/teacher", teacher_protected)
        .nest("/admin", admin_protected)
        .nest("/analytics", analytics_protected)
        .with_state(db)
}

// ─── Example 7: Error Handling ──────────────────────────────────────────────

/// Example showing what happens when authorization fails
///
/// When a user without the required role tries to access a protected route:
///
/// Request:
/// GET /admin/panel
/// Authorization: Bearer <valid_jwt_for_student>
///
/// Response:
/// Status: 403 Forbidden
/// Body:
/// {
///   "error": "Insufficient permissions",
///   "required_roles": ["SchoolAdmin", "SchoolHead", "CountyOfficer", "NationalAdmin"]
/// }
///
/// When a user without authentication tries to access a protected route:
///
/// Request:
/// GET /admin/panel
/// (no Authorization header)
///
/// Response:
/// Status: 401 Unauthorized
/// Body:
/// {
///   "error": "Not authenticated"
/// }

// ─── Example 8: Testing RBAC Protected Routes ───────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    /// Example of how to test RBAC-protected routes
    /// Note: Actual tests would require proper test setup with database, etc.
    #[tokio::test]
    async fn example_test_authorized_access() {
        // This is a conceptual example showing the test structure
        // Actual implementation would require:
        // 1. Test database setup
        // 2. Creating a valid JWT token for a Teacher
        // 3. Making a request to the protected route
        // 4. Asserting the response is 200 OK

        // let app = build_test_app();
        // let token = create_test_token(UserRole::Teacher);
        // let response = app
        //     .oneshot(
        //         Request::builder()
        //             .uri("/teacher/dashboard")
        //             .header("Authorization", format!("Bearer {}", token))
        //             .body(Body::empty())
        //             .unwrap(),
        //     )
        //     .await
        //     .unwrap();
        //
        // assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn example_test_unauthorized_access() {
        // This is a conceptual example showing the test structure
        // Actual implementation would test that a Student cannot access Teacher routes

        // let app = build_test_app();
        // let token = create_test_token(UserRole::Student);
        // let response = app
        //     .oneshot(
        //         Request::builder()
        //             .uri("/teacher/dashboard")
        //             .header("Authorization", format!("Bearer {}", token))
        //             .body(Body::empty())
        //             .unwrap(),
        //     )
        //     .await
        //     .unwrap();
        //
        // assert_eq!(response.status(), StatusCode::FORBIDDEN);
    }
}
