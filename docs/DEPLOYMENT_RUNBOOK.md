# Deployment Runbook

This runbook records the repository-side deployment boundaries and verification
steps. It does not assert that a deployment is currently healthy. Confirm the
target URL, commit, configuration, and environment in the hosting provider
before making a production claim.

## Deployment targets

| Surface | Repository configuration | Notes |
|---|---|---|
| Studio | Root [`vercel.json`](../vercel.json) | Installs and builds from `studio/` |
| AI Agents | [`ai-agents/render.yaml`](../ai-agents/render.yaml) | Describes the expected FastAPI entry point and `/healthz` probe; the live service may be manually configured |
| Database | [`supabase/`](../supabase/) migrations | Confirm the target database and applied migration state before any change |

## Before deployment

1. Review `git status` and stage only the intended changes.
2. Run the relevant local gates. For Studio, the standard checks are:

   ```bash
   cd studio
   npm ci
   npx tsc --noEmit
   npm test
   npm run build
   ```

3. For AI Agents changes, run the service tests:

   ```bash
   cd ai-agents
   PYTHONPATH=src poetry run pytest -q
   ```

4. Review changed routes, environment variables, migrations, and service
   contracts. Keep secrets and real learner data out of logs and test requests.
5. Apply database changes to a non-production project first. A migration file
   in Git is not evidence that it is applied to production.

## After deployment

Use the actual URLs and commit shown by the provider. Check the public Studio
surface and the affected route, then check the AI Agents health endpoint if the
workflow uses that service:

```bash
curl -sS -i "$AI_AGENTS_URL/healthz"
```

Inspect `status`, `lesson_architect.mounted`, and `lesson_architect.error`.
Then test the specific `/agents/*` or `/lesson-architect/*` route involved.
`/healthz` does not prove that an LLM provider, database operation, or generated
response works.

For Studio, verify the changed route in the deployed environment and, when the
user experience is involved, in a browser. Report these as separate results:
local tests, build, deployment status, HTTP check, and browser verification.

## Rollback and incidents

Prefer a focused revert commit over rewriting shared history. Before rolling
back a database change, inspect its effects and use the approved migration or
recovery procedure; do not improvise destructive SQL.

For an incident, capture the commit, deployment, route/method, status, timestamp
and timezone, duration, and redacted logs. Do not include credentials, cookies,
tokens, or identifiable learner data. Use the
[Developer Debugging Playbook](DEBUGGING_PLAYBOOK.md) to structure the report
and separate provider/configuration failures from application failures.
