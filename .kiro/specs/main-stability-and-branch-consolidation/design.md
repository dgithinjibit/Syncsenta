# Main Stability and Branch Consolidation Design

**Status:** Proposed execution design  
**Created:** 2026-09-24

## Decision

Recover and prove the current production path before integrating feature branches or expanding Omega. Preserve the deployed Vercel + Next.js Studio, Render + FastAPI agents, Supabase, and Upstash boundaries unless a separately approved architecture change demonstrates a better result.

## Recovery flow

1. Record the canonical role-to-dashboard route map from current code.
2. Reproduce each role path in a browser and capture the first failing boundary.
3. Use git history to identify the introducing commit.
4. Add the smallest automated regression test that demonstrates the failure.
5. Apply a surgical fix without refactoring adjacent routing or auth code.
6. Run focused tests, full Studio gates, and browser smoke tests.
7. Update architecture and roadmap claims only after runtime verification.

## Branch decision model

Each remote branch receives one decision record:

| Field | Meaning |
|---|---|
| Branch | Exact remote reference |
| Containment | Whether its tip is an ancestor of `origin/main` |
| Unique commits | Commits reachable from branch but not main |
| Changed surfaces | Studio, Rust, Python, database, deployment, docs |
| PR state | Open, merged, closed, or unavailable |
| Architecture effect | Preserves, changes, conflicts, or unknown |
| Required gates | Commands and browser paths required before merge |
| Decision | Already integrated, merge candidate, hold, superseded, or reject |
| Evidence | Commit IDs, diff paths, test results, and source references |

## Merge sequence

1. Fetch remote metadata without changing the working tree.
2. Remove already-contained and patch-equivalent branches from the merge queue.
3. Order stacked candidates by ancestry.
4. Evaluate one candidate at a time in an isolated branch or worktree.
5. Reject candidates that regress the dashboard contract or contradict current architecture.
6. Present architecture-changing candidates with tradeoffs before integration.
7. Merge verified candidates into current `main`, rerun aggregate gates, then push through the repository's allowed workflow.

## Verification matrix

| Changed surface | Required verification |
|---|---|
| Auth, middleware, dashboards, redirects | Focused unit/route tests, typecheck, build, all-role browser smoke |
| General Studio | Clean install, Vitest, typecheck, lint, build |
| Omega TypeScript or Rust | Unit tests plus `check-omega-thresholds.mjs` and Rust workspace gates |
| FastAPI agents | Focused pytest plus full pytest where dependencies permit |
| Supabase schema/RLS | Migration review, policy tests, staging-only application before production |
| Deployment config | Config diff, health endpoint, staging/deployment smoke |
| Documentation only | Link/path validation and architecture consistency review |

## Architecture evidence policy

Current-state statements require code, config, schema, test, or runtime evidence. Target-state work is labeled `proposed`. The older Web4 Axum/DID/IPFS specification remains design intent until its components are present and exercised in the deployed path.

## Rollback

Every integration must retain its pre-merge commit, avoid force pushes, and be revertible as one logical merge. If post-merge dashboard smoke fails, stop the queue and revert the latest integration before evaluating another branch.
