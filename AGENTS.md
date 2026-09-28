# AGENTS.md — SyncSenta Build Instructions

This file tells AI agents (Bonsai, Kiro, etc.) how to work in this codebase.

## Project Identity

SyncSenta is a **Web4 Education OS** for Kenya's CBC curriculum.
- NOT a prototype. NOT a demo. Production-grade code only.
- Target: 100,000+ concurrent users across Kenya
- Stack is fixed — do not suggest alternatives

## Code Rules

### Rust Backend (`backend/`)
- No `unwrap()` in production paths — use `?` and proper error types
- All DB queries use `sqlx::query!` macros (compile-time checked)
- Async everywhere — `tokio::spawn` for background tasks
- Error type: `anyhow::Result` for services, `AppError` for handlers
- Run `cargo check -p syncsenta-backend` before marking any task done

### React frontend (`studio/`)
- TypeScript strict mode — no `any` types
- `studio/` IS the web application (Next.js 14, deployed on Vercel). There is no
  separate `frontend/` directory; do not create one.
- State: `zustand` for global, `@tanstack/react-query` for server state
- Run `npx tsc --noEmit`, `npm test`, and `npm run build` from `studio/` before
  marking any task done
- `typescript.ignoreBuildErrors` must stay OFF — its removal is what lets the
  build catch the class of routing/regression bugs recorded in
  `.kiro/specs/main-stability-and-branch-consolidation/`

### Repository layout
- The repository root holds only deploy and workspace manifests, `README.md`,
  `AGENTS.md`, and the Replit training entry points. Everything else goes in a
  folder.
- New documents → `docs/` (`architecture/`, `research/`, `setup/`, `archive/`).
  New executable helpers → `scripts/`. Never add a loose file to the root.
- Point-in-time status reports go straight to `docs/archive/`, not the root.

### Testing
- Backend property tests: `proptest` (minimum 100 iterations)
- Frontend property tests: `fast-check`
- Unit tests co-located with implementation
- E2E: Playwright

## Task Workflow

1. Read task from `.kiro/specs/syncsenta-education-os/tasks.md`
2. Check `requirements.md` for what it must do
3. Check `design.md` for how to build it
4. Implement in the correct module
5. Write tests
6. Run `cargo check` or `npm run build`
7. Fix all errors before proceeding
8. Mark `[ ]` → `[x]` in tasks.md
9. Git commit: `feat: implement Task X.Y - description`
10. Move to next task

## Working agreements

Installed under [`.claude/skills/`](.claude/skills/) and expected of every agent
here, whether or not your harness loads that directory:

- **TDD first** (`test-driven-development`): write the failing test before the
  fix. `docs/TDD_ANALYSIS.md` lists the seams that still lack coverage.
- **Thin slices** (`incremental-implementation`): one verifiable change per
  commit. A 900-file blob cannot be reviewed and will be reverted.
- **Root-cause, never guess** (`debugging-and-error-recovery`): reproduce, name
  the broken assumption, then fix. Do not patch symptoms.
- **Review before merge** (`code-review-and-quality`): re-read your own diff for
  correctness, dead code, and the anti-patterns logged in `docs/TASKS.md`
  (import-barrel shims and orphaned unlisted imports have both bitten this repo).
- **Cut needless complexity** (`code-simplification`): do not "improve" files a
  task did not touch.

## Response shape

Report like the reader has a working memory of one item
(`i-have-adhd`). Safety beats brevity before destructive actions.

1. First line is the next runnable thing: a command, a path, a diff.
2. Multi-step work is a numbered list, one bounded action per step.
3. State where we are every turn ("step 3 of 5 done: … next: …").
4. Errors are stated as cause and fix — no "uh oh, there seems to be an issue".
5. Vague hedges are deleted; a hedge that carries real uncertainty stays.
6. Time estimates in concrete units, pointed at whoever executes the step.
7. Finished work is shown, not summarised: "chat SSE now reconnects — try it on
   `/student/grade-4/mathematics`".
8. One secondary issue gets one line at the end, as a separate question.

No opener announcing what is about to happen, no closer asking if anything else
is needed.

## What NOT to Do

- Do not suggest switching from Rust to Go/Python/Node
- Do not suggest switching from Polygon to another chain
- Do not create new top-level directories without good reason
- Do not leave TODO/FIXME comments in committed code
- Do not use `unwrap()` or `expect()` in non-test code
- Do not skip tests to move faster

## Key Files

| File | Purpose |
|------|---------|
| `.kiro/specs/syncsenta-education-os/tasks.md` | Master task list |
| `.kiro/specs/syncsenta-education-os/requirements.md` | Functional requirements |
| `.kiro/specs/syncsenta-education-os/design.md` | Technical design |
| `.kiro/specs/main-stability-and-branch-consolidation/` | Current stability spec + branch audit |
| `backend/syncsenta-backend/src/` | Rust Axum API |
| `studio/src/` | Next.js application — the deployed web frontend |
| `studio/src/lib/omega/` | Omega adaptive tutoring decision engine |
| `rust-core/` | Adaptive policy source of truth |
| `docs/architecture/laya-decision-router.md` | Where an open-weight decision model may and may not sit in the tutoring loop |
| `docs/README.md` | Which documentation is authoritative |
| `docs/CONTENT_READINESS.md` | What a student can actually do today |

## Current State (September 27–28, 2026 — overnight session)

- Deployed: `studio/` on Vercel (sentastudio.vercel.app), `ai-agents/` on Render
  (as `Ascendra-1`, and see the provider note below before trusting it),
  Supabase for auth/Postgres/RLS. Not deployed anywhere: `backend/syncsenta-backend`
  (Rust, `/api/v1/mvp/*`). As of 2026-09-27 nothing under `studio/src` calls it.
- Studio gates, measured 2026-09-28 on `fix/render-build-and-student-surface`:
  `npx tsc --noEmit` clean; vitest **480 passed, 17 skipped** across 64 files
  (`npx vitest run --no-file-parallelism`; the `basic` reporter no longer exists in
  Vitest 4). Earlier notes claiming 366 / 403 / 419 / 434 tests were stale. CI runs the
  same suite on Node 22, matching local and Vercel — on Node 20 Supabase's client
  aborts every test file with "Node.js detected but native WebSocket not found",
  which is a runner artifact, not a code defect.
- The learner home (`studio/src/app/student/page.tsx`) is now built from
  `chat_sessions` and `profiles.total_points` via
  `studio/src/lib/student/home-data.ts`. It used to print three hardcoded arrays
  (homework with due dates, 85/72/68 progress bars, "2:00 PM — 3:00 PM" classes)
  and fill its stats from `/api/test-personalization`.
  `studio/src/lib/personalized-learning.ts` — which that endpoint, `/api/mwalimu`
  and `ai/flows/orchestrator-agent.ts` all depend on — stores profiles, sessions
  and progress in per-process `Map`s and then persists them with `localStorage`
  inside a Node function, so on Vercel it starts empty on every invocation and
  returns a name from `generateFriendlyName()`. Treat that whole engine as demo
  scaffolding, not a data layer: nothing new should read learner state from it
  until it is backed by the Supabase tables that already exist
  (`chat_sessions`, `chat_messages`, `point_transactions`, `profiles`).
- `supabase/migrations/001..005_*.sql` are committed as **absolute symlinks to
  `/home/web4ke/codes/Ascendra/sql/studio_migrations/...`**, which exists on no
  machine anyone here has. They are dangling, so a fresh clone cannot recreate
  the core schema (`profiles`, `chat_sessions`, `point_transactions` are missing
  from the repo's SQL entirely). Recover them by exporting schema from the live
  Supabase project and committing real files; until then, do not treat
  `supabase/migrations/` as reproducible.
- 1 open pull request: #17 `fix/render-build-and-student-surface` (student chat,
  teacher live view, quiz, plus the `/api/v1` removal below). It cannot be pushed
  from this laptop yet: four commits touch `.github/workflows/*` and the current
  `gh` token has no `workflow` scope. Run `gh auth refresh -s workflow` (or edit
  `node-version` in the GitHub web UI), then push. 13 remote branches, most already
  merged or superseded — see
  `.kiro/specs/main-stability-and-branch-consolidation/branch-audit.md`
- Student chat: two separate failures, now both understood.
  - *Why the learner saw "Connecting" forever* — not a placeholder. The student tutor
    (`studio/src/components/student/mwalimu-chat.tsx`) was wired to the Rust MVP API
    (`/api/v1/mvp/messages`, `/api/v1/mvp/students/<id>/messages`) and to a WebSocket
    at `wss://sentastudio.vercel.app/api/v1/mvp/ws`. `next.config.js` rewrites
    `/api/v1/:path*` to `http://localhost:8080`, so on Vercel every one of those is a
    404 and no process ever answers the socket. `backend/syncsenta-backend` is
    deployed nowhere. The header badge was reporting that dead socket, not the tutor.
    The tutor now streams from the route that *is* deployed: `/api/chat`, via
    `studio/src/lib/chat/tutor-stream.ts`, with the socket gated behind
    `NEXT_PUBLIC_BACKEND_WS_URL` so an absent backend shows as a separate, honest
    "Teacher link" badge instead of swallowing the chat. The teacher live view
    (`/teacher`, which *is* the teacher role home) had the same defect and now
    reports "Live monitoring is not connected" instead of spinning, and `/quiz`
    was moved off the dead prefix onto `/api/agents/assessment/*`, which
    `vercel.json` already proxies to Render. As of 2026-09-27 `/api/v1` has **no
    callers left anywhere under `studio/src`**: the scheme wizard, the lesson-plan
    dialog and `/teacher/exams` were moved onto Next handlers that ship with the
    studio (`/api/generate/scheme`, `/api/generate/lesson-plan`,
    `/api/generate/exam`, `/api/exams/mark`), and the `scheme-v2-client` /
    `scheme-loader` / `scheme-library` / `save-scheme-button` cluster — which read
    `NEXT_PUBLIC_API_URL || http://localhost:8080` from the browser and had no
    importer in `app/` — was deleted rather than rewired.
    `student-chat-transport.test.ts` walks `src/` and fails on any hard-coded
    `/api/v1/` literal, and `/api/schemes/active` now answers 503
    `awaiting-backend` instead of failing silently inside a try/catch.
    `MVP_BACKEND_URL` in `next.config.js` remains the one switch that turns the
    Rust surfaces on once `backend/syncsenta-backend` is deployed somewhere.
  - *Why the teacher generators looked working but were fake* — every
    `Generate*Request` model in `ai-agents/src/syncsenta_agents/api/lesson_architect_api.py`
    requires `teacher_id` (and `generate-lesson-plan` requires `week`), but the
    studio proxies never sent it. FastAPI answered 422 and the proxies translated
    that into prescribed template rows labelled "AI generation is temporarily
    unavailable". The proxies now derive `teacher_id` from the Supabase session
    and supply `week`/`lesson`, and `preview-step.tsx` shows a green "generated by
    the AI service" or an amber "Template scheme." alert carrying the real
    `fallback_reason`, so a fallback is visible instead of disguised.
    `/api/generate/exam` and `/api/exams/mark` have **no prescribed fallback at
    all** by deliberate decision: a fabricated question set is pupil-facing
    assessment material and a invented mark is pupil-facing feedback, so both fail
    loudly (401 without a session, 400 on empty allocation, 502 with the provider
    list when the LLM chain is unreachable) and `ExamRunner.tsx` tells the teacher
    the answer scored 0 until a human marks it. `exam-generation-shape.test.ts`
    pins the strand-allocation shape and the JSON-extraction helper it shares with
    `lib/llm/complete-with-fallback.ts`.
  - *Deleted rather than left behind (2026-09-27)* — `student/chat/chat-interface.tsx`
    (546 lines) and `components/quiz/interactive-quiz-modal.tsx`. The subject
    deep link `/student/chat/<subject>`, which the learner home pushes, rendered
    that legacy twin, so it reproduced the original "Connecting forever" failure
    right after the real tutor was fixed. Both URLs now render
    `components/student/student-chat-view.tsx`, and `/api/classroom-compass`
    has no caller left (kept deployed, documented). Likewise
    `src/lib/auth.ts` (`signupUser()`/`getServerUser()`) and the orphaned
    `/signup/form` page: they were the last writers of the
    `userRole`/`userName`/`userEmail` cookie session that produced the blank
    `/dashboard`, and nothing linked to that page anywhere in the repo.
  - *Why the route 502s* — the route no longer depends on one upstream:
    `resolveLlmTargets()` (`studio/src/lib/llm/provider-chain.ts`) tries
    `LLM_PROVIDER` first and any other configured provider as backup, and reports
    `providers_tried`. Probed 2026-09-26 against the supplied test keys: 6 of 8 Groq
    keys are `organization_restricted`, and the 2 live ones 404 on
    `llama-3.3-70b-versatile` but answer `qwen/qwen3.8-27b` — which is why that is now
    the groq default. The Gemini key authenticates but its model list could not be
    re-verified (TLS failures from this machine), so `gemini-3.6-flash` is left alone:
    unproven, not disproven. Still needed from the account holder: a working
    `GROQ_API_KEY` and a second provider key in the Vercel project.
  - *Live proof of what production is doing right now (2026-09-28)* — signed in
    through `/api/auth/demo-login?role=student` with `curl` (it sets a real
    `sb-tumikgwhrbvirpjswlzh-auth-token` cookie and lands on `/student?demo=1`) and
    posted one turn to `https://sentastudio.vercel.app/api/chat`. Production answers
    **502 `Upstream model error: groq/llama-3.3-70b-versatile: 404 model_not_found`,
    `providers_tried: ["groq"]`**. Two things follow. The Groq credential in the
    Vercel project authenticates — a bad key gives 401, not a model 404 — but
    production is running a build from before the default became `qwen/qwen3.8-27b`,
    so the tutor is broken until this branch deploys. And `providers_tried` lists
    one provider, so no Gemini backup key is set: the chain has nothing to fall
    back to. If the 502 survives the deploy, `GROQ_MODEL` is pinned to the dead id
    in the Vercel project settings and has to be changed there, not in code.
- The deployed `ai-agents/` service is healthy and useless at the same time.
  `https://ascendra-1.onrender.com/healthz` answers 200, and its OpenAPI showed
  only four routes (`/healthz`, `/agents/chat`, `/agents/assessment/quiz`,
  `/agents/assessment/grade`). Measured 2026-09-27: `GET /lesson-architect/healthz`
  404s on the live host, because the lesson-architect router lived only in
  `api/scheme_server.py`, which `render.yaml` does not run — the dashboard and
  WebSocket routers had the same problem. `api/server.py` now mounts
  `lesson_architect_api.router` inside a guarded import and reports the outcome at
  `/healthz` under `lesson_architect: {mounted, error}`; the guard is deliberate
  (an unguarded import would let one broken wheel take `/agents/chat` down with no
  way to test locally), and `ai-agents/tests/test_deployed_app_routes.py` pins all
  eight teacher-generator routes plus the four student paths. **Still not live
  until Ascendra-1 redeploys from this branch.** Both LLM paths inside the service
  used to construct an `Ollama` client unconditionally, so with no daemon on the box
  `POST /agents/chat` returns HTTP 200 carrying
  `{"success": false, "error": "Synthesis failed: … localhost:11434 … Connection
  refused"}` and `POST /agents/assessment/quiz` returns 500. Fixed in code by
  `ai-agents/src/syncsenta_agents/inference/provider_choice.py`, which resolves
  the provider from the credential that exists instead of defaulting to a local
  daemon. **This is not live until the account holder sets `LLM_PROVIDER=groq`
  and a working `GROQ_API_KEY` on Ascendra-1 and redeploys** — `render.yaml` is
  documentation only for that hand-created service, and the Python tests cannot
  run on this laptop (no pip, no aiohttp/pytest; the edits are validated with
  `python3 -m py_compile`).
- The red Render build is not this repo's. `Ascendra-1` is live on the merged
  commit; the failing builds belong to the `urban-train` service, which deploys
  `dgithinjibit/urban-train` (a different repository, idle for about three
  months) and 404s every `/api/v1/mvp/*` path people expect from this one. It
  needs a decision from the account holder, not a code change: delete it, or
  repoint it at `backend/syncsenta-backend` from this repo. Nothing in `studio/`
  waits for that service any more (see the `/api/v1` removal above), so deleting
  it is now a clean option — the teacher live view and scheme-context grounding
  are gated on env vars / an explicit 503 instead.
- Legacy auth surface retired: `/dashboard` used to resolve a role from a `userEmail`
  cookie nothing writes any more, which rendered a permanently blank page for every
  visitor including signed-in students. It is now a server redirect to the real role
  home, `/api/set-auth-cookie` (which minted roles from an unauthenticated POST) is
  deleted, and `/login` + `/signin` forward to `/auth/signin`. `app-sidebar.tsx` and
  `/dashboard/reports` were the same bug one layer up — they resolved a null role and
  rendered an empty nav / the wrong view, and now read `useAuth()`, with a repo-wide
  test barring any `"use client"` module from calling `getServerUser()`. The trust
  surface (`lib/backend/trust-backend.ts` and its four API routes) had the same
  defect: `getBackendActor()` read the dead `userRole`/`userEmail` cookies, so
  `/api/parental-consent`, `/api/data-requests` and `/api/school-controls` answered
  401 for every real signed-in user while the pages looked functional. It now
  resolves the caller from the Supabase session through the RLS-enforcing
  route-handler client — never `getSupabaseServerClient()`, which carries the
  service-role key and reports a null user. Its Firestore write branch is gone too:
  it sat behind `TRUST_BACKEND_ENABLED`, a flag set nowhere, and enabling it would
  have started storing children's consent records in a retired database with no
  reviewed access policy. `persistTrustRecord()` now returns `persisted: false`
  honestly. Durable trust records need Supabase tables plus RLS policies — a
  migration the account holder owns, not a code fix. Closed on 2026-09-28 in the
  same shell: `lib/auth.ts` and `/signup/form` are deleted (see the student-chat
  bullet), `(main)/layout.tsx` no longer resolves a role from the `userRole`
  cookie it could never read, the sidebar's `/dashboard` items are replaced by one
  Home item derived from `getRoleHome()`, and `AppSidebar`/`/dashboard/reports`
  now accept the role spellings the deployed `profiles.role` column can hold
  (`head`, `admin`) instead of only the frontend's `school_head`/`county_officer` —
  which had silently given a signed-in head an empty nav and the teacher view.
- The legacy local-storage session is gone too (2026-09-28). `AppHeader` and
  `StudentHeader` filled the account menu from `localStorage.userName`/`userEmail`,
  defaulting to **"User / user@example.com" for every signed-in person**, and
  their "Log out" was a link to `/login` — an alias for `/auth/signin` that leaves
  the Supabase session alive, so a learner who clicked it was signed in and looking
  at the sign-in form at once. `ProfileDialog` was the only writer of those keys:
  saving a name wrote the device and never touched `profiles.full_name`, which
  every server handler reads. All three now take identity from `useAuth()` and the
  dialog calls `updateProfile()`. Five more components (the Jitsi room display
  name, county comms sender, school-head announcement sender, the legacy lesson-plan
  dialog, `/student/learn_by_making`) were reading the same absent keys and getting
  their fallback label; they use the profile row too. The avatar picker is deleted
  rather than faked — a base64 data URL in `profiles.avatar_url` would put
  megabytes in a column every auth path reads, and this project has no Supabase
  Storage bucket or policies yet, so durable avatars are a migration the account
  holder owns. `legacy-auth-surface.test.ts` fails on any `localStorage` read or
  write of `userName`/`userEmail`/`userAvatar`/`studentName`/`userRole`, on a
  header that links to `/login` instead of calling `signOut()`, and on the nine
  unreferenced legacy dashboards (`components/dashboards/{teacher,county-officer,
  school-head,school-admin,national-admin,parent}-dashboard.tsx`,
  `components/gamification/*`, `digital-attendance-register.tsx`) growing back.
- Laya System-1 affect router exists as a gated, unadopted PoC
  (`ai-agents/src/syncsenta_agents/decisions/`, `LAYA_AFFECT_ENABLED` off by
  default). CPU latency and Kiswahili/Sheng accuracy are deliberately **unmeasured**:
  the development laptop has 3.7 GB RAM and cannot host torch. See
  `docs/architecture/laya-decision-router.md`.
- `docs/research/conference-submission-agi-venues-2026-27.md` records what we could
  submit externally, which venues are actually open, and the evidence gaps that block
  a submission.
- Rust workspaces build on a machine with a C linker; `cargo check` needs
  `build-essential`, which is not installed in every dev environment
