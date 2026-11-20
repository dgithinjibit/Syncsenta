# Senior Production Completion Specification

## Purpose

This document defines the requirements for treating an active SyncSenta
workflow as production-complete. It applies especially to the Phase 2 teacher
analytics scope in [ROADMAP.md](ROADMAP.md), and to the supporting learner,
authentication, database, deployment, and Omega/Hyperon surfaces.

“Complete” means all applicable requirements below are implemented, tested,
deployed only through an owner-approved process, and browser-verified where
a browser flow is in scope. A passing unit test or component render is not
production-completion evidence.

## 1. Scope and priority

### P0: production blockers

The following must be closed before Phase 2 is advertised as production-ready:

1. Teacher identity and roster authorization.
2. Truthful metric definitions and source tracing.
3. Separate loading, empty, and error states.
4. RLS-enforced database access for learner-facing reads.
5. Complete learner drill-down and intervention authorization.
6. Stable, validated API contracts.
7. Focused authorization, error, and UI regression tests.
8. Deployment and browser verification in the target environment.

### P1: reliability and operability

These are required for sustained operation:

1. Timeouts, retry policy, cancellation, and request budgets.
2. Structured redacted logs and route-level correlation identifiers.
3. Monitoring for auth failures, database failures, upstream failures, and
   stale or missing telemetry.
4. Cache boundaries, refresh behavior, and pagination.
5. Accessibility and responsive behavior.

### P2: hardening

These should be scheduled after P0/P1 acceptance:

1. Export and alert delivery controls.
2. Historical trend retention and reporting windows.
3. Scale testing and capacity limits.
4. Automated deployment rollback.

## 2. Authentication and authorization

### User identity

- Browser applications shall derive identity only from the authenticated
  Supabase session.
- Studio route handlers shall use the cookie-aware, RLS-enforcing Supabase
  client.
- A request body or query parameter shall never be accepted as proof of
  teacher, school, student, or class identity.
- Server-side role checks shall allow only `teacher` or an explicitly approved
  `admin` role for the requested operation.
- Signed-out, expired, wrong-role, and revoked-session states shall fail closed.

### Teacher scope

The system shall derive the teacher's authorized roster from stable assignment
relationships, for example:

```text
profiles.id
  -> teacher_grade_assignments / teacher_subject_assignments
  -> teacher_student_assignments
  -> students.id
  -> student user/profile and telemetry rows
```

Display names, school names, class labels, and client-supplied IDs shall not
be authorization keys.

Every overview and detail query shall enforce one of:

1. The signed-in teacher is assigned to the learner.
2. The learner belongs to a class the signed-in teacher manages.
3. An explicit admin policy permits the read.

The assigned-roster boundary shall be consistent across overview, student
detail, misconceptions, interventions, timelines, competency trends, alerts,
acknowledgements, and exports.

### RLS

- Every learner-owned and teacher-visible table shall have RLS enabled.
- Policies shall use `auth.uid()` or an equivalent verified server identity.
- Service-role Supabase access shall be prohibited for browser-facing and
  learner-facing reads.
- The service role may only be used for explicit platform operations that
  cannot act as a signed-in user.
- RLS policy regressions shall be covered by integration tests using separate
  synthetic teacher and learner identities.

## 3. Teacher dashboard architecture

### Request boundary

The required browser request boundary is:

```text
Teacher browser
  -> same-origin Studio /api/teacher/dashboard/* route
  -> cookie-aware Supabase client
  -> RLS-protected tables/views/RPC
```

The dashboard shall not call `NEXT_PUBLIC_AI_AGENTS_URL` directly from browser
code.

FastAPI dashboard routes may exist only as explicitly versioned internal
services. Browser-facing authorization shall not depend on an API key in
Next.js browser code or a service role impersonating a teacher.

If FastAPI remains in the dashboard path, it shall:

1. Receive no learner IDs that it has not been allowed to derive or verify.
2. Validate the signed-in caller or an approved short-lived server credential.
3. Reuse RLS-aware data access or reconstruct and verify the same roster
   boundary.
4. Never use a fixed teacher, demo UUID, or “unknown” identity fallback.

### Route surface

The minimum same-origin route surface shall include:

- `GET /api/teacher/dashboard/overview`
- `GET /api/teacher/dashboard/students/{studentId}`
- `GET /api/teacher/dashboard/students/{studentId}/misconceptions`
- `GET /api/teacher/dashboard/students/{studentId}/timeline`
- `GET /api/teacher/dashboard/students/{studentId}/interventions`
- `GET /api/teacher/dashboard/competencies`
- `GET /api/teacher/dashboard/competencies/{competency}/trends`
- `GET /api/teacher/dashboard/alerts`
- `POST /api/teacher/dashboard/alerts/{alertId}/acknowledge`
- `POST /api/teacher/dashboard/students/{studentId}/interventions`

Additional routes shall be added only for a documented metric or workflow.

## 4. API contracts

All route responses shall use explicit TypeScript contracts. The contract shall
include:

- A stable success shape.
- An explicit error code and user-safe message.
- Pagination metadata where list size is bounded.
- A data freshness or `as_of` timestamp for time-sensitive values.
- Metric definitions or metric identifiers that map to the metric registry.

Example:

```ts
type DashboardResponse<T> =
  | {
      success: true;
      data: T;
      asOf: string;
    }
  | {
      success: false;
      error: {
        code:
          | 'UNAUTHORIZED'
          | 'FORBIDDEN'
          | 'NOT_FOUND'
          | 'VALIDATION_ERROR'
          | 'UPSTREAM_ERROR'
          | 'DATABASE_ERROR';
        message: string;
      };
    };
```

Contracts shall be validated at runtime at the trust boundary. `unknown` plus
an allowlist or schema validator is preferred over `any` or unchecked casts.

The dashboard shall not use `data || []` to convert an error into an empty
state.

### Status codes

- `401`: missing or expired session.
- `403`: authenticated but not assigned or not an allowed role.
- `400`: invalid, unbounded, or malformed input.
- `404`: a resource may exist but is outside the teacher's scope.
- `409`: stale alert or acknowledgement state, if applicable.
- `429`: rate limit exceeded.
- `500`: unanticipated server failure.
- `502`: an approved upstream returned an unrecoverable failure.
- `503`: a required data source or integration is unavailable.

## 5. Metric registry

Before a metric is displayed, it shall be added to a metric registry with:

1. Metric identifier and label.
2. Human-readable definition.
3. Source table or view.
4. Source fields.
5. Identity joins.
6. Authorized roster relation.
7. Time window and timezone.
8. Aggregation and deduplication rules.
9. Status or threshold inputs.
10. Null, missing, stale, and insufficient-data behavior.
11. Responsible product owner.

### Required metric definition

At minimum, the following Phase 2 values require approved definitions:

- Active student.
- Struggling or intervention-needed student.
- Idle or inactive student.
- Active count.
- Recent session duration.
- Mastery indicator.
- Engagement score.
- Misconception count and severity.
- Intervention priority.
- Competency trend and mastery histogram.
- Alert severity.
- Alert acknowledgement state.

The UI shall use the documented metric label and shall not add stronger
language such as “real-time,” “struggling,” “falling behind,” or “mastered”
unless the metric definition supports it.

### Data truthfulness

- No mock, demo, placeholder, or hardcoded learner value shall be returned
  from a production route.
- No placeholder UUID or teacher name shall be used for authorization or audit.
- The UI shall distinguish:
  - Loading.
  - No matching records.
  - Insufficient or stale telemetry.
  - Upstream or database unavailable.
  - Forbidden or unauthorized.
- An empty data array shall not be inferred from a `503`, `500`, denied query,
  missing table, or missing Supabase configuration.
- Counts shall have bounded windows and shall disclose freshness.
- Aggregates shall not expose individual learner identity in school-wide or
  cohort-only views unless the authorization tier permits it.

## 6. State and UI behavior

### Required states

Each overview and drill-down view shall implement:

1. Skeleton/loading state.
2. Empty/no matching records state.
3. Stale/missing-data state where freshness is known.
4. Error state with retry.
5. Forbidden state when the caller lacks scope.
6. Session-expired state with reauthentication.
7. Cancelled stale request behavior.

Loading, empty, stale, and error states shall never share the same visual
appearance or success copy.

### Interaction behavior

- Refresh shall preserve the selected scope and authorization boundary.
- Auto-refresh shall stop when the tab is hidden or the route is not active.
- Auto-refresh shall cancel or ignore responses older than an in-flight request
  when stale.
- Drill-down shall validate both route identity and roster membership.
- Interventions and acknowledgements shall be idempotent or return a conflict
  with a stable resource state.
- Long lists shall paginate or use bounded server-side limits.
- Critical labels shall also have non-colour cues and accessible text.
- Student names and notes shall be rendered safely and not through HTML sinks.

## 7. Database work

Before implementation, the engineer shall inspect:

1. Tracked migration history.
2. The target Supabase schema.
3. Table and column ownership.
4. Existing RLS and grants.
5. Available indexes and query plans.
6. Data retention and tenant/school relationships.

The implementation shall include migrations for:

- Missing teacher-student scope relationships.
- Teacher-visible dashboard views or narrow RPC functions.
- Alert storage and acknowledgement state, if synthesized alerts are replaced.
- Interventions and audit fields.
- Metric or telemetry freshness fields, if absent.
- RLS policies and index coverage.

Production migration and data changes require database-owner approval. Migrations
shall be reversible or have an explicit forward-fix plan.

No migration shall bypass RLS, duplicate authorization rules into display-name
columns, or introduce service-role-backed user reads.

## 8. Privacy and safety

- Collect the minimum data required for the documented metric.
- Do not log learner names, IDs, prompts, answers, or private notes by default.
- Aggregate rows shall avoid accidental re-identification.
- Exports shall apply the same roster and role boundary as the dashboard.
- Intervention language shall be supportive and shall not make unsupported
  clinical or academic conclusions.
- No automatic action shall permanently label or discipline a learner based
  on a dashboard metric.
- Delete, retention, and export behavior shall follow the approved privacy
  policy and applicable Kenyan requirements.

## 9. Observability

Every dashboard route shall emit:

- Correlation/request ID.
- Route name and HTTP status.
- Duration.
- Authorized roster size, as an aggregate count.
- Data-source type and error code.
- Cache/refresh status.
- As-of time for returned metric data.

Redaction rules:

- Never log Supabase keys or session cookies.
- Never log full learner records or intervention text.
- Prefer opaque identifiers when debugging individual synthetic test cases.
- Error reports shall use aggregate impact and redacted reproduction steps.

The service shall expose:

- Health for process liveness.
- Readiness for required database and integration dependencies.
- Metrics for request failures, latency, stale telemetry, and upstream failures.

## 10. Tests

The following test levels are required.

### Unit and shaping tests

- Metric derivation and thresholds.
- Time-window boundaries.
- Missing, stale, duplicate, and conflicting rows.
- Pagination and de-duplication.
- Safe status and API contract validation.

### Authorization integration tests

Use separate synthetic users:

1. No session.
2. Learner role.
3. Unassigned teacher.
4. Assigned teacher.
5. Cross-school teacher.
6. Admin only if admin access is explicitly supported.

For every protected route, verify:

- `401` for no session.
- `403` for wrong role or insufficient scope.
- Empty or no-match behavior only for authorized roster queries.
- No row, ID, name, or aggregate is leaked across a boundary.

### RLS tests

- Apply the tracked migrations to a disposable test database.
- Verify direct access through a user JWT.
- Verify service-role access is limited to approved operations.
- Verify stale, revoked, and reassigned relationships.

### UI and route tests

- Loading.
- Empty.
- Error.
- Stale data.
- Retry.
- Drill-down.
- Alert acknowledgement.
- Intervention creation.
- Refresh/cancellation behavior.
- Mobile and keyboard navigation.

### Full suite

Before a production Phase 2 completion claim, run:

```bash
cd studio
npm ci
npx tsc --noEmit
npm test
npm run build
```

If FastAPI is changed:

```bash
cd ai-agents
poetry install --with dev
PYTHONPATH=src poetry run pytest -q
```

For root Rust changes:

```bash
cargo test --workspace
```

For backend changes:

```bash
cd backend
DATABASE_URL=<disposable-migrated-postgres>
cargo test -p syncsenta-backend
```

All commands and outcomes shall be recorded exactly. A local passing result
shall not be described as deployment or browser verification.

## 11. Performance and resilience

- Dashboards shall have server-side limits and pagination.
- Broad table selects shall be removed.
- Heavy aggregates shall use narrow views, RPC functions, or materialized
  refreshes with documented freshness.
- Every external or database request shall have a timeout.
- Retries shall be bounded and shall not retry a non-retryable validation or
  authorization failure.
- React effects shall cancel or ignore superseded requests.
- Alert and intervention writes shall be idempotent where delivery or
  acknowledgement may be retried.
- The UI shall remain usable while optional enhancements, such as Redis
  scaffolding, are unavailable.

## 12. Deployment

Production work requires the responsible owner's approval for:

- Database migrations.
- Account or role changes.
- Public deployment.
- Environment-variable changes.
- External service credentials.
- Data backfills or deletions.

The deployment owner shall verify:

1. Required environment-variable presence.
2. Supabase migration status.
3. RLS policy status.
4. FastAPI route mounting and service key, if applicable.
5. `/healthz` and readiness behavior.
6. Correct frontend and service origin configuration.
7. CORS restricted to approved origins.
8. No placeholder or demo identity in production responses.
9. Logs redact credentials and learner data.

## 13. Omega and Hyperon production requirements

“100% Omega” means every applicable requirement in this section is implemented
and verified for the agreed SyncSenta scope; it is not a percentage of lines of
code. This specification does not claim compatibility with the complete
upstream OmegaHive project. That requires access to its implementation,
approved requirements, and conformance tests.

### Authority and boundaries

- Rust/Axum is the canonical Omega service, and Hyperon MeTTa is its policy
  runtime.
- The MeTTa rule pack is the source of truth for Omega policy decisions. Rust
  may validate and normalize inputs, invoke the runtime, and map typed results
  to API responses; it must not duplicate policy decisions in `if`/`else`
  thresholds or a second rules implementation.
- Studio remains the application UI and may proxy authenticated requests to
  Rust. It must not make a competing Omega policy decision.
- Model-provider integrations may remain, but Omega-owned routing and model
  orchestration must go through Rust. Provider clients are not alternative
  Omega agents.
- FastAPI, TypeScript, and other services must not provide fallback Omega
  policy or orchestration paths. Persistence may remain with its existing
  owner where documented, provided identity, authorization, and data ownership
  are explicit and enforced.

### Teacher-facing boundary

- Teacher analytics remain an authenticated Studio-to-Supabase/RLS workflow.
  Hyperon shall not replace roster authorization, telemetry storage, or metric
  aggregation, and dashboard metrics shall not be described as Hyperon-derived
  unless the metric actually comes from a Hyperon decision.
- Teacher views may display an Omega decision already produced by Rust/Hyperon.
  Such a value is a recorded decision, not a live learner state; show its
  recorded time and do not infer a new policy decision in Studio or FastAPI.
- Before a teacher-facing Omega decision is called explainable or current, its
  response and stored snapshot must include the ruleset version, decision
  timestamp, and rule/evidence information from the Rust service. Missing or
  stale snapshots must remain visibly missing or stale, not become a default
  scaffolding level.
- Teacher feedback about Omega policy may be stored as a pending review item.
  It must not be sent to a competing agent to generate an applicable policy
  patch, nor modify the active MeTTa pack without a reviewed, versioned release.
- Teacher access to a learner's Omega decision must use the same verified
  identity and assigned-roster boundary as the learner's dashboard data.

### MeTTa policy and runtime

- Express in-scope Omega decisions—including tutoring/scaffolding level, next
  action, hint selection, progression, and activity eligibility—as executable
  MeTTa rules.
- Return a typed result with the decision and sufficient rule/evidence
  information to explain why it was selected.
- Define behavior for missing, contradictory, malformed, and out-of-range
  inputs. Invalid inputs must produce explicit errors or a conservative
  deny/hold result, never a success-shaped guess.
- Version the rule pack and keep its inputs, outputs, and policy changes
  reviewable.
- Keep Hyperon enabled in normal builds. Respect its thread-safety constraints:
  if the runtime is not `Send` or `Sync`, confine it to an owning worker/thread
  and communicate through a bounded, typed channel. Do not use `unsafe` to
  force it into shared Axum state.

### API, security, and providers

- Expose a versioned, validated API with explicit authentication,
  authorization, error codes, timeouts, request limits, and readiness checks.
- Verify caller identity and permissions at the service boundary. Never trust a
  client-supplied user ID, role, school, or learner ID as proof of access.
- Preserve Supabase RLS and caller-scoped data access; do not use service-role
  access to bypass a learner-facing authorization failure.
- Keep provider credentials server-side. Apply bounded timeouts, cancellation,
  rate limits, and explicit provider error handling.
- Preserve the established chat contract, safety controls, and streaming
  behavior where used. Do not fabricate tutoring responses or present provider
  failure as a successful Omega decision.

### Omega verification

- Unit tests exercise MeTTa rules for normal cases, thresholds, boundaries,
  conflicting facts, and invalid inputs.
- Tests establish that MeTTa—not parallel Rust, TypeScript, or Python
  decisions—determines each policy outcome.
- Rust integration tests cover API validation, authentication, authorization,
  runtime failures, and provider failures. Contract tests cover Studio-to-Rust
  errors and streaming where applicable.
- Tests use synthetic identities and data; no real learner data or secrets.
- The backend compiles and its tests pass with the default Hyperon feature set.
  Run backend tests against a disposable migrated PostgreSQL database when
  SQLx requires it.
- The deployed authenticated learner flow and a denied-access case are
  verified in a browser or an equivalent approved integration environment.

### Omega completion checklist

- [ ] Every in-scope Omega policy decision is executed by Hyperon MeTTa rules.
- [ ] Rust/Axum is the sole Omega policy and orchestration authority.
- [ ] No active TypeScript or Python Omega fallback, mirror, or competing
      orchestrator remains.
- [ ] Teacher analytics remain source-attributed Supabase/RLS data; any displayed
      Omega decision is a timestamped, versioned Rust/MeTTa result with evidence.
- [ ] Teacher Omega feedback cannot generate or apply a policy patch outside the
      reviewed MeTTa rule-release process.
- [ ] Missing, stale, and failed teacher-side Omega decision reads are distinct
      from a valid stored decision.
- [ ] The Hyperon runtime has a safe, tested ownership and concurrency model.
- [ ] Authentication, authorization, RLS, and data ownership are verified at
      each service boundary.
- [ ] Provider calls, errors, timeouts, and streaming have explicit contracts.
- [ ] Required unit, integration, contract, build, and end-to-end checks pass.
- [ ] The deployed service and authenticated/denied user flows are verified.

## 14. Acceptance criteria

Phase 2 shall be considered production-complete only when all of the following
are true:

- [ ] Every teacher dashboard route uses authenticated same-origin Studio
      request handling.
- [ ] No browser route calls the FastAPI dashboard service directly.
- [ ] Every overview/detail response is restricted to the caller's roster.
- [ ] RLS permits direct authorized reads and rejects cross-roster reads.
- [ ] Every displayed metric has a registry entry and source trace.
- [ ] No placeholder, mock, demo, invented, or service-role-derived learner
      value is presented as live.
- [ ] Loading, empty, stale, unauthorized, and error states are distinct.
- [ ] Drills, interventions, alerts, exports, and refresh preserve the same
      authorization boundary.
- [ ] API status codes and runtime response validation match this specification.
- [ ] Synthetic authorization, RLS, metric, empty/error, and UI tests pass.
- [ ] Studio typecheck, test suite, and production build pass.
- [ ] All applicable Python, Rust, migration, and database gates pass.
- [ ] A deployed target has been checked with exact endpoint evidence.
- [ ] The signed-in teacher flow has been observed in a browser.
- [ ] Cross-teacher and cross-school negative cases have been browser/API
      verified.
- [ ] The owner has approved migrations and public deployment.
- [ ] Documentation records implemented, tested, deployed, and browser-verified
      evidence separately.

## 15. Claim and evidence policy

Use only evidence-supported claims:

| Evidence | Permitted wording |
|---|---|
| Source/configuration inspected | “The code/configuration defines…” |
| Test or build passed | “The test/build passes…” |
| Exact endpoint checked after deployment | “The deployed endpoint returned…” |
| Signed-in flow observed in a browser | “The flow was browser-verified…” |

Do not describe a feature as live or deployed based only on a component,
client type, migration file, mock, or passing unit test.
