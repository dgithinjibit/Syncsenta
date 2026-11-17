# Development

The active development path is Studio plus the Python AI Agents service. Read
[Architecture](ARCHITECTURE.md) for request boundaries and the
[Developer Debugging Playbook](DEBUGGING_PLAYBOOK.md) for symptom-based
diagnostics and the Jira-ready report template.

## Prerequisites

- Node.js `>=22.18` for Studio, as declared by
  [`studio/package.json`](../studio/package.json)
- Python 3.11 for AI Agents, as declared by
  [`ai-agents/runtime.txt`](../ai-agents/runtime.txt)
- npm and Poetry
- Local test credentials for any external services the workflow exercises

The Studio GitHub workflow currently pins Node 20. When local and CI results
differ, compare the actual runtime and first failing log before changing
application code.

## Environment

For Studio, copy [`studio/.env.example`](../studio/.env.example) to
`studio/.env.local` and fill in only the values needed for your local task.
Build-time checks require `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY`; provider keys are optional for compilation
but required to exercise provider-backed routes. Keep service-role and model
keys server-side and out of Git.

For AI Agents, use the configuration in
[`ai-agents/render.yaml`](../ai-agents/render.yaml) as the deployment contract
and [`ai-agents/.env.example`](../ai-agents/.env.example) as a local template.
Do not assume the checked-in template matches the live Render service; verify
the deployed environment before investigating a production-only failure.

## Run locally

Studio:

```bash
cd studio
npm ci
npm run dev
```

AI Agents:

```bash
cd ai-agents
poetry install --with dev
PYTHONPATH=src poetry run uvicorn syncsenta_agents.api.server:app \
  --host 127.0.0.1 --port 8001 --reload
```

The local FastAPI health route is `http://127.0.0.1:8001/healthz`. A running
Studio app can use that service by setting
`NEXT_PUBLIC_AI_AGENTS_URL=http://localhost:8001` in its local environment.
Student chat in Studio is a separate path and does not require the FastAPI
service.

## Verify changes

Run the narrowest relevant test first. Before a Studio change is complete, run
the applicable typecheck, unit tests, and build:

```bash
cd studio
npx tsc --noEmit
npm test
npm run build
```

For Python service changes:

```bash
cd ai-agents
PYTHONPATH=src poetry run pytest -q
```

Do not claim deployment or browser verification from a passing local check.
Record exact commands and results in the change or issue. See the debugging
playbook for service-specific checks and safe evidence collection.

## Database changes

Inspect the migration history and the actual target schema before editing or
applying a migration. Test against a non-production project first. Production
migrations and data changes require the database owner's approval; never bypass
RLS or use service-role credentials in browser code as a debugging shortcut.
