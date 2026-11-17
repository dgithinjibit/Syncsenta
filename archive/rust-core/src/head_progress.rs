//! Head-of-School aggregate progress and notification contract.
//!
//! Notifications are deliberately aggregate. This module rejects cross-school
//! requests and never includes learner IDs, raw notes, prompts, or answers.

use crate::Role;

const MAX_SCHOOL_NAME_BYTES: usize = 160;
const MAX_METRIC_BYTES: usize = 96;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ProgressBand {
    NeedsAttention,
    Developing,
    OnTrack,
    Strong,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HeadProgressRequest {
    pub requester_role: Role,
    pub requester_school: String,
    pub learner_school: String,
    pub learner_count: u32,
    pub progress_band: ProgressBand,
    pub metric: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HeadProgressNotification {
    pub school_name: String,
    pub learner_count: u32,
    pub progress_band: ProgressBand,
    pub metric: String,
    pub message: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum HeadProgressError {
    NotHeadOfSchool,
    CrossSchoolAccess,
    MissingSchool,
    InvalidMetric,
}

pub fn build_head_progress_notification(
    request: HeadProgressRequest,
) -> Result<HeadProgressNotification, HeadProgressError> {
    if request.requester_role != Role::Administrator {
        return Err(HeadProgressError::NotHeadOfSchool);
    }
    if request.requester_school.trim().is_empty() || request.learner_school.trim().is_empty() {
        return Err(HeadProgressError::MissingSchool);
    }
    if request.requester_school != request.learner_school {
        return Err(HeadProgressError::CrossSchoolAccess);
    }
    if request.requester_school.len() > MAX_SCHOOL_NAME_BYTES
        || request.metric.trim().is_empty()
        || request.metric.len() > MAX_METRIC_BYTES
        || request.metric.to_ascii_lowercase().contains("student_id")
        || request.metric.to_ascii_lowercase().contains("prompt")
        || request.metric.to_ascii_lowercase().contains("message")
    {
        return Err(HeadProgressError::InvalidMetric);
    }

    let band_label = match request.progress_band {
        ProgressBand::NeedsAttention => "needs attention",
        ProgressBand::Developing => "developing",
        ProgressBand::OnTrack => "on track",
        ProgressBand::Strong => "strong",
    };
    Ok(HeadProgressNotification {
        school_name: request.requester_school,
        learner_count: request.learner_count,
        progress_band: request.progress_band,
        metric: request.metric,
        message: format!(
            "School progress update: {} learners are {} for the selected metric.",
            request.learner_count, band_label
        ),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request(role: Role, requester_school: &str, learner_school: &str) -> HeadProgressRequest {
        HeadProgressRequest {
            requester_role: role,
            requester_school: requester_school.into(),
            learner_school: learner_school.into(),
            learner_count: 12,
            progress_band: ProgressBand::Developing,
            metric: "mathematics mastery".into(),
        }
    }

    #[test]
    fn same_school_head_gets_aggregate_notification() {
        let notification = build_head_progress_notification(request(
            Role::Administrator,
            "Turkana North School",
            "Turkana North School",
        ))
        .unwrap();
        assert_eq!(notification.learner_count, 12);
        assert!(notification.message.contains("12 learners"));
        assert!(!notification.message.contains("student"));
    }

    #[test]
    fn teacher_cannot_create_head_notification() {
        assert_eq!(
            build_head_progress_notification(request(
                Role::Teacher,
                "Turkana North School",
                "Turkana North School",
            )),
            Err(HeadProgressError::NotHeadOfSchool)
        );
    }

    #[test]
    fn cross_school_notification_fails_closed() {
        assert_eq!(
            build_head_progress_notification(request(
                Role::Administrator,
                "Turkana North School",
                "Nairobi School",
            )),
            Err(HeadProgressError::CrossSchoolAccess)
        );
    }

    #[test]
    fn sensitive_metric_is_rejected() {
        let mut input = request(Role::Administrator, "School A", "School A");
        input.metric = "student_id list".into();
        assert_eq!(
            build_head_progress_notification(input),
            Err(HeadProgressError::InvalidMetric)
        );
    }
}
