use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Authentication failed: {0}")]
    AuthError(String),

    #[error("Authorization denied: {0}")]
    ForbiddenError(String),

    #[error("Resource not found: {0}")]
    NotFound(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("External service error: {0}")]
    ExternalServiceError(String),

    #[error("Payment error: {0}")]
    PaymentError(String),

    #[error("Sync conflict: {0}")]
    SyncConflict(String),

    #[error("Internal error: {0}")]
    InternalError(String),
}
