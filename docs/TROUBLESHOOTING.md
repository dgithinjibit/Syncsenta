# SyncSenta Troubleshooting Guide

## Studio build fails before compilation

Check that `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `GROQ_API_KEY` are present in the deployment environment. The build guard intentionally fails when required public or provider configuration is missing. Use placeholders only for local compile verification, never for a production deployment.

## `/api/health` is healthy but AI generation fails

Studio and the FastAPI service are separate deployment paths. Check the configured `NEXT_PUBLIC_AI_AGENTS_URL`, then call the AI service readiness endpoint directly:

```bash
curl -i https://ascendra-1.onrender.com/healthz
```

A `404` means the request reached a different service or route than expected. A timeout means the Render service is unavailable, cold-starting beyond the probe window, or resource constrained. Inspect Render logs before changing frontend code.

## Browser shows a loading shell

Wait for the client bundle to finish loading, then inspect the browser console. If the issue persists, perform a hard reload and check that the current `_next/static` assets return `200`. The service worker can retain an older application shell; unregister the service worker only during diagnosis, then reload and verify `/sw.js` and `/offline`.

## Offline queue does not drain

Confirm that the browser reports `navigator.onLine === true`, the request is not a permanent `4xx` error, and the queue has not exceeded its seven-day retention period. A `409` is intentionally retained as a conflict for user resolution. Never mark an offline assessment finalized until the server confirms synchronization.

## Supabase requests return unauthorized or empty data

Verify the browser session and the route-handler Supabase client. Check the table's RLS policy using a test account with no real learner data. Do not bypass RLS with the service-role client in browser code.

## Python tests cannot import the package

The AI service uses a `src` layout. Run tests with the source directory on `PYTHONPATH`:

```bash
cd ai-agents
PYTHONPATH=src pytest -q
```

## Dependency audit reports vulnerabilities

Run the audit in each Node project and for Python:

```bash
cd studio && npm audit
cd ../scheme-scribe && npm audit
cd ../ai-agents && pip-audit -r requirements.txt
```

Apply non-breaking lockfile fixes first. Treat major upgrades as code changes: run tests, builds, and route smoke tests before publishing.

## Before reporting an incident

Capture the commit SHA, provider, route, HTTP status, response time, and relevant non-sensitive logs. Separate local build failures, Vercel deployment failures, Render readiness failures, Supabase/RLS failures, and browser cache/service-worker failures. This prevents a healthy frontend from being incorrectly reported as a healthy full stack.

---

Last reviewed: September 2026.
