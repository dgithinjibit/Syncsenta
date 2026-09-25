# Main Stability and Branch Consolidation Tasks

**Status:** In progress  
**Started:** 2026-09-24

## Phase 0 — Establish evidence

- [x] Read current architecture, domain context, development, coding standards, Omega status, roadmap, and existing Web4 specs.
- [x] Confirm local `main` tracks `origin/main` with a clean working tree before specification changes.
- [x] Attempt baseline Studio and Rust verification.
- [x] Resolve the `package.json` / `package-lock.json` mismatch that prevents `npm ci` (lockfile regenerated 2026-09-24; `npm ci --ignore-scripts` exits 0; plain `npm ci` still to confirm).
- [ ] Run Rust gates in an environment with the Rust toolchain; local `cargo` is currently unavailable.
- [x] Record baseline typecheck state: `npx tsc --noEmit` on `main` fails with 70 errors; `next.config.js` ships `ignoreBuildErrors: true` and `ignoreDuringBuilds: true`, masking them on Vercel.
- [x] Record orphaned imports of unlisted packages (`framer-motion`, `isomorphic-dompurify`) in three unreferenced files; confirm the build does not reach them.
- [x] Record merge artifact `studio/[ABSOLUTE, FULL path to the file]` (54 bytes, introduced by #8) for removal in the cleanup commit.
- [x] Full Studio test suite green: 54 files / 366 tests passed, 1 file / 17 skipped (2026-09-24).

## Phase 1 — Recover dashboards (P0)

- [x] Reproduce demo and authenticated routing for every supported role. (Root causes confirmed at code level; browser smoke still pending.)
- [x] Record one canonical route per role and compatibility redirects. (`ROLE_HOME` + `DEMO_DESTINATIONS`; teacher canonical = `/teacher`.)
- [x] Identify the introducing commit from recent merge history. (PR #11 `5503e5e` flipped the teacher demo destination and rewrote the test; PR #8 `8d0d634` left ~9 stale call sites.)
- [x] Add a failing regression test before changing behavior. (`demo-destinations.test.ts` pinned the regression and was corrected; `grade-id.test.ts` regression tests added.)
- [x] Apply the minimum routing/auth/loading fix. (Teacher destination, grade-key normalization, session-scoped identity, dead prop removal.)
- [ ] Run focused tests, full Studio gates, and browser smoke tests. (Tests + typecheck + build green; browser smoke pending.)

## Phase 2 — Restore reproducible verification (P0)

- [ ] Make `npm ci` succeed without bypass flags (lock mismatch fixed; plain `npm ci` run pending).
- [x] Add an explicit Studio test script matching documentation (`"test": "vitest run"`).
- [x] Re-arm the TypeScript build gate: 70 → 0 `tsc --noEmit` errors; `typescript.ignoreBuildErrors` removed from `next.config.js` (2026-09-24). ESLint stays build-ignored because Next 14's `next lint` cannot read the repo's flat `eslint.config.mjs` — separate follow-up.
- [x] Add CI coverage for install, tests, typecheck, build, and role-route smoke tests. (`.github/workflows/studio-gates.yml`: `npm ci` + `tsc --noEmit` + `npm test` + `npm run build` on PRs touching `studio/**`, pushes to `main`, and manual dispatch. Role-route browser smoke remains a post-deploy step until credentials exist for it.)
- [ ] Keep Omega TypeScript/Rust parity enforcement active.

## Phase 3 — Inventory branches (P1)

- [x] Fetch all remote refs and record the audit timestamp. (2026-09-24 11:41 UTC, `git fetch --prune`.)
- [x] Classify every branch against `origin/main` using ancestry and patch evidence. (See [`branch-audit.md`](branch-audit.md) — 3 DONE, 6 SUPERSEDED, 2 flagged DO-NOT-MERGE as regression carriers.)
- [x] Map branch tips to pull requests and identify stacked or duplicate work. (`fix/deployment-and-curriculum-integration` stacks on the hyperon + sandboxes branches; `fix/demo-login...` = PR #11.)
- [x] Publish the merge queue with required gates and risk classification. (Queue empty: no unique architecture-safe work remains on branches.)

## Phase 4 — Integrate verified work (P1)

Audit outcome (see [`branch-audit.md`](branch-audit.md)): the merge queue is
empty — every remote branch is DONE or SUPERSEDED relative to `origin/main`.
Phase 4 therefore closes against the queue rather than any merge.

- [x] Evaluate architecture-preserving candidates one at a time. (None found.)
- [x] Present architecture-changing candidates with benefits and tradeoffs before merge. (None to present; the two regression-carrying branches are flagged DO-NOT-MERGE with evidence.)
- [x] Merge only green candidates through the allowed repository workflow. (Vacuous: no candidates.)
- [x] Rerun aggregate tests and all-role dashboard smoke after each merge. (Vacuous: no merges; gates still run for the recovery series.)
- [x] Stop and revert the latest merge if a production-path regression appears. (Not triggered; P0 recovered by forward fix, not revert.)

## Phase 5 — Kenya-first Omega roadmap (P2)

- [ ] Mark roadmap items as implemented, tested, deployed, and browser-verified separately.
- [ ] Define curriculum, policy, localization, assessment, and LMS adapter contracts using Kenya CBC evidence.
- [ ] Deploy the Rust Omega boundary only after contract parity, timeout, observability, and rollback tests pass.
- [ ] Validate educational outcomes and operational behavior in Kenya before adding another curriculum.

## Completion gate

This specification is complete only when dashboards are browser-verified, `main` has reproducible gates, every remote branch has an evidence-backed decision, approved candidates are integrated, and the roadmap reflects observed rather than aspirational status.
