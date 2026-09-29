// MeTTa Interpreter — Task 2.1
//
// Wraps the `hyperon` crate when the `metta` cargo feature is enabled and
// otherwise falls back to a small in-process symbolic engine that implements
// the same surface API. The fallback exists so the workspace compiles in
// environments without the hyperon native build toolchain (cmake, libgit2,
// etc.) — all higher layers (knowledge base, reasoning, orchestrator) are
// agnostic to which backend is in use.
//
// Concurrency model: each `MettaSpace` owns its own backend and is wrapped in
// an `Arc<Mutex<...>>` so multiple async tasks can share a reasoning session.
// The interpreter additionally maintains a registry of named spaces so the
// rest of the system can look up a session by id (e.g. one space per user
// reasoning context).

use anyhow::{anyhow, Result};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use uuid::Uuid;

/// Identifier for a concurrent MeTTa reasoning session.
pub type SpaceId = Uuid;

/// A single result atom produced by the runtime, normalised to its textual
/// MeTTa s-expression form. Higher layers parse this back into typed values.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AtomString(pub String);

impl AtomString {
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

/// A MeTTa atomspace dedicated to one reasoning session. Cheap to clone — the
/// inner state is reference-counted.
#[derive(Clone)]
pub struct MettaSpace {
    inner: Arc<Mutex<Backend>>,
}

impl MettaSpace {
    fn new() -> Result<Self> {
        Ok(Self {
            inner: Arc::new(Mutex::new(Backend::new()?)),
        })
    }

    /// Load a MeTTa program (a sequence of top-level atoms / rules) into the
    /// space. Returns the result of each top-level expression.
    pub async fn run(&self, program: &str) -> Result<Vec<Vec<AtomString>>> {
        let mut backend = self.inner.lock().await;
        backend.run(program)
    }

    /// Add a single atom or rule to the space without evaluating it. This is
    /// the typical path used by the knowledge base when ingesting curriculum
    /// or rule data — evaluation happens later via [`MettaSpace::query`].
    pub async fn add_atom(&self, atom: &str) -> Result<()> {
        let mut backend = self.inner.lock().await;
        backend.add_atom(atom)
    }

    /// Evaluate a MeTTa expression against the current contents of the space
    /// and return the resulting atoms.
    ///
    /// A query must never become an assertion. Both engines this class wraps
    /// treat a *bare* pattern as a fact to add: MeTTa asserts `(rel arg)` and
    /// matches `!(rel arg)`; the fallback engine asserts anything that is not
    /// `(= …)` or `(! …)` (`fallback_backend::eval_top_level`) and returns the
    /// asserted pattern as if it were a match. Every caller in this crate passes
    /// a bare pattern — `omega_claw.rs`, `reasoning.rs`, `orchestration.rs` —
    /// so before this normalisation `scope_for("Grade 6")` inserted
    /// `(omega-claw-scope-for grade6)` into the space, got that string back, read
    /// its last token (`grade6`), matched neither `introductory` nor
    /// `senior-deep`, and answered `blocked`. `is_activity_allowed` then refused
    /// every activity for every learner, and each request permanently grew the
    /// space.
    ///
    /// Wrapping happens here rather than at the call sites because the two
    /// engines spell a query differently, and no caller should have to know which
    /// one is compiled in.
    pub async fn query(&self, expression: &str) -> Result<Vec<AtomString>> {
        let trimmed = expression.trim();
        let already_a_query = trimmed.starts_with("(!") || trimmed.starts_with("!(");
        let expression = if already_a_query {
            trimmed.to_string()
        } else {
            query_form(trimmed)
        };
        let mut backend = self.inner.lock().await;
        backend.query(&expression)
    }

    /// Number of atoms currently asserted in the space (excluding rule
    /// metadata). Used by the knowledge base for persistence diff'ing.
    pub async fn atom_count(&self) -> usize {
        self.inner.lock().await.atom_count()
    }
}

/// Top-level MeTTa interpreter — owns a registry of named atomspaces so that
/// concurrent reasoning sessions remain isolated.
pub struct MettaInterpreter {
    spaces: RwLock<HashMap<SpaceId, MettaSpace>>,
    /// A shared "global" space for cross-cutting rules (curriculum, role
    /// hierarchy) that every session inherits as a starting fact set.
    global: MettaSpace,
}

impl MettaInterpreter {
    pub fn new() -> Result<Self> {
        Ok(Self {
            spaces: RwLock::new(HashMap::new()),
            global: MettaSpace::new()?,
        })
    }

    /// Borrow the global atomspace.
    pub fn global_space(&self) -> &MettaSpace {
        &self.global
    }

    /// Create a fresh per-session atomspace and return its identifier.
    pub async fn create_space(&self) -> Result<SpaceId> {
        let id = Uuid::new_v4();
        let space = MettaSpace::new()?;
        self.spaces.write().await.insert(id, space);
        Ok(id)
    }

    /// Look up an existing session space.
    pub async fn space(&self, id: SpaceId) -> Result<MettaSpace> {
        self.spaces
            .read()
            .await
            .get(&id)
            .cloned()
            .ok_or_else(|| anyhow!("metta space {id} not found"))
    }

    /// Drop a session space.
    pub async fn drop_space(&self, id: SpaceId) -> Result<()> {
        self.spaces.write().await.remove(&id);
        Ok(())
    }

    /// Convenience: run a program directly against the global space.
    pub async fn execute(&self, program: &str) -> Result<Vec<Vec<AtomString>>> {
        self.global.run(program).await
    }
}

impl Default for MettaInterpreter {
    fn default() -> Self {
        Self::new().expect("metta interpreter init")
    }
}

// ─── Backend implementations ────────────────────────────────────────────────

#[cfg(feature = "metta")]
mod hyperon_backend {
    use super::AtomString;
    use anyhow::Result;
    use hyperon::metta::runner::{Metta, SExprParser};

    pub struct Backend {
        runtime: Metta,
        atom_count: usize,
    }

    impl Backend {
        pub fn new() -> Result<Self> {
            Ok(Self {
                runtime: Metta::new(None),
                atom_count: 0,
            })
        }

        pub fn run(&mut self, program: &str) -> Result<Vec<Vec<AtomString>>> {
            let parser = SExprParser::new(program);
            let results = self
                .runtime
                .run(parser)
                .map_err(|e| anyhow::anyhow!("metta run: {e}"))?;
            self.atom_count += results.iter().map(|r| r.len()).sum::<usize>();
            Ok(results
                .into_iter()
                .map(|atoms| atoms.into_iter().map(|a| AtomString(format!("{a}"))).collect())
                .collect())
        }

        pub fn add_atom(&mut self, atom: &str) -> Result<()> {
            // Adding an atom is just running a no-op-evaluated program where
            // the top-level atom becomes part of the space.
            self.run(atom)?;
            self.atom_count += 1;
            Ok(())
        }

        pub fn query(&mut self, expression: &str) -> Result<Vec<AtomString>> {
            let results = self.run(expression)?;
            Ok(results.into_iter().flatten().collect())
        }

        pub fn atom_count(&self) -> usize {
            self.atom_count
        }
    }
}

#[cfg(not(feature = "metta"))]
mod fallback_backend {
    //! Pure-Rust fallback engine.
    //!
    //! It is *not* a complete MeTTa interpreter; it implements just enough of
    //! the surface area to drive the educational rule set used by SyncSenta:
    //! - asserts ground facts of the form `(rel arg1 arg2 ...)`
    //! - evaluates simple equality rewrites of the form `(= (lhs ...) rhs)`
    //! - answers queries by linear unification against asserted facts /
    //!   rewrites
    //!
    //! When the `metta` feature is enabled the real hyperon runtime replaces
    //! this entirely. Until then this lets every higher layer be exercised
    //! end-to-end in tests and in CI environments without native deps.

    use super::AtomString;
    use anyhow::Result;

    pub struct Backend {
        atoms: Vec<String>,
        rewrites: Vec<(String, String)>,
    }

    impl Backend {
        pub fn new() -> Result<Self> {
            Ok(Self {
                atoms: Vec::new(),
                rewrites: Vec::new(),
            })
        }

        pub fn run(&mut self, program: &str) -> Result<Vec<Vec<AtomString>>> {
            let mut results = Vec::new();
            let stripped = strip_line_comments(program);
            for expr in split_top_level(&stripped) {
                let trimmed = expr.trim();
                if trimmed.is_empty() {
                    continue;
                }
                let evaluated = self.eval_top_level(trimmed)?;
                results.push(evaluated);
            }
            Ok(results)
        }

        pub fn add_atom(&mut self, atom: &str) -> Result<()> {
            self.atoms.push(atom.trim().to_string());
            Ok(())
        }

        pub fn query(&mut self, expression: &str) -> Result<Vec<AtomString>> {
            let results = self.run(expression)?;
            Ok(results.into_iter().flatten().collect())
        }

        pub fn atom_count(&self) -> usize {
            self.atoms.len() + self.rewrites.len()
        }

        // ── internal ──────────────────────────────────────────────────────

        fn eval_top_level(&mut self, expr: &str) -> Result<Vec<AtomString>> {
            // `(= lhs rhs)` registers a rewrite rule.
            if let Some(rest) = expr.strip_prefix("(=").and_then(|r| r.strip_suffix(")")) {
                let (lhs, rhs) = split_two(rest.trim())?;
                self.rewrites.push((lhs, rhs));
                return Ok(Vec::new());
            }
            // `(! query)` evaluates `query` against the space.
            if let Some(rest) = expr.strip_prefix("(!").and_then(|r| r.strip_suffix(")")) {
                return Ok(self.match_facts(rest.trim()));
            }
            // Otherwise treat the expression as a fact assertion.
            self.atoms.push(expr.to_string());
            Ok(vec![AtomString(expr.to_string())])
        }

        fn match_facts(&self, query: &str) -> Vec<AtomString> {
            let mut hits = Vec::new();
            for atom in &self.atoms {
                if pattern_match(query, atom) {
                    hits.push(AtomString(atom.clone()));
                }
            }
            for (lhs, rhs) in &self.rewrites {
                if pattern_match(query, lhs) {
                    hits.push(AtomString(rhs.clone()));
                }
            }
            hits
        }
    }

    fn strip_line_comments(program: &str) -> String {
        // MeTTa uses `;` as a line-comment delimiter.
        program
            .lines()
            .map(|line| match line.find(';') {
                Some(idx) => &line[..idx],
                None => line,
            })
            .collect::<Vec<_>>()
            .join("\n")
    }

    fn split_top_level(program: &str) -> Vec<String> {
        let mut out = Vec::new();
        let mut depth = 0i32;
        let mut current = String::new();
        for ch in program.chars() {
            match ch {
                '(' => {
                    depth += 1;
                    current.push(ch);
                }
                ')' => {
                    depth -= 1;
                    current.push(ch);
                    if depth == 0 {
                        out.push(std::mem::take(&mut current));
                    }
                }
                _ if depth == 0 && ch.is_whitespace() => {
                    if !current.is_empty() {
                        out.push(std::mem::take(&mut current));
                    }
                }
                _ => current.push(ch),
            }
        }
        if !current.trim().is_empty() {
            out.push(current);
        }
        out
    }

    fn split_two(s: &str) -> Result<(String, String)> {
        let mut depth = 0i32;
        for (i, ch) in s.char_indices() {
            match ch {
                '(' => depth += 1,
                ')' => depth -= 1,
                _ if depth == 0 && ch.is_whitespace() => {
                    let (a, b) = s.split_at(i);
                    return Ok((a.trim().to_string(), b.trim().to_string()));
                }
                _ => {}
            }
        }
        anyhow::bail!("expected two sub-expressions in `{s}`")
    }

    fn pattern_match(pattern: &str, atom: &str) -> bool {
        // Variable-aware match: `$x` matches any single token at the same
        // position — on *either* side.
        //
        // It has to be either side because a rule is stored as a `(lhs, rhs)`
        // rewrite and reaches here as the `atom` argument. In
        // `(= (omega-claw-can-unlock-transfer $correct $explained) no)` the
        // variables live in `atom`, so a matcher that only honours `$` in
        // `pattern` compares `true` against `$correct`, fails, and the catch-all
        // becomes unanswerable: the façade reports "Omega Claw rule returned no
        // result" for a rule that plainly applies. The same is true of
        // `(= (omega-claw-scope-for $lower-grade) blocked)`, which is why
        // `scope_for` only ever reached `blocked` by its own default branch.
        //
        // NOT implemented: repeated variables are not unified, so two `$x` in
        // one expression may match different tokens. Real MeTTa binds them, so a
        // rule that depends on binding must not enter a pack until this engine
        // grows bindings.
        let p_tokens = tokenize(pattern);
        let a_tokens = tokenize(atom);
        if p_tokens.len() != a_tokens.len() {
            return false;
        }
        p_tokens
            .iter()
            .zip(a_tokens.iter())
            .all(|(p, a)| p.starts_with('$') || a.starts_with('$') || p == a)
    }

    fn tokenize(s: &str) -> Vec<String> {
        let s = s.trim().trim_start_matches('(').trim_end_matches(')');
        s.split_whitespace().map(|t| t.to_string()).collect()
    }
}

#[cfg(feature = "metta")]
use hyperon_backend::Backend;
#[cfg(not(feature = "metta"))]
use fallback_backend::Backend;

/// Wrap a bare pattern in the query syntax of the engine that is compiled in.
///
/// MeTTa asserts `(rel x)` and matches `!(rel x)`. The fallback engine asserts
/// anything that is not `(= …)` or `(! …)` and matches `(! (rel x))`. Both read
/// a bare pattern as a fact, so this is the one place that has to know which
/// engine is live — see [`MettaSpace::query`] for what happens when it doesn't.
#[cfg(feature = "metta")]
fn query_form(pattern: &str) -> String {
    format!("!{pattern}")
}

#[cfg(not(feature = "metta"))]
fn query_form(pattern: &str) -> String {
    format!("(! {pattern})")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn space_isolation() {
        let interp = MettaInterpreter::new().unwrap();
        let a = interp.create_space().await.unwrap();
        let b = interp.create_space().await.unwrap();
        assert_ne!(a, b);

        interp.space(a).await.unwrap().add_atom("(role student alice)").await.unwrap();
        let count_a = interp.space(a).await.unwrap().atom_count().await;
        let count_b = interp.space(b).await.unwrap().atom_count().await;
        assert_eq!(count_a, 1);
        assert_eq!(count_b, 0);
    }

    #[tokio::test]
    async fn drop_space_removes_session() {
        let interp = MettaInterpreter::new().unwrap();
        let id = interp.create_space().await.unwrap();
        interp.drop_space(id).await.unwrap();
        assert!(interp.space(id).await.is_err());
    }

    #[cfg(not(feature = "metta"))]
    #[tokio::test]
    async fn fallback_pattern_query() {
        let interp = MettaInterpreter::new().unwrap();
        let space = interp.global_space();
        space.add_atom("(role student alice)").await.unwrap();
        space.add_atom("(role teacher bob)").await.unwrap();
        let hits = space.query("(! (role student $who))").await.unwrap();
        assert_eq!(hits.len(), 1);
        assert!(hits[0].as_str().contains("alice"));
    }

    /// A caller's bare pattern must be read as a question.
    ///
    /// Before `MettaSpace::query` normalised it, `(omega-claw-scope-for grade6)`
    /// was asserted as a new fact and echoed back, so every rule lookup returned
    /// its own input and the space grew on every request. See the doc comment on
    /// `query` for the downstream effect on Omega Claw.
    #[cfg(not(feature = "metta"))]
    #[tokio::test]
    async fn a_bare_pattern_queries_rather_than_asserting() {
        let interp = MettaInterpreter::new().unwrap();
        let space = interp.global_space();
        space
            .run("(= (omega-claw-scope-for grade6) introductory)")
            .await
            .unwrap();
        let before = space.atom_count().await;

        let hits = space.query("(omega-claw-scope-for grade6)").await.unwrap();

        assert_eq!(hits.len(), 1, "the rule's result, not an echo");
        assert_eq!(hits[0].as_str(), "introductory");
        assert_eq!(
            space.atom_count().await,
            before,
            "a query must not add an atom"
        );
    }

    /// A rule's variables are on the *stored* side, not the query side.
    ///
    /// `(= (head $x) result)` becomes a `(lhs, rhs)` rewrite whose `$x` reaches
    /// `pattern_match` as the `atom` argument, so a matcher that only honours `$`
    /// in `pattern` cannot answer any catch-all rule. This test is that catch-all.
    #[cfg(not(feature = "metta"))]
    #[tokio::test]
    async fn a_variable_in_a_stored_rule_head_still_matches() {
        let interp = MettaInterpreter::new().unwrap();
        let space = interp.global_space();
        space
            .run("(= (omega-claw-can-unlock-transfer $correct $explained) no)")
            .await
            .unwrap();

        let hits = space
            .query("(omega-claw-can-unlock-transfer true false)")
            .await
            .unwrap();

        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].as_str(), "no");
    }

    /// The two engines spell a query differently; the wrapper has to leave an
    /// already-query form alone rather than wrapping it twice.
    #[cfg(not(feature = "metta"))]
    #[tokio::test]
    async fn an_explicit_query_form_is_not_wrapped_again() {
        let interp = MettaInterpreter::new().unwrap();
        let space = interp.global_space();
        space
            .run("(= (omega-claw-scope-for grade11) senior-deep)")
            .await
            .unwrap();

        let hits = space.query("(! (omega-claw-scope-for grade11))").await.unwrap();

        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].as_str(), "senior-deep");
    }
}
