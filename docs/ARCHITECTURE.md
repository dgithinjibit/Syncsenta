# Architecture

*Last updated: September 2026*

## Executive view

Syncsenta is a monorepo of related education components. The primary path is a
Next.js application called **Studio**, backed by a Python FastAPI service
(**AI Agents**) and **Supabase**. A standalone **Scheme Scribe** Vite app,
a **Rust adaptive service**, and an **ESP32-CAM firmware** prototype live
alongside that path.

## Two AI delivery paths in Studio

The Syncsenta web application has two distinct AI paths that share intent but are not a single
abstraction:

**Path 1 — Socratic student chat** (`/api/chat`)
Student browser → `POST /api/chat` → Groq (streamed SSE) → browser.
This route authenticates, rate-limits via Upstash, calls Groq directly,
persists history and progress, and streams SSE. Before every response it
calls `evaluateTutoringDecision()` to compute a scaffolding level
(Independent / Guided / Intensive) and builds a dynamic system prompt via
`buildDynamicSystemPrompt()`. The scaffolding level is persisted to Redis
fire-and-forget. The Rust adaptive service (`SYNCSENTA_RUST_ADAPTIVE_URL`)
can replace this TS decision engine when deployed — the route falls back
to the TS engine when that env var is not set.

**Path 2 — FastAPI agent calls**
Teacher generators (schemes, lesson plans, assessments), the AI agents chat,
and telemetry call the FastAPI service at `NEXT_PUBLIC_AI_AGENTS_URL`
(port 8001 in development, Render in production).

Changes must preserve or deliberately consolidate both paths.

## Component map

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browsers                                 │
│  Student (PP1–Grade 9)    Teacher / Admin    Guardian           │
└────────┬──────────────────────┬─────────────────────────────────┘
         │                      │
         ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Studio  (Next.js, Vercel)                     │
│                                                                 │
│  /student/*          /teacher/*            /api/*               │
│  ├ subject/[slug]    ├ dashboard           ├ chat (SSE+Omega)   │
│  ├ sandbox (canvas)  ├ scheme-wizard       ├ teacher/*          │
│  ├ chat tutor        ├ phase2 analytics    ├ session/sync       │
│  └ journey/profile   └ exams               └ generate/* (proxy) │
└──────┬──────────────────────┬──────────────────────────────────┘
       │                      │
       │ direct Groq/Gemini   │ NEXT_PUBLIC_AI_AGENTS_URL
       ▼                      ▼
  ┌─────────┐       ┌──────────────────────────────────────────┐
  │  Groq   │       │  AI Agents  (FastAPI, Render)            │
  │  API    │       │  LangGraph orchestrator + specialists     │
  └─────────┘       │  Lesson Architect, telemetry, xAPI       │
                    └─────────────────┬────────────────────────┘
                                      │
                    ┌─────────────────▼────────────────────────┐
                    │           Supabase                       │
                    │  Auth · Postgres · RLS · Realtime        │
                    │  Storage · Edge Functions (Scheme Scribe) │
                    └──────────────────────────────────────────┘

  ┌───────────────────┐    ┌──────────────────────────┐
  │  Upstash Redis    │    │  Rust adaptive service   │
  │  LearningSession  │    │  rust-service/ (port 8091)│
  │  rate limits      │    │  Not yet in production   │
  └───────────────────┘    └──────────────────────────┘
```

## Components and responsibilities

### 1. Syncsenta web application — `studio/`

Next.js 16 App Router, React 18, TypeScript, Tailwind, shadcn/ui.

**Student routes**

| Route | Purpose |
|---|---|
| `/student` | Landing + journey selector |
| `/student/sandbox` | Subject catalogue — routes all 10 subjects to `/student/subject/[slug]` |
| `/student/subject/[slug]` | Subject entry page: XP badge, resume point, chat or sandbox layout |
| `/student/sandbox/[grade]/[subject]` | Activity list |
| `/student/sandbox/[grade]/[subject]/[activityId]` | Activity player (canvas + worksheet renderer, Redis resume) |

**Teacher routes**

| Route | Purpose |
|---|---|
| `/teacher/dashboard` | Main teacher view |
| `/teacher/scheme-wizard` | CBC scheme-of-work generator |
| `/teacher/grade/[grade]/[...slug]` | Per-grade student view |
| `/teacher/exams` | Exam tooling |

**Key API routes**

| Route | What it does |
|---|---|
| `POST /api/chat` | Socratic chat — Omega decision → dynamic prompt → Groq SSE |
| `GET /api/teacher/student-subjects` | Per-subject session summary for teacher dashboard |
| `GET/POST /api/session/sync` | Redis LearningSession read/write |
| `POST /api/metta/interact` | MeTTa-style interaction processing |
| `POST /api/generate/scheme` | Proxies to FastAPI Lesson Architect |
| `POST /api/generate/lesson-plan` | Proxies to FastAPI Lesson Architect |
| `POST /api/generate/assessment` | Proxies to FastAPI Lesson Architect |

**Key library modules**

| Module | Purpose |
|---|---|
| `lib/subject-session.ts` | SUBJECT_REGISTRY, XP/level, chat session helpers, Omega prompt builder |
| `lib/omega-agent/metta-core.ts` | `evaluateTutoringDecision()` — TS port of Rust `decide_tutoring()` |
| `lib/sandbox-activities.ts` | Activity catalogue (loads from `curriculum/`) |
| `lib/session-persistence.ts` | Redis LearningSession CRUD |
| `lib/cbc-curriculum.ts` | Grade/level/subject structure |
| `lib/socratic-prompts.ts` | `buildCompassSystemPrompt()` (socratic replaced by Omega path) |
| `lib/chat-history-supabase.ts` | `chat_sessions` + `chat_messages` persistence |
| `lib/rate-limit-upstash.ts` | Distributed rate limiting |

### 2. AI Agents service — `ai-agents/`

FastAPI (Python 3.11), LangGraph, Groq, and the Python Hyperon policy adapter. Deployed on Render from `render.yaml`.

- Assessment quiz generation and grading
- LangGraph orchestration + specialist agents
- Lesson Architect: schemes, lesson plans, worksheets, text-leveling, differentiation, exams
- Telemetry capture, xAPI statements, behavioral profiling
- Teacher dashboard data queries and WebSockets
- Training data export

Entry point: `src/syncsenta_agents/api/server.py` (started by `render.yaml`).
Health check: `GET /healthz`.

> Note: `ai-agents/src/syncsenta_agents/api.py` is a separate legacy FastAPI
> app with different paths. It is **not** started by `render.yaml`.

### 3. Supabase

Primary database and auth layer.

| Access style | Helper | Use |
|---|---|---|
| Browser session | `lib/supabase/client.ts` | Client components, RLS user actions |
| Cookie-aware route | `lib/supabase/route-handler.ts` | Route handlers acting as signed-in caller |
| Service-role | `lib/supabase/server.ts` | Trusted server-side operations |

Key tables: `profiles`, `chat_sessions`, `chat_messages`, `learning_progress`,
`point_transactions`, `behavioral_profiles`, `misconceptions`,
`interventions`, `schemes`, `lesson_plans`, `exams`.

### 4. Upstash Redis

Stores `LearningSession` per user (7-day TTL). Accessed via
`lib/session-persistence.ts` and `/api/session/sync`.

Contains per-user: `currentActivity` (resume point), `recentActivities`,
`preferences.scaffoldingLevel` (last Omega decision), `competencyProgress`,
`achievements`.

### 5. Rust adaptive service — `rust-service/` + `rust-core/`

`rust-core/` contains 14 modules including `agent_runtime.rs`
(`decide_tutoring()` — the Rust source of truth for scaffolding thresholds)
and `adaptive_question.rs`.

`rust-service/` wraps rust-core as an HTTP service:
- `GET /health`
- `POST /v1/adaptive-question`

**Current status: built locally, not deployed to production.**
The Syncsenta `/api/chat` route uses the TypeScript port in `metta-core.ts` as fallback.
Wire it by setting `SYNCSENTA_RUST_ADAPTIVE_URL` in Vercel env vars.
Readiness probe: `scripts/rust-adaptive-readiness.sh`.

### 6. Scheme Scribe — `scheme-scribe/`

Self-contained Vite/React app with its own Supabase project, auth, Edge
Functions, and migrations. Offers scheme-of-work generation, lesson planning,
exam generation and grading, and a pupil dashboard.

Treat its database and Edge Function secrets as separate from Studio until
a deliberate migration unifies them.

### 7. ESP32-CAM firmware — `arduino/`

Prototype attendance + assessment device. Expects API routes (`/assess`,
`/generate-exam`, etc.) that do not match the current FastAPI contract.
A firmware integration requires an adapter service or agreed API contract.
Not connected in production.

## Omega tutoring decision engine

Every `/api/chat` request in socratic mode passes through the request-scoped MeTTa boundary and then the Omega decision engine
to compute scaffolding level before calling the LLM. This is the most critical
AI component for adaptive student tutoring.

```
POST /api/chat (socratic mode)
  │
  ├─ Auth + profile lookup
  │
  ├─ Request-scoped MeTTa student-turn boundary
  │   Normalize subject + grade and record the interaction
  │
  ├─ Query learning_progress table
  │   SELECT questions_answered, correct_answers, mastery_level
  │   WHERE user_id = $1 AND subject = $2
  │
  ├─ buildLearningState()
  │   Constructs: { attempts, correctAttempts, hintsUsed, frustrationSignal }
  │
  ├─ evaluateTutoringDecision()  →  lib/omega-agent/metta-core.ts
  │   │
  │   ├─ Calculate masteryPct = (correctAttempts / attempts) * 100
  │   │
  │   └─ Apply thresholds:
  │       frustrationSignal || hintsUsed >= 2 || masteryPct < 40  →  Intensive
  │       attempts === 0 || masteryPct < 80                       →  Guided
  │       else                                                    →  Independent
  │
  ├─ buildDynamicSystemPrompt()  →  lib/subject-session.ts
  │   Injects: grade, subject, language, studentName,
  │            scaffolding level + instructions, hint, mastery context
  │
  ├─ Groq / Gemini streaming call with dynamic prompt
  │
  ├─ SSE stream to browser
  │
  └─ Post-stream (fire-and-forget):
      ├─ Persist chat_messages to Supabase
      ├─ Update learning_progress (if competencyCode present)
      └─ Update Redis LearningSession.preferences.scaffoldingLevel
```

**Scaffolding levels and instructions:**

| Level | Trigger condition | Prompt instruction |
|---|---|---|
| **Independent** | mastery ≥ 80%, no frustration | Ask open-ended questions. Do NOT give the answer. Let them reason through independently. |
| **Guided** | 40% ≤ mastery < 80%, or no attempts yet | Ask ONE guiding question per turn. Acknowledge what is correct before redirecting. Do not give the complete answer. |
| **Intensive** | mastery < 40%, hintsUsed ≥ 2, or frustrated | Break concept into smallest possible step. Present one step, check understanding, then move to next. Use concrete Kenyan examples (matatus, shillings, everyday life). |

**Implementation locations:**

- TypeScript (active in production): `lib/omega-agent/metta-core.ts`  
  `evaluateTutoringDecision()` + `TutoringDecision` interface
- Rust (source of truth, not yet deployed): `rust-core/src/agent_runtime.rs`  
  `decide_tutoring()` function
- Dynamic prompt builder: `lib/subject-session.ts`  
  `buildDynamicSystemPrompt()`

**Critical invariant:** Thresholds (40%, 80%, hintsUsed ≥ 2) must stay synchronized
between TypeScript and Rust implementations.

**Wiring the Rust service:**

Set `SYNCSENTA_RUST_ADAPTIVE_URL=http://localhost:8091` (or production URL) in
Vercel environment variables. When set, `/api/chat` calls the Rust service
instead of the TypeScript port. Falls back to TypeScript if the env var is unset.

**Teacher visibility:**

The computed scaffolding level is stored fire-and-forget in Redis
(`LearningSession.preferences.scaffoldingLevel`) and visible in the teacher's
Phase 2 dashboard Subject Sessions tab.

## Subject session flow (shipped September 2026)

All 10 subjects now route through a unified entry point at `/student/subject/[slug]`:

```
/student/sandbox (Subject Catalogue)
  └─ openSubject({ slug })
       └─ router.push('/student/subject/[slug]')
            └─ /student/subject/[slug]/page.tsx
                 │
                 ├─ Parallel fetch:
                 │   ├─ getSubjectXP()            (point_transactions)
                 │   ├─ GET /api/session/sync     (Redis resume point)
                 │   ├─ getOrCreateChatSession()  (chat_sessions)
                 │   └─ getChatMessages(40)       (chat_messages)
                 │
                 └─ Route by layout:
                     ├─ layout: 'chat'     →  SubjectChat (full-height embedded)
                     │                         ├─ POST /api/chat (SSE)
                     │                         └─ Omega decision per turn
                     │
                     └─ layout: 'sandbox'  →  redirect to
                                               /student/sandbox/[grade]/[slug]
```

**10 subjects in SUBJECT_REGISTRY** (`lib/subject-session.ts`):

- **Core (sandbox layout):** mathematics, english, kiswahili, environmental,
  creative, cre, indigenous
- **Extended (chat layout):** blockchain, financial-literacy, ai

Each subject has its own:
- XP tracking via `point_transactions` table
- Chat session with up to 40-message history
- Redis resume point for activity continuity
- Level calculation (1–10, 100 XP per level)

## Primary request flows

### Socratic student chat (with Omega)

```
Browser → POST /api/chat
  → auth + profile
  → rate limit (Upstash)
  → query learning_progress
  → evaluateTutoringDecision()
  → buildDynamicSystemPrompt()
  → Groq streaming
  → SSE to browser
  → persist: chat_messages, learning_progress, api_usage
  → fire-and-forget: Redis scaffoldingLevel
```

### Teacher material generation

```
Teacher UI → /api/generate/scheme
           → proxy → FastAPI /lesson-architect/generate-scheme
           → LangGraph LessonArchitectAgent
           → Groq
           → persist to `schemes` table
```

### Activity resume

```
ActivityPage mounts
  → GET /api/session/sync?action=get
  → Redis LearningSession.currentActivity
  → if id matches activityId: restoreVariationIndex
  → InteractiveSandbox(initialVariationIndex)

On variation complete (not yet mastered):
  → POST /api/session/sync { currentActivity: { id, name, progress, data } }

On mastered:
  → POST /api/session/sync { currentActivity: null }
  → submitActivity() → Supabase
```

## Deployment topology

| Component | Config | Platform |
|---|---|---|
| Studio | `studio/vercel.json` | Vercel |
| AI Agents | `ai-agents/render.yaml` | Render |
| Scheme Scribe | Vite + Supabase Edge Functions | Separate |
| Rust service | `rust-service/Dockerfile` | Not yet deployed |

Studio starts on port 5173 (`next dev -p 5173`).
AI Agents runs on port 8001.

## Migration paths (removed September 2026)

The `sql/` directory and duplicate migrations in `studio/supabase/migrations/001-005`
have been removed. Migration source of truth:
- **Studio + shared schema:** `supabase/migrations/`
- **Studio-only additions:** `studio/supabase/migrations/` (only non-duplicate files)
- **Scheme Scribe:** `scheme-scribe/supabase/migrations/` (separate project)

Before applying any migration, verify which have already been applied to the
target Supabase project.

## Known integration gaps

- FastAPI CORS lists ports 3000/3001; Studio uses 5173. Direct browser calls
  to the FastAPI service need the CORS allow-list updated.
- Service-role Supabase helper is not cookie-aware. Some route handlers call
  `auth.getUser()` through it — align before relying on those for access control.
- The teacher-feedback FastAPI router exists in source but is not registered
  in `api/server.py`.
- Firmware API contract does not match FastAPI contract.
- Rust service is built but not wired to production.
- Voice call orchestrator contains a placeholder AI method.
