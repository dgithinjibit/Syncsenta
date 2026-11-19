# Coding standards

These conventions apply to Phase 2 teacher analytics and related Studio work.
Keep changes focused and follow existing patterns in the touched module.

## TypeScript and React

- Keep TypeScript strict. Do not introduce `any`; use a real type or `unknown`
  with validation.
- Keep components, API handlers, and data access in their existing
  `studio/src/` layers. Do not create a parallel frontend or data-access layer.
- Derive the current user's identity and role from the authenticated session on
  the server. Never trust a client-supplied teacher ID as authorization.
- Use explicit types for exported data contracts and narrow database selects to
  the fields the feature uses.

## Teacher analytics and data access

- Every metric must have a documented source, aggregation, and time window.
- Keep teacher-to-student access enforced server-side and by Supabase RLS.
- Do not use a service-role client for user-facing reads or to bypass an RLS
  failure.
- Distinguish an empty result from an unavailable table, denied query, or
  upstream failure. Do not replace errors with zeroes, empty success responses,
  or fabricated learner data.
- Do not describe a value as real-time, live, or school-wide unless the
  implementation and authorization scope support that claim.
- Check the tracked migrations and the actual target schema before relying on a
  table, column, function, or policy. Production migrations require the
  database owner's approval.

## UI behavior

- Represent loading, empty, and error states separately.
- Keep labels and visual indicators aligned with the underlying data and
  documented metric definitions.
- Make refresh and drill-down actions preserve the same authorization boundary
  as the dashboard overview.
- Avoid unnecessary requests, broad selects, and unbounded result sets.

## Tests and verification

- Add a focused regression test for behavior changes. For bugs, first confirm
  the test fails for the reported reason.
- Prefer tests of observable data and UI states over tests of internal call
  order.
- Run the narrowest relevant Vitest test, then the Studio typecheck and suite.
  Run `npm run build` for route or production-build-sensitive changes.
- Keep test fixtures synthetic; never put credentials or identifiable learner
  data in tests or logs.

See [Development](DEVELOPMENT.md) for exact commands and
[the production completion specification](specs.md) for Omega-specific
completion and evidence requirements.
