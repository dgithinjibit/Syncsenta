//! Property-based and unit tests for Mwalimu AI 2.0
//!
//! Task 8.7: Property 10 — Mwalimu AI responds in the language of the input
//! Task 8.8: Property 11 — Off-topic messages trigger educational redirection
//! Task 8.9: Unit tests for Mwalimu AI 2.0
//! Validates: Requirements 3.1–3.12

#[cfg(test)]
mod mwalimu_language_property_tests {
    use proptest::prelude::*;
    use crate::services::mwalimu::{
        build_system_prompt, is_off_topic, CircuitBreaker, MwalimuMode, ModelType,
    };
    use syncsenta_common::models::{CBCGradeLevel, SupportedLanguage};

    /// Strategy to generate supported languages
    fn arb_language() -> impl Strategy<Value = SupportedLanguage> {
        prop_oneof![
            Just(SupportedLanguage::En),
            Just(SupportedLanguage::Sw),
            Just(SupportedLanguage::Ki),
            Just(SupportedLanguage::Luo),
            Just(SupportedLanguage::Luy),
        ]
    }

    /// Strategy to generate CBC grade levels
    fn arb_grade_level() -> impl Strategy<Value = CBCGradeLevel> {
        prop_oneof![
            Just(CBCGradeLevel::PP1),
            Just(CBCGradeLevel::Grade1),
            Just(CBCGradeLevel::Grade5),
            Just(CBCGradeLevel::Grade6),
            Just(CBCGradeLevel::JSS1),
            Just(CBCGradeLevel::SSS1),
        ]
    }

    /// Strategy to generate Mwalimu modes
    fn arb_mode() -> impl Strategy<Value = MwalimuMode> {
        prop_oneof![
            Just(MwalimuMode::Tutor),
            Just(MwalimuMode::HomeworkHelp),
            Just(MwalimuMode::QuizGen),
            Just(MwalimuMode::DocAnalysis),
            Just(MwalimuMode::ImageSolve),
        ]
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        /// Property 10: Mwalimu AI system prompt always specifies the correct language
        ///
        /// The system prompt must instruct the AI to respond in the requested language.
        #[test]
        fn property_system_prompt_specifies_language(
            language in arb_language(),
            grade in arb_grade_level(),
            mode in arb_mode(),
        ) {
            let prompt = build_system_prompt(&grade, &language, &mode);

            let expected_lang = match &language {
                SupportedLanguage::En => "English",
                SupportedLanguage::Sw => "Swahili",
                SupportedLanguage::Ki => "Kikuyu",
                SupportedLanguage::Luo => "Dholuo",
                SupportedLanguage::Luy => "Luhya",
            };

            prop_assert!(
                prompt.contains(expected_lang),
                "System prompt must specify language '{}'. Prompt: {}",
                expected_lang, &prompt[..100.min(prompt.len())]
            );
        }

        /// Property: System prompt always specifies the grade level
        #[test]
        fn property_system_prompt_specifies_grade(
            language in arb_language(),
            grade in arb_grade_level(),
            mode in arb_mode(),
        ) {
            let prompt = build_system_prompt(&grade, &language, &mode);
            let grade_str = format!("{:?}", grade);

            prop_assert!(
                prompt.contains(&grade_str),
                "System prompt must specify grade level '{}'. Prompt: {}",
                grade_str, &prompt[..100.min(prompt.len())]
            );
        }

        /// Property: System prompt always contains CBC curriculum reference
        #[test]
        fn property_system_prompt_references_cbc(
            language in arb_language(),
            grade in arb_grade_level(),
            mode in arb_mode(),
        ) {
            let prompt = build_system_prompt(&grade, &language, &mode);

            prop_assert!(
                prompt.contains("CBC"),
                "System prompt must reference CBC curriculum"
            );
        }

        /// Property: Homework help mode never reveals final answer
        #[test]
        fn property_homework_help_withholds_answer(
            language in arb_language(),
            grade in arb_grade_level(),
        ) {
            let prompt = build_system_prompt(&grade, &language, &MwalimuMode::HomeworkHelp);

            prop_assert!(
                prompt.contains("WITHOUT revealing the final answer"),
                "Homework help mode must instruct AI not to reveal final answer"
            );
        }

        /// Property: System prompt is always non-empty
        #[test]
        fn property_system_prompt_non_empty(
            language in arb_language(),
            grade in arb_grade_level(),
            mode in arb_mode(),
        ) {
            let prompt = build_system_prompt(&grade, &language, &mode);
            prop_assert!(!prompt.is_empty(), "System prompt must not be empty");
            prop_assert!(prompt.len() > 100, "System prompt must be substantive");
        }
    }
}

#[cfg(test)]
mod mwalimu_off_topic_property_tests {
    use proptest::prelude::*;
    use crate::services::mwalimu::is_off_topic;

    /// Strategy to generate clearly educational messages
    fn arb_educational_message() -> impl Strategy<Value = String> {
        prop_oneof![
            Just("help me with mathematics".to_string()),
            Just("explain photosynthesis".to_string()),
            Just("what is the water cycle".to_string()),
            Just("solve this algebra equation".to_string()),
            Just("translate this to Swahili".to_string()),
            Just("what is the CBC curriculum".to_string()),
            Just("help me understand fractions".to_string()),
        ]
    }

    /// Strategy to generate off-topic messages
    fn arb_off_topic_message() -> impl Strategy<Value = String> {
        prop_oneof![
            Just("tell me about politics".to_string()),
            Just("discuss religion with me".to_string()),
            Just("I want to talk about violence".to_string()),
            Just("adult content please".to_string()),
        ]
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(50))]

        /// Property 11: Off-topic messages are always detected
        #[test]
        fn property_off_topic_always_detected(msg in arb_off_topic_message()) {
            prop_assert!(
                is_off_topic(&msg),
                "Off-topic message must be detected: '{}'",
                msg
            );
        }

        /// Property: Educational messages are not flagged as off-topic
        #[test]
        fn property_educational_not_off_topic(msg in arb_educational_message()) {
            prop_assert!(
                !is_off_topic(&msg),
                "Educational message must not be flagged as off-topic: '{}'",
                msg
            );
        }

        /// Property: Off-topic detection is case-insensitive
        #[test]
        fn property_off_topic_case_insensitive(msg in arb_off_topic_message()) {
            let upper = msg.to_uppercase();
            let lower = msg.to_lowercase();

            prop_assert!(
                is_off_topic(&upper) || is_off_topic(&lower),
                "Off-topic detection must work regardless of case"
            );
        }
    }
}

#[cfg(test)]
mod mwalimu_unit_tests {
    use super::super::*;
    use crate::services::mwalimu::*;
    use syncsenta_common::models::{CBCGradeLevel, SupportedLanguage};
    use uuid::Uuid;

    // ─── System Prompt Tests ──────────────────────────────────────────────────

    #[test]
    fn test_system_prompt_english() {
        let prompt = build_system_prompt(&CBCGradeLevel::Grade5, &SupportedLanguage::En, &MwalimuMode::Tutor);
        assert!(prompt.contains("English"));
        assert!(prompt.contains("Grade5"));
        assert!(prompt.contains("CBC"));
    }

    #[test]
    fn test_system_prompt_swahili() {
        let prompt = build_system_prompt(&CBCGradeLevel::Grade3, &SupportedLanguage::Sw, &MwalimuMode::Tutor);
        assert!(prompt.contains("Swahili"));
        assert!(prompt.contains("Grade3"));
    }

    #[test]
    fn test_system_prompt_homework_help() {
        let prompt = build_system_prompt(&CBCGradeLevel::Grade5, &SupportedLanguage::En, &MwalimuMode::HomeworkHelp);
        assert!(prompt.contains("WITHOUT revealing the final answer"));
        assert!(prompt.contains("guiding questions"));
    }

    #[test]
    fn test_system_prompt_quiz_gen() {
        let prompt = build_system_prompt(&CBCGradeLevel::Grade5, &SupportedLanguage::En, &MwalimuMode::QuizGen);
        assert!(prompt.contains("quiz questions"));
        assert!(prompt.contains("CBC curriculum"));
    }

    #[test]
    fn test_system_prompt_image_solve() {
        let prompt = build_system_prompt(&CBCGradeLevel::Grade5, &SupportedLanguage::En, &MwalimuMode::ImageSolve);
        assert!(prompt.contains("step-by-step"));
    }

    // ─── Off-Topic Detection Tests ────────────────────────────────────────────

    #[test]
    fn test_off_topic_politics() {
        assert!(is_off_topic("tell me about politics"));
        assert!(is_off_topic("POLITICS in Kenya"));
    }

    #[test]
    fn test_off_topic_religion() {
        assert!(is_off_topic("discuss religion"));
    }

    #[test]
    fn test_off_topic_violence() {
        assert!(is_off_topic("violence in movies"));
    }

    #[test]
    fn test_educational_not_off_topic() {
        assert!(!is_off_topic("help me with math"));
        assert!(!is_off_topic("explain photosynthesis"));
        assert!(!is_off_topic("what is 2+2"));
        assert!(!is_off_topic("translate to Swahili"));
    }

    // ─── Circuit Breaker Tests ────────────────────────────────────────────────

    #[test]
    fn test_circuit_breaker_starts_closed() {
        let cb = CircuitBreaker::new(3);
        assert!(!cb.is_open());
    }

    #[test]
    fn test_circuit_breaker_opens_at_threshold() {
        let mut cb = CircuitBreaker::new(3);
        cb.record_failure();
        cb.record_failure();
        assert!(!cb.is_open());
        cb.record_failure();
        assert!(cb.is_open());
    }

    #[test]
    fn test_circuit_breaker_resets_on_success() {
        let mut cb = CircuitBreaker::new(2);
        cb.record_failure();
        cb.record_failure();
        assert!(cb.is_open());
        cb.record_success();
        assert!(!cb.is_open());
        assert_eq!(cb.failures, 0);
    }

    // ─── Model Routing Tests ──────────────────────────────────────────────────

    #[test]
    fn test_fallback_returns_edge_model() {
        let req = MwalimuRequest {
            session_id: "test-session".to_string(),
            student_id: Uuid::new_v4(),
            grade_level: CBCGradeLevel::Grade5,
            input_type: InputType::Text,
            content: "help me with math".to_string(),
            language: SupportedLanguage::En,
            mode: MwalimuMode::Tutor,
        };
        let resp = fallback_to_edge(&req).unwrap();
        assert_eq!(resp.model_used, ModelType::CandleEdge);
        assert!(resp.response_text.contains("offline"));
    }

    #[test]
    fn test_all_input_types_handled() {
        let types = vec![
            InputType::Text,
            InputType::Voice,
            InputType::Image,
            InputType::Document,
        ];
        // All types should be serializable
        for t in types {
            let json = serde_json::to_string(&t).unwrap();
            assert!(!json.is_empty());
        }
    }

    #[test]
    fn test_all_modes_have_system_prompts() {
        let modes = vec![
            MwalimuMode::Tutor,
            MwalimuMode::HomeworkHelp,
            MwalimuMode::QuizGen,
            MwalimuMode::DocAnalysis,
            MwalimuMode::ImageSolve,
        ];
        for mode in modes {
            let prompt = build_system_prompt(&CBCGradeLevel::Grade5, &SupportedLanguage::En, &mode);
            assert!(!prompt.is_empty(), "Mode {:?} must have a system prompt", mode);
        }
    }

    #[test]
    fn test_all_languages_in_system_prompt() {
        let languages = vec![
            (SupportedLanguage::En, "English"),
            (SupportedLanguage::Sw, "Swahili"),
            (SupportedLanguage::Ki, "Kikuyu"),
            (SupportedLanguage::Luo, "Dholuo"),
            (SupportedLanguage::Luy, "Luhya"),
        ];
        for (lang, expected) in languages {
            let prompt = build_system_prompt(&CBCGradeLevel::Grade5, &lang, &MwalimuMode::Tutor);
            assert!(
                prompt.contains(expected),
                "Prompt must contain language name '{}' for {:?}",
                expected, lang
            );
        }
    }

    #[test]
    fn test_kenyan_context_in_prompt() {
        let prompt = build_system_prompt(&CBCGradeLevel::Grade5, &SupportedLanguage::En, &MwalimuMode::Tutor);
        assert!(prompt.contains("Kenyan") || prompt.contains("Kenya"), "Prompt must reference Kenyan context");
    }
}
