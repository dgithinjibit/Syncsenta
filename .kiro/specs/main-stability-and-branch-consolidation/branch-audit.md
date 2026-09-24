# Branch Topology Audit — Evidence and Merge Queue

**Audited:** 2026-09-24 11:41 UTC (after `git fetch origin --prune`)
**Baseline:** `origin/main` @ `7595550` (2026-09-22)
**Method per branch:** ancestry containment (`git merge-base --is-ancestor`),
patch equivalence (`git cherry -v`), content delta vs main tip
(`git diff origin/main origin/<b>`), and file-level insertion attribution
(`git diff --numstat`, files where the branch adds lines main does not have).

## Decision legend

- **DONE** — patch-equivalent commits already in main; nothing unique.
- **SUPERSEDED** — branch has "+" patches, but file-level evidence shows they
  are older variants of content main already carries (squash-merged PRs).
  Merging would rewrite current files back to stale versions.
- **MERGE CANDIDATE** — unique, architecture-safe work worth integrating.

## Findings

| Branch | Ancestry | cherry | Real delta vs main | Decision |
|---|---|---|---|---|
| `agent/current-work-mergeable` | not ancestor (ahead 1 / behind 6) | `-` (patch in main) | none | **DONE** |
| `docs/record-lms-omega-route-flaws` | not ancestor (1/2) | `-` | none | **DONE** |
| `fix/demo-login-to-working-dashboards` | not ancestor (1/3) | `-` (= PR #11) | none | **DONE** (its `teacher → /teacher/dashboard` behavior is the P0 regression; recovery commit reverts the destination on main) |
| `feat/grade6-ai-blockchain-curriculum` | not ancestor (12/2) | 12 `+` | only removes 52 lines of `docs/OMEGA_METTA_STATUS.md` that main added; all curriculum content verified present on main | **SUPERSEDED** (squash-merged) |
| `chore/retire-netlify-and-align-render-env` | not ancestor (5/4) | 5 `+` | netlify.toml and stripe routes already absent from main; websocket/env fixes byte-identical to main; its "adds" are stale sign-in-form + `/teacher/dashboard` (the regression) | **SUPERSEDED — DO NOT MERGE** (would re-introduce P0 bug) |
| `fix/deployment-and-curriculum-integration` | not ancestor (9/5) | 6 `+` (stacked on hyperon + sandboxes branches) | re-adds Stripe routes, `netlify.toml`, old sign-in-form, `/teacher/dashboard`, stale lockfile | **SUPERSEDED — DO NOT MERGE** (stale tree; regression + retired architecture) |
| `experiment/hyperon-rust-embedding` | not ancestor (4/99) | 4 `+` | `rust-hyperon-bridge/` already present on main; remaining "adds" are pre-refactor file locations main has since restructured | **SUPERSEDED** (squash-merged; 99 behind) |
| `feat/curriculum-sandboxes-chat` | not ancestor (2/7) | 2 `+` (db1cd50 also inside deployment branch) | sandbox/chat/journey files on branch are older variants of current main content (2026-09-21 unified catalog slices landed) | **SUPERSEDED** (squash-merged) |
| `agent/current-work-checkpoint-sanitized` | **no merge base** (orphan root, behind 417) | 1 `+` (whole-repo snapshot) | single-commit sanitized snapshot of an old repo state | **SUPERSEDED** — historical artifact; not mergeable, no unique current work |

## Merge queue

**Empty.** No branch carries verified, unique, architecture-safe work that
`origin/main` does not already have. Per the merge policy, nothing is merged
in Phase 4; the queue instead prioritizes the local recovery commit series
(dashboard routing P0 + typecheck gate restoration).

## Deletion eligibility (user performs deletion; this spec never deletes)

All nine branches above are evidence-classified as DONE or SUPERSEDED. Each
squash-merged classification should be cross-checked against its closed PR
before deletion; the two **DO NOT MERGE** branches additionally prove their
tips are harmful, not just stale.

## Re-open criteria

If any branch is later found to contain work not covered here (e.g., an
unpushed colleague commit), it re-enters the queue as a normal candidate:
reproduce, failing test first, minimum fix, full gates, then merge decision.
