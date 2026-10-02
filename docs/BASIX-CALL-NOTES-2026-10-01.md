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
| The engine decides and cites its own policy lines | `node developer_tools/scripts/reconcile.mts` | exit 0, 26-line transcript, `2 clean · 2 blocking · 0 advisory · 4 rows`, `∴ not certified` |
| The same decision is in the browser's view model | `basix-readme.test.ts`, `scheme-reconcile-cli.test.ts` | terminal stdout equals `buildCheckView`'s transcript, byte for byte |
| The terminal can change the scheme *and* record it | `node developer_tools/scripts/reconcile.mts --accept 3 --waive assessmentMethods --actor … --note … --at … --out /tmp/run1` | writes `policy.metta`, `ledger.json`, `diff.json`; prints 4 records; exit 2 under `--require-handoff` while uncertified |
| A waiver counts only because a later run reads it off disk | `node developer_tools/scripts/reconcile.mts --policy /tmp/run1/policy.metta` | reproduces `field-obligation-waived-by-teacher` as an advisory with no waiver flag, citing the file it read |
| The record reports being edited | `scheme-ledger` / `scheme-handoff` suites | a middle deletion returns `gate: 'chain'` and names entry 4; a prefix cut still verifies (documented, not hidden) |
| The suite is green | `npx vitest run --no-file-parallelism --testTimeout=30000` in `studio/` | **1085 passed, 17 skipped, 110 files, exit 0** (62.75 s vitest clock, 1:08 wall, 2026-10-02 ~12:15 EAT; earlier baselines were 1078/17 at 61.4 s with 237 MB peak, then 1079/17, then 1080/17 — the +5 here is `basix-readme.test.ts` gaining five clean-checkout tests) |
| The live site does not have this feature yet | `curl -o /dev/null -w %{http_code} https://sentastudio.vercel.app/omega/check` | **404** (production is 68 commits behind this branch) |
| The upload works; the build never served anything | `vercel deploy --yes --local-config vercel-cli-preview.json` in `studio/`, then `vercel inspect` and `curl -L` on `/`, `/omega/check`, `/teacher/omega`, `/api/auth/demo-login` | uploaded **355.6 KB**, created `sentastudio-gady22na2-…`; `vercel inspect` → `status ● Blocked`, reason *"the commit author doesn't have permission to create deployments for this project"*; every path lands on `https://vercel.com/login?next=/sso-api…` (`<title>Login – Vercel</title>`). **Tier A for the upload and the block; nothing about the app.** An earlier row here claimed `Ready in 54 s` and 200s showing the sign-in page — both false, corrected 2026-10-01 17:3x EAT |

## What is not proven — said out loud, not papered over

1. **No browser pass, on any host.** The preview this table used to describe does not exist as recorded: the
   deployment is `● Blocked` by a Vercel project permission and sits behind Vercel's own SSO, so a signed-out
   `curl` never reaches our middleware and never reaches `/omega/check`. Locally the page renders with no
   account and has been read there. Nobody has logged in as the teacher demo account and walked the check on
   a served page; that half is still outstanding, and it needs the Vercel permission resolved first.
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

- **The push is blocked by a token scope, not by the repository's state — and it is one command to fix.**
  `git push --set-upstream origin feat/safe-data-retrieval` is rejected with
  `refusing to allow an OAuth App to create or update workflow
  '.github/workflows/rust-gates.yml' without 'workflow' scope`, and `gh auth status` reports
  `Token scopes: 'gist', 'read:org', 'repo'`. Exactly one commit in the range touches workflows
  (`2f37915`, which adds that Rust CI file). The fix is owner-side and takes a minute:
  **`gh auth refresh -s workflow`** (gh 2.63.2 has no `refresh-scopes` subcommand — the command written here
  earlier failed in the owner's terminal with `unknown shorthand flag: 's' in -s`). It opens a browser with a
  device code; run it in whichever terminal you like, since all of them read the same
  `~/.config/gh/hosts.yml`. A push of `main` separately reported
  `remote: Your repository is disabled.` — recorded here as observed, with that command, rather than
  explained. Until the scope is refreshed, 68 commits of this week's work exist on one laptop.
- Visibility is already **private** (measured: `"private": true`), so once the scope is refreshed: push, then
  fix the platform's repo field, which still points at `Ascendra.git` — a repository that does not exist —
  and add `BASIX.MARKET` as a collaborator. Pushing to a *public* repo would auto-deploy the 100 MB asset
  tree to the live production URL; that is why private came first.
- **Revoke the leaked `gho_…` token.** Still valid as of today.
- `ASI_CLOUD_KEY` into `studio/.env.local`, by the owner, never pasted into a file, a commit or a chat.

## Where we think we are going wrong, honestly

The risk is not the engine — it is the seam between *tested* and *seen*. Two-thirds of the score is
visibility (demo, docs, video) and the feature currently looks like nothing on the deployed URL. If the
preview build is clean, the next hour's highest-value work is one screenshot of `/omega/check` and one
terminal shot of the same transcript, because that pair *is* the pitch.
