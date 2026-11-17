# Developer scripts

Scripts here are optional helpers, not application entrypoints. Read a script
before running it; some require credentials, a deployed service, or external
checkouts.

## Useful current helpers

- `repo-map.py` — generate a local repository map.
- `generate-ai-design-pack.mts` — run the design-pack generator also exposed
  as `npm run generate:design-pack` in `studio/`.
- `staging-e2e-gate.sh` and `student-sandbox-mobile-smoke.sh` — staging-only
  checks; they require their documented endpoints and test setup.
- `setup-chatdev-env.sh`, `run-chatdev.sh`, `chatdev-harness.sh`, and
  `chatdev-orchestrator.sh` — optional legacy helpers that require an external
  `ChatDev/` checkout. They are not part of the active Studio development path.

Other scripts target archived Rust experiments, one-off dataset work, or
service-specific checks. They are not general setup commands. Confirm the
target, required environment, and side effects before using them.
