//! Deterministic mixture-of-experts routing contracts for Syncsenta.
//!
//! This is orchestration, not neural-MoE training: it selects a small, ordered
//! set of specialist contracts after the Rust policy boundary has inspected the
//! request. Provider execution remains outside this crate.

use crate::{Connectivity, ExpertId, Intent, Request, Role, RouteReason, Vision2030Goal};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SpecialistContract {
    pub expert: ExpertId,
    pub reason: RouteReason,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MoePlan {
    pub specialists: Vec<SpecialistContract>,
    pub max_experts: usize,
    pub requires_human_review: bool,
}

impl MoePlan {
    pub fn expert_ids(&self) -> Vec<ExpertId> {
        self.specialists
            .iter()
            .map(|contract| contract.expert)
            .collect()
    }
}

fn safety_requires_review(request: &Request) -> bool {
    request.safety.self_harm
        || request.safety.abuse_or_exploitation
        || request.safety.sexual_content
        || request.safety.dangerous_activity
        || request.safety.privacy_request
        || request.safety.prompt_injection
        || (request.role == Role::Student && request.consent != crate::ConsentState::Granted)
}

fn push_unique(
    specialists: &mut Vec<SpecialistContract>,
    expert: ExpertId,
    reason: RouteReason,
    max_experts: usize,
) {
    if specialists.iter().any(|contract| contract.expert == expert)
        || specialists.len() >= max_experts
    {
        return;
    }
    specialists.push(SpecialistContract { expert, reason });
}

/// Plans the smallest safe expert set for the request. It never includes a
/// non-offline-safe expert in an offline or metered route and never omits the
/// shared Safety/Grounding contracts.
pub fn plan_specialists(request: &Request) -> MoePlan {
    let max_experts = match request.connectivity {
        Connectivity::Online => crate::MAX_ALLOWED_EXPERTS,
        Connectivity::Metered | Connectivity::Offline | Connectivity::Unknown => 3,
    };
    let review = safety_requires_review(request);
    let mut specialists = Vec::new();
    push_unique(
        &mut specialists,
        ExpertId::Safety,
        RouteReason::SharedSafety,
        max_experts,
    );
    push_unique(
        &mut specialists,
        ExpertId::Grounding,
        RouteReason::SharedGrounding,
        max_experts,
    );

    if review {
        push_unique(
            &mut specialists,
            ExpertId::HumanReview,
            RouteReason::HumanReview,
            max_experts,
        );
        return MoePlan {
            specialists,
            max_experts,
            requires_human_review: true,
        };
    }

    let intent_expert = match request.intent {
        Intent::SocraticTutor | Intent::General => Some(ExpertId::SocraticTutor),
        Intent::Curriculum => Some(ExpertId::Curriculum),
        Intent::LessonPlan => Some(ExpertId::LessonArchitect),
        Intent::Assessment => Some(ExpertId::Assessment),
        Intent::Localization => Some(ExpertId::Localization),
        Intent::Inclusion => Some(ExpertId::Inclusion),
        Intent::Mastery => Some(ExpertId::Mastery),
        Intent::CareerPathways => Some(ExpertId::CareerPathways),
        Intent::RealWorldProblem => Some(ExpertId::RealWorldProblemSolver),
    };
    if let Some(expert) = intent_expert {
        push_unique(
            &mut specialists,
            expert,
            RouteReason::IntentMatch,
            max_experts,
        );
    }

    if request.accessibility.audio_first || request.accessibility.simplified_language {
        push_unique(
            &mut specialists,
            ExpertId::Inclusion,
            RouteReason::Accessibility,
            max_experts,
        );
    }
    if request.language != "en" {
        push_unique(
            &mut specialists,
            ExpertId::Localization,
            RouteReason::LocalLanguage,
            max_experts,
        );
    }
    if request.vision_goal != Vision2030Goal::Unknown {
        let expert = match request.vision_goal {
            Vision2030Goal::InclusiveLearning => ExpertId::Inclusion,
            Vision2030Goal::DigitalSkills => ExpertId::RealWorldProblemSolver,
            Vision2030Goal::SkillsAndEmployment => ExpertId::CareerPathways,
            Vision2030Goal::QualityOfLife => ExpertId::SocraticTutor,
            Vision2030Goal::Unknown => ExpertId::Grounding,
        };
        push_unique(
            &mut specialists,
            expert,
            RouteReason::VisionGoal,
            max_experts,
        );
    }

    if matches!(
        request.connectivity,
        Connectivity::Metered | Connectivity::Offline | Connectivity::Unknown
    ) {
        specialists.retain(|contract| contract.expert.offline_safe());
    }

    MoePlan {
        specialists,
        max_experts,
        requires_human_review: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{AccessibilityNeeds, AgeBand, ConsentState, SafetySignals};

    fn request() -> Request {
        Request::new("Help with fractions")
            .with_request_id("moe-test")
            .with_role(Role::Student)
            .with_age_band(AgeBand::Primary)
            .with_connectivity(Connectivity::Online)
            .with_consent(ConsentState::Granted)
            .with_language("en")
            .with_accessibility(AccessibilityNeeds::default())
            .with_safety(SafetySignals::default())
    }

    #[test]
    fn online_plan_keeps_shared_experts_and_matches_intent() {
        let mut request = request();
        request.intent = Intent::Curriculum;
        let plan = plan_specialists(&request);
        assert_eq!(
            plan.expert_ids()[..3],
            [ExpertId::Safety, ExpertId::Grounding, ExpertId::Curriculum]
        );
        assert!(!plan.requires_human_review);
    }

    #[test]
    fn metered_plan_is_capped_and_deduplicated() {
        let mut request = request();
        request.connectivity = Connectivity::Metered;
        request.language = "sw".into();
        request.accessibility.audio_first = true;
        request.intent = Intent::Localization;
        let plan = plan_specialists(&request);
        assert_eq!(plan.max_experts, 3);
        assert_eq!(plan.specialists.len(), 3);
        assert_eq!(
            plan.expert_ids(),
            vec![
                ExpertId::Safety,
                ExpertId::Grounding,
                ExpertId::Localization
            ]
        );
    }

    #[test]
    fn risky_request_routes_to_human_review_without_content_experts() {
        let mut request = request();
        request.safety = SafetySignals {
            self_harm: true,
            ..SafetySignals::default()
        };
        let plan = plan_specialists(&request);
        assert!(plan.requires_human_review);
        assert_eq!(
            plan.expert_ids(),
            vec![ExpertId::Safety, ExpertId::Grounding, ExpertId::HumanReview]
        );
    }

    #[test]
    fn unknown_student_consent_fails_closed() {
        let mut request = request();
        request.consent = ConsentState::Unknown;
        let plan = plan_specialists(&request);
        assert!(plan.requires_human_review);
        assert!(plan.expert_ids().contains(&ExpertId::HumanReview));
        assert!(!plan.expert_ids().contains(&ExpertId::SocraticTutor));
    }
}
