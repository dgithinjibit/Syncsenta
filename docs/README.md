# Syncsenta documentation

This directory is the maintained source of truth for the Syncsenta platform. Current documents describe the implementation, deployment configuration, test contracts, and product decisions in the repository. Historical reports are retained in [`archive/`](archive/) for context only.

## Active architecture

Syncsenta is a Kenyan education platform for learners, teachers, school leaders, and families. The active production path consists of:

| Component | Responsibility | Deployment |
|---|---|---|
| `studio/` | Next.js web application, student journeys, subject sandboxes, teacher workflows, and `/api/*` routes | Vercel |
| `ai-agents/` | Python FastAPI service, agent workflows, Hyperon policy evaluation, telemetry, and readiness checks | Render |
| Supabase | Authentication, PostgreSQL, RLS, storage, and realtime data | Managed service |
| Upstash Redis | Rate limiting and short-lived learning-session state | Managed service |
| `rust-core/` and `rust-service/` | Adaptive-policy source of truth and optional HTTP service | Local / planned production service |

The student tutoring path uses the TypeScript MeTTa boundary and Omega decision engine in the web application. The Python service provides the Hyperon policy boundary for selected agent and telemetry flows. These are related but distinct execution paths and must not be described as one runtime until the production Hyperon route is verified end to end.

## Read these first

1. [`ARCHITECTURE.md`](ARCHITECTURE.md) — components, request flows, MeTTa/Omega boundaries, and deployment topology.
2. [`DEVELOPMENT.md`](DEVELOPMENT.md) — local setup, environment variables, testing, migrations, and deployment commands.
3. [`CONTEXT.md`](CONTEXT.md) — CBC terminology, Kenyan education context, and architectural vocabulary.
4. [`ROADMAP.md`](ROADMAP.md) — current implementation status and prioritized work.
5. [`TDD_ANALYSIS.md`](TDD_ANALYSIS.md) — test gaps, test seams, and the Red–Green–Refactor workflow.
6. [`OMEGA_METTA_STATUS.md`](OMEGA_METTA_STATUS.md) — current Omega and MeTTa implementation boundaries.
7. [`HYPERON_DEPENDENT_PROJECTS.md`](HYPERON_DEPENDENT_PROJECTS.md) — external Hyperon patterns and guardrails.

## Supporting references

- [`CODING_STANDARDS.md`](CODING_STANDARDS.md) — implementation conventions and safe-change practices.
- [`SECURITY_AUDIT_REPORT.md`](SECURITY_AUDIT_REPORT.md) — security findings and follow-up controls.
- [`GRADE_2_STUDENT_WORKFLOW.md`](GRADE_2_STUDENT_WORKFLOW.md) — learner workflow reference.
- [`TASKS.md`](TASKS.md) — active task register.
- [`TEST_PLAN_WSL.md`](TEST_PLAN_WSL.md) — local test and environment notes.
- [`architecture/`](architecture/) — service-specific architecture notes.
- [`research/`](research/) — research and evidence notes.
- [`archive/`](archive/) — historical reports and superseded summaries.

## Documentation rules

Update the relevant active document in the same change as any new route, API contract, environment variable, deployment target, database migration, or service-boundary decision. Link to source files and state whether behavior is implemented, optional, or planned. Do not use archived reports as current implementation evidence.
