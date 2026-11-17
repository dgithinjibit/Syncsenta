//! Deterministic, privacy-safe attendance validation primitives.
//!
//! This module deliberately contains no model calls and no biometric logic. It
//! validates an already-authenticated teacher-issued attendance event before a
//! persistence adapter is allowed to write it.

use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AttendanceStatus {
    Present,
    Absent,
    Late,
    Excused,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AttendanceDecision {
    Accepted,
    Duplicate,
    Expired,
    InvalidToken,
    WrongClass,
    ConsentRequired,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AttendanceEvent {
    pub event_id: String,
    pub token_id: String,
    pub teacher_id: String,
    pub student_id: String,
    pub class_name: String,
    pub status: AttendanceStatus,
    pub issued_at_epoch_seconds: u64,
    pub expires_at_epoch_seconds: u64,
    pub consent_granted: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AttendanceLedgerRecord {
    pub event_id: String,
    pub event_digest: String,
    pub previous_digest: String,
    pub chain_digest: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AttendanceValidation {
    pub decision: AttendanceDecision,
    pub idempotency_key: String,
}

/// Validates a token-backed attendance event before persistence.
///
/// The caller supplies the current time, class assignment, and already-seen
/// event IDs so this function is deterministic and straightforward to test.
pub fn validate_event(
    event: &AttendanceEvent,
    now_epoch_seconds: u64,
    assigned_class: &str,
    seen_event_ids: &HashSet<String>,
) -> AttendanceValidation {
    let idempotency_key = format!("{}:{}", event.teacher_id, event.event_id);

    if event.event_id.trim().is_empty()
        || event.token_id.trim().is_empty()
        || event.teacher_id.trim().is_empty()
        || event.student_id.trim().is_empty()
        || event.class_name.trim().is_empty()
        || event.issued_at_epoch_seconds > event.expires_at_epoch_seconds
    {
        return AttendanceValidation {
            decision: AttendanceDecision::InvalidToken,
            idempotency_key,
        };
    }

    if !event.consent_granted {
        return AttendanceValidation {
            decision: AttendanceDecision::ConsentRequired,
            idempotency_key,
        };
    }

    if event.class_name != assigned_class {
        return AttendanceValidation {
            decision: AttendanceDecision::WrongClass,
            idempotency_key,
        };
    }

    if now_epoch_seconds > event.expires_at_epoch_seconds {
        return AttendanceValidation {
            decision: AttendanceDecision::Expired,
            idempotency_key,
        };
    }

    if seen_event_ids.contains(&event.event_id) {
        return AttendanceValidation {
            decision: AttendanceDecision::Duplicate,
            idempotency_key,
        };
    }

    AttendanceValidation {
        decision: AttendanceDecision::Accepted,
        idempotency_key,
    }
}

/// Creates a compact tamper-evident record from canonical event fields.
///
/// Creates the canonical SHA-256 digest used by the integrity record.
pub fn ledger_record(event: &AttendanceEvent, previous_digest: &str) -> AttendanceLedgerRecord {
    let canonical = format!(
        "{}|{}|{}|{}|{}|{}|{}|{}|{}",
        event.event_id,
        event.token_id,
        event.teacher_id,
        event.student_id,
        event.class_name,
        status_name(event.status),
        event.issued_at_epoch_seconds,
        event.expires_at_epoch_seconds,
        event.consent_granted
    );
    let event_digest = stable_digest(&canonical);
    let chain_digest = stable_digest(&format!("{}|{}", previous_digest, event_digest));
    AttendanceLedgerRecord {
        event_id: event.event_id.clone(),
        event_digest,
        previous_digest: previous_digest.to_owned(),
        chain_digest,
    }
}

fn status_name(status: AttendanceStatus) -> &'static str {
    match status {
        AttendanceStatus::Present => "present",
        AttendanceStatus::Absent => "absent",
        AttendanceStatus::Late => "late",
        AttendanceStatus::Excused => "excused",
    }
}

fn stable_digest(value: &str) -> String {
    let digest = Sha256::digest(value.as_bytes());
    digest.iter().map(|byte| format!("{byte:02x}")).collect()
}

pub fn unix_now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::from_secs(0))
        .as_secs()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn event() -> AttendanceEvent {
        AttendanceEvent {
            event_id: "evt-1".into(),
            token_id: "token-1".into(),
            teacher_id: "teacher-01".into(),
            student_id: "student-01".into(),
            class_name: "G5-A".into(),
            status: AttendanceStatus::Present,
            issued_at_epoch_seconds: 100,
            expires_at_epoch_seconds: 200,
            consent_granted: true,
        }
    }

    #[test]
    fn accepts_valid_event() {
        let result = validate_event(&event(), 150, "G5-A", &HashSet::new());
        assert_eq!(result.decision, AttendanceDecision::Accepted);
        assert_eq!(result.idempotency_key, "teacher-01:evt-1");
    }

    #[test]
    fn fails_closed_without_consent() {
        let mut e = event();
        e.consent_granted = false;
        assert_eq!(
            validate_event(&e, 150, "G5-A", &HashSet::new()).decision,
            AttendanceDecision::ConsentRequired
        );
    }

    #[test]
    fn rejects_expired_and_wrong_class_events() {
        assert_eq!(
            validate_event(&event(), 201, "G5-A", &HashSet::new()).decision,
            AttendanceDecision::Expired
        );
        assert_eq!(
            validate_event(&event(), 150, "G5-B", &HashSet::new()).decision,
            AttendanceDecision::WrongClass
        );
    }

    #[test]
    fn rejects_replayed_event_id() {
        let mut seen = HashSet::new();
        seen.insert("evt-1".into());
        assert_eq!(
            validate_event(&event(), 150, "G5-A", &seen).decision,
            AttendanceDecision::Duplicate
        );
    }

    #[test]
    fn ledger_chain_changes_when_previous_digest_changes() {
        let first = ledger_record(&event(), "GENESIS");
        let second = ledger_record(&event(), "different");
        assert_ne!(first.chain_digest, second.chain_digest);
        assert_eq!(first.event_digest, second.event_digest);
    }
}
