# AI Agents

This directory contains the Python FastAPI service used by selected agent,
assessment, and teacher-generation workflows. It is separate from the Studio
web application in `studio/`.

## Runtime

- Entrypoint: `syncsenta_agents.api.server:app`
- Render configuration: [`render.yaml`](render.yaml)
- Health check: `GET /healthz`
- Teacher assessment content: `POST /agents/chat`
- Assessment routes are mounted under `/agents/assessment/`.
- Teacher generation routes are mounted by the lesson-architect router when
  its dependencies are available; `/healthz` reports whether it mounted.

The Render manifest documents the deployed service configuration. The live
Render service was created manually, so changes to `render.yaml` do not deploy
until its dashboard settings and deployment are updated.

## Current routing status

`POST /agents/chat` is a content-only adapter for the teacher assessment
generator. It uses the existing multi-provider client and returns
`{success, response, source}`. Blank messages and provider failures return
explicit errors; the endpoint does not make structured tutoring-policy
decisions. The service API-key middleware protects the route. Request `role`
and `user_id` fields are not authorization credentials.

Studio's assessment generator calls `/api/generate/assessment`, which verifies
the request-bound session and teacher profile, then replaces client-supplied
identity fields before proxying. Missing service configuration returns 503;
provider/upstream failures return 502 rather than a fabricated assessment.
The forwarded user header is derived from the session, but is not itself an
authentication credential.

The active learner-chat path remains Studio's same-origin `/api/chat`: it
requests a structured tutoring decision from the Rust API and streams the
generated response through Studio's provider path. Do not route learner
tutoring policy through `/agents/chat`.

Five tests in `tests/test_omega_api.py` still expect `get_orchestrator()` and
structured dispatchers that are absent from this package. This is a source/test
contract mismatch, not a statement about the live Render deployment. Resolve
whether those legacy quiz, grading, and teacher-generation contracts are still
required before restoring orchestration or pruning modules.

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

Run the focused content-route and service-boundary tests:

```bash
PYTHONPATH=src poetry run pytest -q tests/test_chat_api.py tests/test_deployed_app_routes.py tests/test_api_auth.py
```

Configure provider credentials and optional Supabase settings in the local
environment. Never commit secrets. See [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
for service boundaries and [`../docs/DEBUGGING_PLAYBOOK.md`](../docs/DEBUGGING_PLAYBOOK.md)
for production checks.

The legacy dispatcher contract tests are separate from this content-only
adapter check:

```bash
PYTHONPATH=src poetry run pytest -q tests/test_omega_api.py
```

They currently fail because they expect absent `get_orchestrator()` dispatchers;
resolve that contract before restoring policy routing or removing modules.
