//! Contracts for specialist outputs used by the bounded MoE router.
//!
//! Specialists return structured, bounded evidence. They do not make policy
//! decisions, access raw telemetry, or silently override human review.

use crate::{ReviewSeverity, ReviewType};

const MAX_TEXT_BYTES: usize = 4_000;
const MAX_EVIDENCE_ITEMS: usize = 8;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SpecialistDomain {
    Curriculum,
    Wellbeing,
    Creativity,
    Safety,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SpecialistOutput {
    pub domain: SpecialistDomain,
    pub summary: String,
    pub evidence: Vec<String>,
    pub needs_human_review: bool,
    pub review_type: Option<ReviewType>,
    pub severity: Option<ReviewSeverity>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SpecialistOutputError {
    EmptySummary,
    TextTooLong,
    TooManyEvidenceItems,
    ReviewMetadataMissing,
    ReviewMetadataUnexpected,
}

impl SpecialistOutput {
    pub fn validate(&self) -> Result<(), SpecialistOutputError> {
        if self.summary.trim().is_empty() {
            return Err(SpecialistOutputError::EmptySummary);
        }
        if self.summary.len() > MAX_TEXT_BYTES
            || self.evidence.iter().any(|item| item.len() > MAX_TEXT_BYTES)
        {
            return Err(SpecialistOutputError::TextTooLong);
        }
        if self.evidence.len() > MAX_EVIDENCE_ITEMS {
            return Err(SpecialistOutputError::TooManyEvidenceItems);
        }
        if self.needs_human_review && (self.review_type.is_none() || self.severity.is_none()) {
            return Err(SpecialistOutputError::ReviewMetadataMissing);
        }
        if !self.needs_human_review && (self.review_type.is_some() || self.severity.is_some()) {
            return Err(SpecialistOutputError::ReviewMetadataUnexpected);
        }
        Ok(())
    }

    pub fn human_review(
        domain: SpecialistDomain,
        summary: impl Into<String>,
        review_type: ReviewType,
        severity: ReviewSeverity,
    ) -> Self {
        Self {
            domain,
            summary: summary.into(),
            evidence: Vec::new(),
            needs_human_review: true,
            review_type: Some(review_type),
            severity: Some(severity),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SignalKind {
    Curriculum,
    Creativity,
    Wellbeing,
    Safety,
    Privacy,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SpecialistPlan {
    pub domains: Vec<SpecialistDomain>,
    pub needs_human_review: bool,
}

/// Deterministic specialist selection. Sensitive signals never fan out to
/// content specialists, and privacy signals never reach any specialist.
pub fn plan_specialists(signal: SignalKind) -> SpecialistPlan {
    match signal {
        SignalKind::Curriculum => SpecialistPlan {
            domains: vec![SpecialistDomain::Curriculum],
            needs_human_review: false,
        },
        SignalKind::Creativity => SpecialistPlan {
            domains: vec![SpecialistDomain::Creativity],
            needs_human_review: false,
        },
        SignalKind::Wellbeing => SpecialistPlan {
            domains: vec![SpecialistDomain::Wellbeing],
            needs_human_review: true,
        },
        SignalKind::Safety => SpecialistPlan {
            domains: vec![SpecialistDomain::Safety],
            needs_human_review: true,
        },
        SignalKind::Privacy => SpecialistPlan {
            domains: Vec::new(),
            needs_human_review: true,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn curriculum_output_accepts_bounded_evidence() {
        let output = SpecialistOutput {
            domain: SpecialistDomain::Curriculum,
            summary: "Mapped the activity to a learning outcome.".into(),
            evidence: vec!["grade=2".into(), "subject=mathematics".into()],
            needs_human_review: false,
            review_type: None,
            severity: None,
        };
        assert_eq!(output.validate(), Ok(()));
    }

    #[test]
    fn wellbeing_output_requires_review_metadata_when_escalated() {
        let output = SpecialistOutput::human_review(
            SpecialistDomain::Wellbeing,
            "A trusted adult should review this concern.",
            ReviewType::Wellbeing,
            ReviewSeverity::High,
        );
        assert_eq!(output.validate(), Ok(()));
    }

    #[test]
    fn safety_output_cannot_claim_review_without_a_route() {
        let output = SpecialistOutput {
            domain: SpecialistDomain::Safety,
            summary: "Review required.".into(),
            evidence: Vec::new(),
            needs_human_review: true,
            review_type: None,
            severity: None,
        };
        assert_eq!(
            output.validate(),
            Err(SpecialistOutputError::ReviewMetadataMissing)
        );
    }

    #[test]
    fn curriculum_signal_selects_only_curriculum_specialist() {
        let plan = plan_specialists(SignalKind::Curriculum);
        assert_eq!(plan.domains, vec![SpecialistDomain::Curriculum]);
        assert!(!plan.needs_human_review);
    }

    #[test]
    fn wellbeing_signal_cannot_fan_out_to_content_specialists() {
        let plan = plan_specialists(SignalKind::Wellbeing);
        assert_eq!(plan.domains, vec![SpecialistDomain::Wellbeing]);
        assert!(plan.needs_human_review);
    }

    #[test]
    fn privacy_signal_reaches_no_specialist() {
        let plan = plan_specialists(SignalKind::Privacy);
        assert!(plan.domains.is_empty());
        assert!(plan.needs_human_review);
    }

    #[test]
    fn creativity_output_rejects_unbounded_evidence() {
        let output = SpecialistOutput {
            domain: SpecialistDomain::Creativity,
            summary: "Ideas".into(),
            evidence: vec!["x".into(); MAX_EVIDENCE_ITEMS + 1],
            needs_human_review: false,
            review_type: None,
            severity: None,
        };
        assert_eq!(
            output.validate(),
            Err(SpecialistOutputError::TooManyEvidenceItems)
        );
    }
}
