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

## Omega orchestration

The deployed app routes chat, quiz generation/grading, and teacher content
provider-backed generation through a direct compatibility route → a registered
specialist. The MeTTa policy and Python fallback share the role/task routing
contract in `src/syncsenta_agents/omega_routing.py`; add a policy route and a
focused dispatch test when introducing a new specialist task. Structured
specialist results are retained internally so the existing quiz and teacher
API response shapes remain unchanged. If Omega cannot initialize, app startup
fails; worker exceptions return an Omega-owned error instead of routing around
the master. Scheme save/list endpoints remain data operations, not agent tasks.

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

Run the focused Omega orchestration tests:

```bash
PYTHONPATH=src poetry run pytest -q tests/test_omega_api.py tests/test_omega_queen.py tests/test_omega_routing.py tests/test_orchestrator.py tests/test_assessment_agent.py
```

Configure provider credentials and optional Supabase settings in the local
environment. Never commit secrets. See [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
for service boundaries and [`../docs/DEBUGGING_PLAYBOOK.md`](../docs/DEBUGGING_PLAYBOOK.md)
for production checks.
