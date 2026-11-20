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

The focused command
`cd ai-agents && PYTHONPATH=src .venv/bin/python -m pytest -q tests/test_deployed_app_routes.py tests/test_omega_api.py`
ran against versions within the declared `pyproject.toml` ranges and returned **3 passed, 6 failed**.
The lesson-architect router mounts; `/agents/chat` is absent; five tests reference
`get_orchestrator()` and related orchestration functions that are absent from `api/server.py`.
This is tested source behavior, not deployed behavior.

The owner selected Rust/Hyperon as the target sole authority for structured tutoring policy on
2026-11-20. This is an architecture decision, not evidence that Hyperon is running or Rust is deployed.
Further source review found Studio's learner chat uses `/api/chat`, calls Rust for structured tutoring
decisions, and streams generated content through Studio. Separately, the teacher assessment UI calls
`/api/generate/assessment`, which proxies to the absent Python `/agents/chat` route. On non-2xx
responses, that proxy returns an explicitly labelled prescribed template. Rust exposes scope,
activity, progression, hint, and tutoring endpoints, but no free-form chat endpoint. Those Rust routes
require a short-lived, Studio-signed student assertion; the AI Agents proxy instead sends a service
key and may send `X-Forwarded-User`.

The assessment UI sends a placeholder `user_id` and client-supplied `role`. The Studio route now uses
the cookie-aware route-handler client, checks the authenticated profile's teacher role, and replaces
those fields before proxying. The Python endpoint is still missing, so the route continues to return
its explicitly labelled prescribed template on upstream failure.

The focused command
`cd studio && npm test -- src/app/api/generate/assessment/route.test.ts`
passed: **5 tests** cover anonymous and non-teacher rejection (including an unconfigured AI service),
profile lookup failure, and forwarding the verified teacher identity. `cd studio && npm run typecheck`
did not pass: it reports the existing
unrelated error `src/app/api/teacher/resources/route.test.ts(72,28): Expected 1 arguments, but got 0.`

No AI Agents runtime behavior, modules, or dependencies were changed. The active task in `TASKS.md` is
to restore and test the Python content-only route while preserving the UI contract and Rust policy
boundary. The Python venv is local and ignored by Git.

## Active work

Use [TASKS.md](TASKS.md) for the live backlog. The current backlog is:

1. Restore the Python content-generation route and verify its response contract before cleanup.
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
