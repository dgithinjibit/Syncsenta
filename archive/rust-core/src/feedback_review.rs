//! Provider-neutral teacher feedback and human-review contracts.
//!
//! This module validates feedback before it crosses a network boundary and
//! turns safety or quality signals into an explicit human-review request.
//! Persistence and connector transport remain outside the Rust policy core.

const MAX_CONTENT_ID_BYTES: usize = 256;
const MAX_FEEDBACK_BYTES: usize = 2_000;
const MAX_SUMMARY_BYTES: usize = 1_000;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FeedbackRating {
    ThumbsUp,
    ThumbsDown,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ReviewType {
    LearningSupport,
    Safeguarding,
    Wellbeing,
    ContentCorrection,
    Privacy,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum ReviewSeverity {
    Low,
    Normal,
    High,
    Urgent,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TeacherFeedbackInput {
    pub teacher_id: String,
    pub content_type: String,
    pub content_id: String,
    pub rating: FeedbackRating,
    pub feedback_text: Option<String>,
    pub improvement_suggestions: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HumanReviewRequest {
    pub student_id: String,
    pub initiated_by: String,
    pub review_type: ReviewType,
    pub severity: ReviewSeverity,
    pub summary: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum FeedbackValidationError {
    MissingIdentity,
    MissingContent,
    UnsupportedContentType,
    FeedbackRequiredForNegativeRating,
    FieldTooLong,
}

impl TeacherFeedbackInput {
    pub fn validate(&self) -> Result<(), FeedbackValidationError> {
        if self.teacher_id.trim().is_empty() {
            return Err(FeedbackValidationError::MissingIdentity);
        }
        if self.content_id.trim().is_empty() {
            return Err(FeedbackValidationError::MissingContent);
        }
        if !matches!(
            self.content_type.as_str(),
            "scheme"
                | "lesson_plan"
                | "assessment"
                | "worksheet"
                | "text_leveler"
                | "standards_unpacker"
        ) {
            return Err(FeedbackValidationError::UnsupportedContentType);
        }
        if self.content_id.len() > MAX_CONTENT_ID_BYTES
            || self.teacher_id.len() > MAX_CONTENT_ID_BYTES
            || self.content_type.len() > MAX_CONTENT_ID_BYTES
            || self
                .feedback_text
                .as_deref()
                .is_some_and(|v| v.len() > MAX_FEEDBACK_BYTES)
            || self
                .improvement_suggestions
                .as_deref()
                .is_some_and(|v| v.len() > MAX_FEEDBACK_BYTES)
        {
            return Err(FeedbackValidationError::FieldTooLong);
        }
        if self.rating == FeedbackRating::ThumbsDown
            && self
                .feedback_text
                .as_deref()
                .unwrap_or_default()
                .trim()
                .is_empty()
            && self
                .improvement_suggestions
                .as_deref()
                .unwrap_or_default()
                .trim()
                .is_empty()
        {
            return Err(FeedbackValidationError::FeedbackRequiredForNegativeRating);
        }
        Ok(())
    }
}

/// Escalates only explicit, bounded signals. It never copies raw learner
/// telemetry into the review summary.
pub fn review_from_signal(
    student_id: impl Into<String>,
    initiated_by: impl Into<String>,
    review_type: ReviewType,
    severity: ReviewSeverity,
    summary: impl Into<String>,
) -> Option<HumanReviewRequest> {
    let student_id = student_id.into();
    let initiated_by = initiated_by.into();
    let summary = summary.into();
    if student_id.trim().is_empty()
        || initiated_by.trim().is_empty()
        || summary.trim().is_empty()
        || summary.len() > MAX_SUMMARY_BYTES
    {
        return None;
    }
    Some(HumanReviewRequest {
        student_id,
        initiated_by,
        review_type,
        severity,
        summary,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn valid_feedback() -> TeacherFeedbackInput {
        TeacherFeedbackInput {
            teacher_id: "teacher-01".into(),
            content_type: "lesson_plan".into(),
            content_id: "lesson-01".into(),
            rating: FeedbackRating::ThumbsUp,
            feedback_text: None,
            improvement_suggestions: None,
        }
    }

    #[test]
    fn positive_feedback_can_be_submitted_without_comment() {
        assert_eq!(valid_feedback().validate(), Ok(()));
    }

    #[test]
    fn negative_feedback_requires_actionable_context() {
        let mut input = valid_feedback();
        input.rating = FeedbackRating::ThumbsDown;
        assert_eq!(
            input.validate(),
            Err(FeedbackValidationError::FeedbackRequiredForNegativeRating)
        );
        input.feedback_text = Some("Too long for this class".into());
        assert_eq!(input.validate(), Ok(()));
    }

    #[test]
    fn unknown_content_type_is_rejected() {
        let mut input = valid_feedback();
        input.content_type = "raw_prompt".into();
        assert_eq!(
            input.validate(),
            Err(FeedbackValidationError::UnsupportedContentType)
        );
    }

    #[test]
    fn oversize_feedback_is_rejected_without_truncation() {
        let mut input = valid_feedback();
        input.feedback_text = Some("x".repeat(MAX_FEEDBACK_BYTES + 1));
        assert_eq!(input.validate(), Err(FeedbackValidationError::FieldTooLong));
    }

    #[test]
    fn safeguarding_signal_creates_bounded_human_review_request() {
        let request = review_from_signal(
            "student-01",
            "teacher-01",
            ReviewType::Safeguarding,
            ReviewSeverity::Urgent,
            "Teacher requested immediate safeguarding review.",
        )
        .unwrap();
        assert_eq!(request.review_type, ReviewType::Safeguarding);
        assert_eq!(request.severity, ReviewSeverity::Urgent);
        assert!(!request.summary.contains("telemetry"));
    }

    #[test]
    fn invalid_review_signal_fails_closed() {
        assert!(review_from_signal(
            "",
            "teacher-01",
            ReviewType::Wellbeing,
            ReviewSeverity::High,
            "Needs help"
        )
        .is_none());
        assert!(review_from_signal(
            "student-01",
            "teacher-01",
            ReviewType::Wellbeing,
            ReviewSeverity::High,
            ""
        )
        .is_none());
    }
}
