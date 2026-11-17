# Developer Debugging Playbook

Use this guide to turn a bug report into a reproducible, testable engineering
issue. It covers the active Studio, AI Agents, Supabase, and Rust source
workspaces. Code still under `archive/` is historical unless a task explicitly
targets it.

## Read before investigating

1. [`BASIX-NORTH-STAR.md`](BASIX-NORTH-STAR.md) — product claims and evidence rules.
2. [`README.md`](README.md) — active documentation map and service boundaries.
3. [`ARCHITECTURE.md`](ARCHITECTURE.md) — request flows and component responsibilities.
4. [`ROADMAP.md`](ROADMAP.md) — current priorities and verified project status.
5. [Test-driven development skill](../.claude/skills/test-driven-development/SKILL.md) —
   the red/green workflow.

Some older documents still describe Windows-only commands, retired components,
or paths now under `archive/`. Before running a command or following a path,
confirm it exists in the current checkout and check the service configuration
that actually launches it. The Rust backend source is active but is not
currently deployed; Studio forwards to it only when
`SYNCSENTA_BACKEND_URL` is configured.

## Jira-ready bug report

Copy this section into Jira (or an issue) and remove fields that do not apply.
Write down observations separately from theories. Never include credentials,
session cookies, learner names, student IDs, or unredacted learner content.

```text
Summary:
[BUG] <user-visible symptom> in <route or component>

Issue type: Bug | Regression | Incident | Test/CI failure
Priority: Blocker | High | Medium | Low
Component: Studio | Rust/MeTTa | AI Agents | Supabase/Auth/RLS | LLM/provider | Deployment/CI | Other
Environment: local | CI | preview | production
Affected commit/branch:
First observed (include timezone):
Frequency: every time | intermittent | once

Impact:
Who is affected, what they cannot do, and whether a learner/teacher is blocked.
Use aggregate counts only; do not identify people.

Expected:
<Specific observable result>

Actual:
<Specific observable result, including route, status, and safe error text>

Reproduction:
1. <Exact setup, with secret values replaced by [REDACTED]>
2. <Exact action/request>
3. <Observed result>

Evidence:
- Request URL/method and HTTP status:
- Timestamp/timezone and response duration:
- Browser/OS or runtime version:
- Relevant redacted log lines or test output:
- Last known good commit/build (if known):

Hypotheses (unconfirmed):
- <Possible cause, or "none yet">

Acceptance criteria:
- [ ] Reproduction is documented and the root cause is supported by evidence.
- [ ] A focused regression test fails before the fix and passes after it.
- [ ] Relevant type, test, or build gates pass; exact commands/results are recorded.
- [ ] No secrets or personally identifying learner data are present in the ticket.

Owner:
Status: Open | Investigating | Blocked | Ready for review | Verified
```

### Priority guide

- **Blocker:** active safety, privacy, security, or data-integrity incident, or
  the primary service is unavailable for all users.
- **High:** a core learner or teacher workflow is unavailable for a meaningful
  group and there is no safe workaround.
- **Medium:** a feature is degraded or a limited workflow is affected; a safe
  workaround exists.
- **Low:** cosmetic, low-impact, or internal-only defect with no blocked workflow.

Escalate a suspected exposure of credentials or learner data through the
repository's security process; do not paste the material into Jira or chat.

## Triage sequence

1. **Capture the exact failure.** Record the route/action, timestamp and
   timezone, status/error, runtime, commit/build, and frequency. Preserve safe
   logs before retrying; redact tokens and learner data.
2. **Classify the boundary.** Decide whether the failing hop is browser → Studio,
   Studio → Rust/AI Agents, Studio → Supabase/Redis, AI Agents → model/database,
   or deployment/CI. A healthy service check only proves that health endpoint.
3. **Reproduce with the smallest case.** Start with the narrowest existing test
   or request. Keep the environment and inputs fixed; change one variable at a
   time.
4. **Compare working and failing cases.** Check the exact branch/commit, route,
   environment-variable *presence* (not its value), request/response shape,
   auth identity/role, and deployment target.
5. **Find the root cause.** Follow the request through the configured entry
   point. Do not infer the deployed app from a similarly named module or
   health-check response.
6. **Prove the fix.** Add or update a focused regression test, observe it fail
   for the reported reason, apply the smallest fix, then rerun the focused test
   and relevant gates below.
7. **Report evidence, not status words.** Keep “implemented”, “tested”,
   “deployed”, and “browser-verified” separate. State exact commands and
   outcomes; if a gate could not run, name the blocker.

## Active runtime map

| Area | Runtime/source of truth | First diagnostic |
|---|---|---|
| Web app, pages, `/api/*` | `studio/` (Next.js; Vercel) | Browser network/console, route handler logs, Studio tests |
| Agent, assessment, teacher-generation APIs | `ai-agents/src/syncsenta_agents/api/server.py` (FastAPI; Render) | `GET /healthz`, then the specific route |
| Omega Claw MeTTa rules | `backend/syncsenta-backend/` (Rust/Axum; Hyperon enabled by default) | Backend tests with migrated PostgreSQL; check whether `SYNCSENTA_BACKEND_URL` is configured |
| Adaptive Rust policy | `rust-core/` and `rust-service/` (root Cargo workspace) | Root workspace tests and the specific service configuration |
| Auth, database, access policies | Supabase | Check session, table/schema, and RLS separately |
| Rate limits and short-lived session state | Upstash Redis, when configured | Check env-var presence and route logs |
| Retired experiments | `archive/` | Not part of the production path |

Studio chat calls its `/api/chat` route and provider chain; it is not the same
path as teacher-generation proxies to the FastAPI service. The Render process
is configured in [`../ai-agents/render.yaml`](../ai-agents/render.yaml).
`GET /healthz` returns service status and whether the lesson-architect router
mounted; it does not prove that a model key works or a generation request
succeeds.

## Local checks

Run commands from the indicated directory. Use the repository's Node engine
requirement (`>=22.18`) for Studio. The current Studio GitHub workflow pins Node
20, so if CI and local results disagree, compare the runner version and failure
logs before attributing the difference to application code.

### Studio

Required build-time public configuration is checked by
[`studio/scripts/check-env.js`](../studio/scripts/check-env.js):
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. AI provider keys
are optional at build time and are checked by provider-backed routes when
called. See [`studio/.env.example`](../studio/.env.example); use local test
credentials and never commit `.env.local`.

```bash
cd studio
npm ci
npm run dev
```

In another terminal, check the relevant gate(s):

```bash
cd studio
npx tsc --noEmit
npm test
npm run build
```

Run one Vitest file with `npx vitest run path/to/test.test.ts`. Do not treat a
passing typecheck or unit suite as a production deployment or browser check.

### Rust

The backend uses a separate Cargo workspace and enables Hyperon MeTTa by
default. Its SQLx macros require a migrated PostgreSQL database:

```bash
cd backend
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/syncsenta \
  cargo test -p syncsenta-backend
```

Run root workspace tests separately:

```bash
cargo test --workspace
```

CI applies the backend migrations before running package tests. If the local
toolchain or database is unavailable, report that exact blocker rather than
treating skipped tests as a pass.

### AI Agents

The deployed FastAPI entry point is
`syncsenta_agents.api.server:app`; `api/scheme_server.py` is a separate app and
is not the Render entry point.

```bash
cd ai-agents
poetry install --with dev
PYTHONPATH=src poetry run pytest -q
PYTHONPATH=src poetry run uvicorn syncsenta_agents.api.server:app \
  --host 127.0.0.1 --port 8001 --reload
```

In another terminal:

```bash
curl -sS -i http://127.0.0.1:8001/healthz
```

Check `status`, `lesson_architect.mounted`, and `lesson_architect.error`. If
health succeeds but a workflow fails, call or test that exact route; health
does not validate model credentials, Supabase permissions, or generated output.
For a deployed check, use the service URL from the current deployment settings,
not an assumed hostname.

## Symptom-to-boundary guide

| Symptom | Check first | Do not assume |
|---|---|---|
| Studio fails before pages load/build | `node --version`, required public env presence, `npm ci` output, then `npm run build` | That an optional provider key is needed to compile |
| Studio page loads but one API route fails | Browser Network panel, exact route/method/status, Studio route logs and focused route test | That a healthy home page means every route is healthy |
| Student chat fails but other pages work | `/api/chat` response, auth/rate-limit result, provider selection/model response, server logs | That the separate AI Agents service is necessarily involved |
| Teacher generation returns 404/502 or fallback content | `NEXT_PUBLIC_AI_AGENTS_URL`, deployed service URL, specific `/lesson-architect/*` route, `lesson_architect.mounted` | That `/healthz` alone proves the teacher routes or LLM work |
| AI Agents health is 200 but generation fails | `LLM_PROVIDER`, provider-key presence, model ID, dependency/import error, route-specific response/log | That 200 from `/healthz` means the model is reachable |
| Supabase returns 401/403 or empty rows | Current caller/session, role, table existence, RLS policy, and whether the route uses the intended Supabase client | That service-role access is an acceptable debugging workaround |
| Data operation fails after a schema change | Migration history and live target schema; read-only inspection first | That a migration file in the repo has been applied to the target database |
| CI differs from local | Exact job, commit, runtime version, install output, and first failing test | That every CI-only failure is a code defect or every local pass clears CI |
| Browser seems stale or stuck | Network status for current JS assets, console errors, route response, then cache/service-worker state | That clearing all browser storage is a safe first step |

For provider failures, check whether keys are configured without copying or
printing their values. Studio's provider selection is in
[`studio/src/lib/llm/provider-chain.ts`](../studio/src/lib/llm/provider-chain.ts);
the Python service selection is in
[`ai-agents/src/syncsenta_agents/inference/provider_choice.py`](../ai-agents/src/syncsenta_agents/inference/provider_choice.py).

For Supabase failures, separate authentication (who is the caller), authorization
(what RLS permits), and schema (whether the queried table/column exists). Use a
test account and read-only checks when possible. Never disable RLS or switch a
user-facing route to a service-role client just to make a local symptom disappear.

## Debugging and data-safety rules

- Do not put `.env` files, API keys, bearer tokens, cookies, or service-role
  credentials in issue text, screenshots, test fixtures, or logs.
- Do not include real learner records or message content. Use synthetic
  fixtures; share only the minimum redacted evidence needed to reproduce.
- Never run a production write, migration, destructive query, or account change
  as a diagnostic shortcut. Get the database owner’s approval and use staging.
- Keep hypotheses labeled as hypotheses until a reproduction or test supports
  them. A `200` response, green health check, passing test, or successful build
  is evidence only for the specific surface it exercised.
- Check `git status` before editing or staging. Keep unrelated worktree changes
  out of the fix and stage only the intended files.

## Completion checklist

- [ ] The reported behavior can be reproduced or the inability to reproduce is documented.
- [ ] Root cause is supported by a failing test, trace, or other direct evidence.
- [ ] A regression test covers the behavior changed.
- [ ] Relevant checks were run and their exact results were added to the issue.
- [ ] Any unrun checks and the reason are listed.
- [ ] Secrets and learner data are absent from the ticket, logs, and diff.
- [ ] Deployment and browser verification are reported separately from local tests.
