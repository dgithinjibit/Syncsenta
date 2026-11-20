# SyncSenta Developer Guide and Active Tasks

**Last reviewed:** 2026-11-20
**Purpose:** the one active task register for maintainers and coding agents. Update this file when work is started, completed, blocked, or newly verified. Git history is the archive.

## How to work in this repository

1. Pick one unchecked task below. If a task needs behavior not described here, agree on the requirement before coding.
2. Read the relevant source, tests, and directly related documentation. Do not rely on old status reports as proof of current behavior.
3. For behavior changes, add or update a focused regression test first and confirm it fails for the expected reason.
4. Make a small, reviewable change. Keep TypeScript strict, avoid `any`, and do not add dependencies without need.
5. Run the narrowest relevant test first. For `studio/`, the documented gates are `npx tsc --noEmit`, `npm test`, and `npm run build`; for Rust, run `cargo check -p syncsenta-backend`. If a tool is unavailable, state that explicitly rather than claiming the gate passed.
6. Review the diff for correctness, authorization, error handling, dead code, and related documentation. Update this task list and `ROADMAP.md` with evidence, not assumptions.

## Evidence language

Keep these states distinct:

- **Implemented:** code is present.
- **Tested:** a named command ran successfully.
- **Deployed:** the target deployment contains the change.
- **Browser-verified:** the relevant signed-in user flow was exercised in a browser.

Do not upgrade a claim to a later state without its evidence. See [the project charter](BASIX-NORTH-STAR.md) and [the documentation index](README.md).

## Current issue review

These are source-review findings, not claims about the deployed site:

- **Teacher documents:** the CSP directive formatting fix and DOM-based scheme printing are present, with regression tests. Teacher scheme generation routes through the Studio handler; when the AI service is unavailable, it may return explicitly labelled prescribed template rows. The wizard's **Save to Library** handler is still a no-op.
- **Student access:** the chat page uses the shared `StudentChatView`, role routing uses `getRoleHome()`, and `normalizeGradeKey()` exists. Corresponding regression tests are present.
- **Head workspace:** the `/head` page now has a sidebar/header shell using the existing role-aware `AppSidebar`. Its new regression test is present.

The relevant files are [the head layout](../studio/src/app/head/layout.tsx), [head navigation test](../studio/src/lib/__tests__/head-navigation.test.ts), [the student chat page](../studio/src/app/student/chat/page.tsx), [role-home mapping](../studio/src/lib/auth/role-home.ts), [grade normalization](../studio/src/lib/curriculum/grade-id.ts), [CSP middleware](../studio/src/middleware.ts), [scheme print helper](../studio/src/lib/print-scheme.ts), and [scheme preview step](../studio/src/components/scheme-wizard/steps/preview-step.tsx).

## Active tasks

- [ ] Restore and test the content-only Python `/agents/chat` adapter for teacher assessment generation. Rust/Hyperon remains the target authority for structured tutoring policy. Studio `/api/generate/assessment` now verifies the request session and teacher profile, and overwrites client-supplied identity fields; the Python route is still absent and the proxy still falls back to a labelled template on upstream failure. Preserve the `{success, response}` contract without treating `role` or forwarded identity as authorization. The focused Python baseline had 6 failures: `/agents/chat` is unregistered, and five tests expect missing `get_orchestrator()` functions. Do not prune modules or dependencies until this route contract is green and callers are audited.
- [ ] Rebuild the Codespace with the lean Ubuntu devcontainer image and record the container build result.
- [ ] Run the focused Studio regression tests for head navigation, student transport, role routing, grade normalization, CSP, and safe scheme printing when Node.js and the project dependencies are available. Record the exact command and result.
- [ ] Browser-verify student, teacher, and head workspace access on the deployed build using authorized test accounts. Record deployment and browser evidence separately.
- [ ] Agree on the durable storage contract for generated schemes before implementing the wizard's **Save to Library** action. Do not select Firebase, Supabase, or another store by assumption.

## Completed in the current work

- [x] Added the `/head` layout with `AppSidebar`, `AppHeader`, `SidebarProvider`, and `SidebarInset`.
- [x] Added a regression test asserting the head workspace mounts its navigation shell.
- [x] Reviewed the reported CSP, print-sink, student-routing, and grade-normalization causes against the current source; fixes and corresponding tests already exist.

## Documentation ownership

- This file is the only active task register.
- [README.md](../README.md) is the repository overview; [docs/README.md](README.md) indexes maintained documentation.
- [ROADMAP.md](ROADMAP.md) records current project position and evidence. It is not a second task list.
- Keep detailed technical references only when they remain useful to current implementation or future maintenance. Dated snapshots, completed one-off plans, and superseded architecture proposals should be removed after checking and updating inbound references.
- [PRODUCTION_ACCEPTANCE.md](PRODUCTION_ACCEPTANCE.md) is the named production acceptance specification. Do not create another task list to replace this one.
