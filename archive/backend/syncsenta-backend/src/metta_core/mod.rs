// MeTTa Core Engine — Task 2.1
//
// Central reasoning system for SyncSenta's Web4 dApp. The four submodules
// below are the foundation for all higher-level intelligence:
//
//   * `interpreter`  — wraps the `hyperon` MeTTa runtime (with an in-process
//                      fallback when the `metta` cargo feature is disabled).
//                      Provides per-session atomspaces for concurrent
//                      reasoning.
//   * `knowledge_base` — durable persistence of asserted atoms via PostgreSQL
//                      and IPFS, plus the educational domain seed schema.
//   * `reasoning`    — high-level rule packs and query API on top of the
//                      interpreter.
//   * `orchestration` — translates dApp operations into MeTTa queries and
//                      produces typed decisions for the rest of the backend.

pub mod interpreter;
pub mod knowledge_base;
pub mod orchestration;
pub mod reasoning;
pub mod omega_claw;

pub use interpreter::{AtomString, MettaInterpreter, MettaSpace, SpaceId};
pub use knowledge_base::{AtomDomain, IpfsBackend, KnowledgeBase, NullIpfs, PersistedAtom};
pub use omega_claw::OmegaClawRules;
pub use orchestration::{
    OrchestrationOutcome, OrchestrationRequest, OrchestrationResponse, SystemOrchestrator,
};
pub use reasoning::{Query, QueryResult, ReasoningEngine, RulePack};

use anyhow::Result;
use std::sync::Arc;

/// MeTTa Core Engine — central control for all dApp operations.
///
/// All submodules share the same underlying `MettaInterpreter` so that
/// atoms asserted by the knowledge base are visible to the reasoning engine
/// and orchestrator.
pub struct MettaCore {
    pub interpreter: Arc<MettaInterpreter>,
    pub knowledge_base: KnowledgeBase,
    pub reasoning_engine: Arc<ReasoningEngine>,
    pub orchestrator: SystemOrchestrator,
    pub omega_claw: OmegaClawRules,
}

impl MettaCore {
    pub fn new() -> Result<Self> {
        let interpreter = Arc::new(MettaInterpreter::new()?);
        let knowledge_base = KnowledgeBase::with_interpreter(interpreter.clone());
        let reasoning_engine = Arc::new(ReasoningEngine::with_interpreter(interpreter.clone()));
        let orchestrator = SystemOrchestrator::with_reasoning(reasoning_engine.clone());
        let omega_claw = OmegaClawRules::with_space(interpreter.global_space().clone());

        Ok(Self {
            interpreter,
            knowledge_base,
            reasoning_engine,
            orchestrator,
            omega_claw,
        })
    }

    /// Boot-time hook: load curriculum and reasoning rules.
    pub async fn initialize(&mut self) -> Result<()> {
        self.knowledge_base.load_curriculum().await?;
        self.reasoning_engine.load_rules().await?;
        self.omega_claw.load().await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn metta_core_initialises_end_to_end() {
        let mut core = MettaCore::new().unwrap();
        core.initialize().await.unwrap();

        let count = core.interpreter.global_space().atom_count().await;
        assert!(count > 0);
        assert!(!core.reasoning_engine.loaded_rule_packs().await.is_empty());
    }

    #[tokio::test]
    async fn orchestrator_consults_shared_atomspace() {
        let mut core = MettaCore::new().unwrap();
        core.initialize().await.unwrap();

        let resp = core
            .orchestrator
            .orchestrate(OrchestrationRequest {
                operation: "check_role".into(),
                subject: Some("teacher".into()),
                object: None,
                session: None,
            })
            .await
            .unwrap();

        // The seed schema asserts `(role teacher)`, so the orchestrator
        // should not fall through to a flat Deny.
        assert!(!matches!(resp.outcome, OrchestrationOutcome::Deny));
    }

    #[tokio::test]
    async fn omega_claw_rules_load_into_shared_core() {
        let mut core = MettaCore::new().unwrap();
        core.initialize().await.unwrap();

        assert_eq!(core.omega_claw.scope_for("Grade 6").await.unwrap(), "introductory");
        assert!(core
            .omega_claw
            .is_activity_allowed("Grade 11", "blockchain-consensus")
            .await
            .unwrap());
        assert!(!core
            .omega_claw
            .is_activity_allowed("Grade 5", "ai-input-output")
            .await
            .unwrap());
    }
}
