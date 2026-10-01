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
| The suite is green | `npx vitest run --no-file-parallelism` in `studio/` | **1089 passed, 16 skipped, 125 files, exit 0** |
| The live site does not have this feature yet | `curl -o /dev/null -w %{http_code} https://sentastudio.vercel.app/omega/check` | **404** (production is 66 commits behind `main`) |
| A deployment of this tree builds and answers | `vercel deploy --yes --local-config vercel-cli-preview.json` in `studio/`, then `curl -L` on `/` and `/omega/check` | `Ready in 54 s`, exit 0; both **200**, body is the sign-in page. Private preview, `public/assets/` omitted — evidence that the build works, not that the feature was used |

## What is not proven — said out loud, not papered over

1. **No browser pass with an account.** A preview of this tree is now deployed and answers 200 on `/` and
   `/omega/check`, and both show the sign-in page to a visitor with no cookie — so the middleware and the
   first real `next build` of this batch are fine. Nobody has logged in as the teacher demo account and
   walked the check on screen yet; that is the outstanding half.
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

- **The repository is disabled on GitHub, and that is the only hard blocker left.** `git push origin main` is
  refused with `remote: Your repository is disabled.` (403), and a REST `GET /repos/dgithinjibit/Syncsenta`
  with the CLI's own token returns **403** too, while the browser session can see it — so 66 commits, all of
  this week's work, exist on one laptop. Read the banner at
  `https://github.com/settings/administration-or-migration-guidance`; expect a reply in hours rather than
  minutes, so it is the first thing to raise. Nothing code-side can work around it.
- Visibility is already **private** (measured: `"private": true`), so when the block lifts: push, then fix
  the platform's repo field, which still points at `Ascendra.git` — a repository that does not exist — and
  add `BASIX.MARKET` as a collaborator. Pushing to a *public* repo would auto-deploy the 100 MB asset tree to
  the live production URL; that is why private comes first.
- **Revoke the leaked `gho_…` token.** Still valid as of today.
- `ASI_CLOUD_KEY` into `studio/.env.local`, by the owner, never pasted into a file, a commit or a chat.

## Where we think we are going wrong, honestly

The risk is not the engine — it is the seam between *tested* and *seen*. Two-thirds of the score is
visibility (demo, docs, video) and the feature currently looks like nothing on the deployed URL. If the
preview build is clean, the next hour's highest-value work is one screenshot of `/omega/check` and one
terminal shot of the same transcript, because that pair *is* the pitch.
