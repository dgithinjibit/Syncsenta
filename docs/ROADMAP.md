# Phase 2 Roadmap — Teacher Analytics

## Scope

For this repository, **Phase 2 means teacher analytics and dashboards**. This
roadmap is the implementation plan for that work. Older scale-feature plans
under `.kiro/` are not the current Phase 2 scope.

The goal is to give teachers useful, explainable views of learner activity
using authorized application data. Dashboards must not imply that a learner is
struggling, inactive, or progressing unless the underlying records and metric
definition support that conclusion.

## Existing code to start from

- [`studio/src/app/teacher/metta-analytics/page.tsx`](../studio/src/app/teacher/metta-analytics/page.tsx)
  mounts the Phase 2 dashboard.
- [`studio/src/app/teacher/grade/[grade]/[...slug]/page.tsx`](../studio/src/app/teacher/grade/[grade]/[...slug]/page.tsx)
  also routes teacher views to dashboard components.
- [`studio/src/components/teacher/phase2-teacher-dashboard.tsx`](../studio/src/components/teacher/phase2-teacher-dashboard.tsx)
  owns the Phase 2 dashboard UI.
- [`studio/src/lib/phase2-dashboard-client.ts`](../studio/src/lib/phase2-dashboard-client.ts)
  defines the client data contract for learner activity, progress, misconceptions,
  interventions, timelines, competency trends, and alerts.
- [`studio/src/lib/api-config.ts`](../studio/src/lib/api-config.ts) defines the
  API endpoint mapping used by that client.

These are source-code entry points, not proof that the endpoints, database
schema, or production dashboard currently work end to end. Trace each request
to its handler and data source before extending it.

## Work items

1. **Trace the active data path.** For every dashboard metric, identify the
   route, server-side authorization, query or RPC, source table, and migration.
   Record which parts are implemented and which are not verified.
2. **Enforce teacher scope.** Ensure each response is limited to students and
   classes the signed-in teacher may access. Use caller-aware Supabase access
   and RLS; do not rely on client-supplied teacher or school identifiers alone.
3. **Define each metric.** Document the source fields, time window, aggregation,
   and empty-data behavior for activity, mastery, competency trends, and alerts.
   Avoid labels such as “struggling” unless an approved rule supports them.
4. **Make states truthful.** Distinguish loading, no matching records, and query
   failure in the UI. Do not silently convert an API error into zero counts or
   an empty success state.
5. **Complete learner detail and alerts.** Keep drill-downs and interventions
   within the same teacher authorization boundary as the overview.
6. **Add school-level rollups only after class-level access is proven.** Scope
   them by stable school and assignment relationships, never by display name.
7. **Verify the deployed path separately.** A passing test or build does not
   establish that production has the required schema, policies, configuration,
   or working endpoints.

## Acceptance criteria

- A signed-in teacher sees only data permitted by the current authorization
  policies.
- Every displayed value can be traced to a defined source and metric.
- Empty results and failed requests render distinct, accurate states.
- No placeholder, demo, or invented value is presented as live learner data.
- Focused tests cover authorization, metric mapping, and error/empty behavior.
- Studio typecheck, tests, and production build pass; deployment and browser
  checks are reported separately.

## Verification commands

Run the narrowest relevant test first. Before completing a Studio change, run:

```bash
cd studio
npx tsc --noEmit
npm test
npm run build
```

See [Development](DEVELOPMENT.md) for environment setup and
[Developer Debugging Playbook](DEBUGGING_PLAYBOOK.md) for issue reporting and
safe diagnosis.
