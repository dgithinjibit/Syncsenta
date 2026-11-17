# SyncSenta agent instructions

Read [the North Star](docs/BASIX-NORTH-STAR.md), then the
[Phase 2 roadmap](docs/ROADMAP.md), before changing product behavior.

## Active product

- `studio/` is the Next.js 14 web application and the primary product surface.
- `ai-agents/` is the Python FastAPI service used by selected agent and teacher
  workflows.
- Supabase provides authentication, PostgreSQL, and row-level security.
- `archive/` contains retired or experimental code; do not treat it as an active
  runtime unless a task explicitly targets it.

For Phase 2, the plan of record is teacher analytics and dashboards in
[`docs/ROADMAP.md`](docs/ROADMAP.md). Do not use archived plans or assume a
dashboard, API, database function, or deployment works just because a file
exists.

## Implementation rules

- Make the smallest change that fully fixes the requested behavior.
- Keep Studio TypeScript strict; do not add `any`.
- Preserve authentication and Supabase RLS. Never route learner-facing requests
  through a service-role client to work around an access failure.
- Separate loading, empty, and error states. Do not present failed data queries
  as successful empty results or substitute fabricated analytics.
- Inspect the tracked migrations and the target schema before database work.
  Production writes, migrations, and account changes require the owner's
  approval.
- For behavior changes, add a focused regression test first, then implement the
  minimum fix. Prefer tests beside the existing feature tests.
- Keep unrelated worktree changes intact. Do not commit unless asked.

## Verification

Run the narrowest relevant test first. For Studio changes, use the commands in
[`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md); the project-wide gates are:

```bash
cd studio
npx tsc --noEmit
npm test
npm run build
```

For Python service changes, run `PYTHONPATH=src poetry run pytest -q` from
`ai-agents/`. Report exactly which checks ran; a passing local check does not
prove deployment or browser behavior.

## Documentation

Keep the [documentation index](docs/README.md) accurate. Update the roadmap
when Phase 2 scope or verified implementation status changes. Put new
developer-facing Markdown in `docs/` only when it is needed to implement,
operate, or verify active product behavior. Do not add point-in-time reports.

## Response shape

Lead with the next runnable action or the result. For multi-step work, use a
short numbered list, state the current step, and distinguish implemented,
tested, deployed, and browser-verified outcomes.
