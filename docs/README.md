# Developer documentation

This index lists the maintained guidance for active SyncSenta development.
Historical research and superseded plans are intentionally not duplicated here;
use Git history when historical context is required.

## Start here

1. [Phase 2 Roadmap](ROADMAP.md) — teacher analytics scope, work items, and
   acceptance criteria.
2. [Development](DEVELOPMENT.md) — local environment and verification commands.
3. [Architecture](ARCHITECTURE.md) — active runtime and data boundaries.
4. [Coding Standards](CODING_STANDARDS.md) — conventions for Studio and
   teacher analytics.
5. [Developer Debugging Playbook](DEBUGGING_PLAYBOOK.md) — Jira-ready bug
   reports, triage, and safe diagnostics.
6. [Deployment Runbook](DEPLOYMENT_RUNBOOK.md) — deployment boundaries and
   post-deploy verification.
7. [Student Content Readiness](CONTENT_READINESS.md) — current learner routes
   and activity readiness.
8. [Production Completion Specification](specs.md) — acceptance and senior
   production requirements for active product surfaces, including Omega and
   Hyperon.

## Documentation rules

Update the relevant active document when a change alters a route, API contract,
environment variable, database migration, deployment target, or product scope.
State whether behavior is implemented, tested, deployed, or browser-verified;
these are separate claims.

Do not add point-in-time status reports or duplicate design documents. Keep
Phase 2 work and its evidence in [the roadmap](ROADMAP.md); Git history
preserves prior versions.
