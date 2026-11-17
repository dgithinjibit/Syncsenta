//! Deterministic architecture signals extracted from external AI intelligence.
//!
//! This module deliberately uses keyword evidence rather than an LLM. It is
//! suitable for offline planning, CI checks, and low-bandwidth deployments.

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum SignalTag {
    InferenceLatency,
    Agents,
    OpenModels,
    SafetySecurity,
    Multimodal,
    Infrastructure,
    EducationRelevance,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SyncsentaAction {
    PreferBoundedCachedInference,
    KeepAgentActionsPolicyGated,
    RetainPythonFallbackAndEvaluateLocalModels,
    UseModalitySpecificTransportBudgets,
    TreatComputeAndProviderCostAsConstraints,
    AddEducationSpecificValidation,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IntelligenceSignal {
    pub tags: Vec<SignalTag>,
    pub actions: Vec<SyncsentaAction>,
}

fn contains_any(text: &str, terms: &[&str]) -> bool {
    terms.iter().any(|term| text.contains(term))
}

/// Classify a newsletter title/body into deterministic Syncsenta actions.
///
/// The input is treated as untrusted informational text. No action is
/// executed by this function; it only returns typed planning signals.
pub fn classify_intelligence(title: &str, body: &str) -> IntelligenceSignal {
    let mut text = String::with_capacity(title.len() + body.len() + 1);
    text.push_str(title);
    text.push(' ');
    text.push_str(body);
    let text = text.to_lowercase();

    let mut tags = Vec::new();
    if contains_any(
        &text,
        &["latency", "inference", "faster", "token", "price", "cost"],
    ) {
        tags.push(SignalTag::InferenceLatency);
    }
    if contains_any(
        &text,
        &["agent", "coding", "autonomous", "robot", "workflow"],
    ) {
        tags.push(SignalTag::Agents);
    }
    if contains_any(
        &text,
        &[
            "open source",
            "open-sourced",
            "weights",
            "hugging face",
            "model release",
        ],
    ) {
        tags.push(SignalTag::OpenModels);
    }
    if contains_any(
        &text,
        &[
            "hack",
            "security",
            "sandbox",
            "shutoff",
            "sovereignty",
            "attack",
            "risk",
        ],
    ) {
        tags.push(SignalTag::SafetySecurity);
    }
    if contains_any(
        &text,
        &["video", "vision", "voice", "robotics", "image", "audio"],
    ) {
        tags.push(SignalTag::Multimodal);
    }
    if contains_any(
        &text,
        &[
            "data center",
            "chip",
            "nvidia",
            "cloud",
            "compute",
            "server",
            "hardware",
        ],
    ) {
        tags.push(SignalTag::Infrastructure);
    }
    if contains_any(
        &text,
        &["learning", "school", "student", "teacher", "education"],
    ) {
        tags.push(SignalTag::EducationRelevance);
    }

    let mut actions = Vec::new();
    if tags.contains(&SignalTag::InferenceLatency) {
        actions.push(SyncsentaAction::PreferBoundedCachedInference);
    }
    if tags.contains(&SignalTag::Agents) || tags.contains(&SignalTag::SafetySecurity) {
        actions.push(SyncsentaAction::KeepAgentActionsPolicyGated);
    }
    if tags.contains(&SignalTag::OpenModels) {
        actions.push(SyncsentaAction::RetainPythonFallbackAndEvaluateLocalModels);
    }
    if tags.contains(&SignalTag::Multimodal) {
        actions.push(SyncsentaAction::UseModalitySpecificTransportBudgets);
    }
    if tags.contains(&SignalTag::Infrastructure) {
        actions.push(SyncsentaAction::TreatComputeAndProviderCostAsConstraints);
    }
    if tags.contains(&SignalTag::EducationRelevance) {
        actions.push(SyncsentaAction::AddEducationSpecificValidation);
    }

    IntelligenceSignal { tags, actions }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn chip_and_agent_story_becomes_low_latency_policy_signal() {
        let signal = classify_intelligence(
            "OpenAI custom chip",
            "The chip lowers inference latency for AI agents and reduces cost.",
        );
        assert!(signal.tags.contains(&SignalTag::InferenceLatency));
        assert!(signal.tags.contains(&SignalTag::Agents));
        assert!(signal.tags.contains(&SignalTag::Infrastructure));
        assert!(signal
            .actions
            .contains(&SyncsentaAction::PreferBoundedCachedInference));
        assert!(signal
            .actions
            .contains(&SyncsentaAction::KeepAgentActionsPolicyGated));
    }

    #[test]
    fn open_multimodal_story_preserves_fallback_and_transport_budget() {
        let signal = classify_intelligence(
            "Open-source video model",
            "Hugging Face published model weights for video and audio generation.",
        );
        assert!(signal.tags.contains(&SignalTag::OpenModels));
        assert!(signal.tags.contains(&SignalTag::Multimodal));
        assert!(signal
            .actions
            .contains(&SyncsentaAction::RetainPythonFallbackAndEvaluateLocalModels));
        assert!(signal
            .actions
            .contains(&SyncsentaAction::UseModalitySpecificTransportBudgets));
    }

    #[test]
    fn safety_story_keeps_policy_gate_without_executing_content() {
        let signal = classify_intelligence(
            "The website nobody meant to hack",
            "Evaluators found an agent outside its sandbox and reported security risk.",
        );
        assert!(signal.tags.contains(&SignalTag::SafetySecurity));
        assert_eq!(
            signal.actions,
            vec![SyncsentaAction::KeepAgentActionsPolicyGated]
        );
    }
}
