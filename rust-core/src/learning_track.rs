//! Rust-owned policy contract for SyncSenta's extended learning tracks.
//!
//! This module is intentionally deterministic and dependency-free. It defines
//! the safety-sensitive domain boundary that prompt composition may consume,
//! while leaving language rendering and UI orchestration to Studio.

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TrackId {
    Ai,
    Blockchain,
    FinancialLiteracy,
}

impl TrackId {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Ai => "ai",
            Self::Blockchain => "blockchain",
            Self::FinancialLiteracy => "financial-literacy",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct TrackPolicy {
    pub id: TrackId,
    pub label: &'static str,
    pub content_version: &'static str,
    pub focus: &'static str,
    pub evidence_prompt: &'static str,
    pub safety_boundary: &'static str,
    pub offline_alternative: &'static str,
}

pub const AI_LITERACY_POLICY: TrackPolicy = TrackPolicy {
    id: TrackId::Ai,
    label: "AI Literacy",
    content_version: "2026-09-v1",
    focus: "patterns, evidence, uncertainty, bias, privacy, evaluation, and human responsibility",
    evidence_prompt: "What source, observation, or test could help us check this AI claim?",
    safety_boundary: "Treat AGI as hypothetical; do not claim consciousness, inevitability, or autonomous authority.",
    offline_alternative: "Use a sorting game, paper rule system, or teacher-approved source comparison.",
};

pub const BLOCKCHAIN_LITERACY_POLICY: TrackPolicy = TrackPolicy {
    id: TrackId::Blockchain,
    label: "Blockchain Literacy",
    content_version: "2026-09-v1",
    focus: "records, shared ledgers, consensus, governance, privacy, and database trade-offs",
    evidence_prompt: "Who records, verifies, or controls this entry, and what evidence supports it?",
    safety_boundary: "Do not request wallets, seed phrases, private keys, credentials, payments, or trading actions.",
    offline_alternative: "Use a paper shared-ledger or tamper-evident-card simulation.",
};

pub const FINANCIAL_LITERACY_POLICY: TrackPolicy = TrackPolicy {
    id: TrackId::FinancialLiteracy,
    label: "Financial Literacy",
    content_version: "2026-09-v1",
    focus: "needs, wants, budgets, saving, opportunity cost, fees, risk, and consumer protection",
    evidence_prompt: "What is the goal, what information is missing, and how can we check the total cost?",
    safety_boundary: "Use fictional scenarios only; do not give personalized investment, credit, payment, or provider advice.",
    offline_alternative: "Use invented Kenyan-shilling amounts, paper receipts, and a classroom budget.",
};

pub const fn policy_for(track: TrackId) -> &'static TrackPolicy {
    match track {
        TrackId::Ai => &AI_LITERACY_POLICY,
        TrackId::Blockchain => &BLOCKCHAIN_LITERACY_POLICY,
        TrackId::FinancialLiteracy => &FINANCIAL_LITERACY_POLICY,
    }
}

/// Classify only known extended-course aliases. Unknown subjects remain CBC
/// content and must not inherit an extended-track safety policy accidentally.
pub fn classify_subject(subject: &str) -> Option<TrackId> {
    let normalized = subject.trim().to_ascii_lowercase().replace(['_', '-'], " ");
    let value = normalized.split_whitespace().collect::<Vec<_>>().join(" ");
    match value.as_str() {
        "ai" | "agi" | "artificial intelligence" => Some(TrackId::Ai),
        "blockchain" | "crypto" | "cryptocurrency" | "web3" => Some(TrackId::Blockchain),
        "financial literacy" | "finlit" | "personal finance" => Some(TrackId::FinancialLiteracy),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn policies_have_stable_ids_and_versions() {
        assert_eq!(policy_for(TrackId::Ai).id.as_str(), "ai");
        assert_eq!(policy_for(TrackId::Blockchain).content_version, "2026-09-v1");
        assert_eq!(policy_for(TrackId::FinancialLiteracy).label, "Financial Literacy");
    }

    #[test]
    fn aliases_are_classified_without_granting_unknown_subjects() {
        assert_eq!(classify_subject("AI"), Some(TrackId::Ai));
        assert_eq!(classify_subject("financial-literacy"), Some(TrackId::FinancialLiteracy));
        assert_eq!(classify_subject("web3"), Some(TrackId::Blockchain));
        assert_eq!(classify_subject("mathematics"), None);
    }

    #[test]
    fn safety_boundaries_are_explicit() {
        assert!(policy_for(TrackId::Ai).safety_boundary.contains("hypothetical"));
        assert!(policy_for(TrackId::Blockchain).safety_boundary.contains("private keys"));
        assert!(policy_for(TrackId::FinancialLiteracy).safety_boundary.contains("fictional"));
    }
}
