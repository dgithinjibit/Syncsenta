# Development guide

*Last updated: September 2026*

## Scope

This guide covers the primary development path: Studio (Next.js) + AI Agents
(FastAPI). It does not cover Scheme Scribe or the ESP32 firmware.

Read [Architecture](ARCHITECTURE.md) first if you are unsure which part to run.

## Prerequisites

| Tool | Why |
|---|---|
| Node.js 20+ with npm | Studio builds and tests |
| Python 3.11 | AI Agents (declared in `ai-agents/runtime.txt`) |
| Groq API key | Required for Studio chat and AI Agent LLM calls |
| Supabase project | Auth + database for all features |
| Upstash Redis | Optional — enables rate limiting and session persistence |

## Environment setup

Never commit secrets. Review `git status` before every commit.

### Studio — `studio/.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

GROQ_API_KEY=your-groq-key
GROQ_MODEL=llama-3.3-70b-versatile

# Optional: switch inference to Gemini
LLM_PROVIDER=groq
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.6-flash

NEXT_PUBLIC_AI_AGENTS_URL=http://localhost:8001

UPSTASH_REDIS_REST_URL=https://your-redis-endpoint
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Optional: wire the Rust adaptive service (not in prod yet)
# SYNCSENTA_RUST_ADAPTIVE_URL=http://localhost:8091

# Dev-only: allows unauthenticated chat for local testing
# SYNCSENTA_ALLOW_DEV_CHAT=true
```

Required for build: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`GROQ_API_KEY`. The build script `studio/scripts/check-env.js` fails fast if
these are missing.

Important notes:
- `SUPABASE_SERVICE_ROLE_KEY` is server-only — never prefix with `NEXT_PUBLIC_`
- Upstash values are optional; without them rate limiting is disabled (logs a warning)
- `LLM_PROVIDER=gemini` switches the `/api/chat` route to Gemini; everything
  else stays on Groq

### AI Agents — `ai-agents/.env`

Copy from `ai-agents/.env.example` and fill in:

```
ENVIRONMENT=development
DEBUG=true
GROQ_API_KEY=your-groq-key
GROQ_MODEL=llama-3.3-70b-versatile
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
FRONTEND_URL=http://localhost:5173
SYNCSENTA_OFFLINE_DEMO=0
```

Set `SYNCSENTA_OFFLINE_DEMO=1` only when you want the deterministic assessment
stub — it does not make every feature offline.

## Running the stack

Use two terminals for the full stack. For student-only features, Studio alone
is sufficient.

### Terminal 1 — AI Agents

```powershell
Set-Location "c:\Users\hp\codes\Syncsenta\ai-agents"
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:PYTHONPATH = "$PWD\src"
python -m uvicorn syncsenta_agents.api.server:app --host 127.0.0.1 --port 8001 --reload
```

Verify:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/healthz
# Expected: status=ok, offline_demo=False
```

### Terminal 2 — Studio

```powershell
Set-Location "c:\Users\hp\codes\Syncsenta\studio"
npm ci
npm run dev
# Opens at http://localhost:5173
```

### Running just Studio (no AI Agents)

All student chat and subject pages work without AI Agents running. Teacher
generators (schemes, lesson plans, assessments) will fail — they proxy to
the FastAPI service.

## CORS note

FastAPI's allow-list currently includes ports 3000 and 3001, but Studio runs
on 5173. If you see a CORS error in the browser console for a direct
FastAPI call, add port 5173 to the allow-list in:
`ai-agents/src/syncsenta_agents/api/server.py`

## Test commands

Run from the component directory.

### Studio

```powershell
Set-Location "c:\Users\hp\codes\Syncsenta\studio"

# Run all tests once (CI mode, recommended before commits)
npx vitest run

# Run a single test file
npx vitest run src/lib/__tests__/socratic-prompts.test.ts

# Run tests matching a pattern
npx vitest run socratic

# Watch mode (interactive development)
npx vitest

# Type-check (catches TypeScript errors without running tests)
npx tsc --noEmit

# Lint
npm run lint

# Production build (validates env vars and checks for build errors)
npm run build
```

Tests live in:
- `src/lib/__tests__/` — unit tests for lib modules
- `src/app/api/**/route.test.ts` — route handler tests

**Test command notes:**
- `npx vitest run` runs all tests once and exits (use in CI or before commits)
- `npx vitest` enters watch mode and reruns tests on file changes
- Individual test files can be run by specifying the full path or a unique substring

### AI Agents

```powershell
Set-Location "c:\Users\hp\codes\Syncsenta\ai-agents"
.\.venv\Scripts\Activate.ps1
$env:PYTHONPATH = "$PWD\src"
pytest
```

## Database migrations

Before applying any migration:
1. Export/back up the target Supabase project
2. Check what migrations are already applied in that project
3. Use the correct source:
   - **Studio + shared schema:** `supabase/migrations/`
   - **Studio-only additions:** `studio/supabase/migrations/` (non-duplicate files only)
   - **Scheme Scribe:** `scheme-scribe/supabase/migrations/` (separate project)
4. Apply to staging first, then regenerate Studio DB types if schema changed

The numbered `001`–`005` files under `supabase/migrations/` contain the core
schema. Additional migrations follow the timestamp format `YYYYMMDDNNNNNN_*.sql`.

To apply migrations using Supabase CLI:
```powershell
Set-Location "c:\Users\hp\codes\Syncsenta"
npx supabase db push
```

## Rust adaptive service (optional)

The Rust service is built but not wired to production.

```powershell
# Build (requires Rust toolchain)
Set-Location "c:\Users\hp\codes\Syncsenta"
cargo build --release -p rust-service

# Run locally
.\target\release\rust-service
# Listens on 127.0.0.1:8091

# Health check
Invoke-RestMethod http://127.0.0.1:8091/health
```

Wire to Studio by adding to `studio/.env.local`:
```
SYNCSENTA_RUST_ADAPTIVE_URL=http://localhost:8091
```

When this is set, `/api/chat` uses the Rust decision engine instead of the
TypeScript port in `lib/omega-agent/metta-core.ts`.

**Note:** The Rust implementation is the source of truth for scaffolding thresholds.
The TypeScript port in `lib/omega-agent/metta-core.ts` must stay synchronized with
`rust-core/src/agent_runtime.rs` (`decide_tutoring()` function).

## Known setup traps

| Symptom | Cause | Fix |
|---|---|---|
| Studio build fails immediately | Missing required env var | Check `studio/scripts/check-env.js` output |
| CORS error on FastAPI call | Studio on 5173, FastAPI CORS only allows 3000/3001 | Add 5173 to FastAPI CORS allow-list in `ai-agents/src/syncsenta_agents/api/server.py` |
| AI agent import not found | PYTHONPATH missing | Set `$env:PYTHONPATH = "$PWD\src"` before uvicorn/pytest |
| Teacher feedback 404 from FastAPI | Router not registered in `api/server.py` | Register the router in FastAPI app |
| Voice UI broken | Placeholder AI method in orchestrator | Review `voice-call-orchestrator.ts` |
| `vitest` hangs or doesn't exit | Watch mode is active | Use `npx vitest run` for single-pass execution |
| Rust service connection refused | Service not running or wrong port | Check service is running on 8091, verify `SYNCSENTA_RUST_ADAPTIVE_URL` |

## Safe change workflow

1. Work in one component at a time
2. Keep secrets in component-local `.env` files — never commit them
3. Add migrations only to the canonical source family for that component
4. Run `npx vitest run` and `npm run build` before committing Studio changes
5. Update the matching doc in `docs/` when an interface, env var, or
   deployment contract changes
6. Stage specific files — avoid `git add .` which can sweep in env files
