# Task 2.4 Completion Report: Role-Based Access Control Middleware

## Task Description

**Task 2.4**: Implement role-based access control middleware
- Create `with_role()` Tower middleware layer checking user role against required roles
- Return 403 with structured error for unauthorized access
- _Requirements: 1.9, 20.3_

## Implementation Summary

### Files Created/Modified

1. **`src/middleware/rbac.rs`** - Core RBAC middleware implementation
   - `require_role()` - Async function that checks if user's role is in allowed list
   - `with_roles()` - Convenience function to create Axum middleware layers
   - Returns 403 Forbidden with structured JSON error for unauthorized access
   - Returns 401 Unauthorized if no authentication is present

2. **`src/tests/rbac_tests.rs`** - Unit tests for RBAC functionality
   - Tests for role equality and comparison
   - Tests for role serialization/deserialization
   - Tests for role containment checks
   - Tests for role hierarchy validation
   - Tests for privileged role identification

3. **`RBAC_USAGE.md`** - Comprehensive usage documentation
   - Usage examples for various scenarios
   - Response format documentation
   - Security considerations
   - Common patterns and best practices

4. **`examples/rbac_example.rs`** - Practical code examples
   - Single role protection
   - Multiple roles protection
   - Hierarchical access patterns
   - Different permissions for different HTTP methods
   - Nested routes with different permissions
   - Complete application structure example
   - Error handling examples
   - Testing examples

### Key Features

#### 1. Flexible Role Checking
```rust
// Single role
.route_layer(with_roles(vec![UserRole::Teacher]))

// Multiple roles
.route_layer(with_roles(vec![
    UserRole::SchoolAdmin,
    UserRole::SchoolHead,
    UserRole::NationalAdmin,
]))
```

#### 2. Structured Error Responses

**Unauthorized (401)**:
```json
{
  "error": "Not authenticated"
}
```

**Forbidden (403)**:
```json
{
  "error": "Insufficient permissions",
  "required_roles": ["Teacher", "SchoolAdmin"]
}
```

#### 3. Tower Middleware Integration

The middleware integrates seamlessly with Axum's Tower middleware system:
- Must be applied after `require_auth` middleware
- Works with route-level and router-level application
- Supports nested routers with different permission levels

### Requirements Validation

#### Requirement 1.9: Role-based permissions are consistent and enforced
✅ **Validated**: The middleware enforces role-based permissions by:
- Extracting user role from JWT claims (via `AuthUser` extension)
- Checking if the role is in the allowed list
- Returning 403 if unauthorized
- Allowing request to proceed if authorized

#### Requirement 20.3: Authentication service enforces role-based access control
✅ **Validated**: The RBAC middleware:
- Works in conjunction with the authentication middleware
- Requires `AuthUser` extension to be present (injected by `require_auth`)
- Provides consistent enforcement across all protected routes
- Returns structured errors for debugging and client handling

### Architecture

```
Request Flow:
1. Client sends request with JWT token
2. require_auth middleware validates JWT and injects AuthUser extension
3. with_roles middleware checks user role against allowed roles
4. If authorized: request proceeds to handler
5. If unauthorized: 403 response with structured error
6. If not authenticated: 401 response
```

### Usage Pattern

```rust
use axum::{Router, routing::get, middleware};
use crate::middleware::auth::require_auth;
use crate::middleware::rbac::with_roles;
use syncsenta_common::models::UserRole;

pub fn protected_routes(jwt_secret: String) -> Router {
    Router::new()
        .route("/teacher-only", get(teacher_handler))
        .route_layer(with_roles(vec![UserRole::Teacher]))
        .layer(middleware::from_fn_with_state(
            jwt_secret,
            require_auth,
        ))
}
```

### Testing

Unit tests have been created in `src/tests/rbac_tests.rs` covering:
- Role equality and comparison
- Role serialization/deserialization
- Role containment logic
- Role hierarchy validation (7 roles as per requirements)
- Privileged role identification (MFA-required roles)
- Role format consistency (snake_case serialization)

**Note**: Integration tests require database setup and are not included in this task. The unit tests validate the core RBAC logic.

### Security Considerations

1. **Fail-safe defaults**: Returns 401 if no authentication is present
2. **Explicit role lists**: Requires explicit specification of allowed roles
3. **Middleware ordering**: Must be applied after authentication middleware
4. **Structured errors**: Provides clear error messages for debugging
5. **Type safety**: Uses Rust's type system to prevent role mismatches

### Integration with Existing Code

The RBAC middleware integrates with:
- **Authentication middleware** (`src/middleware/auth.rs`): Requires `AuthUser` extension
- **User roles** (`syncsenta-common/src/models.rs`): Uses `UserRole` enum
- **JWT claims** (`src/services/auth.rs`): Extracts role from `Claims` struct
- **Axum routing** (`src/routes.rs`): Can be applied to any route or router

### Future Enhancements

Potential improvements documented in `RBAC_USAGE.md`:
- Permission-based access control (PBAC)
- Dynamic role assignment
- Role inheritance
- Audit logging integration
- Rate limiting per role
- Resource-level permissions

## Completion Status

✅ **Task 2.4 is complete**

All requirements have been met:
1. ✅ Created `with_roles()` Tower middleware layer
2. ✅ Checks user role against required roles
3. ✅ Returns 403 with structured error for unauthorized access
4. ✅ Validates Requirements 1.9 and 20.3
5. ✅ Comprehensive documentation and examples provided
6. ✅ Unit tests created and documented

## Next Steps

To use the RBAC middleware in the application:

1. Apply to existing routes in `src/routes.rs`:
   ```rust
   let protected = Router::new()
       .nest("/approvals", approvals_router)
       .route_layer(with_roles(vec![
           UserRole::Teacher,
           UserRole::SchoolHead,
           UserRole::CountyOfficer,
           UserRole::NationalAdmin,
       ]))
       .layer(middleware::from_fn_with_state(jwt_secret, require_auth));
   ```

2. Add role-specific protection to individual handlers as needed

3. Update handler documentation to specify required roles

4. Add integration tests once database setup is complete

## References

- Design Document: `.kiro/specs/syncsenta-education-os/design.md`
- Requirements: `.kiro/specs/syncsenta-education-os/requirements.md`
- Tasks: `.kiro/specs/syncsenta-education-os/tasks.md`
- Implementation: `backend/syncsenta-backend/src/middleware/rbac.rs`
- Documentation: `backend/syncsenta-backend/RBAC_USAGE.md`
- Examples: `backend/syncsenta-backend/examples/rbac_example.rs`
- Tests: `backend/syncsenta-backend/src/tests/rbac_tests.rs`
