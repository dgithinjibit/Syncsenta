# AI Agents

This directory contains the Python FastAPI service used by selected agent,
assessment, and teacher-generation workflows. It is separate from the Studio
web application in `studio/`.

## Runtime

- Entrypoint: `syncsenta_agents.api.server:app`
- Render configuration: [`render.yaml`](render.yaml)
- Health check: `GET /healthz`
- Assessment routes are mounted under `/agents/assessment/`.
- `/agents/chat` is not currently registered.
- Teacher generation routes are mounted by the lesson-architect router when
  its dependencies are available; `/healthz` reports whether it mounted.

The Render manifest documents the deployed service configuration. The live
Render service was created manually, so changes to `render.yaml` do not deploy
until its dashboard settings and deployment are updated.

## Current routing status

The source and its tests are not yet aligned on the intended Omega request
path. `api/server.py` registers `/healthz` and direct assessment handlers.
`api/lesson_architect_api.py` mounts the teacher-generation routes. Existing
tests and the teacher assessment proxy expect `/agents/chat`, but FastAPI does
not register it.

Existing tests expect assessment and teacher handlers to dispatch through
`get_orchestrator()` and preserve structured specialist results. Those
orchestration functions are not present in the current package. The route test
therefore fails for `/agents/chat`, and the orchestration tests fail because
the expected dispatcher is missing. This is a source/test finding, not a
statement about the live Render deployment.

The active learner-chat path is Studio's same-origin `/api/chat`, not this
service's `/agents/chat`: it requests a structured tutoring decision from the
Rust API and streams the generated response through Studio's provider path.
Separately, the teacher assessment generator calls Studio's
`/api/generate/assessment`, which proxies to this service's `/agents/chat`.
That FastAPI route is missing, so the proxy maps its 404 to an explicitly
labelled prescribed-template response. The UI sends a placeholder `user_id`
and client-supplied `role`; the proxy's `getSupabaseServerClient()` uses the
service-role client rather than reading the request session. Do not treat those
payload fields or `X-Forwarded-User` as verified identity.

The Rust API has no free-form chat endpoint; its tutoring endpoints require a
short-lived Studio-signed student assertion. The existing AI Agents proxy does
not send that assertion.

`omega_routing.py` contains a Python role/task routing table, while
`metta-logic/syncsenta_policy.metta` and Rust policy code contain overlapping
policy material. Do not expand the Python table or delete existing agents until
the service contract is agreed and tested. Rust/Hyperon was selected as the
target policy authority on 2026-11-20; this choice is not evidence that all
policy paths are unified, Hyperon is running, or the Rust service is deployed.

The Python `reasoning` package also has imports targeting absent
`metta_engine.py` and `hyperon_evaluator.py` modules. Call sites exist in rule
sync and telemetry code, but no mounted route was established during the
current source review. Treat these as unresolved references, not proof that
the whole package is safe to remove.

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

Run the focused route and orchestration tests:

```bash
PYTHONPATH=src poetry run pytest -q tests/test_deployed_app_routes.py tests/test_omega_api.py tests/test_omega_routing.py
```

Configure provider credentials and optional Supabase settings in the local
environment. Never commit secrets. See [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
for service boundaries and [`../docs/DEBUGGING_PLAYBOOK.md`](../docs/DEBUGGING_PLAYBOOK.md)
for production checks.
