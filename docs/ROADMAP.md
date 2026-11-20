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

## AI Agents architecture scout — 2026-11-20

Initial baseline, before restoring the chat adapter:
`cd ai-agents && PYTHONPATH=src .venv/bin/python -m pytest -q tests/test_deployed_app_routes.py tests/test_omega_api.py`
returned **3 passed, 6 failed**. `/agents/chat` was absent, and five tests referenced
`get_orchestrator()` functions absent from `api/server.py`. This is a historical source baseline,
not deployed behavior.

The owner selected Rust/Hyperon as the target sole authority for structured tutoring policy on
2026-11-20. This is an architecture decision, not evidence that Hyperon is running or Rust is deployed.
Further source review found Studio's learner chat uses `/api/chat`, calls Rust for structured tutoring
decisions, and streams generated content through Studio. Separately, the teacher assessment UI calls
`/api/generate/assessment`. Rust exposes scope, activity, progression, hint, and tutoring endpoints,
but no free-form chat endpoint. Those Rust routes require a short-lived, Studio-signed student
assertion; the AI Agents proxy instead sends a service key and may send `X-Forwarded-User`.

Implemented: the Studio assessment route verifies the cookie-bound user and teacher profile, then
replaces client-supplied identity fields. Python `POST /agents/chat` is restored as a content-only
adapter using the existing multi-provider client; it ignores role/identity fields for authorization
and does not route policy. The Studio proxy now reports configuration failures as 503 and upstream
or provider failures as 502 instead of returning a fabricated assessment.

Verification:

- `cd ai-agents && PYTHONPATH=src .venv/bin/python -m pytest -q tests/test_chat_api.py tests/test_deployed_app_routes.py tests/test_api_auth.py`
  passed: **13 tests**. One existing Starlette deprecation warning remains.
- `cd ai-agents && PYTHONPATH=src .venv/bin/python -m pytest -q tests/test_omega_api.py`
  failed: **5 tests** still expect `get_orchestrator()` dispatchers absent from `api/server.py`.
  Reconcile these legacy quiz/grading/teacher-generation contracts before pruning modules.
- `cd studio && npm test -- src/app/api/generate/assessment/route.test.ts`
  passed: **7 tests**, covering authentication, trusted identity, configuration errors, and upstream
  failures.
- `cd studio && npx tsc --noEmit` failed on the unrelated
  `src/app/api/teacher/resources/route.test.ts(72,28): Expected 1 arguments, but got 0.`
- `cd studio && npm test` failed: **1,058 passed, 18 skipped, 12 failed**. The failures are in the
  existing BASIX sample/docs, schema-coverage, Omega Claw copy, and PWA wiring tests; none cover the
  assessment route.
- `cd studio && npm run build` exited successfully and generated all 112 static pages. It emitted
  existing dependency, dynamic-rendering, metadata, and `localStorage` prerender warnings.

No deployment or browser verification was performed. Python's declared dotenv dependency was added to
`pyproject.toml` because the provider client imports it directly; the local `.venv` was missing it.

## Active work

Use [TASKS.md](TASKS.md) for the live backlog. The current backlog is:

1. Reconcile the legacy Python orchestration-test expectations with the content-only adapter boundary
   before pruning or restoring any modules.
2. Rebuild the Codespace and record the container build result.
3. Run the focused Studio regressions.
4. Browser-verify authorized student, teacher, and head flows.
5. Agree on the durable generated-scheme storage contract before implementing Save to Library.

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
