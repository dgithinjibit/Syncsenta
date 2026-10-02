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
node developer_tools/scripts/reconcile.mts
```

Change it and read the record back:

```bash
node developer_tools/scripts/reconcile.mts --accept 3 --waive assessmentMethods \
  --actor teacher:kibera_mama_joy --note 'Lesson 2 is oral.' \
  --at 2026-10-02T09:04:15+03:00 --out /tmp/run1
node developer_tools/scripts/reconcile.mts --policy /tmp/run1/policy.metta
```

## What is proven, with the command that proves it

| Claim | Command | Result |
|---|---|---|
| The engine decides and cites its own policy lines | `node developer_tools/scripts/reconcile.mts` | exit 0, `2 clean · 2 blocking · 0 advisory · 4 rows`, `∴ not certified` |
| The browser shows the identical decision | `npx vitest run --no-file-parallelism src/lib/__tests__/scheme-reconcile-cli.test.ts` in `studio/` | the terminal's stdout equals the page's transcript, byte for byte |
| A waiver counts only because a later run reads it off disk | `--policy /tmp/run1/policy.metta` with no waiver flag | reproduces `field-obligation-waived-by-teacher`, citing the file it read |
| The sample audit trail is committed, and is still what the code writes | `npx vitest run --no-file-parallelism src/lib/__tests__/basix-sample-audit.test.ts` in `studio/` | `docs/basix-sample-audit/` holds three transcripts plus `policy.metta`, `ledger.json` and `diff.json`; the guard re-runs the recorded command into a temp directory and requires those three artefacts byte for byte — `∴ not certified` before the teacher's consent, `∴ certified for classroom use` after it, four chained entries naming `teacher:kibera_mama_joy` |
| The record reports being edited | `npx vitest run --no-file-parallelism src/lib/__tests__/scheme-ledger.test.ts` | a middle deletion returns `gate: 'chain'` and names the entry |
| The suite is green on this machine | `npx vitest run --no-file-parallelism --testTimeout=30000` in `studio/` | **1089 passed, 17 skipped** across 111 files, exit 0, 72.32 s vitest clock / 1:14 wall, 2026-10-02 ~12:27 EAT |
| The deploy *upload* works; nothing has been served | `vercel deploy --yes --local-config vercel-cli-preview.json` in `studio/`, then `vercel inspect` | uploaded **355.6 KB** and created `sentastudio-gady22na2-…vercel.app`, which `vercel inspect` reports as `status ● Blocked` — *"the commit author doesn't have permission to create deployments for this project"*. `curl -L` on `/` and `/omega/check` both end at `https://vercel.com/login` (Vercel's SSO, not our page). **This row proves the upload, not the app** |

## What this pull request does not claim

- The refusal gate is real where a caller asks it to be (`--require-handoff` exits 2) and is **not yet wired
  into `/api/generate/lesson-plan`**.
- Nobody has logged in as the teacher demo account and walked the check on a served page. There **is** now a
  URL that carries this branch: `main` was pushed over SSH on 2026-10-02 and git-triggered a Production build
  that went **● Ready in 4m**; `https://sentastudio.vercel.app/omega/check` then measured **HTTP 200** with
  the reconciler's copy in the HTML, and `/teacher/omega` measures **307** to `/auth/signin` — the gate, as
  designed. (The two pushes an hour earlier were `● Blocked`: the commit-author email was one an earlier agent
  session invented, corrected and recorded in `docs/ROADMAP.md` §11, spoon 10.) The page has been read locally,
  in the browser, with no account — that remains the extent of what has been *seen*. The served 200 is proven;
  the served click-through is not.
- The packs are read by this repository's own MeTTa parser (`studio/src/lib/attest/derive.ts`). Running them
  under real Hyperon and diffing the answers is scheduled, not done.
- No efficacy evidence: four hand-seeded demo accounts, one hand-written pack.
- The ledger's head hash is **not** published on-chain; today it is a tamper-evident file in this repository.

The AI disclosure required for the Solo track is written in the owner's words in `README.md`, not generated
by the agent that made the feature.

## Reviewer notes

`docs/BASIX-CALL-NOTES-2026-10-01.md` is the honest position one-pager as of this branch. Machine limits
behind the "we ran it this way" choices — 3.7 GB of RAM — are recorded in `docs/ROADMAP.md` §6.
