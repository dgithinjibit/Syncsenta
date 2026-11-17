# Active architecture

This page describes the repository's active application boundaries. It does
not assert that a live deployment or database is healthy; verify the exact
target when diagnosing production behavior.

## Runtime components

| Component | Responsibility | Deployment/configuration |
|---|---|---|
| [`studio/`](../studio/) | Next.js 14 application, learner and teacher pages, and `/api/*` handlers | Vercel; configured by root [`vercel.json`](../vercel.json) |
| [`ai-agents/`](../ai-agents/) | Python FastAPI agent, assessment, and selected teacher-generation APIs | Render configuration in [`ai-agents/render.yaml`](../ai-agents/render.yaml) |
| [`backend/`](../backend/) | Rust/Axum API with Hyperon MeTTa as the default Omega Claw runtime | Active source; deployment is not currently configured. Studio forwards only when `SYNCSENTA_BACKEND_URL` is set |
| [`rust-core/`](../rust-core/) and [`rust-service/`](../rust-service/) | Separate root Rust workspace for adaptive policy and service code | Source workspace; verify deployment separately |
| Supabase | Authentication, PostgreSQL, application data, and row-level security | Managed service; verify the actual target and applied schema |
| Upstash Redis | Optional rate limiting and short-lived session state | Used only by configured paths |
| [`archive/`](../archive/) | Remaining retired or experimental code retained for reference | Not part of the active request path |

## Teacher analytics

The Phase 2 dashboard entry points include
[`studio/src/app/teacher/metta-analytics/page.tsx`](../studio/src/app/teacher/metta-analytics/page.tsx)
and
[`studio/src/app/teacher/grade/[grade]/[...slug]/page.tsx`](../studio/src/app/teacher/grade/%5Bgrade%5D/%5B...slug%5D/page.tsx).
The main dashboard is
[`studio/src/components/teacher/phase2-teacher-dashboard.tsx`](../studio/src/components/teacher/phase2-teacher-dashboard.tsx);
its client-side API contract is in
[`studio/src/lib/phase2-dashboard-client.ts`](../studio/src/lib/phase2-dashboard-client.ts).

Trace each API endpoint to its server handler and data source before changing
it. Authorization must be derived from the signed-in caller and enforced by
server-side checks and Supabase RLS. A UI component or API type is not evidence
that a metric is backed by live data.

## Other request boundaries

- Student chat enters through Studio's
  [`/api/chat` route](../studio/src/app/api/chat/route.ts) and its configured
  provider chain. It is not automatically a request to the AI Agents service.
- Omega Claw rule endpoints use Studio's TypeScript mirror when
  `SYNCSENTA_BACKEND_URL` is absent, and forward to the Rust/Hyperon service
  when it is explicitly configured. The Rust service is not currently deployed.
- Selected agent and teacher-generation flows pass from Studio API handlers to
  the FastAPI application at
  [`ai-agents/src/syncsenta_agents/api/server.py`](../ai-agents/src/syncsenta_agents/api/server.py).
- Authentication and user-facing database access use Supabase. Browser,
  route-handler, and trusted server clients have different privileges; keep
  RLS enabled and use the least-privileged caller-aware client.
- The presence of a migration file does not prove that the migration has been
  applied to a particular database.

For local commands, see [Development](DEVELOPMENT.md). For failure isolation
and safe evidence collection, see the [Debugging Playbook](DEBUGGING_PLAYBOOK.md).
