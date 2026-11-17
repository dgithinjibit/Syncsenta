// System Orchestration — Task 2.1
//
// Routes higher-level dApp operations through the MeTTa reasoning engine and
// returns a typed decision the caller can act on. The richer orchestrator
// scaffolding (service registry, health monitoring, execution engine) lives
// in `orchestrator.rs` and ships in Task 2.3 — this module deliberately
// offers only the minimum surface needed to bootstrap MeTTa-mediated
// decisions in Task 2.1.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use super::reasoning::{Query, ReasoningEngine};

/// What a caller wants the system to decide. Domain-specific orchestrators
/// (auth, assessment, content) feed concrete fields here.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrchestrationRequest {
    pub operation: String,
    pub subject: Option<String>,
    pub object: Option<String>,
    pub session: Option<uuid::Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OrchestrationOutcome {
    Allow,
    Deny,
    Review,
    Custom(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrchestrationResponse {
    pub outcome: OrchestrationOutcome,
    pub trace: Vec<String>,
}

pub struct SystemOrchestrator {
    reasoning: Arc<ReasoningEngine>,
}

impl SystemOrchestrator {
    pub fn new() -> Result<Self> {
        Ok(Self {
            reasoning: Arc::new(ReasoningEngine::new()?),
        })
    }

    pub fn with_reasoning(reasoning: Arc<ReasoningEngine>) -> Self {
        Self { reasoning }
    }

    /// Translate a request into a MeTTa query and interpret the result.
    pub async fn orchestrate(
        &self,
        req: OrchestrationRequest,
    ) -> Result<OrchestrationResponse> {
        let expression = match (&req.subject, &req.object) {
            (Some(s), Some(o)) => format!("(! (has-permission {s} {o}))"),
            (Some(s), None) => format!("(! (role {s}))"),
            _ => format!("(! ({}))", req.operation),
        };

        let result = self
            .reasoning
            .query(Query {
                expression: expression.clone(),
                session: req.session,
            })
            .await?;

        let outcome = if result.atoms.iter().any(|a| a.contains("review")) {
            OrchestrationOutcome::Review
        } else if result
            .atoms
            .iter()
            .any(|a| a.contains("true") || a.contains("allow"))
        {
            OrchestrationOutcome::Allow
        } else if result.atoms.is_empty() {
            OrchestrationOutcome::Deny
        } else {
            OrchestrationOutcome::Custom(result.atoms.join(" | "))
        };

        Ok(OrchestrationResponse {
            outcome,
            trace: vec![expression, format!("atoms={:?}", result.atoms)],
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn empty_atomspace_denies() {
        let orch = SystemOrchestrator::new().unwrap();
        let resp = orch
            .orchestrate(OrchestrationRequest {
                operation: "noop".into(),
                subject: None,
                object: None,
                session: None,
            })
            .await
            .unwrap();
        assert!(matches!(resp.outcome, OrchestrationOutcome::Deny));
    }
}
