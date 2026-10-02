# Contributing to SyncSenta

One repository, several runtimes: the Next.js app in `studio/`, Python agent
services in `ai-agents/`, Rust engines at the root (`rust-core/`, `rust-service/`,
`backend/`), and Supabase migrations in `supabase/`. Read
[`docs/ROADMAP.md`](docs/ROADMAP.md) before planning work — it is the binding
map of what is proven, what is recorded-but-unverified, and what our own docs
used to claim falsely.

## The one rule

**Implemented ≠ tested ≠ deployed ≠ browser-verified.** A claim enters a commit
only with the command that produced it. If you add a number to a README, the
guard tests will demand the command behind it — several already do
(`studio/src/lib/__tests__/basix-readme.test.ts` is the strictest).

## Setting up

```bash
# Node side (the web app)
cd studio && npm install
npx tsc --noEmit                          # type gate
npx vitest run --no-file-parallelism --testTimeout=30000   # full suite

# The submitted feature needs no install beyond Node ≥ 22.18:
node developer_tools/scripts/reconcile.mts

# Rust side
cargo check -p syncsenta-backend          # needs a C linker (build-essential)
```

Low-RAM machines (≤ 4 GB) can run the Node suite and the CLI; they cannot host
model inference or a full Hyperon runtime — do not try.

## Making a change

1. Write the failing test first, watch it fail for the right reason, then the
   minimal code.
2. One verifiable change per commit. Do not bundle refactors with behaviour.
3. No secrets, ever: `.env.local` stays untracked, use the nearest
   `.env.example` as a template and never put a real value in it.
4. New documents go in `docs/` (`architecture/`, `research/`, `setup/`,
   `archive/`); developer helpers go in `developer_tools/`. The repository
   root holds only deploy/workspace manifests, `README.md`, `AGENTS.md`,
   `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, and the community-health files.
5. If you change what is proven, update `docs/ROADMAP.md` in the same commit —
   the roadmap is the map, and a session that does work without recording it
   has done half the work.

## Commit messages

Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`), imperative, one
sentence about *why* when the diff doesn't say it. A commit message that reads
like a chat transcript will be asked to be rewritten before merge.

## Before opening a pull request

The checklist in `pull_request_template.md` is the short version; the CI
workflows in `.github/workflows/` (`studio-gates`, `rust-gates`) are the
long version and must be green.
