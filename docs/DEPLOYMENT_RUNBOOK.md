# SyncSenta Deployment Runbook

**Scope:** Studio on Vercel, AI Agents on Render, and Supabase-backed application services.

## Deployment order

Deploy database migrations first, then the AI Agents service, and finally Studio. Do not publish a frontend change that depends on a backend route until the backend readiness check is healthy.

## Pre-deployment checks

From the repository root:

```bash
cd studio
npm ci
npm run lint
npm run typecheck
npm test -- --run
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key \
SUPABASE_SERVICE_ROLE_KEY=placeholder-service-role-key \
GROQ_API_KEY=placeholder-groq-key \
npm run build

cd ../ai-agents
PYTHONPATH=src python -m compileall -q src tests
PYTHONPATH=src pytest -q
```

Use real deployment environment variables only in the hosting provider. Never put service-role keys, provider keys, or database credentials in Git.

## Render readiness

The Render service is defined in `render.yaml`:

```text
rootDir: ai-agents
startCommand: PYTHONPATH=src uvicorn syncsenta_agents.api.server:app --host 0.0.0.0 --port $PORT
healthCheckPath: /healthz
```

Verify:

```bash
curl -fsS https://ascendra-1.onrender.com/healthz
```

Expected response shape:

```json
{"status":"ok","offline_demo":false}
```

A timeout is not equivalent to a healthy cold start. Inspect the Render deployment logs and service state before changing application code or retrying production requests.

## Vercel verification

After deployment, verify the public shell and representative protected behavior:

```bash
base=https://sentastudio.vercel.app
curl -fsS "$base/api/health"
curl -fsS "$base/manifest.json"
curl -fsS "$base/sw.js"
curl -fsS "$base/offline"
curl -sS -o /tmp/protected -w '%{http_code}\n' \
  -X POST -H 'content-type: application/json' \
  --data '{}' "$base/api/student/wellbeing"
```

The protected request should return `401` without an authenticated session. Do not use real learner data for smoke tests.

## Rollback

Rollback by reverting the specific verified commit and pushing the revert. Do not reset shared history. After rollback, repeat the Vercel route and health checks above and confirm the working tree is clean.

## Incident notes

Record deployment time, commit SHA, provider deployment URL, failing route, response status, and whether the failure is application code, provider configuration, credential availability, or a cold-start/resource issue. Do not record secrets or personal data.

## Current known external dependency

The AI service readiness endpoint must be rechecked after every Render deployment. If it times out while Vercel remains healthy, treat Studio's public shell and the AI-backed workflows as separate deployment states; do not claim the full platform is healthy until `/healthz` responds.

---

Last reviewed: September 2026.
