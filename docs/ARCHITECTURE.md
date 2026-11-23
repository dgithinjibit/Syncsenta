# Architecture

**Reviewed:** 2026-11-20
**Scope:** code-level boundaries in this repository. This document does not establish that a service or feature is currently deployed.

## Maintained handover

This section is the code-level source of truth for an agent joining the repository. It supplements
`TASKS.md` and `ROADMAP.md`: use `TASKS.md` for active work, `ROADMAP.md` for position and evidence,
and this file for boundaries and canonical file locations.

### Reconciled source state

- The Studio application is Next.js 14.2.35 in `studio/`; it requires Node.js 22.18 or newer in
  `studio/package.json`.
- Student chat uses the same-origin `/api/chat` route in `studio/src/app/api/chat/route.ts`.
  `studio/src/lib/auth/role-home.ts` is the canonical signed-in role-to-workspace mapping.
- Teacher scheme, lesson-plan, assessment, and exam flows reach Studio API routes under
  `studio/src/app/api/generate/`. Those routes may call the Python service; the scheme route's
  prescribed-template fallback is explicitly labelled fallback data, not AI-generated content.
- The Python service entry point is
  `ai-agents/src/syncsenta_agents/api/server.py:app`. Its Render deployment state is configuration,
  not evidence that the service is currently reachable or mounted correctly.
- Supabase supplies authentication and application data. Existing migrations under
  `supabase/migrations_live/` describe applied live-schema history, but listing or applying source
  migrations is not by itself proof of the live schema or browser-visible behavior.
- Rust/Hyperon was selected on 2026-11-20 as the target sole authority for structured tutoring policy.
  This is an owner decision, not deployment or cut-over evidence: Studio's `/api/chat` calls the Rust
  tutoring API, while TypeScript policy code remains in the tree and other request paths. Studio's
  teacher assessment route verifies a request session and teacher role before proxying to the
  content-only Python `/agents/chat` adapter. Configuration and provider failures are returned as
  errors rather than generated-looking templates. Rust has no free-form chat API.
- Python teacher-generation routes dispatch directly to `LessonArchitectAgent`;
  quiz and grading routes dispatch to `AssessmentAgent`. No Omega orchestrator
  is mounted. This is source/test status, not deployment verification. See
  [`ai-agents/README.md`](../ai-agents/README.md) for route details and
  [`TASKS.md`](TASKS.md) for remaining work.

### File inventory

#### Studio

- `studio/src/app/api/chat/route.ts` - signed-in student chat API and tutor stream.
- `studio/src/app/api/generate/scheme/route.ts` - teacher scheme generation proxy.
- `studio/src/app/api/generate/lesson-plan/route.ts` - teacher lesson-plan generation proxy.
- `studio/src/app/api/generate/exam/route.ts` - teacher exam generation proxy.
- `studio/src/app/student/chat/page.tsx` - student chat workspace entry point.
- `studio/src/app/teacher/layout.tsx` - teacher workspace shell.
- `studio/src/app/teacher/scheme-wizard/page.tsx` - scheme-of-work wizard.
- `studio/src/app/head/layout.tsx` - shared head-workspace shell.
- `studio/src/app/head/page.tsx` - head workspace entry point.
- `studio/src/lib/auth/role-home.ts` - canonical role-to-home mapping.
- `studio/src/lib/curriculum/grade-id.ts` - canonical curriculum grade-key normalization.
- `studio/src/lib/print-scheme.ts` - DOM-based scheme printing helper.
- `studio/src/lib/scheme/reconcile.ts` - scheme reconciliation decision engine.
- `studio/src/lib/scheme/ledger.ts` - append-only hash-chained scheme record.
- `studio/src/lib/scheme/override.ts` - teacher waiver policy used by later reconciliation runs.
- `studio/src/middleware.ts` - CSP and route middleware.

#### Python

- `ai-agents/src/syncsenta_agents/api/server.py` - FastAPI application entry point.
- `ai-agents/src/syncsenta_agents/api/lesson_architect_api.py` - teacher lesson/scheme generation router.
- `ai-agents/render.yaml` - Render start configuration; see `ai-agents/README.md` for deployment caveats.

#### Rust

- `backend/syncsenta-backend/src/` - Axum/SQLx backend implementation.
- `rust-core/src/` - policy and typed Rust core.
- `rust-hyperon-bridge/src/` - optional Hyperon bridge.
- `rust-service/src/` - separate Rust service surface.

#### Data and operations

- `supabase/migrations_live/` - migrations recorded as applied to the live schema.
- `.devcontainer/devcontainer.json` - lean Ubuntu devcontainer base.
- `.devcontainer/setup.sh` - environment setup and disk-aware Ollama model handling.
- `.github/workflows/studio-gates.yml` - Studio CI and build gates.
- `docs/TASKS.md` - only active task register.
- `docs/ROADMAP.md` - current position and recorded evidence.

### API and route inventory

| Surface | Handler | Source state |
|---|---|---|
| `POST /api/chat` | `studio/src/app/api/chat/route.ts` | Same-origin active Studio route |
| `POST /api/generate/assessment` | `studio/src/app/api/generate/assessment/route.ts` | Verifies the request session and teacher profile; proxies to Python content generation and returns explicit configuration/provider errors |
| `POST /agents/chat` | `ai-agents/src/syncsenta_agents/api/server.py` | Content-only teacher assessment adapter; service API key required; no policy routing |
| `POST /api/generate/scheme` | `studio/src/app/api/generate/scheme/route.ts` | Calls Python when configured; has labelled prescribed-template fallback |
| `POST /api/generate/lesson-plan` | `studio/src/app/api/generate/lesson-plan/route.ts` | Studio route with Python proxy behavior |
| `POST /api/generate/exam` | `studio/src/app/api/generate/exam/route.ts` | Studio route; does not invent a curriculum allocation |
| `GET /student/chat` | `studio/src/app/student/chat/page.tsx` | Student workspace route |
| `GET /teacher` | `studio/src/app/teacher/page.tsx` | Teacher workspace route |
| `GET /head` | `studio/src/app/head/page.tsx` | Head workspace route |
| `GET /healthz` | `ai-agents/src/syncsenta_agents/api/server.py` | FastAPI health and lesson-architect mount reporting |
| `/api/v1/mvp/*` | Rust API paths | Undeployed; do not direct learners or routes through these paths |

### Canonical key functions

- `getRoleHome()` in `studio/src/lib/auth/role-home.ts` - canonical role redirect and fallback behavior.
- `normalizeGradeKey()` in `studio/src/lib/curriculum/grade-id.ts` - canonical curriculum grade key.
- `printScheme()` in `studio/src/lib/print-scheme.ts` - scheme print sink.
- `reconcileScheme()` in `studio/src/lib/scheme/reconcile.ts` - cited scheme reconciliation decision.
- `buildLedger()` and ledger append operations in `studio/src/lib/scheme/ledger.ts` - tamper-evident scheme records.
- `applyWaiver()` in `studio/src/lib/scheme/override.ts` - persisted teacher override used by later runs.

### Naming and editing conventions

- React components use `PascalCase.tsx`; route handlers use `route.ts` under `app/**`.
- TypeScript symbols and variables use `camelCase`; constants use `UPPER_SNAKE_CASE`.
- Python modules use `snake_case.py`; Python symbols use `snake_case`.
- Rust modules use `snake_case.rs`; Rust symbols use `snake_case`.
- Do not create `AGENT_CONTEXT.md`, `PROJECT_CONTEXT.md`, `spec.md`, or a second active task register.
  Update this architecture guide, `docs/TASKS.md`, and `docs/ROADMAP.md` instead.
- Do not add a separate `frontend/` directory or place a new frontend under a top-level duplicate.

### Known reconciliation items

- The README has an inconsistent Next.js-version sentence in one section; `studio/package.json` and
  `studio/README.md` pin Next.js 14.2.35. Treat 14.2.35 as the source inventory.
- `studio/package.json` requires Node.js 22.18 or newer, but `studio-gates.yml` was historically pinned
  to Node 20. Treat this as a CI configuration issue, not as a proven application failure.
- The live teacher, student, and head flows are not browser-verified in this environment.
- The generated-scheme persistence contract has not been agreed. Do not implement **Save to Library**
  until the active task in `docs/TASKS.md` is resolved.

### Agent scout checklist

Before an implementation task:

1. Read `AGENTS.md`, `docs/BASIX-NORTH-STAR.md`, and `docs/research/BASIX-FINAL-POSITION.md`.
2. Read `docs/TASKS.md`; select one unchecked, bounded task.
3. Check this file and the relevant source, tests, and accepted decision before creating a file.
4. Confirm whether an existing route, component, function, or grade/role mapping already owns the behavior.
5. Keep implementation, test, deployment, and browser verification claims separate.
6. Write the focused failing regression first for behavior changes.
7. Update `docs/TASKS.md` and `docs/ROADMAP.md` with exact commands and actual evidence.

## Components

| Component | Role |
|---|---|
| `studio/` | Next.js 14 web application, authenticated workspaces, and same-origin API routes |
| `ai-agents/` | Python FastAPI service for agent and teacher-generation operations |
| Supabase | Authentication and application data with row-level security |
| `backend/syncsenta-backend/`, `rust-core/`, `rust-service/` | Rust services and policy code; use is optional/configuration-dependent and must not be described as the active web request path without deployment evidence |

## Web request paths

- **Student chat:** the Studio student chat uses the same-origin `/api/chat` handler. It resolves the signed-in user and streams model output through the configured provider path. Do not direct learners to the undeployed `/api/v1/mvp/*` endpoints.
- **Teacher generation:** the scheme wizard calls `/api/generate/scheme`; lesson-plan and exam flows use their Studio API routes. These handlers may call the Python service when configured. Scheme generation can return explicitly labelled prescribed template rows when the AI service is unavailable; that fallback is not AI-generated content.
- **Head workspace:** `/head` applies the role gate in its page and mounts the shared `AppSidebar` and `AppHeader` through its route layout. The sidebar's role mapping and route access must stay consistent.
- **Role routing:** `studio/src/lib/auth/role-home.ts` is the canonical role-to-home mapping. Keep redirects and workspace gates aligned with it.

## Policy and data boundaries

- Rust/Hyperon is the selected target authority for structured tutoring decisions. Preserve the existing
  Studio-signed identity boundary when calling Rust; the Python service's API key and forwarded user
  header are not a substitute. The Python `/agents/chat` endpoint is only a teacher assessment
  content-generation adapter; do not treat its `role` or `user_id` fields as authorization or add
  structured tutoring-policy decisions there.
- Authenticated database access must preserve Supabase RLS. Require a bounded active task and verified migration evidence before changing schema ownership or migration behavior.
- Security-sensitive or deployment-specific work should update the corresponding accepted decision and the current task entry with evidence.

## Decision sources

- [Project charter](BASIX-NORTH-STAR.md) and [evidence record](research/BASIX-FINAL-POSITION.md) — current policy direction and limitations.
- The standalone decision files previously listed under `docs/architecture/` are not present in this checkout. Record and verify any new accepted decision before treating it as implementation evidence.

For project status and verification evidence, use [ROADMAP.md](ROADMAP.md). For the active backlog, use [TASKS.md](TASKS.md).
