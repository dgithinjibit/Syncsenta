# Main Stability and Branch Consolidation Requirements

**Status:** Active recovery specification  
**Created:** 2026-09-24  
**Scope:** Current deployed Syncsenta architecture and remote branch consolidation

## Evidence hierarchy

When sources disagree, use this order:

1. Reproduced browser/runtime behavior
2. Executable tests, code, deployment configuration, and schemas
3. `docs/ARCHITECTURE.md`, `docs/CONTEXT.md`, and current runbooks
4. Roadmaps and historical reports
5. Aspirational `.kiro` Web4 design documents

A completed checkbox or architecture claim is not proof without executable or runtime evidence.

## Requirement 1: Dashboard reachability

**User story:** As any supported user role, I need authentication to lead to one canonical dashboard so I can use the platform without loops or indefinite loading.

### Acceptance criteria

1. Every supported demo role SHALL establish its expected session before navigation.
2. Every supported authenticated role SHALL resolve to one documented canonical destination.
3. Compatibility routes SHALL redirect to the canonical destination without creating competing dashboard implementations.
4. A dashboard SHALL show useful content or a bounded, actionable error state; it SHALL NOT remain in an indefinite loading state.
5. Browser-level smoke tests SHALL cover all supported demo roles and ordinary sign-in routing.
6. A regression test SHALL fail against the introducing behavior and pass after the fix.

## Requirement 2: Learner identity and curriculum context

**User story:** As a learner, I need the dashboard and Omega context to use my authenticated identity and selected grade.

### Acceptance criteria

1. Production dashboard requests SHALL NOT use a hard-coded learner identifier.
2. Display labels and stored curriculum grade identifiers SHALL pass through one explicit normalization contract.
3. A selectable grade with repository-backed content SHALL not be marked unavailable due to key-format mismatch.
4. Missing personalization data SHALL degrade to a bounded fallback without blocking navigation.
5. Omega inputs SHALL remain scoped to authenticated learner, grade, subject, and session boundaries.

## Requirement 3: Branch inventory and containment proof

**User story:** As repository owner, I need to know which remote branches contain work absent from `main` before deleting them.

### Acceptance criteria

1. Remote references SHALL be fetched before classification.
2. Every remote branch SHALL be checked with commit-containment and unique-diff evidence against `origin/main`.
3. Each unmerged branch SHALL be mapped to its pull request when metadata is available.
4. Stacked, duplicate, stale, conflicting, and already-integrated branches SHALL be identified explicitly.
5. No branch SHALL be deleted as part of this specification; deletion remains a separate owner action after verified integration.

## Requirement 4: Merge quality gate

**User story:** As repository owner, I need branch integration to preserve working architecture and prevent regressions.

### Acceptance criteria

1. A candidate SHALL have its unique diff reviewed before merge.
2. Required tests SHALL be selected from the changed surface: Studio, Rust, Python, schema, deployment, and documentation.
3. Studio candidates SHALL pass clean dependency installation, focused tests, typecheck, lint, production build, and dashboard smoke tests where routing or auth is touched.
4. Rust candidates SHALL pass format, check, tests, all targets/features, and Omega parity checks where applicable.
5. Python candidates SHALL pass their focused and full pytest gates with the documented runtime.
6. A candidate SHALL NOT merge while required gates are unavailable or red.
7. Architecture-preserving candidates may merge after all gates pass.
8. Architecture-changing candidates SHALL have benefits, costs, migration effect, rollback, and recommendation explained to the user before merge.
9. Integration SHALL use a traceable merge or pull-request workflow; no force push or history rewrite is allowed.

## Requirement 5: Reproducible main

**User story:** As a contributor, I need a clean checkout of `main` to install and verify consistently.

### Acceptance criteria

1. `studio/package.json` and `studio/package-lock.json` SHALL support `npm ci` from a clean checkout.
2. Repository documentation and package scripts SHALL name commands that actually exist.
3. CI SHALL run the minimum merge gates for affected production paths, including dashboard routing/auth tests.
4. Missing local tooling SHALL be reported as an unverified gate, never interpreted as a pass.

## Requirement 6: Kenya-first universal Omega Claw

**User story:** As the product owner, I need Kenya CBC to validate a future universal education engine without pretending unsupported curricula already work.

### Acceptance criteria

1. Kenya CBC SHALL remain the only production curriculum claim until another curriculum has evidence.
2. Curriculum, policy, localization, assessment, and LMS contracts SHALL expose explicit boundaries from platform orchestration.
3. Rust SHALL remain the target authoritative backend/Omega boundary, while current deployed TypeScript and Python paths remain labeled accurately.
4. Target-state architecture SHALL not replace stable production paths without parity, observability, rollback, and measured benefit.
5. Roadmap milestones SHALL distinguish implemented, tested, deployed, and browser-verified states.
