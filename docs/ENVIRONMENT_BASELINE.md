# Environment baseline — the clean slate

Written 2026-09-28. This is the authoritative list of what the two deployed
runtimes must be given, what must be deliberately absent, and what is legacy
that no one should set. It replaces the scattered per-file guesses that made
`SYNCSENTA_BACKEND_URL` default to a laptop.

Why this document exists: **62 distinct `process.env` names** are read across
`studio/src` (excluding test files; 71 including them and the root config), and
nobody could say which ones the live site depends on. The Omega Claw outage was
not a crash — it was a variable nobody had set, pointing at a service nobody
had deployed, on a page that looked fine.

## The one rule that matters

> **No variable may default to a loopback address or to a service that is not
> deployed in the same environment as the code reading it.**

If a runtime can't be reached from production, its URL variable must default to
*empty*, and the code must have a real behaviour for empty. That is what
`SYNCSENTA_BACKEND_URL` does now (`studio/src/lib/omega-claw-api.ts`): unset
means the TypeScript rule pack answers; set means forward to Rust. No third
state, no `127.0.0.1`.

---

## Vercel — `studio/` (sentastudio.vercel.app)

### A. Required. The product does not work without these.

| Variable | Read by | What breaks if unset |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `middleware.ts`, `lib/supabase/{client,server,route-handler}.ts`, `api/chat` | No session, no RLS, every page redirects to sign-in |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same | same |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/server.ts`, `api/internal/schools/onboarding` | Admin/platform-side writes fail |
| `GROQ_API_KEY` | `lib/llm/provider-chain.ts`, `lib/groq-client.ts`, `api/voice-call` | The tutor has no primary provider → 502 |
| `GEMINI_API_KEY` | `provider-chain.ts`, `ai/genkit.ts`, `lib/vision-analysis.ts` | The tutor has **no fallback** — this is what made chat go dark on 2026-09-26 with a healthy second provider sitting unused |
| `NEXT_PUBLIC_AI_AGENTS_URL` | `middleware.ts`, `components/student/syncsenta-chat.tsx`, `lib/api/*`, `api/teacher/feedback` | Tutor and feedback calls hit the Vercel origin instead of Render |

`GROQ_API_KEY` and `GEMINI_API_KEY` are listed together on purpose: the chain
in `provider-chain.ts` only produces a fallback if a *second* key exists. One
key is a single point of failure for every learner.

### B. Optional, with verified defaults. Set them to change behaviour, not to make it work.

| Variable | Default if unset | Note |
|---|---|---|
| `LLM_PROVIDER` | `groq` | Names the *primary*; the other configured provider still runs as fallback |
| `GROQ_MODEL` | `qwen/qwen3.8-27b` | **Verified live 2026-09-27.** The old default `llama-3.3-70b-versatile` answers `404 model_not_found` on this account — that is the production 502 |
| `GEMINI_MODEL` | `gemini-3.6-flash` | **Unproven, not disproven.** The key's model list was never read because the endpoint went unreachable. Treat as a guess |
| `SYNCSENTA_BACKEND_URL` | empty → Omega Claw rules run in TypeScript | Set **only** when `backend/syncsenta-backend` is actually deployed. When set, it becomes authoritative |
| `SYNC_SENTA_RUST_ADAPTIVE_URL` | unset → adaptive question falls back | Rust `rust-core` adaptive endpoint |
| `AUTH_WALL_ENABLED` | off | `middleware.ts` auth wall |
| `SCHEME_GENERATION_MODE`, `SCHEME_AI_TIMEOUT_MS`, `EXAM_AI_TIMEOUT_MS` | code defaults | Teacher generator tuning |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | unset → in-memory | Rate limiting + session persistence |
| `SYNC_SENTA_RELEASE_CHECK_TOKEN`, `SYNC_SENTA_SCHOOL_REVIEW_TOKEN` | unset → those internal routes deny | Shared secrets, not user auth |
| `GITHUB_FEEDBACK_WEBHOOK_URL`, `OBSERVABILITY_ENDPOINT`, `NEXT_PUBLIC_MONITORING_URL` | unset → feature silent | Nice-to-have telemetry |

### C. Must be ABSENT in production. Presence is a vulnerability, not a config.

These are all bypasses or self-attestation flags. Vercel does not delete
variables you drop from the code, so they must be **manually removed** from the
project, not merely stopped being read:

`SYNCSENTA_ALLOW_DEV_CHAT` · `NEXT_PUBLIC_AUTH_DEMO_BYPASS` ·
`SYNC_SENTA_USE_MOCK_AUTH` · `REQUIRE_MOCK_AUTH` ·
`SYNC_SENTA_ALLOW_SYNTHETIC_DATA` · `SYNC_SENTA_ENABLE_BIOMETRIC_PROCESSING`

Two of them are load-bearing for child data. `SYNC_SENTA_ALLOW_SYNTHETIC_DATA`
and `SYNC_SENTA_ENABLE_BIOMETRIC_PROCESSING` are read by
`api/internal/child-facing-readiness` — the gate that decides whether a
learner-facing build is allowed to exist. A flag that a deployment can set to
`true` to pass its own safety audit is not an audit.

### D. Legacy. Do not set. Deleting the code is the actual task.

Read by modules that are imported, but by nothing a learner or teacher can
reach — or by routes that were retired on this branch:

- **Payments (frozen by decision):** `MPESA_ENV`, `MPESA_CONSUMER_KEY`,
  `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, `MPESA_SHORTCODE`,
  `MPESA_CALLBACK_URL`. No cash during development. The routes still exist
  under `src/app/api/payments/`, so this is "never set", not "deleted".
- **Never deployed here:** `AISA_API_KEY`, `AISA_BASE_URL`, `DIFY_API_KEY`,
  `DIFY_API_URL`, `HUGGINGFACE_API_KEY`, `HUGGINGFACE_USERNAME`,
  `NEXT_PUBLIC_HUGGINGFACE_API_KEY`, `METTA_BASE_URL`, `CBC_AGENT_URL`,
  `NEXT_PUBLIC_CBC_BACKEND_URL`.
- **Hardware / meetings:** `ESP32_DEVICE_KEYS`, `NEXT_PUBLIC_JITSI_DOMAIN`.
- **Unused anywhere in `src`:** `MVP_BACKEND_URL`, `TEST_API_URL`.
- **Old backend pointers:** `MVP_BACKEND_URL`, `NEXT_PUBLIC_API_URL`,
  `NEXT_PUBLIC_BACKEND_API_URL`, `NEXT_PUBLIC_BACKEND_WS_URL`. `middleware.ts`
  still rewrites on these, and `components/teacher/teacher-dashboard.tsx`
  reads them.

### E. The Firebase problem — an open decision, not a settled one

`src/app/layout.tsx:3` does `import { app } from '@/lib/firebase'` with the
comment *"Ensure Firebase is initialized"*. Because the root layout imports it,
these seven variables are on the critical path of **every page render**:

`NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`,
`_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, `_APP_ID`, `_MEASUREMENT_ID`

At least **thirteen other modules** import `db` or `storage` from it —
`app/(main)/dashboard/curriculum`, both `learning-lab` pages, `api/seed`,
`lib/teacher-service.ts`, `ai/flows/mwalimu-ai-flow.ts`, and six generator
dialogs plus `my-resources`. Fourteen files in total. `initializeApp()` does
not throw on an all-`undefined` config, which is why the site renders and the
Firestore-backed surfaces are quietly broken instead.

**This must be resolved before the env slate can be called clean.** Two honest
options, and they are not symmetric:

1. **Keep Firebase** → set the seven variables, and accept two auth systems and
   two data stores in a product whose compliance story is child data.
2. **Drop Firebase** → delete the root-layout import first, then each consumer,
   then the variables. This is the option consistent with Supabase-as-source-of-truth.

Recommendation: **2**, but it is a real migration, not a rename, and it should
be its own task rather than a side effect of an env cleanup. Until it is done,
list these seven as *"currently load-bearing, deliberately on the way out"*.

---

## Render — `ai-agents/` (Ascendra-1)

`ai-agents/render.yaml` is documentation, **not** the live config: the running
service was created by hand, so editing the file changes nothing. Mirror these
into the dashboard's Environment tab.

### Required

| Variable | Value | Why |
|---|---|---|
| `LLM_PROVIDER` | `groq` | Unset, the orchestrator resolves to **Ollama at `http://localhost:11434`**, which does not exist on Render. The service reported healthy on `/healthz` while every request failed — measured 2026-09-26 |
| `GROQ_API_KEY` | secret, `sync: false` | — |
| `GROQ_MODEL` | `qwen/qwen3.8-27b` | `llama-3.3-70b-versatile` is `404 model_not_found` for this org |
| `SUPABASE_URL` | project URL | — |
| `SUPABASE_SERVICE_KEY` | secret, `sync: false` | service-role; the only key the FastAPI side has |
| `FRONTEND_URL` | `https://sentastudio.vercel.app` | CORS / callback allow-list |

### Optional

`SYNCSENTA_OFFLINE_DEMO` · `ENABLE_CURRICULUM_VALIDATION` ·
`ENABLE_AUTO_REGENERATION` · `MAX_REGENERATION_ATTEMPTS` ·
`ENABLE_VALIDATION_LOGGING` · `VALIDATION_TIMEOUT_SECONDS` ·
`VALIDATION_CACHE_TTL` · `VALIDATION_ALIGNMENT_THRESHOLD` ·
`GEMINI_API_KEY` / `GEMINI_MODEL` · `OPENAI_API_KEY` / `OPENAI_BASE_URL` /
`OPENAI_MODEL` · `NVIDIA_API_KEY` · `OLLAMA_BASE_URL` · `DIFY_API_KEY` /
`DIFY_BASE_URL`

Set a provider's key **only if `LLM_PROVIDER` can select it.** Every unused key
stored on a free-tier Render service is a credential with no consumer.

### Cron job `rule-learning-job`

`LLM_PROVIDER`, `GROQ_API_KEY`, `GROQ_MODEL`, `SUPABASE_URL`,
`SUPABASE_SERVICE_KEY` — same values as the web service.

---

## Later: the Rust backend (`backend/syncsenta-backend`)

Deployed nowhere today. When it ships, it needs its own set — and Vercel then
gets `SYNCSENTA_BACKEND_URL` pointed at it, which is the *only* change studio
requires. Nothing else in this document moves.

From `src/`: `PORT`, `RUST_LOG`, `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`,
`AI_AGENTS_URL`, and — only for the features they gate — `GEMINI_API_KEY`,
`OPENAI_API_KEY`, `IPFS_API_URL`, `IPFS_GATEWAY_URL`, `PINATA_API_KEY`,
`PINATA_SECRET_KEY`, `JITSI_DOMAIN`, `JITSI_SECRET`, `STORAGE_BUCKET`,
`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `AT_USERNAME`, `AT_API_KEY`,
and the same six `MPESA_*` variables that are frozen above.

`DATABASE_URL` and `JWT_SECRET` must point at the same Supabase instance the
app already uses, or two backends will own two divergent copies of the same
learner — which is the failure this document exists to prevent.

---

## What is verified and what is not

**Verified from code on this branch:** every variable name above, which file
reads it, and the defaults in `provider-chain.ts` (`DEFAULT_MODELS`),
`omega-claw-api.ts` (empty default) and `teacher-dashboard.tsx`
(`LIVE_BACKEND_CONFIGURED`). The `qwen/qwen3.8-27b` choice was confirmed
against a live key on 2026-09-27.

**Not verified — and this is the gap that matters:** what is *actually saved*
in the Vercel project and in Render's dashboard right now. Reading them needs
`vercel env ls`, which is not authenticated from this machine, and the browser
session does not carry a Vercel login. So this document says what the slate
**should** be; it has not yet diffed that against what it **is**.

`gemini-3.6-flash` is explicitly a guess. Render has not redeployed from our
branch — `/healthz` still omits the `lesson_architect` field added in `a79c53e`
— so treat every Render value as "as designed", not "as running".
