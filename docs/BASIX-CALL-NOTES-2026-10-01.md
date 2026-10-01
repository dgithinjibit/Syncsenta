# BASIX daily call — honest position, 2026-10-01

One page. Tier A means a command was run and its output is here. Anything else says so.

## What is the submission

Track 5 (Solo), challenge 1 — *"One agent producing an auditable decision"*. The agent is SyncSenta and the
decision is the **Grade 8 Artificial Intelligence scheme-of-work check**: two MeTTa packs (design facts +
policy), one teacher draft in, one cited verdict out, with consent, waiver, an audit record and a gate in
front of the next stage.

## Tier A — proven on this machine, with the command

| Claim | Command | Result |
|---|---|---|
| The engine decides and cites its own policy lines | `node scripts/reconcile.mts` | exit 0, 26-line transcript, `2 clean · 2 blocking · 0 advisory · 4 rows`, `∴ not certified` |
| The same decision is in the browser's view model | `basix-readme.test.ts`, `scheme-reconcile-cli.test.ts` | terminal stdout equals `buildCheckView`'s transcript, byte for byte |
| The terminal can change the scheme *and* record it | `node scripts/reconcile.mts --accept 3 --waive assessmentMethods --actor … --note … --at … --out /tmp/run1` | writes `policy.metta`, `ledger.json`, `diff.json`; prints 4 records; exit 2 under `--require-handoff` while uncertified |
| A waiver counts only because a later run reads it off disk | `node scripts/reconcile.mts --policy /tmp/run1/policy.metta` | reproduces `field-obligation-waived-by-teacher` as an advisory with no waiver flag, citing the file it read |
| The record reports being edited | `scheme-ledger` / `scheme-handoff` suites | a middle deletion returns `gate: 'chain'` and names entry 4; a prefix cut still verifies (documented, not hidden) |
| The suite is green | `npx vitest run --no-file-parallelism` in `studio/` | **1069 passed, 17 skipped, 109 files, exit 0, 90.3 s** |
| The live site does not have this feature yet | `curl -o /dev/null -w %{http_code} https://sentastudio.vercel.app/omega/check` | **404** (production is 43 commits behind `main`) |

## What is not proven — said out loud, not papered over

1. **No browser pass.** The page `/omega/check` exists in code and is typechecked by the narrowed `tsc`, but
   nobody has opened it in a browser since spoon 5b. A preview deploy is being built now; that build is the
   first real `next build` of this batch, so it may find something the suite cannot.
2. **The page cannot act yet.** Accept, waive and the ledger are reachable from the terminal and from tests,
   not from buttons. That is an owner decision plus one browser pass, not a missing module.
3. **The gate is not in front of the generator.** `handoff.ts` refuses and can exit 2; `/api/generate/lesson-plan`
   does not call `requireHandoff` yet. Today the enforcement is real where a caller asks for it.
4. **The packs are read by our own parser, not by Hyperon.** `derive.ts` implements the subset of MeTTa these
   two packs use. Running the same packs under real Hyperon and diffing the answers is scheduled, not done.
5. **No efficacy evidence.** Four hand-seeded demo accounts, one hand-written pack, one draft. This is a
   working mechanism, not a pilot.
6. **The AI disclosure is not written.** Mandatory for Solo, and it has to be in the owner's words. What is
   ready is the inventory it needs (see the Tier A table above and the commit messages, which carry the
   red-first evidence) — the document itself is not drafted yet.

## Blocked on the owner, not on code

- GitHub: make the repository **private first**, then push (43 commits), then fix the platform's repo field,
  which still points at `Ascendra.git` — a repository that does not exist — and add `BASIX.MARKET` as a
  collaborator.
- **Revoke the leaked `gho_…` token.** Still valid as of today.
- `ASI_CLOUD_KEY` into `studio/.env.local`, by the owner, never pasted into a file, a commit or a chat.

## Where we think we are going wrong, honestly

The risk is not the engine — it is the seam between *tested* and *seen*. Two-thirds of the score is
visibility (demo, docs, video) and the feature currently looks like nothing on the deployed URL. If the
preview build is clean, the next hour's highest-value work is one screenshot of `/omega/check` and one
terminal shot of the same transcript, because that pair *is* the pitch.
