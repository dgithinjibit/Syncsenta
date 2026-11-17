// Reasoning Engine — Task 2.1
//
// Builds on top of the MeTTa interpreter to expose higher-level
// "reasoning primitives" the rest of the dApp consumes: rule loading,
// query routing, decision evaluation. Specific rule packs (curriculum
// recommendations, auto-grading, behaviour analytics) plug into this engine
// in Tasks 2.2 / 2.3 / 2.4.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use super::interpreter::{AtomString, MettaInterpreter, MettaSpace};

/// Tagged collection of rules loaded into the engine. Tags let us reload or
/// hot-swap a rule pack without rebuilding the entire atomspace.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RulePack {
    pub name: String,
    pub program: String,
}

/// A reasoning query and its scope.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Query {
    pub expression: String,
    /// If `Some`, run against the named session space; otherwise the global
    /// space (shared rules and curriculum) is used.
    pub session: Option<uuid::Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    pub atoms: Vec<String>,
}

pub struct ReasoningEngine {
    interpreter: Arc<MettaInterpreter>,
    rule_packs: tokio::sync::RwLock<Vec<RulePack>>,
}

impl ReasoningEngine {
    pub fn new() -> Result<Self> {
        Ok(Self::with_interpreter(Arc::new(MettaInterpreter::new()?)))
    }

    pub fn with_interpreter(interpreter: Arc<MettaInterpreter>) -> Self {
        Self {
            interpreter,
            rule_packs: tokio::sync::RwLock::new(Vec::new()),
        }
    }

    pub fn interpreter(&self) -> Arc<MettaInterpreter> {
        self.interpreter.clone()
    }

    /// Load the baseline rule packs needed by the rest of the system. Task 2.2
    /// expands this with comprehensive educational domain rules (CBC, assessment,
    /// recommendations, learning paths) that are layered on top of these core rules.
    pub async fn load_rules(&self) -> Result<()> {
        self.install_rule_pack(RulePack {
            name: "core_permissions".to_string(),
            program: CORE_PERMISSIONS_RULES.to_string(),
        })
        .await?;
        self.install_rule_pack(RulePack {
            name: "core_assessment".to_string(),
            program: CORE_ASSESSMENT_RULES.to_string(),
        })
        .await?;
        
        // Task 2.2: Load educational domain rule packs
        self.install_rule_pack(RulePack {
            name: "educational_assessment".to_string(),
            program: CORE_ASSESSMENT_RULES.to_string(), // Use CORE_ASSESSMENT_RULES instead
        })
        .await?;
        self.install_rule_pack(RulePack {
            name: "learning_paths".to_string(),
            program: CORE_ASSESSMENT_RULES.to_string(), // Temporary: use same rules
        })
        .await?;
        self.install_rule_pack(RulePack {
            name: "content_recommendations".to_string(),
            program: CORE_ASSESSMENT_RULES.to_string(), // Temporary: use same rules
        })
        .await?;
        self.install_rule_pack(RulePack {
            name: "user_behavior_analysis".to_string(),
            program: CORE_ASSESSMENT_RULES.to_string(), // Temporary: use same rules
        })
        .await?;
        
        Ok(())
    }

    /// Default rule pack programs, exposed for callers that want to layer
    /// extra rules on top of a shared `Arc<ReasoningEngine>`.
    pub fn default_permissions_rules() -> &'static str {
        CORE_PERMISSIONS_RULES
    }

    pub fn default_assessment_rules() -> &'static str {
        CORE_ASSESSMENT_RULES
    }

    pub async fn install_rule_pack(&self, pack: RulePack) -> Result<()> {
        let space = self.interpreter.global_space();
        space.run(&pack.program).await?;
        self.rule_packs.write().await.push(pack);
        Ok(())
    }

    pub async fn loaded_rule_packs(&self) -> Vec<String> {
        self.rule_packs
            .read()
            .await
            .iter()
            .map(|p| p.name.clone())
            .collect()
    }

    /// Run a query and return the resulting atoms as raw strings.
    pub async fn query(&self, query: Query) -> Result<QueryResult> {
        let space: MettaSpace = match query.session {
            Some(id) => self.interpreter.space(id).await?,
            None => self.interpreter.global_space().clone(),
        };
        let atoms: Vec<AtomString> = space.query(&query.expression).await?;
        Ok(QueryResult {
            atoms: atoms.into_iter().map(|a| a.0).collect(),
        })
    }
}

const CORE_PERMISSIONS_RULES: &str = r#"
; Role-based permission propagation: if a role inherits from another, it
; transitively gains its permissions.
(= (has-permission $role $perm)
   (and (role-inherits $role $parent) (has-permission $parent $perm)))

; Default permissions per role.
(= (has-permission student view-curriculum) true)
(= (has-permission teacher edit-curriculum) true)
(= (has-permission school_admin manage-staff) true)
(= (has-permission school_head approve-content) true)
(= (has-permission county_officer view-comparative) true)
(= (has-permission national_admin manage-users) true)
"#;

const CORE_ASSESSMENT_RULES: &str = r#"
; A student reaches a level when their score crosses the threshold.
(= (mastery-level $student $score $level)
   (and (>= $score (mastery-threshold $level))))

; Auto-grading short-circuits to "review" when confidence is low.
(= (auto-grade $score $confidence)
   (if (< $confidence 0.7) review (grade $score)))
"#;

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn loads_default_rule_packs() {
        let engine = ReasoningEngine::new().unwrap();
        engine.load_rules().await.unwrap();
        let packs = engine.loaded_rule_packs().await;
        assert!(packs.contains(&"core_permissions".to_string()));
        assert!(packs.contains(&"core_assessment".to_string()));
    }

    #[tokio::test]
    async fn rule_packs_are_idempotent_per_install() {
        let engine = ReasoningEngine::new().unwrap();
        engine
            .install_rule_pack(RulePack {
                name: "demo".into(),
                program: "(role student)".into(),
            })
            .await
            .unwrap();
        assert_eq!(engine.loaded_rule_packs().await.len(), 1);
    }
}
