//! Rust-native adaptive question selection for the student sandbox.
//!
//! The browser may render the activity, but the decision contract remains
//! deterministic and MeTTa-ready: correctness and bounded signals select the
//! next smallest learning step. Raw learner text is never embedded in the
//! policy query; only whether an interest anchor is available is included.

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum NextQuestionAction {
    Retry,
    Advance,
    Complete,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AdaptiveQuestionRequest {
    pub lesson_id: String,
    pub grade: String,
    pub subject: String,
    pub competency: String,
    pub current_index: usize,
    pub total_questions: usize,
    pub attempt_count: u32,
    pub correct_count: u32,
    pub hint_level: u8,
    pub last_correct: bool,
    pub interest: Option<String>,
    pub mastery_threshold: u32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AdaptiveQuestionDecision {
    pub action: NextQuestionAction,
    pub next_index: usize,
    pub difficulty_delta: i8,
    pub interest_anchor_present: bool,
    pub metta_query: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum AdaptiveQuestionError {
    EmptyLesson,
    EmptyCompetency,
    NoQuestions,
    IndexOutOfBounds,
    InvalidMasteryThreshold,
    InterestTooLong,
}

pub fn choose_next_question(
    request: &AdaptiveQuestionRequest,
) -> Result<AdaptiveQuestionDecision, AdaptiveQuestionError> {
    if request.lesson_id.trim().is_empty() {
        return Err(AdaptiveQuestionError::EmptyLesson);
    }
    if request.competency.trim().is_empty() {
        return Err(AdaptiveQuestionError::EmptyCompetency);
    }
    if request.total_questions == 0 {
        return Err(AdaptiveQuestionError::NoQuestions);
    }
    if request.current_index >= request.total_questions {
        return Err(AdaptiveQuestionError::IndexOutOfBounds);
    }
    if request.mastery_threshold == 0 {
        return Err(AdaptiveQuestionError::InvalidMasteryThreshold);
    }
    if request.interest.as_deref().map(str::len).unwrap_or(0) > 120 {
        return Err(AdaptiveQuestionError::InterestTooLong);
    }

    let interest_anchor_present = request
        .interest
        .as_deref()
        .map(str::trim)
        .is_some_and(|value| !value.is_empty());
    let mastered = request.correct_count >= request.mastery_threshold;
    let action = if mastered {
        NextQuestionAction::Complete
    } else if request.last_correct && request.current_index + 1 < request.total_questions {
        NextQuestionAction::Advance
    } else if request.last_correct && request.current_index + 1 >= request.total_questions {
        NextQuestionAction::Complete
    } else {
        NextQuestionAction::Retry
    };

    let next_index = match action {
        NextQuestionAction::Advance => request.current_index + 1,
        NextQuestionAction::Retry | NextQuestionAction::Complete => request.current_index,
    };
    let difficulty_delta = if matches!(action, NextQuestionAction::Retry) && request.hint_level >= 2
    {
        -1
    } else {
        0
    };

    Ok(AdaptiveQuestionDecision {
        action,
        next_index,
        difficulty_delta,
        interest_anchor_present,
        metta_query: format_metta_query(request, interest_anchor_present),
    })
}

fn format_metta_query(request: &AdaptiveQuestionRequest, interest_anchor_present: bool) -> String {
    format!(
        "!(syncsenta-next-question lesson={} competency={} index={} attempts={} correct={} hint-level={} interest-anchor={} mastery={})",
        atom(&request.lesson_id),
        atom(&request.competency),
        request.current_index,
        request.attempt_count,
        request.correct_count,
        request.hint_level,
        interest_anchor_present,
        request.mastery_threshold,
    )
}

fn atom(value: &str) -> String {
    value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || character == '_' || character == '-' {
                character
            } else {
                '-'
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request() -> AdaptiveQuestionRequest {
        AdaptiveQuestionRequest {
            lesson_id: "fractions-1".into(),
            grade: "Grade 2".into(),
            subject: "Mathematics".into(),
            competency: "MATH.G2.FRACTIONS".into(),
            current_index: 0,
            total_questions: 3,
            attempt_count: 1,
            correct_count: 1,
            hint_level: 0,
            last_correct: true,
            interest: Some("octopus".into()),
            mastery_threshold: 2,
        }
    }

    #[test]
    fn advances_and_keeps_interest_private() {
        let decision = choose_next_question(&request()).unwrap();
        assert_eq!(decision.action, NextQuestionAction::Advance);
        assert_eq!(decision.next_index, 1);
        assert!(decision.interest_anchor_present);
        assert!(!decision.metta_query.contains("octopus"));
        assert!(decision.metta_query.contains("interest-anchor=true"));
    }

    #[test]
    fn retries_with_bounded_difficulty_when_hints_accumulate() {
        let mut input = request();
        input.last_correct = false;
        input.hint_level = 2;
        let decision = choose_next_question(&input).unwrap();
        assert_eq!(decision.action, NextQuestionAction::Retry);
        assert_eq!(decision.next_index, 0);
        assert_eq!(decision.difficulty_delta, -1);
    }

    #[test]
    fn completes_at_mastery_or_end_of_sequence() {
        let mut input = request();
        input.correct_count = 2;
        assert_eq!(
            choose_next_question(&input).unwrap().action,
            NextQuestionAction::Complete
        );

        let mut input = request();
        input.current_index = 2;
        input.last_correct = true;
        assert_eq!(
            choose_next_question(&input).unwrap().action,
            NextQuestionAction::Complete
        );
    }

    #[test]
    fn rejects_invalid_or_unbounded_input() {
        let mut input = request();
        input.lesson_id.clear();
        assert_eq!(
            choose_next_question(&input),
            Err(AdaptiveQuestionError::EmptyLesson)
        );

        let mut input = request();
        input.interest = Some("x".repeat(121));
        assert_eq!(
            choose_next_question(&input),
            Err(AdaptiveQuestionError::InterestTooLong)
        );
    }
}
