# AI Agents

This directory contains the Python FastAPI service used by selected agent,
assessment, and teacher-generation workflows. It is separate from the Studio
web application in `studio/`.

## Runtime

- Entrypoint: `syncsenta_agents.api.server:app`
- Render configuration: [`render.yaml`](render.yaml)
- Health check: `GET /healthz`
- Student agent and assessment routes are mounted under `/agents/`.
- Teacher generation routes are mounted by the lesson-architect router when
  its dependencies are available; `/healthz` reports whether it mounted.

The Render manifest documents the deployed service configuration. The live
Render service was created manually, so changes to `render.yaml` do not deploy
until its dashboard settings and deployment are updated.

## Local development

With Python 3.11 or later and Poetry installed:

```bash
poetry install --with dev
PYTHONPATH=src poetry run uvicorn syncsenta_agents.api.server:app --reload --port 8001
```

Run the service tests from this directory:

```bash
PYTHONPATH=src poetry run pytest
```

Configure provider credentials and optional Supabase settings in the local
environment. Never commit secrets. See [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
for service boundaries and [`../docs/DEBUGGING_PLAYBOOK.md`](../docs/DEBUGGING_PLAYBOOK.md)
for production checks.
