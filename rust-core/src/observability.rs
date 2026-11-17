//! Privacy-safe operational observability contracts.
//!
//! Operational telemetry is intentionally separate from learner telemetry. This
//! module accepts only bounded, non-identifying dimensions and rejects values
//! that look like raw content, credentials, or direct learner identifiers.

const MAX_DIMENSIONS: usize = 8;
const MAX_VALUE_BYTES: usize = 128;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum OperationalEvent {
    RequestAccepted,
    RequestReviewed,
    RequestRejected,
    BackendUnavailable,
    OfflineFallback,
    SyncQueued,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SafeDimension {
    Role,
    Connectivity,
    Route,
    Outcome,
    ModelClass,
    ErrorClass,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SafeMetric {
    pub event: OperationalEvent,
    pub latency_ms: Option<u32>,
    pub dimensions: Vec<(SafeDimension, String)>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ObservabilityError {
    TooManyDimensions,
    ValueTooLong,
    SensitiveValue,
}

impl SafeMetric {
    pub fn validate(&self) -> Result<(), ObservabilityError> {
        if self.dimensions.len() > MAX_DIMENSIONS {
            return Err(ObservabilityError::TooManyDimensions);
        }
        for (_, value) in &self.dimensions {
            if value.len() > MAX_VALUE_BYTES {
                return Err(ObservabilityError::ValueTooLong);
            }
            let lower = value.to_ascii_lowercase();
            if lower.contains("student_id")
                || lower.contains("email")
                || lower.contains("token")
                || lower.contains("password")
                || lower.contains("prompt")
                || lower.contains("message")
            {
                return Err(ObservabilityError::SensitiveValue);
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn operational_metric_accepts_bounded_dimensions() {
        let metric = SafeMetric {
            event: OperationalEvent::OfflineFallback,
            latency_ms: Some(12),
            dimensions: vec![
                (SafeDimension::Role, "student".into()),
                (SafeDimension::Connectivity, "offline".into()),
                (SafeDimension::Route, "offline".into()),
            ],
        };
        assert_eq!(metric.validate(), Ok(()));
    }

    #[test]
    fn sensitive_values_are_rejected() {
        let metric = SafeMetric {
            event: OperationalEvent::RequestAccepted,
            latency_ms: None,
            dimensions: vec![(SafeDimension::Outcome, "student_id=123".into())],
        };
        assert_eq!(metric.validate(), Err(ObservabilityError::SensitiveValue));
    }

    #[test]
    fn dimension_count_is_bounded() {
        let metric = SafeMetric {
            event: OperationalEvent::RequestRejected,
            latency_ms: None,
            dimensions: vec![(SafeDimension::ErrorClass, "policy".into()); MAX_DIMENSIONS + 1],
        };
        assert_eq!(
            metric.validate(),
            Err(ObservabilityError::TooManyDimensions)
        );
    }

    #[test]
    fn long_values_are_rejected_without_truncation() {
        let metric = SafeMetric {
            event: OperationalEvent::SyncQueued,
            latency_ms: None,
            dimensions: vec![(SafeDimension::Outcome, "x".repeat(MAX_VALUE_BYTES + 1))],
        };
        assert_eq!(metric.validate(), Err(ObservabilityError::ValueTooLong));
    }
}
