//! Authenticated Supabase notification adapter boundary.
//!
//! The adapter is deliberately transport-neutral: the production HTTP client
//! implements the trait, while Rust enforces recipient scope, schema readiness,
//! consent, and payload contracts before any Supabase write is attempted.

use crate::head_progress::{HeadProgressNotification, ProgressBand};
use crate::parent_report::ParentPerformanceReport;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum NotificationKind {
    HeadProgress,
    ParentPerformance,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NotificationReceipt {
    pub notification_id: String,
    pub kind: NotificationKind,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AuthenticatedRecipient {
    pub user_id: String,
    pub role: &'static str,
    pub school_name: Option<String>,
    pub linked_child: bool,
    pub consent_granted: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AdapterError {
    SchemaUnavailable,
    MissingRecipient,
    WrongRole,
    SchoolScopeMismatch,
    ConsentRequired,
    InvalidPayload,
}

pub trait SupabaseNotificationTransport {
    fn schema_ready(&self) -> bool;
    fn insert_notification(
        &mut self,
        recipient: &AuthenticatedRecipient,
        kind: NotificationKind,
        payload: NotificationPayload,
    ) -> Result<NotificationReceipt, AdapterError>;
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum NotificationPayload {
    HeadProgress {
        school_name: String,
        learner_count: u32,
        progress_band: ProgressBand,
        metric: String,
    },
    ParentPerformance {
        child_reference: String,
        school_name: String,
        subject: String,
        mastery_percent: u8,
        band: String,
        teacher_feedback_summary: Option<String>,
        next_step: String,
    },
}

pub fn publish_head_progress<T: SupabaseNotificationTransport>(
    transport: &mut T,
    recipient: &AuthenticatedRecipient,
    notification: &HeadProgressNotification,
) -> Result<NotificationReceipt, AdapterError> {
    ensure_ready(transport, recipient)?;
    if recipient.role != "head_of_school" && recipient.role != "admin" {
        return Err(AdapterError::WrongRole);
    }
    if recipient.school_name.as_deref() != Some(notification.school_name.as_str()) {
        return Err(AdapterError::SchoolScopeMismatch);
    }
    transport.insert_notification(
        recipient,
        NotificationKind::HeadProgress,
        NotificationPayload::HeadProgress {
            school_name: notification.school_name.clone(),
            learner_count: notification.learner_count,
            progress_band: notification.progress_band,
            metric: notification.metric.clone(),
        },
    )
}

pub fn publish_parent_performance<T: SupabaseNotificationTransport>(
    transport: &mut T,
    recipient: &AuthenticatedRecipient,
    report: &ParentPerformanceReport,
) -> Result<NotificationReceipt, AdapterError> {
    ensure_ready(transport, recipient)?;
    if recipient.role != "parent" {
        return Err(AdapterError::WrongRole);
    }
    report
        .validate_for_delivery(recipient.linked_child, recipient.consent_granted)
        .map_err(|_| AdapterError::InvalidPayload)?;
    transport.insert_notification(
        recipient,
        NotificationKind::ParentPerformance,
        NotificationPayload::ParentPerformance {
            child_reference: report.child_reference.clone(),
            school_name: report.school_name.clone(),
            subject: report.subject.clone(),
            mastery_percent: report.mastery_percent,
            band: format!("{:?}", report.band),
            teacher_feedback_summary: report.teacher_feedback_summary.clone(),
            next_step: report.next_step.clone(),
        },
    )
}

fn ensure_ready<T: SupabaseNotificationTransport>(
    transport: &T,
    recipient: &AuthenticatedRecipient,
) -> Result<(), AdapterError> {
    if !transport.schema_ready() {
        return Err(AdapterError::SchemaUnavailable);
    }
    if recipient.user_id.trim().is_empty() {
        return Err(AdapterError::MissingRecipient);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::head_progress::{build_head_progress_notification, HeadProgressRequest};
    use crate::parent_report::{ParentPerformanceReport, ParentReportBand};
    use crate::Role;

    #[derive(Default)]
    struct FakeTransport {
        ready: bool,
        inserts: usize,
    }

    impl SupabaseNotificationTransport for FakeTransport {
        fn schema_ready(&self) -> bool {
            self.ready
        }

        fn insert_notification(
            &mut self,
            _recipient: &AuthenticatedRecipient,
            kind: NotificationKind,
            _payload: NotificationPayload,
        ) -> Result<NotificationReceipt, AdapterError> {
            self.inserts += 1;
            Ok(NotificationReceipt {
                notification_id: format!("test-{}", self.inserts),
                kind,
            })
        }
    }

    #[test]
    fn head_notification_requires_ready_schema_and_same_school() {
        let notification = build_head_progress_notification(HeadProgressRequest {
            requester_role: Role::Administrator,
            requester_school: "School A".into(),
            learner_school: "School A".into(),
            learner_count: 8,
            progress_band: ProgressBand::OnTrack,
            metric: "mathematics mastery".into(),
        })
        .unwrap();
        let recipient = AuthenticatedRecipient {
            user_id: "head-1".into(),
            role: "head_of_school",
            school_name: Some("School A".into()),
            linked_child: false,
            consent_granted: false,
        };
        let mut transport = FakeTransport {
            ready: true,
            inserts: 0,
        };
        assert!(publish_head_progress(&mut transport, &recipient, &notification).is_ok());
        assert_eq!(transport.inserts, 1);
    }

    #[test]
    fn head_cross_school_delivery_is_denied() {
        let notification = HeadProgressNotification {
            school_name: "School A".into(),
            learner_count: 2,
            progress_band: ProgressBand::Developing,
            metric: "mastery".into(),
            message: "aggregate".into(),
        };
        let recipient = AuthenticatedRecipient {
            user_id: "head-1".into(),
            role: "head_of_school",
            school_name: Some("School B".into()),
            linked_child: false,
            consent_granted: false,
        };
        let mut transport = FakeTransport {
            ready: true,
            inserts: 0,
        };
        assert_eq!(
            publish_head_progress(&mut transport, &recipient, &notification),
            Err(AdapterError::SchoolScopeMismatch)
        );
        assert_eq!(transport.inserts, 0);
    }

    #[test]
    fn parent_report_requires_link_and_consent() {
        let report = ParentPerformanceReport {
            child_reference: "child-1".into(),
            school_name: "School A".into(),
            subject: "Mathematics".into(),
            mastery_percent: 50,
            band: ParentReportBand::Developing,
            teacher_feedback_summary: Some("Use a visual example.".into()),
            next_step: "Practise one example.".into(),
        };
        let recipient = AuthenticatedRecipient {
            user_id: "parent-1".into(),
            role: "parent",
            school_name: Some("School A".into()),
            linked_child: false,
            consent_granted: false,
        };
        let mut transport = FakeTransport {
            ready: true,
            inserts: 0,
        };
        assert_eq!(
            publish_parent_performance(&mut transport, &recipient, &report),
            Err(AdapterError::InvalidPayload)
        );
        assert_eq!(transport.inserts, 0);
    }

    #[test]
    fn parent_report_is_published_only_when_linked_and_consented() {
        let report = ParentPerformanceReport {
            child_reference: "child-1".into(),
            school_name: "School A".into(),
            subject: "Mathematics".into(),
            mastery_percent: 50,
            band: ParentReportBand::Developing,
            teacher_feedback_summary: Some("Use a visual example.".into()),
            next_step: "Practise one example.".into(),
        };
        let recipient = AuthenticatedRecipient {
            user_id: "parent-1".into(),
            role: "parent",
            school_name: Some("School A".into()),
            linked_child: true,
            consent_granted: true,
        };
        let mut transport = FakeTransport {
            ready: true,
            inserts: 0,
        };
        assert!(publish_parent_performance(&mut transport, &recipient, &report).is_ok());
        assert_eq!(transport.inserts, 1);
    }

    #[test]
    fn missing_schema_fails_closed_before_insert() {
        let notification = HeadProgressNotification {
            school_name: "School A".into(),
            learner_count: 1,
            progress_band: ProgressBand::Strong,
            metric: "mastery".into(),
            message: "aggregate".into(),
        };
        let recipient = AuthenticatedRecipient {
            user_id: "head-1".into(),
            role: "admin",
            school_name: Some("School A".into()),
            linked_child: false,
            consent_granted: false,
        };
        let mut transport = FakeTransport {
            ready: false,
            inserts: 0,
        };
        assert_eq!(
            publish_head_progress(&mut transport, &recipient, &notification),
            Err(AdapterError::SchemaUnavailable)
        );
        assert_eq!(transport.inserts, 0);
    }
}
