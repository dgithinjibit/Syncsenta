# SyncSenta agent instructions

Read [Architecture](docs/ARCHITECTURE.md), then the
[Phase 2 roadmap](docs/ROADMAP.md), before changing product behavior. For
Omega/Hyperon work, also follow [the completion specification](docs/specs.md).

## Active product

- `studio/` is the Next.js 14 web application and the primary product surface.
- `ai-agents/` is the Python FastAPI service used by selected agent and teacher
  workflows.
- `backend/` is the Rust/Axum backend. Its default build uses Hyperon MeTTa for
  the Omega Claw rule runtime; Studio forwards to it only when
  `SYNCSENTA_BACKEND_URL` is configured.
- `rust-core/` and `rust-service/` are members of the root Rust workspace.
- Supabase provides authentication, PostgreSQL, and row-level security.
- `archive/` contains the remaining retired or experimental code. Active Rust
  code is kept at its normal workspace paths, not under `archive/`.

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
- Keep Hyperon enabled in normal backend builds. Use
  `--no-default-features` only for an explicitly requested fallback build.
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

For root Rust workspace changes, run `cargo test --workspace` from the
repository root. For backend changes, run `cargo test -p syncsenta-backend`
from `backend/` with `DATABASE_URL` pointing to a PostgreSQL database that has
the backend migrations applied. The backend's default feature set compiles and
tests the Hyperon runtime.

## Documentation

Keep the [documentation index](docs/README.md) accurate. Update the roadmap
when Phase 2 scope or verified implementation status changes. Put new
developer-facing Markdown in `docs/` only when it is needed to implement,
operate, or verify active product behavior. Do not add point-in-time reports.

## Response shape

Lead with the next runnable action or the result. For multi-step work, use a
short numbered list, state the current step, and distinguish implemented,
tested, deployed, and browser-verified outcomes.
