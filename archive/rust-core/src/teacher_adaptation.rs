//! Deterministic teacher-feedback adaptations for the learner's next interaction.
//!
//! This module changes the interaction plan, not the learner's score. It emits
//! bounded pedagogical instructions and never copies teacher comments or raw
//! learner content into a downstream prompt.

use crate::agent_runtime::{decide_tutoring, LearningState, ScaffoldingLevel};
use crate::feedback_review::{FeedbackRating, FeedbackValidationError, TeacherFeedbackInput};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum InteractionAdjustment {
    AddVisualExample,
    UseGuidedQuestioning,
    SlowThePace,
    OfferLanguageClarification,
    PreserveIndependentPractice,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TeacherInteractionPlan {
    pub adjustment: InteractionAdjustment,
    pub scaffolding: ScaffoldingLevel,
    pub next_action: &'static str,
    pub requires_teacher_review: bool,
}

/// Converts validated teacher feedback into a small, explainable next-step
/// adjustment. Text content is classified by bounded keywords only; it is not
/// copied into the learner interaction.
pub fn adapt_next_interaction(
    feedback: &TeacherFeedbackInput,
    state: LearningState,
) -> Result<TeacherInteractionPlan, FeedbackValidationError> {
    feedback.validate()?;
    let text = format!(
        "{} {}",
        feedback.feedback_text.as_deref().unwrap_or_default(),
        feedback
            .improvement_suggestions
            .as_deref()
            .unwrap_or_default()
    )
    .to_ascii_lowercase();

    let adjustment = if text.contains("visual") || text.contains("diagram") {
        InteractionAdjustment::AddVisualExample
    } else if text.contains("language") || text.contains("swahili") || text.contains("kiswahili") {
        InteractionAdjustment::OfferLanguageClarification
    } else if text.contains("pace") || text.contains("slow") || text.contains("step") {
        InteractionAdjustment::SlowThePace
    } else if feedback.rating == FeedbackRating::ThumbsDown
        || state.frustration_signal
        || state.mastery_percent() < 40
    {
        InteractionAdjustment::UseGuidedQuestioning
    } else {
        InteractionAdjustment::PreserveIndependentPractice
    };

    let base = decide_tutoring(state);
    let scaffolding = match adjustment {
        InteractionAdjustment::PreserveIndependentPractice => base.scaffolding,
        InteractionAdjustment::AddVisualExample
        | InteractionAdjustment::UseGuidedQuestioning
        | InteractionAdjustment::SlowThePace
        | InteractionAdjustment::OfferLanguageClarification => ScaffoldingLevel::Guided,
    };
    let next_action = match adjustment {
        InteractionAdjustment::AddVisualExample => "show_visual_example",
        InteractionAdjustment::UseGuidedQuestioning => "ask_guiding_question",
        InteractionAdjustment::SlowThePace => "break_into_smaller_steps",
        InteractionAdjustment::OfferLanguageClarification => "offer_language_clarification",
        InteractionAdjustment::PreserveIndependentPractice => base.next_action,
    };

    Ok(TeacherInteractionPlan {
        adjustment,
        scaffolding,
        next_action,
        requires_teacher_review: feedback.rating == FeedbackRating::ThumbsDown,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn feedback(text: &str, suggestion: &str, rating: FeedbackRating) -> TeacherFeedbackInput {
        TeacherFeedbackInput {
            teacher_id: "teacher-01".into(),
            content_type: "assessment".into(),
            content_id: "assessment-01".into(),
            rating,
            feedback_text: Some(text.into()),
            improvement_suggestions: Some(suggestion.into()),
        }
    }

    #[test]
    fn visual_feedback_changes_next_interaction() {
        let plan = adapt_next_interaction(
            &feedback(
                "Needs a visual example",
                "Add a diagram",
                FeedbackRating::ThumbsDown,
            ),
            LearningState::default(),
        )
        .unwrap();
        assert_eq!(plan.adjustment, InteractionAdjustment::AddVisualExample);
        assert_eq!(plan.next_action, "show_visual_example");
        assert!(plan.requires_teacher_review);
    }

    #[test]
    fn language_feedback_changes_next_interaction() {
        let plan = adapt_next_interaction(
            &feedback(
                "Use Kiswahili",
                "Offer language clarification",
                FeedbackRating::ThumbsDown,
            ),
            LearningState::default(),
        )
        .unwrap();
        assert_eq!(
            plan.adjustment,
            InteractionAdjustment::OfferLanguageClarification
        );
    }

    #[test]
    fn negative_feedback_without_actionable_context_fails_closed() {
        let input = TeacherFeedbackInput {
            teacher_id: "teacher-01".into(),
            content_type: "assessment".into(),
            content_id: "assessment-01".into(),
            rating: FeedbackRating::ThumbsDown,
            feedback_text: None,
            improvement_suggestions: None,
        };
        assert_eq!(
            adapt_next_interaction(&input, LearningState::default()),
            Err(FeedbackValidationError::FeedbackRequiredForNegativeRating)
        );
    }

    #[test]
    fn positive_feedback_preserves_independent_practice_when_mastery_is_high() {
        let plan = adapt_next_interaction(
            &feedback("Clear", "Keep this approach", FeedbackRating::ThumbsUp),
            LearningState {
                attempts: 5,
                correct_attempts: 5,
                hints_used: 0,
                frustration_signal: false,
            },
        )
        .unwrap();
        assert_eq!(
            plan.adjustment,
            InteractionAdjustment::PreserveIndependentPractice
        );
        assert_eq!(plan.scaffolding, ScaffoldingLevel::Independent);
        assert!(!plan.requires_teacher_review);
    }
}
