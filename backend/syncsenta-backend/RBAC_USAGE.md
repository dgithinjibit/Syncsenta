# RBAC Middleware Usage Guide

## Overview

The Role-Based Access Control (RBAC) middleware provides a Tower middleware layer for Axum routes that checks user roles against required roles and returns a 403 Forbidden error with a structured JSON response for unauthorized access.

## Implementation

The RBAC middleware is implemented in `src/middleware/rbac.rs` and provides two main functions:

1. `require_role()` - The core middleware function that checks roles
2. `with_roles()` - A convenience function to create middleware layers

## Requirements Validated

- **Requirement 1.9**: Role-based permissions are consistent and enforced
- **Requirement 20.3**: Authentication service enforces role-based access control

## Usage Examples

### Basic Usage - Single Route

```rust
use axum::{Router, routing::get};
use syncsenta_common::models::UserRole;
use crate::middleware::rbac::with_roles;

// Protect a single route - only Teachers can access
let app = Router::new()
    .route("/teacher-dashboard", get(teacher_dashboard_handler))
    .route_layer(with_roles(vec![UserRole::Teacher]));
```

### Multiple Roles

```rust
// Allow multiple roles to access a route
let app = Router::new()
    .route("/admin-panel", get(admin_panel_handler))
    .route_layer(with_roles(vec![
        UserRole::SchoolAdmin,
        UserRole::SchoolHead,
        UserRole::NationalAdmin,
    ]));
```

### Nested Routes with Different Permissions

```rust
use axum::{Router, routing::{get, post}};

// Create separate routers for different permission levels
let teacher_routes = Router::new()
    .route("/schemes", get(list_schemes))
    .route("/schemes", post(create_scheme))
    .route_layer(with_roles(vec![UserRole::Teacher]));

let admin_routes = Router::new()
    .route("/users", get(list_users))
    .route("/users/:id", post(update_user))
    .route_layer(with_roles(vec![
        UserRole::SchoolAdmin,
        UserRole::SchoolHead,
    ]));

// Combine them
let app = Router::new()
    .nest("/teacher", teacher_routes)
    .nest("/admin", admin_routes);
```

### Complete Example with Authentication

```rust
use axum::{middleware, Router, routing::get};
use crate::middleware::auth::require_auth;
use crate::middleware::rbac::with_roles;

pub fn protected_routes(db: PgPool, cfg: AppConfig) -> Router {
    // Routes requiring authentication but no specific role
    let authenticated = Router::new()
        .route("/profile", get(get_profile))
        .layer(middleware::from_fn_with_state(
            cfg.jwt_secret.clone(),
            require_auth,
        ));

    // Routes requiring specific roles
    let teacher_only = Router::new()
        .route("/classes", get(list_classes))
        .route_layer(with_roles(vec![UserRole::Teacher]))
        .layer(middleware::from_fn_with_state(
            cfg.jwt_secret.clone(),
            require_auth,
        ));

    Router::new()
        .merge(authenticated)
        .merge(teacher_only)
}
```

## Response Format

### Success (200 OK)

When the user has the required role, the request proceeds to the handler normally.

### Unauthorized (401 Unauthorized)

When no authentication is present:

```json
{
  "error": "Not authenticated"
}
```

### Forbidden (403 Forbidden)

When the user is authenticated but doesn't have the required role:

```json
{
  "error": "Insufficient permissions",
  "required_roles": ["Teacher", "SchoolAdmin"]
}
```

## Implementation Details

### How It Works

1. The middleware extracts the `AuthUser` extension from the request (injected by `require_auth` middleware)
2. It checks if the user's role is in the list of allowed roles
3. If authorized, the request proceeds to the next middleware/handler
4. If unauthorized, it returns a 403 response with structured error details

### Middleware Order

**IMPORTANT**: The RBAC middleware must be applied AFTER the authentication middleware:

```rust
// ✅ CORRECT - auth first, then RBAC
Router::new()
    .route("/protected", get(handler))
    .route_layer(with_roles(vec![UserRole::Teacher]))  // Second
    .layer(middleware::from_fn_with_state(
        jwt_secret,
        require_auth,  // First
    ));

// ❌ WRONG - RBAC before auth won't work
Router::new()
    .route("/protected", get(handler))
    .layer(middleware::from_fn_with_state(
        jwt_secret,
        require_auth,
    ))
    .route_layer(with_roles(vec![UserRole::Teacher]));
```

## Role Hierarchy

The system supports seven user roles in a hierarchical structure:

1. **Student** - Basic learner access
2. **Parent** - Access to linked student information
3. **Teacher** - Content creation and class management
4. **SchoolAdmin** - School-level administration
5. **SchoolHead** - School leadership and approvals
6. **CountyOfficer** - County-level oversight
7. **NationalAdmin** - System-wide administration

## Testing

Unit tests for the RBAC middleware are located in `src/tests/rbac_tests.rs`. Run them with:

```bash
cargo test --package syncsenta-backend rbac_unit_tests
```

## Common Patterns

### Admin-Only Routes

```rust
let admin_only = vec![
    UserRole::SchoolAdmin,
    UserRole::SchoolHead,
    UserRole::CountyOfficer,
    UserRole::NationalAdmin,
];

Router::new()
    .route("/admin", get(admin_handler))
    .route_layer(with_roles(admin_only));
```

### Privileged Roles (MFA Required)

```rust
let privileged = vec![
    UserRole::SchoolAdmin,
    UserRole::SchoolHead,
    UserRole::CountyOfficer,
    UserRole::NationalAdmin,
];

Router::new()
    .route("/sensitive", get(sensitive_handler))
    .route_layer(with_roles(privileged));
```

### Teacher and Above

```rust
let teacher_and_above = vec![
    UserRole::Teacher,
    UserRole::SchoolAdmin,
    UserRole::SchoolHead,
    UserRole::CountyOfficer,
    UserRole::NationalAdmin,
];

Router::new()
    .route("/content", post(create_content))
    .route_layer(with_roles(teacher_and_above));
```

## Security Considerations

1. **Always use with authentication**: The RBAC middleware requires the `AuthUser` extension to be present, which is injected by the `require_auth` middleware.

2. **Fail-safe defaults**: If no `AuthUser` extension is found, the middleware returns 401 Unauthorized.

3. **Explicit role lists**: Always explicitly list the allowed roles rather than using implicit hierarchies.

4. **Audit logging**: Consider adding audit logging for authorization failures in production.

## Future Enhancements

Potential improvements for the RBAC system:

- [ ] Permission-based access control (PBAC) in addition to roles
- [ ] Dynamic role assignment and permission updates
- [ ] Role inheritance and hierarchical permissions
- [ ] Audit logging integration for authorization events
- [ ] Rate limiting per role
- [ ] Resource-level permissions (e.g., "can edit own content only")
