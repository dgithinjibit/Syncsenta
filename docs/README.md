# SyncSenta documentation

This directory contains maintained product guidance, implementation references, and supporting evidence. `docs/TASKS.md` is the only active task register; old plans and point-in-time reports are not sources of current status.

## Start here

1. [BASIX-NORTH-STAR.md](BASIX-NORTH-STAR.md) — product claim rules and task-selection guardrails.
2. [../AGENTS.md](../AGENTS.md) — repository conventions and verification requirements.
3. [TASKS.md](TASKS.md) — the active task register and working guide.
4. [DEVELOPMENT.md](DEVELOPMENT.md) — setup, environment, test, and migration commands.
5. [ROADMAP.md](ROADMAP.md) — current position and active priorities.

## Maintained references

- [ARCHITECTURE.md](ARCHITECTURE.md) — code-level components and boundaries; not deployment evidence.
- [CONTENT_READINESS.md](CONTENT_READINESS.md) — student-facing content and route readiness.
- [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md) — deployment operations.
- [PRODUCTION_ACCEPTANCE.md](PRODUCTION_ACCEPTANCE.md) — production completion and acceptance requirements.
- [DEBUGGING_PLAYBOOK.md](DEBUGGING_PLAYBOOK.md) — triage and incident evidence.
- [curriculum/README.md](curriculum/README.md) — curriculum document index.
- [research/BASIX-FINAL-POSITION.md](research/BASIX-FINAL-POSITION.md) — evidence supporting the project charter.
- [basix-sample-audit/](basix-sample-audit/) — reproducible example artifacts referenced by the README and tests.
- [architecture/](architecture/) — accepted architecture decisions and active boundaries.

## Documentation rules

Update the relevant maintained reference when changing a route, API contract, environment variable, deployment target, database migration, or service boundary. Record only evidence that was actually produced. Remove superseded plans and one-off status reports after checking their inbound references; use git history for completed work.
