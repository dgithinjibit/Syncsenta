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
    /// The pack is asserted once, no matter how many times `load` is called.
    loaded: tokio::sync::OnceCell<Result<(), String>>,
}

impl OmegaClawRules {
    pub async fn new() -> Result<Self> {
        let interpreter = super::interpreter::MettaInterpreter::new()?;
        let space = interpreter.global_space().clone();
        let rules = Self {
            space,
            loaded: tokio::sync::OnceCell::new(),
        };
        rules.load().await?;
        Ok(rules)
    }

    pub fn with_space(space: MettaSpace) -> Self {
        Self {
            space,
            loaded: tokio::sync::OnceCell::new(),
        }
    }

    /// Assert the rule pack into the space, once.
    ///
    /// Every HTTP handler in `handlers/omega_claw.rs` calls this before it asks a
    /// question, so without the guard the pack was re-asserted on every request:
    /// `(omega-claw-activity grade6 ai-input-output)` existed three times after
    /// two visitors, `activities_for` returned the path with duplicates, and the
    /// space grew without bound. `include_str!` means the bytes cannot change at
    /// runtime, so re-running them can only add copies.
    ///
    /// A failure is cached rather than retried. The pack is compiled into the
    /// binary, so if it does not parse it never will, and `new` propagates this
    /// error before the service can build its state.
    pub async fn load(&self) -> Result<()> {
        let outcome = self
            .loaded
            .get_or_init(|| async { self.space.run(RULES).await.map(|_| ()).map_err(|e| e.to_string()) })
            .await;
        match outcome {
            Ok(()) => Ok(()),
            Err(message) => Err(anyhow!("Omega Claw rule pack failed to load: {message}")),
        }
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

    /// The activities a grade walks, in the order the pack lists them.
    ///
    /// `is_activity_allowed/2` answers one pair at a time, which is what the
    /// gate needs and nothing more — it cannot tell a learner what path exists.
    /// A caller that wants a path used to write the set down a second time in
    /// the component, and copies of a rule set drift. This derives the list from
    /// the pack's own rows so the UI can ask.
    ///
    /// Order is pack order, not sorted, because the sequence is the path. A
    /// blocked grade yields an empty list rather than an error: "no activities"
    /// and "I do not understand that grade" are the same answer to a learner, and
    /// `canonical_grade` makes every CBC spelling of a real grade arrive at the
    /// same rows.
    pub async fn activities_for(&self, grade: &str) -> Result<Vec<String>> {
        if self.scope_for(grade).await? == "blocked" {
            return Ok(Vec::new());
        }

        let normalized = canonical_grade(grade);
        let results = self
            .space
            .query(&format!("(omega-claw-activity {normalized} $activity)"))
            .await?;
        Ok(results
            .iter()
            .map(|atom| atom_symbol(atom.as_str()))
            .collect())
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

    /// Whether transfer is proven and the next node may open.
    ///
    /// The pack states this as one positive rule plus a catch-all:
    /// `(= (… true true) yes)` and `(= (… $correct $explained) no)`. Both heads
    /// match `(… true true)`, and MeTTa answers a pattern query with *every*
    /// match rather than the most specific one, so "take the first result" would
    /// depend on the order the rules were written in. `any(… == "yes")` reads the
    /// pack the way it is meant to be read: transfer is unlocked when a rule
    /// says so, and the absence of such a rule — including a pack that fails to
    /// load — defaults to locked.
    pub async fn can_unlock_transfer(&self, correct: bool, explained: bool) -> Result<bool> {
        let results = self
            .space
            .query(&format!(
                "(omega-claw-can-unlock-transfer {} {})",
                bool_atom(correct),
                bool_atom(explained)
            ))
            .await?;
        Ok(results
            .iter()
            .any(|atom| atom_symbol(atom.as_str()) == "yes"))
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

    /// O-3: the learner-facing path has to be *listed*, not just checked.
    ///
    /// `is_activity_allowed/2` answers one pair at a time, which is what the
    /// gate needs and nothing more. Nothing in this service could say "these are
    /// the activities a Grade 6 learner walks", so the set was written down a
    /// second time in the React component — where it had already drifted: it
    /// carried `blockchain-consensus`, a Senior School row this pack would
    /// refuse for Grade 6, and `explain-your-thinking`, which the pack has never
    /// heard of. Listing belongs here, derived from the pack's own rows, and the
    /// UI asks.
    ///
    /// Order is pack order, not sorted, because the sequence is the path.
    #[tokio::test]
    async fn grade_six_lists_exactly_the_three_activities_the_pack_approves() {
        let rules = OmegaClawRules::new().await.unwrap();

        assert_eq!(
            rules.activities_for("Grade 6").await.unwrap(),
            vec![
                "ai-input-output",
                "blockchain-shared-record",
                "responsible-digital-citizenship",
            ]
        );
    }

    #[tokio::test]
    async fn listing_agrees_with_the_predicate_on_every_row_it_returns() {
        let rules = OmegaClawRules::new().await.unwrap();

        for grade in ["Grade 6", "Grade 10", "Grade 11", "Grade 12", "Senior School"] {
            for activity in rules.activities_for(grade).await.unwrap() {
                assert!(
                    rules
                        .is_activity_allowed(grade, &activity)
                        .await
                        .unwrap(),
                    "{grade} listed {activity} but the predicate refuses it"
                );
            }
        }
    }

    #[tokio::test]
    async fn grade_ten_does_not_inherit_the_senior_school_rows() {
        let rules = OmegaClawRules::new().await.unwrap();

        // `is_activity_allowed` matches the grade column literally, so listing
        // must too — otherwise the card renders an activity the gate then
        // refuses and the learner is told no twice.
        assert_eq!(
            rules.activities_for("Grade 10").await.unwrap(),
            vec!["ai-data-literacy", "blockchain-consensus"]
        );
        assert!(!rules
            .activities_for("Grade 10")
            .await
            .unwrap()
            .contains(&"blockchain-governance".to_string()));
    }

    #[tokio::test]
    async fn a_grade_can_arrive_in_any_of_the_spellings_a_cbc_record_uses() {
        let rules = OmegaClawRules::new().await.unwrap();
        let expected = rules.activities_for("grade6").await.unwrap();

        for spelling in ["Grade 6", "grade-6", "G6", "  grade_6 "] {
            assert_eq!(
                rules.activities_for(spelling).await.unwrap(),
                expected,
                "canonical_grade should fold {spelling}"
            );
        }
    }

    /// Loading is not the same operation as being asked to load again.
    ///
    /// Each of the four handlers calls `load()` before answering, so an
    /// unguarded `load` asserted the pack once per request. After two visitors
    /// the Grade 6 path contained nine entries — three copies of three
    /// activities — and the atom count grew by 35 every request after that.
    #[tokio::test]
    async fn loading_repeatedly_asserts_the_pack_once() {
        let rules = OmegaClawRules::new().await.unwrap();
        let before = rules.space.atom_count().await;

        for _ in 0..20 {
            rules.load().await.unwrap();
        }

        assert_eq!(rules.space.atom_count().await, before);
        assert_eq!(rules.activities_for("Grade 6").await.unwrap().len(), 3);
    }

    #[tokio::test]
    async fn a_blocked_grade_lists_nothing_rather_than_erroring() {
        let rules = OmegaClawRules::new().await.unwrap();

        assert!(rules.activities_for("Grade 4").await.unwrap().is_empty());
        assert!(rules.activities_for("").await.unwrap().is_empty());
    }

    /// The catch-all transfer rule has to actually answer.
    ///
    /// `(= (omega-claw-can-unlock-transfer $correct $explained) no)` puts its
    /// variables in the stored rule head. While the fallback matcher honoured
    /// `$` only in the query, that rule matched nothing, so every request that
    /// was not exactly `true true` failed with "Omega Claw rule returned no
    /// result" instead of answering `no` — a progression endpoint that errors on
    /// the common case (a wrong answer) and only works when the learner has
    /// already passed.
    #[tokio::test]
    async fn a_pair_the_positive_rule_excludes_still_gets_an_answer() {
        let rules = OmegaClawRules::new().await.unwrap();

        assert!(!rules.can_unlock_transfer(true, false).await.unwrap());
        assert!(!rules.can_unlock_transfer(false, true).await.unwrap());
        assert!(!rules.can_unlock_transfer(false, false).await.unwrap());
        assert!(rules.can_unlock_transfer(true, true).await.unwrap());
    }

    /// Serving a learner must not slowly eat the process.
    ///
    /// Each of these look-ups used to assert its own question into the shared
    /// atomspace, so `atom_count` climbed with traffic and never came back down.
    #[tokio::test]
    async fn answering_a_learner_never_grows_the_space() {
        let rules = OmegaClawRules::new().await.unwrap();
        let before = rules.space.atom_count().await;

        for _ in 0..50 {
            rules.scope_for("Grade 6").await.unwrap();
            rules.activities_for("Grade 10").await.unwrap();
            rules
                .is_activity_allowed("Grade 11", "ai-data-literacy")
                .await
                .unwrap();
            rules.can_unlock_transfer(true, true).await.unwrap();
        }

        assert_eq!(rules.space.atom_count().await, before);
    }
}
