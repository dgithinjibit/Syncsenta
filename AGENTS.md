# SyncSenta Build Instructions

Read [the project charter](docs/BASIX-NORTH-STAR.md) first, then its [evidence record](docs/research/BASIX-FINAL-POSITION.md). Keep claims separated as implemented, tested, deployed, and browser-verified.

## Project

SyncSenta is an education platform for Kenya's CBC curriculum. Keep the existing stack: Rust services, the Next.js application in `studio/`, Python agents in `ai-agents/`, and Supabase. Do not create a separate `frontend/` directory or add a new top-level directory without a clear need.

## Code and verification

### Rust (`backend/`)

- Do not use `unwrap()` or `expect()` in production paths; use `?` and the established error types.
- Keep database access asynchronous and use the repository's SQLx query macros.
- Run `cargo check -p syncsenta-backend` when backend code changes. Some environments may lack a C linker; report that as a verification blocker rather than skipping it silently.

### Studio (`studio/`)

- TypeScript strict mode is required; do not introduce `any`.
- Use Zustand for global client state and TanStack Query for server state where those patterns apply.
- Run `npx tsc --noEmit`, `npm test`, and `npm run build` for frontend changes when the environment supports them.
- Do not enable `typescript.ignoreBuildErrors`.

### Tests

- Write a focused failing regression test before changing behavior.
- Keep unit tests beside their implementation where practical; use `fast-check` for frontend properties and `proptest` (at least 100 iterations) for Rust properties.
- Run the narrowest relevant test first, then the required project gates. Record commands and actual results.
- Do not claim a deployment or browser flow was verified because a test or build passed.

## Task workflow

1. Use [docs/TASKS.md](docs/TASKS.md) as the **only active task register**.
2. Read the relevant code and tests. Consult a requirements/design document only when it is still current and directly applies to the selected task.
3. Implement one bounded, reviewable change at a time; follow the repository's TDD and error-handling conventions.
4. Run relevant tests and builds; state unavailable tools and unverified deployment behavior explicitly.
5. Review the diff, update the task status and [docs/ROADMAP.md](docs/ROADMAP.md) with evidence, and update directly related documentation.
6. Commit the completed slice with a short, imperative message and the required Copilot co-author trailer. Do not amend commits unless explicitly asked.

## Working agreements

- Root-cause first: reproduce the behavior, identify the broken assumption, then fix it.
- Prefer a thin vertical slice over a large batch. Avoid unrelated cleanup.
- Review changes for correctness, readability, architecture, security, performance, and dead code.
- Do not leave TODO/FIXME comments in committed code, skip tests to move faster, or hide errors behind broad catches or silent fallbacks.
- Keep the response concise and concrete. Lead with the next runnable action, number multi-step work, state progress, and link to changed files.

## Maintained entry points

- [docs/TASKS.md](docs/TASKS.md) — active tasks and working guide
- [docs/README.md](docs/README.md) — maintained documentation index
- [docs/ROADMAP.md](docs/ROADMAP.md) — project position and verification evidence
- `studio/src/` — Next.js application
- `backend/syncsenta-backend/src/` — Rust API
- `ai-agents/src/` — Python agent service
- `supabase/migrations_live/` — migrations recorded as applied to the live schema
