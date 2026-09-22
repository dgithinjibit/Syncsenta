use anyhow::{anyhow, Result};

use super::interpreter::MettaSpace;

const RULES: &str = include_str!("../../data/omega_claw_rules.metta");

/// Typed façade over the symbolic Omega Claw student-learning rules.
///
/// The rule pack owns learning scope and progression decisions; the UI remains
/// responsible for rendering the activity and the backend remains responsible
/// for authentication, persistence, and teacher approval.
pub struct OmegaClawRules {
    space: MettaSpace,
}

impl OmegaClawRules {
    pub async fn new() -> Result<Self> {
        let interpreter = super::interpreter::MettaInterpreter::new()?;
        let space = interpreter.global_space().clone();
        let rules = Self { space };
        rules.load().await?;
        Ok(rules)
    }

    pub fn with_space(space: MettaSpace) -> Self {
        Self { space }
    }

    pub async fn load(&self) -> Result<()> {
        self.space.run(RULES).await?;
        Ok(())
    }

    pub async fn scope_for(&self, grade: &str) -> Result<&'static str> {
        let normalized = canonical_grade(grade);
        let results = self
            .space
            .query(&format!("(omega-claw-scope-for {normalized})"))
            .await?;

        if results
            .iter()
            .any(|atom| atom_symbol(atom.as_str()) == "introductory")
        {
            return Ok("introductory");
        }
        if results
            .iter()
            .any(|atom| atom_symbol(atom.as_str()) == "senior-deep")
        {
            return Ok("senior-deep");
        }
        Ok("blocked")
    }

    pub async fn is_activity_allowed(&self, grade: &str, activity: &str) -> Result<bool> {
        if self.scope_for(grade).await? == "blocked" {
            return Ok(false);
        }

        let activity = canonical_activity(activity);
        let grade = canonical_grade(grade);
        let results = self
            .space
            .query(&format!("(omega-claw-activity {grade} {activity})"))
            .await?;
        Ok(!results.is_empty())
    }

    pub async fn next_action_for_outcome(&self, outcome: &str) -> Result<&'static str> {
        let outcome = canonical_token(outcome);
        let result = first_symbol(
            self.space
                .query(&format!("(omega-claw-next-action {outcome})"))
                .await?,
        )?;
        match result.as_str() {
            "scaffold-retry" => Ok("scaffold-retry"),
            "celebrate-transfer" => Ok("celebrate-transfer"),
            "mastery-review" => Ok("mastery-review"),
            "unlock-next-node" => Ok("unlock-next-node"),
            _ => Err(anyhow!("unknown Omega Claw progression action: {result}")),
        }
    }

    pub async fn hint_for(&self, hint_level: u8) -> Result<&'static str> {
        let level = hint_level.clamp(1, 4);
        let result = first_symbol(
            self.space
                .query(&format!("(omega-claw-hint {level})"))
                .await?,
        )?;
        match result.as_str() {
            "notice" => Ok("notice"),
            "isolate-step" => Ok("isolate-step"),
            "representation" => Ok("representation"),
            "worked-example" => Ok("worked-example"),
            _ => Err(anyhow!("unknown Omega Claw hint: {result}")),
        }
    }

    pub async fn can_unlock_transfer(&self, correct: bool, explained: bool) -> Result<bool> {
        let result = first_symbol(
            self.space
                .query(&format!(
                    "(omega-claw-can-unlock-transfer {} {})",
                    bool_atom(correct),
                    bool_atom(explained)
                ))
                .await?,
        )?;
        Ok(result == "yes")
    }
}

fn first_symbol(atoms: Vec<super::interpreter::AtomString>) -> Result<String> {
    atoms
        .first()
        .map(|atom| atom_symbol(atom.as_str()))
        .ok_or_else(|| anyhow!("Omega Claw rule returned no result"))
}

fn atom_symbol(atom: &str) -> String {
    atom.trim()
        .trim_start_matches('(')
        .trim_end_matches(')')
        .split_whitespace()
        .last()
        .unwrap_or_default()
        .to_string()
}

fn bool_atom(value: bool) -> &'static str {
    if value {
        "true"
    } else {
        "false"
    }
}

fn canonical_grade(grade: &str) -> String {
    let compact = grade.to_ascii_lowercase().replace([' ', '-', '_'], "");
    match compact.as_str() {
        "g6" | "grade6" => "grade6".to_string(),
        "g10" | "grade10" => "grade10".to_string(),
        "g11" | "grade11" => "grade11".to_string(),
        "g12" | "grade12" => "grade12".to_string(),
        "senior" | "seniorschool" => "senior-school".to_string(),
        _ => compact,
    }
}

fn canonical_activity(activity: &str) -> String {
    canonical_token(activity)
}

fn canonical_token(value: &str) -> String {
    value.trim().to_ascii_lowercase().replace([' ', '_'], "-")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn grade_six_is_introductory_and_lower_grades_are_blocked() {
        let rules = OmegaClawRules::new().await.unwrap();

        assert_eq!(rules.scope_for("Grade 6").await.unwrap(), "introductory");
        assert_eq!(rules.scope_for("Grade 11").await.unwrap(), "senior-deep");
        assert_eq!(rules.scope_for("Grade 5").await.unwrap(), "blocked");
        assert!(rules
            .is_activity_allowed("Grade 6", "ai-input-output")
            .await
            .unwrap());
        assert!(!rules
            .is_activity_allowed("Grade 5", "ai-input-output")
            .await
            .unwrap());
    }

    #[tokio::test]
    async fn progression_scaffolds_mistakes_and_requires_transfer_after_success() {
        let rules = OmegaClawRules::new().await.unwrap();

        assert_eq!(
            rules.next_action_for_outcome("incorrect").await.unwrap(),
            "scaffold-retry"
        );
        assert_eq!(
            rules.next_action_for_outcome("correct").await.unwrap(),
            "celebrate-transfer"
        );
        assert!(!rules.can_unlock_transfer(true, false).await.unwrap());
        assert!(rules.can_unlock_transfer(true, true).await.unwrap());
        assert_eq!(rules.hint_for(1).await.unwrap(), "notice");
        assert_eq!(rules.hint_for(4).await.unwrap(), "worked-example");
    }
}
