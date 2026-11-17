//! Privacy-safe holistic-development evidence evaluation.
//!
//! This module never infers a child's mood, ability, or wellbeing from a
//! camera, voice, biometric signal, or protected characteristic. It accepts
//! explicit learner self-report or teacher observations only, and wellbeing
//! evidence is rejected unless consent is recorded.

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum DevelopmentDomain {
    Learning,
    Communication,
    Collaboration,
    Creativity,
    SelfManagement,
    WellbeingCheckIn,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EvidenceSource {
    LearnerSelfReport,
    TeacherObservation,
    CompletedLearningArtifact,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EvidenceDecision {
    Accepted,
    ConsentRequired,
    BiometricEvidenceRejected,
    UnsupportedInferenceRejected,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HolisticEvidence {
    pub learner_id: String,
    pub domain: DevelopmentDomain,
    pub source: EvidenceSource,
    pub statement: String,
    pub consent_granted: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HolisticEvaluation {
    pub decision: EvidenceDecision,
    pub domain: DevelopmentDomain,
    pub next_step: Option<&'static str>,
}

fn contains_forbidden_inference(statement: &str) -> bool {
    let lower = statement.to_lowercase();
    [
        "face recognition",
        "facial expression",
        "biometric",
        "voiceprint",
        "emotion detected",
        "mood detected",
        "personality inferred",
    ]
    .iter()
    .any(|term| lower.contains(term))
}

/// Evaluate explicit evidence into a bounded next step.
///
/// This is a planning signal, not a diagnosis, ranking, grade, or automated
/// disciplinary decision. Learner and teacher agency remain required.
pub fn evaluate_evidence(evidence: &HolisticEvidence) -> HolisticEvaluation {
    if contains_forbidden_inference(&evidence.statement) {
        return HolisticEvaluation {
            decision: EvidenceDecision::BiometricEvidenceRejected,
            domain: evidence.domain,
            next_step: None,
        };
    }

    if evidence.domain == DevelopmentDomain::WellbeingCheckIn && !evidence.consent_granted {
        return HolisticEvaluation {
            decision: EvidenceDecision::ConsentRequired,
            domain: evidence.domain,
            next_step: Some("Request voluntary consent before recording a wellbeing check-in."),
        };
    }

    let next_step = match evidence.domain {
        DevelopmentDomain::Learning => {
            Some("Offer one scaffolded practice task and invite learner reflection.")
        }
        DevelopmentDomain::Communication => {
            Some("Invite the learner to explain their reasoning in their preferred class language.")
        }
        DevelopmentDomain::Collaboration => {
            Some("Offer a small peer task with teacher-observed participation.")
        }
        DevelopmentDomain::Creativity => {
            Some("Invite a learner-chosen artifact or alternative solution.")
        }
        DevelopmentDomain::SelfManagement => {
            Some("Set one learner-owned goal with a review point.")
        }
        DevelopmentDomain::WellbeingCheckIn => {
            Some("Show the learner a voluntary check-in and a human-support option.")
        }
    };

    HolisticEvaluation {
        decision: EvidenceDecision::Accepted,
        domain: evidence.domain,
        next_step,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn evidence(
        domain: DevelopmentDomain,
        statement: &str,
        consent_granted: bool,
    ) -> HolisticEvidence {
        HolisticEvidence {
            learner_id: "learner-01".into(),
            domain,
            source: EvidenceSource::LearnerSelfReport,
            statement: statement.into(),
            consent_granted,
        }
    }

    #[test]
    fn accepts_explicit_learning_evidence_with_bounded_support() {
        let result = evaluate_evidence(&evidence(
            DevelopmentDomain::Learning,
            "I can explain my solution",
            false,
        ));
        assert_eq!(result.decision, EvidenceDecision::Accepted);
        assert!(result.next_step.unwrap().contains("scaffolded"));
    }

    #[test]
    fn wellbeing_requires_explicit_consent() {
        let result = evaluate_evidence(&evidence(
            DevelopmentDomain::WellbeingCheckIn,
            "I would like support",
            false,
        ));
        assert_eq!(result.decision, EvidenceDecision::ConsentRequired);
    }

    #[test]
    fn consented_wellbeing_remains_voluntary_and_human_supported() {
        let result = evaluate_evidence(&evidence(
            DevelopmentDomain::WellbeingCheckIn,
            "I feel ready to check in",
            true,
        ));
        assert_eq!(result.decision, EvidenceDecision::Accepted);
        assert!(result.next_step.unwrap().contains("human-support"));
    }

    #[test]
    fn biometric_and_emotion_inference_is_rejected() {
        for statement in [
            "facial expression says the learner is sad",
            "emotion detected by camera",
            "voiceprint matched",
        ] {
            let result = evaluate_evidence(&evidence(
                DevelopmentDomain::WellbeingCheckIn,
                statement,
                true,
            ));
            assert_eq!(result.decision, EvidenceDecision::BiometricEvidenceRejected);
        }
    }
}
