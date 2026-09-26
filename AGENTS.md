# AGENTS.md — SyncSenta Build Instructions

This file tells AI agents (Bonsai, Kiro, etc.) how to work in this codebase.

## Project Identity

SyncSenta is a **Web4 Education OS** for Kenya's CBC curriculum.
- NOT a prototype. NOT a demo. Production-grade code only.
- Target: 100,000+ concurrent users across Kenya
- Stack is fixed — do not suggest alternatives

## Code Rules

### Rust Backend (`backend/`)
- No `unwrap()` in production paths — use `?` and proper error types
- All DB queries use `sqlx::query!` macros (compile-time checked)
- Async everywhere — `tokio::spawn` for background tasks
- Error type: `anyhow::Result` for services, `AppError` for handlers
- Run `cargo check -p syncsenta-backend` before marking any task done

### React frontend (`studio/`)
- TypeScript strict mode — no `any` types
- `studio/` IS the web application (Next.js 14, deployed on Vercel). There is no
  separate `frontend/` directory; do not create one.
- State: `zustand` for global, `@tanstack/react-query` for server state
- Run `npx tsc --noEmit`, `npm test`, and `npm run build` from `studio/` before
  marking any task done
- `typescript.ignoreBuildErrors` must stay OFF — its removal is what lets the
  build catch the class of routing/regression bugs recorded in
  `.kiro/specs/main-stability-and-branch-consolidation/`

### Repository layout
- The repository root holds only deploy and workspace manifests, `README.md`,
  `AGENTS.md`, and the Replit training entry points. Everything else goes in a
  folder.
- New documents → `docs/` (`architecture/`, `research/`, `setup/`, `archive/`).
  New executable helpers → `scripts/`. Never add a loose file to the root.
- Point-in-time status reports go straight to `docs/archive/`, not the root.

### Testing
- Backend property tests: `proptest` (minimum 100 iterations)
- Frontend property tests: `fast-check`
- Unit tests co-located with implementation
- E2E: Playwright

## Task Workflow

1. Read task from `.kiro/specs/syncsenta-education-os/tasks.md`
2. Check `requirements.md` for what it must do
3. Check `design.md` for how to build it
4. Implement in the correct module
5. Write tests
6. Run `cargo check` or `npm run build`
7. Fix all errors before proceeding
8. Mark `[ ]` → `[x]` in tasks.md
9. Git commit: `feat: implement Task X.Y - description`
10. Move to next task

## Working agreements

Installed under [`.claude/skills/`](.claude/skills/) and expected of every agent
here, whether or not your harness loads that directory:

- **TDD first** (`test-driven-development`): write the failing test before the
  fix. `docs/TDD_ANALYSIS.md` lists the seams that still lack coverage.
- **Thin slices** (`incremental-implementation`): one verifiable change per
  commit. A 900-file blob cannot be reviewed and will be reverted.
- **Root-cause, never guess** (`debugging-and-error-recovery`): reproduce, name
  the broken assumption, then fix. Do not patch symptoms.
- **Review before merge** (`code-review-and-quality`): re-read your own diff for
  correctness, dead code, and the anti-patterns logged in `docs/TASKS.md`
  (import-barrel shims and orphaned unlisted imports have both bitten this repo).
- **Cut needless complexity** (`code-simplification`): do not "improve" files a
  task did not touch.

## Response shape

Report like the reader has a working memory of one item
(`i-have-adhd`). Safety beats brevity before destructive actions.

1. First line is the next runnable thing: a command, a path, a diff.
2. Multi-step work is a numbered list, one bounded action per step.
3. State where we are every turn ("step 3 of 5 done: … next: …").
4. Errors are stated as cause and fix — no "uh oh, there seems to be an issue".
5. Vague hedges are deleted; a hedge that carries real uncertainty stays.
6. Time estimates in concrete units, pointed at whoever executes the step.
7. Finished work is shown, not summarised: "chat SSE now reconnects — try it on
   `/student/grade-4/mathematics`".
8. One secondary issue gets one line at the end, as a separate question.

No opener announcing what is about to happen, no closer asking if anything else
is needed.

## What NOT to Do

- Do not suggest switching from Rust to Go/Python/Node
- Do not suggest switching from Polygon to another chain
- Do not create new top-level directories without good reason
- Do not leave TODO/FIXME comments in committed code
- Do not use `unwrap()` or `expect()` in non-test code
- Do not skip tests to move faster

## Key Files

| File | Purpose |
|------|---------|
| `.kiro/specs/syncsenta-education-os/tasks.md` | Master task list |
| `.kiro/specs/syncsenta-education-os/requirements.md` | Functional requirements |
| `.kiro/specs/syncsenta-education-os/design.md` | Technical design |
| `.kiro/specs/main-stability-and-branch-consolidation/` | Current stability spec + branch audit |
| `backend/syncsenta-backend/src/` | Rust Axum API |
| `studio/src/` | Next.js application — the deployed web frontend |
| `studio/src/lib/omega/` | Omega adaptive tutoring decision engine |
| `rust-core/` | Adaptive policy source of truth |
| `docs/README.md` | Which documentation is authoritative |
| `docs/CONTENT_READINESS.md` | What a student can actually do today |

## Current State (September 26, 2026)

- Deployed: `studio/` on Vercel (sentastudio.vercel.app), `ai-agents/` on Render,
  Supabase for auth/Postgres/RLS
- Studio gates: `npm ci` clean, 366 vitest tests passing, `tsc --noEmit` clean,
  `typescript.ignoreBuildErrors` removed
- 0 open pull requests; 11 branches, most already merged or superseded — see
  `.kiro/specs/main-stability-and-branch-consolidation/branch-audit.md`
- Rust workspaces build on a machine with a C linker; `cargo check` needs
  `build-essential`, which is not installed in every dev environment
