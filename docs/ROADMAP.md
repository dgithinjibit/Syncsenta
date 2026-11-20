# SyncSenta Roadmap

**Current position:** 2026-11-20

`docs/TASKS.md` is the only active task register. Git history is the record of completed implementation.
This roadmap states current verified and unverified position without converting source or deployment
configuration into proof.

## Current evidence

- Implemented: the architecture handover and current-state documentation are maintained.
- Implemented: the `/head` layout uses the shared role-aware application shell.
- Implemented: student role routing, grade normalization, CSP fixes, and DOM-based scheme printing
  have source-level fixes and focused regression tests in the repository.
- Implemented: the lean Ubuntu devcontainer image and disk-aware Ollama setup have been written.
- Not verified: the Codespace rebuild and container build result.
- Not verified: the focused Studio regression suite, typecheck, test suite, production build, and
  deployed browser flows.
- Not verified: live Supabase schema state and deployed Python/Rust runtime behavior.

## Active work

Use [TASKS.md](TASKS.md) for the live backlog. The current backlog is:

1. Rebuild the Codespace and record the container build result.
2. Run the focused Studio regressions.
3. Browser-verify authorized student, teacher, and head flows.
4. Agree on the durable generated-scheme storage contract before implementing Save to Library.

## Working priorities

1. Preserve one rule/decision voice; do not add an active third runtime.
2. Keep Studio, Python, Rust, and Supabase request boundaries explicit.
3. Distinguish implementation, tests, deployment, and browser verification.
4. Finish thin vertical slices and record exact commands and results.
5. Require owner approval for live database, deployment, secret, or public visibility changes.

## Historical record

Historical implementation detail, dated BASIX work, and prior measurements remain in Git history.
The evidence record is [BASIX-FINAL-POSITION.md](research/BASIX-FINAL-POSITION.md), and the claim
rules are [BASIX-NORTH-STAR.md](BASIX-NORTH-STAR.md).
