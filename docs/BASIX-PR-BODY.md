# BASIX Track 5 (Solo) — challenge 1: one agent producing an auditable decision

This branch carries the submitted feature and the record of how it was built. The commit history is the
build process, spoon by spoon: a failing test, its witness, the minimum code, and a roadmap entry saying
what is now true. `docs/ROADMAP.md` is the running log; `docs/BASIX-NORTH-STAR.md` is the rule the work is
checked against.

## What it does

A Grade 8 teacher's scheme of work for Artificial Intelligence is checked against two MeTTa rule packs —
the curriculum facts and the checking policy. The agent does not produce a paragraph of opinion: it produces
a numbered derivation where every finding cites the rule line it came from, and the decision is only valid if
a teacher's consent, and any waiver, are recorded with a name and a timestamp.

Run it from the repository root, read-only, no account and no key:

```bash
node scripts/reconcile.mts
```

Change it and read the record back:

```bash
node scripts/reconcile.mts --accept 3 --waive assessmentMethods \
  --actor teacher:kibera_mama_joy --note 'Lesson 2 is oral.' \
  --at 2026-10-02T09:04:15+03:00 --out /tmp/run1
node scripts/reconcile.mts --policy /tmp/run1/policy.metta
```

## What is proven, with the command that proves it

| Claim | Command | Result |
|---|---|---|
| The engine decides and cites its own policy lines | `node scripts/reconcile.mts` | exit 0, `2 clean · 2 blocking · 0 advisory · 4 rows`, `∴ not certified` |
| The browser shows the identical decision | `npx vitest run --no-file-parallelism src/lib/__tests__/scheme-reconcile-cli.test.ts` in `studio/` | the terminal's stdout equals the page's transcript, byte for byte |
| A waiver counts only because a later run reads it off disk | `--policy /tmp/run1/policy.metta` with no waiver flag | reproduces `field-obligation-waived-by-teacher`, citing the file it read |
| The record reports being edited | `npx vitest run --no-file-parallelism` in `studio/` | **1078 passed, 17 skipped** across 110 files, exit 0 |
| The app builds and serves | `vercel deploy --yes --local-config vercel-cli-preview.json` in `studio/` | `Ready in 54 s`; `/` and `/omega/check` answer 200 and show the sign-in page |

## What this pull request does not claim

- The refusal gate is real where a caller asks for it (`--require-handoff` exits 2) and is **not yet wired
  into `/api/generate/lesson-plan`**.
- Nobody has logged in as the teacher demo account and walked the check on a deployed URL. The 200s above
  are the sign-in page.
- The packs are read by this repository's own MeTTa parser (`studio/src/lib/attest/derive.ts`). Running them
  under real Hyperon and diffing the answers is scheduled, not done.
- No efficacy evidence: four hand-seeded demo accounts, one hand-written pack.
- The ledger's head hash is **not** published on-chain; today it is a tamper-evident file in this repository.

The AI disclosure required for the Solo track is written in the owner's words in `README.md`, not generated
by the agent that made the feature.

## Reviewer notes

`docs/BASIX-CALL-NOTES-2026-10-01.md` is the honest position one-pager as of this branch. Machine limits
behind the "we ran it this way" choices — 3.7 GB of RAM — are recorded in `docs/ROADMAP.md` §6.
