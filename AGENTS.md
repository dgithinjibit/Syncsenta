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

### React Frontend (`frontend/`)
- TypeScript strict mode — no `any` types
- Components from `studio/` are the source of truth — copy, don't rewrite
- State: `zustand` for global, `@tanstack/react-query` for server state
- Run `npm run build` before marking any task done

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
| `backend/syncsenta-backend/src/` | Rust source |
| `frontend/src/` | React source |
| `studio/src/` | UI component library |

## Current State (April 28, 2026)

- Backend compiles clean (0 errors)
- Tasks 1-10 mostly complete
- Task 11+ in progress
- Next: assessment service → virtual classrooms → analytics
