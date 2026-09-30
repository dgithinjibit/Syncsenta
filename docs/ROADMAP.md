# Syncsenta Roadmap — the map

**Project**: Syncsenta — a CBC teaching and learning workspace for Kenyan schools
**Owner**: dgithinjibit
**Last updated**: 2026-09-29
**Supersedes**: [`docs/archive/ROADMAP-2026-09-24-superseded.md`](archive/ROADMAP-2026-09-24-superseded.md), which is kept as historical planning data and is **not** release evidence.
**Status of this file**: plan of record.

> **This document is the map, and it is binding.** Work that is not in this file is
> not scheduled. Work in this file that changes shape gets edited here first, in the
> same session, before the code moves. Every stage below is written so that someone
> picking the project up cold can answer three questions without asking anyone:
> *where are we*, *what is the next step*, and *what evidence would prove it*.

---

## 1. Where we are, on 2026-09-29

**We are at the end of Stage 0 (the gate): coded and locally green, not yet deployed. Stage 1's
three plumbing defects are fixed and tested, its fourth — the gamification DDL — is applied to
production and verified against the live catalog, and the code that was left standing on the wrong
side of that DDL now calls it: the mastery award goes through `award_points()` from `/api/chat`.
So Stage 1 is unapplied nowhere and unwritten nowhere. What Stage 1 still lacks is a deploy and a
learner-visible result: the points **are** on the learner's home page and on the subject header — read from
`profiles.total_points` and `point_transactions` (`src/lib/student/home-data.ts:179`,
`src/lib/chat/subject-session.ts:162`), both maintained by the applied DDL — but the code that *pays*
them is committed locally only, so on production today those surfaces honestly show what an unawarded ledger
holds. What has no surface at all is rank and the class board: `get_leaderboard()` exists and is granted to
`authenticated`, and nothing in `src` calls it (§3 Stage 1's open read task).**

**Added 2026-09-30, and it applies to everything above.** A full sweep of the research corpus against the
code found that the two engines Track 5 asks us to show have **never been executed by any runner**: the
Rust CI workflow is not on `origin/main` and 404s on GitHub, so `rust-core`'s 99 tests and the façade's 24
have not run anywhere, and production answers pedagogy from two TypeScript files. Read
[`docs/research/BASIX-FINAL-POSITION.md`](research/BASIX-FINAL-POSITION.md) for the evidence and the four
Tier C sentences in our own artefacts that describe work which does not exist, and
[`docs/BASIX-NORTH-STAR.md`](BASIX-NORTH-STAR.md) for the charter that stops it recurring — that file is
now pointed at from `AGENTS.md` and outranks prose here.

**Later the same day: the owner's security gate — items 1–4 of `docs/SCOPE-SECURITY-AND-OMEGA.md` — is
closed, with every one of its four criteria backed by a guard suite that was checked red first. Five
commits, locally green (`tsc` exit 0, 686 tests passing), and deliberately not pushed: the day's Vercel
deploy was spent on PR #20. See the §1 block "Items 1–4 (the security gate) are closed on `main`
locally".**

Evidence for that sentence, run on this machine on 2026-09-29:

- `npx tsc --noEmit` → **exit 0, no diagnostics.** This is what proves the deletions were clean:
  the sign-up page, the sign-up form, the wallet button, the quick-login component and
  `/login/student` are gone, and no remaining module imports them or calls `signUp()`.
- `npx vitest run --no-file-parallelism` → **631 passed, 0 failed, 17 skipped** across 74 files
  (`VITEST_EXIT=0`). The suite is green end to end for the first time in this batch: the three
  failures that had been sitting in `schema-coverage.test.ts` were a stale snapshot, and Stage 1's
  re-baseline item closed it the same day. It is committed green, not deleted — and it was
  re-checked red by dropping in a call site for a `zzz_ghost_table`, so its greenness means
  something.
- The new `auth-role-routing` suite: **47 passed**, run on its own first and again inside the full
  suite.
- The new `points-award-on-mastery` suite: **13 passed**, and it was 13 failing first — checked red
  against `updateLearningProgress()` returning nothing, `awardCompetencyMastery` not existing, the
  dead writer still in `points-system.ts`, and `/api/chat` unwired. See Stage 1's code task.
- The gamification DDL, read back from production rather than asserted (2026-09-29, Supabase SQL
  editor against `tumikgwhrbvirpjswlzh`): catalog counts agree, an inserted ledger row of 10 moved
  `profiles.total_points` to 10, a direct `set total_points = 999999` still read 10,
  `get_leaderboard('school', <id>, 5, <learner>)` returned `rank 1 / 10 / is_requester true`,
  `award_points` as `authenticated` returned `42501 permission denied`, and after cleanup
  `ledger_rows = 0` with `0` profiles whose cache disagrees with the ledger. Full output in the
  migration file's V1–V7 block. Applying it also surfaced three defects that reading had missed —
  see Stage 1, defect 4.

A learner can, right now, on `https://sentastudio.vercel.app` (verified 2026-09-28 with curl against the deployed build):

- sign in through `/api/auth/demo-login?role=student` and land on `/student?demo=1`;
- be turned away from `/dashboard` and sent to their role home instead of getting the
  permanently blank page that used to sit there;
- get a real streamed tutor reply from `/api/chat`;
- get an honest `400 — no curriculum allocation` from `/api/generate/exam` rather than a `404`.

That is the whole verified surface. Everything else in this document is *written*, *tested*,
*deployed*, or *browser-verified* — those are four different claims and §5 keeps them apart.

**Pushed and merged 2026-09-29: PR #20 → `ef394e4` on `main`, production build `Ready`**
(`sentastudio-5q96rsz9l…`, 2 m build). The batch that had been held locally — 41 files, +3881 / −1747 —
is now on `sentastudio.vercel.app`. Read back from production with curl the same day, as
`student01`: `/api/auth/demo-login?role=student` → `200` → `/student?demo=1`; `/dashboard` → `307` →
`/student`; `POST /api/omega-claw/hint {hint_level:5}` → `200 {"hintLevel":4,"hint":"worked-example",
"hintMessage":"…"}`; `POST /api/omega-claw/progression {outcome:"correct"}` →
`200 {"nextAction":"celebrate-transfer",…,"unlocksTransfer":false}`; `{outcome:"maybe"}` → `400`; and
both endpoints anonymous → `401`, not the old `503`.

**Also 2026-09-29, Stage 3 is two bricks deep: the tree, and a proof that one learner is inside it.**
`aa81219` puts a canonical evidence tree in `studio/src/lib/attest/` — one class-term's learning evidence to
one Merkle root, with a golden fixture and tests pinning the serialization rules a third party would have to
reproduce without asking us anything. `73066f7` adds `buildInclusionProof` / `verifyInclusionProof` over the
same fold, so a party who already knows a learner's id can be shown that their row is in the anchored set
without being shown anybody else's. Both are the Stage 3 pieces that need no signing key, no table, no deploy
and no browser, which is why they are first and not last. Stage 3's remaining Phase 0 boxes (`sign.ts`,
`evidence_anchors`, `/api/verify/[anchorId]`, the consent gate) are open, and §10's new item asks what the
first anchor should commit to at all, because the table the research note names has no writer. The full
write-ups are §1's `aa81219` and `73066f7` subsections.

One of today's two full-suite failures was not this code's, and saying so took measurements: `3531e08` raises
the filesystem budgets of the two repo-walking guards that timed out under load. §9 carries both numbers.

CI's `install / typecheck / test / build` job is **red on `main` for a reason that is not this code**:
one suite, `production-readiness-regressions.test.ts`, dies with `Error: Node.js detected but native
WebSocket not found`, i.e. Supabase's `realtime-js` needing Node 22 while `studio-gates.yml` pins
Node 20 (72 other files passed, and the same suite is 631-green locally on Node 22). The fix is the
unpushed `ci-node22-pending` branch, blocked on the `workflow` scope in §7. Vercel built the same tree
on Node 22 in 2 minutes and is Ready, so the red is an environment mismatch, not a broken build.

| Commit | What it is |
|---|---|
| `62acc87` | this map, rewritten to cover the work actually in flight; the previous map archived; `docs/research/ASI-DAPP-PATH.md` added |
| `2a101a2` | Stage 1 defects 1–3 — transcript count, subject→competency resolution, Nairobi calendar days |
| `2be809e` + `fd97acb` | Stage 1 defect 4 — the ledger DDL, then its apply and the three defects running it found. **Production holds this** |
| `2916dd5` | Stage 0 — one gate: a signed-in visitor is never asked to sign in again; sign-up deleted |
| `4c03d69` | Stage 1's code task — the mastery award through `award_points()`, the dead writer deleted, `/api/chat` wired |
| `6f948b9` | Stage 1's re-baseline — `schema-coverage.test.ts` committed green for the first time |
| `363602e` | the learner home's stale points caveat, corrected |
| `3b61639` | this §1, written against the commits it describes |
| `ef394e4` | PR #20 merged to `main` — all of the above is production |
| `372089c` | S-1 — both print surfaces built with DOM calls; two `document.write`/`innerHTML` sinks closed |
| `e584ff4` | S-3 — `parseGradeLevel()` as the one way in, and the week divisor guarded |
| `f97dcc5` | S-4 — the phantom-memory engine deleted, `/api/mwalimu` authenticated and reading real tables |
| `a966b04` | S-2 — 14 identity-bearing ids on the CSPRNG, no non-CSPRNG branch |
| `66167fb` | S-4's tail — the last two bare `GradeLevel` casts, and the guard that keeps them gone |
| `cdf32cc` | the security gate written down — scope scoreboard ticked, this §1, §8 and §9 |
| `371c884` | O-1 — the challenge path renders the API's learner sentences; the local copies deleted |
| `d476c20` | O-2 — one canonical grade parser; the teacher module stops refusing `Grade-6` |
| `285bab0` | O-1 and O-2 written into the scoreboard and this §1 |
| `73347f5` | Rust engine, defect 1 + 2 — a query asks instead of asserting, and a `$` in a stored rule head matches |
| `d984a26` | Rust engine, defect 3 — the pack loads once, `activities_for()` exists, the transfer gate answers instead of raising |
| `2d857a5` | `GET /:grade/scope` now returns `{grade, scope, activities[]}` — the shape O-3's card needs |
| `2f37915` | `rust-gates.yml` (unpushed — no `workflow` scope) and `docs/architecture/decision-one-rule-voice.md`, the ADR that answers "can the frontend be Rust?" |
| `9f86916` | this §1, §5, §7, §8, §9 and the scoreboard, written against the four commits above |
| `bc61765` | O-4 — the blocked-topic boundary is on every request path, and refuses in the learner's own language |
| `37cfa98` | this §1's commit count, corrected to what `git rev-list` printed rather than what it used to print |
| `c117bef` | O-5 — the challenge path is a `learning_progress` row, graded by the server, and wired to the ledger |
| `81401f4` | this §1 subsection, §5's two new rows, §8's three decisions, §9's two gaps and the scoreboard's item 9 |
| `f1c409a` | the counts in that write-up, tied to the commands that printed them |
| `c71aa18` | a mastery transition can be reported only once, by the request that actually caused it |
| `9110da3` | the same guard on `daily_activity`, where a lost write deletes a message the learner really sent |
| `224d47a` | the third read-modify-write of the day — the columns that decide the next difficulty — folded into the guard |
| `fe44af9` | the scaffolding telemetry reports the pair the row holds, not the pair the request assumed |
| `6be90dd` | that write-up, and the §9 gap it closes restated as "truthful and still unread" |
| `aa81219` | **Stage 3 opens** — one class-term's evidence folds to one hash, reproducibly by someone else |
| `73066f7` | Stage 3's second brick — one learner's row can now be proved inside that hash, alone |
| `3531e08` | the two repo-walking guards get filesystem budgets measured on this laptop instead of guessed |
| `336a142` | that write-up: Stage 3 two bricks deep, §5's evidence row, §9's two re-runs |
| `5f9c963` | **new branch `feat/safe-data-retrieval`** — the redaction half of a surface that can read production rows safely |
| `74564c4` | that brick written up, plus §7's ninth blocker: the repository is public, so pushing is a disclosure decision |
| `caffc4e` | the count in those two sentences replaced by the guard set that was actually run |
| `2098ab8` | the retriever — an unpolicied table is never queried, and a dropped column never leaves the database |
| `4f41fda` | the retrieval ledger row, §9's missing adapter and §10's frontend fork |
| `4e7babb` | O-3's mechanical half — the TypeScript mirror grows the pack's `activities_for()` listing getter |

Working tree clean. As of `4e7babb`, on `feat/safe-data-retrieval`, `git rev-list --count origin/main..HEAD`
printed **41**: nine for the
security gate and O-1/O-2, four for the Rust engine slice, one for O-4, one for O-5, three for the three
read-modify-write races in the progress layer, one for the telemetry that was reporting the wrong pair, two
for the evidence tree and its inclusion proofs, one for the guard budgets, two for the safety-retrieval
bricks, and the rest are this map being brought up to date with them. Nothing here is pushed or deployed — see the
`workflow` scope in §7, the publish decision §7 now names, and the spent deploy cap below.
The number is stated as what the command
printed at a named commit rather than as a live total, because the next commit to this file changes it.

### The Rust slice, 2026-09-29 — three defects in the engine, found and fixed locally

The question was #22's: does the rule pack actually run? It did not, and the reason was not the missing
hyperon feature. Three defects, each found by executing the fallback engine's own source rather than
reading it (the local vehicle is a transcribed probe — `~/.cache/syncsenta-probe/run.sh` →
`CHECKS=31 FAILURES=0 PROBE_RESULT=PASS` — because `cargo` cannot link on this machine, see §9):

1. **A query was being asserted.** `MettaSpace::query()` handed the bare pattern to the evaluator, which
   treats anything that is not `(= …)` or `(! …)` as a fact to store and echoes it back. So
   `scope_for("Grade 6")` read the last token of its own question, matched `grade6`, found no scope rule
   that way, fell to the `$lower-grade` catch-all and answered **`blocked`**; `is_activity_allowed`
   refused every activity; and every learner request grew the space by one atom. Fixed by wrapping the
   pattern in `(! …)` — and by the two tests that could only pass after the wrap.
2. **A `$` in a stored rule head never matched.** `pattern_match()` honoured variable syntax only on the
   question side, but a rule head like `(= (omega-claw-scope-for $lower-grade) blocked)` arrives as the
   *stored* argument. Both catch-alls were therefore unanswerable, which is why the progression endpoint
   raised "Omega Claw rule returned no result" on `can_unlock_transfer(true, false)` — the common case —
   and only worked once a learner had already explained.
3. **The pack was re-asserted on every request.** All four handlers call `load()`; three calls produced
   **9** Grade-6 activity rows instead of 3 and 105 atoms. Fixed with a `OnceCell`, which keeps the
   existing behaviour that the pack is loaded lazily on first request (the routes build the rules through
   `OmegaClawRules::with_space()`, never by loading in `new()`).

Consequence worth stating plainly: the two pre-existing `#[tokio::test]`s in `omega_claw.rs` assert
`introductory`, and under defect 1 they **cannot ever have passed**. That is the mechanism behind this §5's
"0 of 35 statements have ever been executed" — not a missing test runner, an engine that answered
`blocked` to its own tests.

Added on top of the fixes: `activities_for()` (empty when the grade is `blocked`), the same function
carried out over HTTP as `{grade, scope, activities[]}` (O-3's blocker), `can_unlock_transfer()` resolving
by `any(== "yes")` so a failed pack load answers *locked* instead of erroring, and five new engine tests
including one that answers a learner 50 times and asserts the space did not grow.

`docs/architecture/decision-one-rule-voice.md` is the holistic document the owner asked for ("*I know I
will be asked these questions*") — the three copies of the rules and why the rejected options were
rejected, the frontend-in-Rust answer with the line counts behind it (246 `.tsx` files, 129,501 lines),
the hosting table (Render has no African region; Vercel cannot hold a long-lived Axum process), the CI
constraint the 64 `sqlx::query!` macros create, the keep-alive search results, and the six-step cut-over
checklist.

**What runs next is scoped in `docs/SCOPE-SECURITY-AND-OMEGA.md`** — a 10-item scoreboard the owner
dictated on 2026-09-29 ("*do not build a single new feature or touch the reasoning engine until your
codebase is hardened*", then "*code this omegaclaw to around 90%*"). Read as counts, not vibes:
`grep -c '^- \[x\]' docs/SCOPE-SECURITY-AND-OMEGA.md` → **7**, `grep -c '^- \[ \]'` → **3**. Items 1–4 are
the security gate and are **closed**; 5–6 (O-1, O-2) and 8 (O-4) are **closed**; 7 (O-3) and 9 (O-5) are
Omega Claw and still open — O-3 blocked on a decision recorded in §10 — and 10 (the MeTTa engine
actually executing the pack) cannot be ticked from this
machine, which is why 9/10 is the ceiling rather than a rounding choice. The file also records which of
the directive's five claims are still true on `main` today: the SSRF one is already closed and guarded
by a test, the randomness one is real but one file deeper, the XSS one is the worst item there, the
"format string injection" one is mis-described but has a real defect under it, and "PR #8 failed CodeQL"
is not true of current `main` — CodeQL is green and still misses the sink, so green is not evidence.

### O-4, the same day — six rules that gated nothing, and why the fix is a translator

`grep -rn isBlockedOmegaClawTopic studio/src` returned the mirror and its own tests, and nothing else. So
the pack's six `(omega-claw-blocked-topic …)` rows were documentation: a child asking "how do I start a
mining wallet to keep my coins safe" got an answer, because the matcher only recognises the canonical
identifiers (`wallet-custody`) and no child types those. `bc61765` adds
`src/lib/omega-agent/omega-claw-safety.ts` as the translation layer between what a learner writes and what
the pack declares, and puts it on **all five** paths that reach a provider: `/api/chat` and the four
`/api/generate/*` proxies.

Two decisions inside it are worth keeping, because they are the parts a future session would otherwise
"fix" and break:

- **Triggers are word sets that must all appear, not phrases.** Filler between the words is exactly what a
  child writes ("start a mining wallet to keep my coins"), while a bare word ("wallet", "invest", "hack")
  would refuse the approved lesson — "what is a crypto wallet", "our class hackathon", "where does
  investment come from in Social Studies".
- **There is no allow-list, deliberately.** `responsible-digital-citizenship` and `ai-data-literacy` are
  activity rows in the *same pack*, so refusing "personal data" outright would refuse the curriculum the
  boundary exists to protect. The triggers encode the thing the pack actually blocks — *eliciting or acting
  on* data ("their phone number", "my … wallet", "without permission") — and four tests pin the
  false-positive cases that reasoning depends on: a Grade 4 question about a phone number's digits, a
  password-safety lesson and a school hackathon all stay in scope.

The learner sees a refusal as an **answer**, streamed through the same SSE contract the tutor pane already
reads (`refusalEventStream()`, and its tests read it back through the real `consumeTutorStream()`), because
a `Response.json({ error })` renders as "the tutor could not answer right now" — the same words an outage
produces. It sits before the session row, the transcript write and the quota read: the blocked text leaves
no trace and costs no tokens. A teacher gets a `400` that names the rule, the words that tripped and the
approved alternative, because a teacher is the one person who can argue with a boundary.

Evidence: 29 new tests, RED at 13 failed then at 6 failed before the code landed. `npx tsc --noEmit` →
**exit 0**. Full suite → **747 passed / 0 failed / 17 skipped** across 86 files. One unrelated fix in the
same commit: `schema-coverage`'s four-tree walk measured 7.2 s on this laptop and died on vitest's 5 s
default, so it now declares 20 s — assertion unchanged, and the file passes alone.

What is *not* proven: this has never been deployed, so no real learner request has met it, and the guard
tests assert source ordering (`the detect call sits before the first provider marker in each route file`)
rather than running the route. Both are listed in §9.

### O-5, the same day — the path is a row now, and the award is wired but has never fired

`bc61765` closed the boundary; the scoreboard's item 9 was the last Omega Claw code task: *"progress
persists and pays"*. Three facts made it worse than a missing `INSERT`:

- `completed` was `useState<string[]>([])` in the card, so a refresh, a second device or tomorrow's
  Chromebook started every learner at node 1. `learning_progress` — a row per learner per competency
  since the schema was written — had no challenge rows at all, and no table for them existed.
- The node list lived inside the component, so there was nowhere for an endpoint to check an answer
  against.
- Correctness was the browser's claim: `/api/omega-claw/progression` accepted `{ correct: true }` and
  believed it. Harmless while nothing was earned; not harmless the moment the path touches the ledger.

**What `c117bef` does.** `lib/omega-agent/omega-claw-challenge.ts` becomes the only copy of the node
list and the only place an answer is graded; `GET`/`POST /api/omega-claw/challenge` sit behind
`auth.getUser()`, take the grade from `profiles` (a body claiming `Grade 12` cannot file a Grade 6
learner's rows where nobody looking for them will find them), write the row with the caller's own client
so `learning_progress`'s owner policies apply, and reach for the service client only at
`award_points()`. The card reads its saved path on mount and posts every attempt. Rows are keyed
`omega-claw:<node id>`; the prefix is what lets the read get the path back without pulling in the
competencies the tutor writes, and it cannot collide with a curriculum code, which are of the form
`M8-ALG.1`.

**"And pays" is where the honest number lives.** The award follows
`calculateMasteryLevel()` — 20 answered questions at 90%+ — and the path has 3 nodes, so a learner who
answers all three correctly sits at 3. **0 of 3 nodes can reach the 50-point transition as the path is
today**, and that is measured, not estimated: the transition branch is proven to fire by a test that
seeds a row at 20 answers and watches `award_points` land on the service client and nowhere else. What
was built is the wire, not the payment. The fix for the length is O-3 — nodes come from the pack's 13
`activity` rows — not a second, lower award rule, which would be the map's own "two voices" mistake in
the one place it pays children.

Evidence: 20 new tests, RED at 16 failed / 4 passed against a stub. `npx tsc --noEmit` → **exit 0**.
`npx vitest run --no-file-parallelism` → **767 passed / 0 failed / 17 skipped** across 87 files.

One test-infrastructure finding worth keeping: both new fakes initially mutated the row object a
previous `select()` had handed back. `updateLearningProgress()` compares the level it just wrote
against the row it read, so an in-place mutation made the mastery transition invisible *in the test*
while the production code was right. PostgREST returns JSON; the fakes now replace rows instead. If a
future fake of that client mutates in place, it will fail the same way and hide the same class of bug.

What is *not* proven: nothing here is deployed, so no real session has written a row, which means the
RLS admission question is open in exactly the way §9 already records for `/api/mwalimu` — the write is
proven against a fake that speaks the query shapes, not against the database that owns the policies.

### `c71aa18`, the same day — the double-pay that O-5 made worth fixing

O-5 attached the challenge path to the points ledger, and the line the ledger inherits is
`updateLearningProgress()`. Reading that function for a different reason turned up a defect that has been
live since Stage 1's award was wired, in the plainest possible way: it selects a row, adds to the
counters in JavaScript, and writes the totals back with **no condition on the `UPDATE`**. Two requests
for one competency — a learner double-tapping an answer, a tutor turn and a challenge answer landing in
the same second, a client retrying a slow stream — both read `proficient` at 19 answers, both compute
the crossing, both write, and **both report `masteryJustAchieved: true`**. The learner is paid 50 points
twice and gets two `competency_mastered` badges for one achievement, and one of the two answers is lost
outright because the second write files totals derived from a row that no longer exists. The doc comment
on `ProgressUpdateResult` had been asserting the opposite since it was written.

Fixed with an optimistic lock rather than new DDL: the `UPDATE` now carries the four columns the
arithmetic read plus `mastery_level`, so PostgREST lands it only while those still hold and answers
`data: []` when they do not. A writer whose numbers went stale re-reads and recomputes — up to three
attempts, then it raises `learning_progress for <code> changed under every attempt; nothing was written`
instead of looping against a writer that never stops. The badge and the points hang off the same
returned boolean, so the loser can award neither. Two behaviours are deliberately preserved: `data: null`
still counts as landed (that is what a client which does not report matched rows returns, including every
injected double in this repo), and a read error still falls through to the insert branch rather than
throwing, which is what it did before the guard existed.

Evidence: 8 tests in `progress-transition-race.test.ts`, **RED at 5 failed / 3 passed** — the three that
passed on the old code are exactly the shapes this change must not disturb (an uncontested write, a row
already `mastered`, a competency's first insert). `npx tsc --noEmit` → **exit 0**;
`npx vitest run --no-file-parallelism` → **775 passed / 0 failed / 17 skipped** across 88 files.

**What it does not fix, stated as a gap rather than a footnote.** `point_transactions` has no unique key
beyond its own `id`, and `mastered` is recomputed from scratch on every write, so a competency whose
accuracy later drops below 90% falls to `proficient` and is paid a second time when it re-crosses.
`mastered_at` is sticky, so the fact needed to refuse that already exists in the row, and the schema even
reserved a `correlation_id` column for idempotency — but nothing indexes either of them, so refusing needs
one more DDL statement on a live school database this machine has never been able to exercise against an
empty schema. That is §10's question, not a §5 claim.

### `9110da3`, the same day — the same race one table over, where the cost is a deleted action

`c71aa18` fixed the pattern, and the next function in the same file was still the pattern:
`updateDailyActivity()` reads today's `daily_activity` row, adds `messagesSent` / `sessionsStarted` /
`timeSpentMinutes` in JavaScript, and writes the totals back with no condition on the `UPDATE`. Two
requests in the same second both read `messages_sent: 4`, both write `5`, and the day ends one message
short. The window is narrower than the pattern suggests —
`grep -rn "updateDailyActivity(" src | grep -v __tests__` → one hit, `src/app/api/chat/route.ts:658` — so
the race this closes is two tutor requests from one learner: a double-send, a retry over a slow stream, or
the same child on two tabs. Nothing is paid twice here, which is why it is a quieter bug than the
double-pay; but §2's promise is that every number a teacher sees traces to a real learner action, and a
silently dropped action breaks that promise in the direction that is hardest to notice — the dashboard
under-reports a child's work.

The guard is the same shape: the `UPDATE` carries the three counters the arithmetic read — all `non-null`
`number` columns per `src/lib/supabase/types.ts:280-282` — plus `user_id` and `activity_date`, and a
writer whose numbers went stale re-reads and recomputes up to `MAX_TRANSITION_ATTEMPTS` (the constant
`c71aa18` introduced, now shared) before naming the conflict. `subjects_practiced` is deliberately *not*
a guard predicate: it is `string[] | null`, so matching on it would make a null-vs-`[]` difference reject
a write that should land; instead the union is re-derived from the fresh row on each attempt, which is
why the losing writer merges into `['Mathematics', 'English']` rather than overwriting it with its own
`['Mathematics', 'Agriculture']`. The insert branch is unchanged, including the pre-existing
`insertRes as any` — `grep -c 'as any\|: any' src/lib/progress/progress-tracking.ts` → **14** lines, all
of them older than today's work (this change removed three), and removing the rest is its own spoon, not
a rider on a race fix.

Evidence: 5 tests in `daily-activity-transition-race.test.ts`, **RED at 4 failed / 1 passed** against the
code as it was. The failures, verbatim enough to check: `expected 5 to be 7`; a stored patch of two keys
asserted against a five-key `toMatchObject`; `expected [ 'Mathematics', 'Agriculture' ] to deeply equal
[ 'Mathematics', 'English', …(1) ]`; and the source guard finding no `.eq('messages_sent'` in the
function body. The one that passed on the old code is the uncontested day, the shape this change must not
disturb.
`npx vitest run` on the two race files plus `points-award-on-mastery` → **26 passed**;
`npx tsc --noEmit` → **exit 0**; `npx vitest run --no-file-parallelism` → **780 passed / 17 skipped**
across **89 files** (`Test Files 89 passed | 1 skipped (90)` — the skipped file is the
`ai-metta-e2e` one that needs `cargo`, so 90 files exist and 89 ran).

**What it does not fix, and it is the same shape a third time.** *(Closed two commits later, by
`224d47a` below — kept here because the line numbers are as they stood at `9110da3`.)* `/api/chat` writes
the Omega signals to `learning_progress` on a second, unguarded write immediately after the guarded one:
`src/app/api/chat/route.ts:726-733`
updates `hints_used` and `consecutive_wrong` on `.eq('user_id').eq('competency_code')` alone — no guard
predicates, no `.select()` — and both values are derived from a row read at `:364`, before the answer was
even generated. Two concurrent turns therefore settle by arrival order: one turn's `consecutive_wrong`
increment can be replaced by the other's reset, which moves the difficulty the engine will pick next. It
is not points, and it cannot re-cross a mastery boundary, because the guarded counters are not in this
patch. Closing it properly means folding the signals into the guarded write (a delta and a reset flag, not
an absolute value, so a retry recomputes them from the fresh row) rather than bolting a second retry loop
onto a route handler. Recorded in §9 at the time, and taken as the next spoon — it is `224d47a` below.

### `224d47a`, the same day — the third read-modify-write, and why the fix is an intent not a number

The write described above was the last unguarded read-modify-write in the tutor's own row, and it is the
one that decides what the learner is asked next: `hints_used` and `consecutive_wrong` are the live Omega
signals, read back at `src/app/api/chat/route.ts:360` on every request to build the learning state. The
route computed both from that early read and wrote them in a second `UPDATE` conditioned only on
`user_id` and `competency_code`, so two concurrent turns settled by arrival order and whichever number
landed last became the difficulty the engine saw.

Fixed by moving the arithmetic to where the fresh row is, not by adding a second retry loop. The route now
passes **intents** — `hintsUsedAtLeast`, `consecutiveWrongDelta`, `resetConsecutiveWrong`
(`src/app/api/chat/route.ts:703-708`) — and `updateLearningProgress()` resolves them inside the same
guarded statement that carries the counters: `hints_used` becomes `max(row.hints_used, the claim)`, so a
client reporting fewer hints than the row holds cannot lower the record; `consecutive_wrong` becomes
`min(row.consecutive_wrong + delta, 10)` or `0`. The consequence that matters is the retry: a writer that
lost the row re-adds its delta to the streak the competing request just wrote (the test pins it as
`3 + 1 = 4`, not the `0 + 1 = 2` its stale read would have filed). `MAX_CONSECUTIVE_WRONG = 10` moved next
to the write that applies it, because a cap that lives in one caller is a property of that caller's
memory. Two greps carry the claim: `grep -rn "from('learning_progress')" src/app/api/chat/route.ts` →
**one** line (the read at `:360`), and `grep -rn "hints_used" src | grep -v __tests__` shows the column
assigned only at `src/lib/progress/progress-tracking.ts:117` and `:273` — everywhere else it is read
(`route.ts:465`, `:472`, `lib/chat/subject-session.ts:251`) or written to the separate
`omega_scaffolding_events` table (`lib/omega-agent/scaffolding-telemetry.ts:90`).

Evidence: 8 tests in `progress-omega-signal-write.test.ts`, **RED at 7 failed / 1 passed** — the one that
passed before the change is "writes neither column when a caller has no signals", the shape that keeps the
O-5 challenge path untouched. `npx tsc --noEmit` → **exit 0**; `npx vitest run --no-file-parallelism` →
**788 passed / 17 skipped** across **90 files** (`Test Files 90 passed | 1 skipped (91)`). One existing
test had to move with the code: `learner-activity-plumbing.test.ts` pinned the *removed* second write as
its evidence that the progress write was scoped to the derived competency, so it now asserts the same fact
at `.eq('competency_code', competencyCode)` inside `progress-tracking.ts`. That is a guard relocated, not
a guard dropped — the competency scoping is now a condition on the write rather than a WHERE clause nobody
checked.

**What it does not fix.** The scaffolding telemetry still reported `hintsUsed: newHintsUsed` and
`consecutiveWrong: contextRow?.consecutive_wrong ?? 0` (`route.ts:746-747`) — the turn's intent and the
pre-write value, not the stored pair. That is unchanged from before this commit, so
`omega_scaffolding_events` remained an analytics stream whose numbers describe the request, not the row —
and nothing reads it yet, which is why §9 keeps it as a latent gap rather than a live wrong number. The other thing nobody has
done yet, again: none of this has met a real database — the writes are proven against fakes that speak
PostgREST's `data: []` on a missed guard, and §9's standing gap about the real service key and RLS
admission is untouched by it. *(The first of those two is closed by `fe44af9` below; the second is still
open, and the line numbers above are as they stood at `224d47a`.)*

### `fe44af9`, the same day — the telemetry was reporting the request, so the write now reports the row

`224d47a` moved the arithmetic inside the guard and left the caller computing its own copy of the answer
for the analytics payload. Two consequences of that, both real. The observable one: `omega_scaffolding_events`
was fed `Math.max(body.hintsUsed, contextRow.hints_used)` and `contextRow.consecutive_wrong` — a browser's
claim and the value the row held *before the answer existed*, while the engine's next decision was being
made from the pair that had just landed. The structural one: the insert branch had a second hand-written
copy of the same three rules (`hints_used: hintsUsedAtLeast ?? 0`, `consecutive_wrong: min(delta ?? 0, 10)`,
`reset → 0`) sitting where the guard could never reach it, so a change to `omegaSignalPatch()` would leave
first writes behind.

Fixed by making the write tell the truth about itself. `ProgressUpdateResult` gains `hintsUsed` and
`consecutiveWrong`, resolved per attempt from the same `signalPatch` the guarded `UPDATE` carries, so the
writer that lost the race reports `3 + 1 = 4` rather than the `2` its stale read implied; a caller that sent
no signals is handed back what the row already holds. The insert branch calls the same `omegaSignalPatch()`
with `{ hints_used: 0, consecutive_wrong: 0 }` — which is why that helper now takes
`Pick<LearningProgress, 'hints_used' | 'consecutive_wrong'>` instead of a whole row: passing a fabricated
row would have needed an `as LearningProgress` cast, and the no-`any`/no-cast rule in `AGENTS.md` is
better served by narrowing the parameter than by lying about the argument. `/api/chat` reads
`progressResult.hintsUsed` / `progressResult.consecutiveWrong`, and `newHintsUsed` is deleted. The grep that
carried `224d47a`'s claim carries this one too: `grep -n "hints_used = \|consecutive_wrong = " src/lib/progress/progress-tracking.ts`
→ **three lines** (`:129`, `:133`, `:135`), all inside `omegaSignalPatch()`, which has exactly two call
sites — `:207` against the row the write is conditioned on and `:281` against zeros for the insert. One
derivation, reached from both branches.

Evidence: 5 more tests in the same file, under `describe('what the write returns')`, **all failing before
the change** (the file went 8 → 13): a claim of fewer hints than the row holds is reported as the row's
number, not the claim; the pair survives a retry as the value the losing writer added to; a caller with no
signals still gets the row back; a first write reports what it created. `npx tsc --noEmit` → **exit 0**;
`npx vitest run --no-file-parallelism` → **793 passed / 0 failed / 17 skipped** across **90 files**
(`Test Files 90 passed | 1 skipped (91)`), re-run fresh for this entry at 19:16 rather than quoted from the
commit.

**What it does not fix.** The rest of the scaffolding payload is still the pre-answer read: `attempts` and
`correctAttempts` come from `learningState`, built at `route.ts:468` from the row read at `:360` — before
this turn's answer was classified — so an event row describes the state the engine reasoned from rather than
the state the turn produced. That is arguably what a scaffolding-effectiveness table should hold, and it is
left alone deliberately rather than quietly redefined. The same pre-answer read still feeds the decision
itself at `route.ts:472`, where `hints_used: Math.max(dbHintsUsed, clientHintsUsed)` is recomputed for the
in-memory learning state; this turn's difficulty is therefore chosen from the stale row plus the client's
claim, which is unavoidable for a request already in flight and is what the next request reads correctly.
`omega_scaffolding_events` still has no reader in `src` (§9), so neither pair has ever been compared in a
dashboard. And the gap that has now survived four commits unchanged: none of it has met a real database or
a browser, so `next build` and the deploy remain other people's evidence.

### `aa81219`, the same day — Stage 3 opens with the part that needs no chain and no deploy

Everything before this section is Stage 0 and Stage 1. This is the first brick of Stage 3, chosen precisely
because it is the brick that does not need the owner's SQL editor, a deploy, or a browser: the canonical
evidence tree from `docs/research/ASI-DAPP-PATH.md` Phase 0, item 2. `studio/src/lib/attest/evidence-tree.ts`
turns one class-term's evidence rows into one hash, and the property that makes the hash worth publishing is
that **someone who does not trust us can reproduce it** — so the file is a serialization contract, and its
rules are asserted rather than described.

The contract, as pinned by 20 tests in
`studio/src/lib/attest/__tests__/evidence-tree.test.ts`:

1. `syncsenta-evidence-v1` commits to fifteen `learning_evidence` columns and ignores every other key, so a
   caller may hand over `SELECT *` rows. `created_at`, `event_id`, `reviewed_by` and `reviewed_at` are
   outside the version deliberately: a teacher reviewing evidence next term must not change the root that
   term was anchored under.
2. Keys are sorted by code point *at emit time*, not by object iteration order — ECMAScript iterates
   integer-like keys numerically, so a rubric keyed `"1"`, `"2"`, `"10"` would serialize in a different order
   from one keyed `"10"`, `"2"`, `"1"` if the implementation trusted `Object.keys` after sorting. The
   fixture carries exactly that rubric.
3. Absent and `null` are the same leaf, because PostgREST, the SQL editor and a CSV export disagree about
   which they emit.
4. `captured_at` is rendered `YYYY-MM-DDTHH:MM:SSZ`, so `+03:00` and `.000000` cannot fork the tree. Second
   precision is the deliberate cost; two rows differing only in microseconds still differ in `id`. A string
   that is not a moment throws instead of being hashed.
5. Leaves are ordered by lowercase canonical uuid; an id outside that form is refused, because an ordering
   rule a Python mirror sorts differently is not a public contract. Duplicate ids are refused: the order
   would be ambiguous.
6. The fold pairs hex sha256 digests, promotes an odd node rather than duplicating it, and binds the top node
   as `sha256("syncsenta-evidence-root-v1|<leafCount>|<top>")`, so the root states how many rows it stands
   for. An empty set throws — a predictable hash over nothing would read as a class-term that happened.

Two things were wrong before the code was, which is the part of red-green that is easy to skip: the
"whitespace-free" assertion tripped on a space inside a real learning outcome, and the "every committed field
changes the leaf" loop tripped the uuid guard by appending `-changed` to an id. Both were test bugs, and both
guards were correct.

Evidence: `npx vitest run src/lib/attest/__tests__/evidence-tree.test.ts` **RED 4 failed / 14 passed** at the
first pass (module unresolvable, then the four pins), **20 passed** after; `npx tsc --noEmit` → **exit 0**;
`npx vitest run --no-file-parallelism` → **813 passed / 0 failed / 17 skipped** across **91 files**
(`Test Files 91 passed | 1 skipped (92)`), up from 793 across 90.

**What it does not do.** It has never hashed a row that exists: `learning_evidence` is in the production
catalog (`supabase/live_schema_export/01_objects.sql:144`) and has **zero writers, zero readers and no
generated type in `studio/src`** — `grep -rn -i learning_evidence studio/src` returns **2** lines, and both of
them are the comments in this new module. So the source
of the first real anchor is an open question for the owner, and it is §10's new item, not a detail: either the
capture path gets built, or the anchor commits to the evidence the tutor actually produces today
(`learning_progress`, `daily_activity`, `chat_sessions`), which would be a different field set and a new
version string. The recorded root in the fixture is the implementation's own output, pinned once; what makes
it load-bearing is that the ordering, key-sort, null and time rules are each asserted independently, plus a
hand-worked reconstruction of the five-row fold that does not go through the loop. `sign.ts`, the
`evidence_anchors` migration and `/api/verify/[anchorId]` are still open below, and none of the four Stage 3
pieces has a key, a table, or a request behind it yet.

### `73066f7` + `3531e08`, the same evening — the proof, and two guards that needed measuring

`buildInclusionProof(records, evidenceId)` answers one question for one learner: *is this row inside the set
whose root we signed?* It has to answer it without handing over the rest of the class, which is what
`docs/research/ASI-DAPP-PATH.md` Phase 0 item 4 asks of `/api/verify/[anchorId]` — the party who already knows
a learner id gets a proof and learns nothing about the other children.

The design decision is that the proof is **produced by the fold, not described alongside it**. `aa81219` had
`computeEvidenceRoot` fold the tree internally; this pulls that fold into `parentLevel()` — one level up,
pairs hashed, an odd trailing node promoted — and both the root and the proof climb with it. So the path
cannot disagree with the root about what an odd level does, and a mirrored implementation in another language
has one rule to copy rather than two that happen to match today. A leaf that travelled alone up an odd-sized
level emits `{ promote: true }` instead of a copy of itself as its own sibling; the fixture's fifth row is
proved by `[{promote}, {promote}, {combine: n0123, side: 'left'}]`, which is the promote-odd rule seen from
inside a proof, and that is where a duplicated-last implementation shows up.

`verifyInclusionProof` re-folds from the steps alone and returns a boolean rather than throwing, for the same
reason the leaderboard RPC refuses instead of explaining: a verifier that distinguishes "wrong proof" from
"wrong shape" tells an attacker how close they are, and the route wants one yes/no answer either way.

**The gap the reviewer pass found was my own.** Re-reading the finished function — not the tests, the
function — `verifyInclusionProof` never looked at `proof.version`. The literal type says it cannot be
anything else, and the type checker then refused to let me *write* the forged object:

```
error TS2352: Conversion of type '{ version: "syncsenta-evidence-v2"; … }' to type 'InclusionProof'
may be a mistake because neither type sufficiently overlaps with the other.
```

That rejection is the finding, not an annoyance. The route receives this object from a stored anchor row or a
caller's POST, so whatever the type promises does not survive `JSON.parse`; a verifier that folded without
reading the name would have approved a `v2` proof under `v1`'s rules, which is precisely the drift the version
string exists to stop. Test written first, observed failing `expected true to be false`, then the check. The
file is at **29 tests**; `npx tsc --noEmit` → **exit 0**.

**`3531e08` is the other half of the evening, and it is about a measurement rather than a defect.** The full
serial run at 20:27 came back **819 passed / 2 failed / 17 skipped**, and both failures were
`Test timed out` — `grade-cast-guard`'s walk of every `.ts`/`.tsx` under `src` at 6.36 s against vitest's 5 s
default, and `schema-coverage`'s four-tree symlink walk at 29.3 s against the 20 s its own comment had
justified with a single 7.2 s observation. Run alone, the same two files take 0.49 s and 9.4 s, so the
assertions were never the problem: a filesystem budget set from one warm run was. Both guards walk the
repository, and `aa81219` put two more `.ts` files into the tree they walk, so the honest reading is that my
own work makes them marginally slower every day — the budgets are now 40 s and 60 s with the measured range
written down next to them, no assertion touched.

Evidence, fresh at 21:28: `npx vitest run --no-file-parallelism` → **822 passed / 0 failed / 17 skipped**
across **91 files** (`Test Files 91 passed | 1 skipped (92)`) in 52.69 s; `tsc --noEmit` **exit 0**; the
evidence-tree file alone is **29 passed**.

**What it does not do.** There is still no key, no table, no route: nothing has signed a root, nothing stores
one, and no HTTP request has ever asked for a proof. The proofs have never been built over rows that exist —
same gap as `aa81219`, and §10 item 8 is still the owner's to answer. And there has been no `next build` on
any of this, so the build claim for `73066f7` and `3531e08` is nobody's evidence yet; the day's deploy was
spent on PR #20.

### `5f9c963`, on `feat/safe-data-retrieval` — the map's most-repeated "no" is a retrieval problem

Ask why §5 says **no** so often in the "deployed" and "browser-verified" columns. It is not that the code is
untestable; it is that checking it means reading rows out of the production database, and the production
database holds children — names, guardian phone numbers, guardrail events, chat transcripts. A `SELECT *`
onto this screen is a dump that can honestly be stored nowhere, which is why the six dangling `.sql` symlinks
and the unread `supabase_production_schema.sql` have stayed unread for weeks. So the safety half of data
retrieval was built first, on its own branch, before anything queries anything.

`studio/src/lib/safe-retrieval/redact.ts` is a policy, not a client. A caller hands over a row and a table
policy and gets back only what the policy named. Three properties carry the safety, and all three are
fail-closed rather than fail-open:

- **A column the policy does not name is absent.** Not null, not `undefined` under its key, not passed
  through because it looked harmless. An allow-list whose default is inclusion is a deny-list wearing a
  costume, and the whole reason a live export has never been safe to keep here is that nobody enumerated
  what was in it.
- **A non-scalar value refuses the row.** `jsonb` is where a dump hides — a `portfolio` blob can carry an
  essay with a phone number in its body, and neither the policy author nor the reader would ever see the key
  it sat under. So the row raises `NonScalarRetrievedValueError` instead of quietly dropping the column,
  because a silent drop over unread content is exactly the thing that would let somebody call the output
  "redacted" in good faith.
- **Identifiers become salted, truncated digests.** A school roster is a few dozen guessable names, so an
  unsalted hash of `full_name` is the name itself in an encoding nobody bothered to decode. The salt arrives
  as a parameter, is refused below 16 characters, and is not in the file — which is the point: the secret
  that makes the token meaningless has to come from somewhere that is not this repository. The token is
  stable and type-tagged, so the same child is the same 16 hex characters across `learning_progress` and
  `point_transactions` and the join that answers "did the award land" is possible without either table
  naming her.

Evidence, fresh at 21:48: the new file alone → **8 passed / 0 failed** (red observed first as
`Cannot find module '../redact'`, 981 ms); `npx tsc --noEmit` → **exit 0** in 33.8 s. Then, at 21:55, the
eight tests that walk the repository — `auth-role-routing`, `grade-cast-guard`, `legacy-auth-surface`,
`mwalimu-no-phantom-memory`, `route-exports`, `schema-coverage`, `secure-id`, `student-chat-transport` — ran
together with the new module: **9 files, 144 passed / 0 failed** in 13.21 s. That is the set that could
plausibly object to two more `.ts` files under `src/`, and none did. The whole 92-file suite was not
re-run, because the laptop had 821 MB free at the time and the claim this commit makes does not need it.

**What it does not do.** There is no retriever yet — nothing calls Supabase, no table has a registered
policy, no route or script consumes this, and no live row has ever passed through it. The salt has no named
environment variable, which the retriever half has to decide (the `ATTEST_KEY` pattern in Stage 3 is the
nearest precedent). The full suite has not been re-run on this branch, because the laptop has ~1.1 GB free
and one file's assertions plus a clean typecheck is what this commit actually claims. And the lint gate is
unverified: `npx eslint` fails here with `Cannot find package 'eslint'`, so nothing in this commit has been
seen by the repo's own ESLint config.

**Where the branch sits, and what pushing it would do.** It is based on `336a142`, the current `main`, so it
carries this map rather than diverging from it. The repository is **public**, which means
`git push -u origin feat/safe-data-retrieval` would publish every commit above `origin/main` — the whole of
§1's table — including every paragraph above
about who is blocked on what — and the range still contains `.github/workflows/rust-gates.yml`, so it needs
the `workflow` scope in §7 as well. Both are the account holder's call, so the branch is local and the work
is backed up nowhere; §7 item 9 names the two levers.

### `2098ab8`, the same night — the retriever, and the select list the policy writes

Redaction that happens after the rows arrive is a confession: the guardian phone number came over the wire,
sat in this process's memory, and was then thrown away by a function hoping nobody dumped the heap. So the
second brick decides what is ever asked for.

`retrieveTable({ select, table, policies, salt, limit })` refuses before it queries, and the ordering is the
design: no policy for the table → `UnpoliciedRetrievalError` and **the connection is never called** (a test
asserts the call log is empty, because "we would have redacted it" is not a defence for having fetched it).
Then the salt, so a missing secret aborts a query rather than a result set. Then the limit — `limit` is
refused above `MAX_RETRIEVAL_ROWS` (200) instead of silently clamped, because a caller that believed it was
reading 5,000 rows must not be handed 200 and left to average them. Only then is the select list built: the
policy's `keep` and `pseudonymize` columns, sorted, never `*` — so a `drop` rule removes a column from the
network rather than from the answer, and a schema change cannot turn into a disclosure without somebody
editing this file. A policy that drops everything it names is refused too, since an empty select list is a
mistake wearing the costume of a safety rule.

The connection arrives as a function, which is what makes all of that testable: the suite runs against a
double that records `(table, columns, limit)`. There is no Supabase adapter yet, deliberately — writing one
means deciding which credential reads which table, and that is a decision with §7's public-repository
problem attached to it.

Evidence, fresh at 22:00: `npx vitest run` over the directory → **17 passed** (9 new, red first as
`Cannot find module '../retrieve'`); the same eight repository-walking guards re-run with it → **10 files,
153 passed / 0 failed** in 13.32 s; `npx tsc --noEmit` → **exit 0** in 38.1 s. `redact.ts` gained
`assertRetrievalSalt` so both halves check one rule rather than two that happen to agree, and its eight
tests still pass unchanged.

**What it does not do.** Nothing calls `retrieveTable` yet, so no live row has been asked for; no real table
has a policy registered, so the registry is one test fixture; and the full 92-file suite still has not been
run on this branch. A caller that wants rows today has to write the `select` function itself, which is the
correct amount of friction for a surface whose whole job is to make the easy call the safe one.

### `4e7babb`, 2026-09-30 (committed 10:15 EAT) — O-3's mechanical half, taken without taking the fork

§10 item 3 has always been a fork, not a task: either the activity-listing card waits for the Rust cut-over
(a), or it is permitted to read one getter over the mirror's pinned `ACTIVITIES` rows (b). The last time this
was attempted it was reverted under the standing "No ts now, just rust" instruction. What changes the maths
now is the hackathon clock in §11: the card has to render a reasoning trail on camera by 21:29 EAT on
2 October, and (a) cannot be delivered here because the engine has never run under `cargo` (§10 item 10,
blocked on the `workflow` scope and a deploy).

So this commit builds the getter and deliberately wires nothing. `omegaClawActivitiesFor(grade)` mirrors
`OmegaClawRules::activities_for()`: a blocked scope returns the empty list, and otherwise the rows are
selected on the canonical **grade** symbol — which is why grade 10 gets its two activities and not
`senior-school`'s four, the mistake the Rust façade makes if it selects on scope. An unpinned grade never
falls back to the whole pack. If the owner answers (a), the card is written against the service and this
function is deleted with one caller to remove; if (b), it already has its tests.

Evidence, on the tree this commit landed on: `npx vitest run src/lib/__tests__/omega-claw-rules.test.ts --no-file-parallelism`
→ **31 passed**, exit 0, in **1.29 s**; `npx tsc --noEmit` → **exit 0, 0 errors**, in **4 m 49 s** with
**831 MB** peak resident set. That tsc run is the one this session's earlier attempt never got a result from,
so the getter's typecheck was unverified until now — the wall time tripling from the 38 s recorded above is
the laptop being busy, not the change. Four new tests, each red first: the listing is derived from the pack
file rather than a hand-typed table, `grade4` is empty, `'Grade-6'` and `'grade 6'` fold to the same rows,
and the listing agrees with `isOmegaClawActivityAllowed` for every row it returns.

**What it does not do.** Nothing calls it. The drift lock is what makes this cheap — the test parses
`omega_claw_rules.metta` and requires the TypeScript table to agree, so a listing that drifted from the pack
would be red, not merely wrong.

### Items 1–4 (the security gate) are closed on `main` locally, 2026-09-29

Five commits, listed in §1's table: `372089c` S-1, `e584ff4` S-3, `f97dcc5` S-4, `a966b04` S-2,
`66167fb` S-4's tail. S-2 lands after S-4 deliberately — its tripwire walks all of `src/` for
`Math.random().toString(`, and the phantom-memory engine S-4 deletes was the last server-side id built
that way, so the guard ships with no exclusions.

- `npx tsc --noEmit` → **exit 0** on the final tree.
- `npx vitest run --no-file-parallelism` → **686 passed, 0 failed, 17 skipped** across 81 files
  (80 passed, 1 skipped — the MeTTa e2e file, which needs a running engine). `VITEST_EXIT=0`.
- The gate's four "green means" criteria each have a named guard suite behind them now, and each of
  those suites was checked red before the code landed: `scheme-print-is-not-an-html-sink` +
  `lesson-plan-print-is-not-an-html-sink`, `secure-id`, `grade-cast-guard` + `grade-level.test`,
  `mwalimu-no-phantom-memory`.

What a teacher or a learner would notice, once this is deployed: an anonymous `POST /api/mwalimu` now
returns `401` instead of answering as a fabricated child called "user1"; a learner's name is never
invented (`studentName: null` plus `hasRecordedName: false`); and a second tutor request in the same
session sees the first one's transcript, because the state lives in `chat_sessions`,
`chat_messages`, `learning_progress`, `daily_activity` and `profiles` rather than in a `Map` that a cold
start erased.

**Not done: this is committed, not pushed, not deployed, not browser-verified.** One Vercel deploy was
already spent today on PR #20 and the cap is daily, so the push is one batch — which also means none of
it says anything yet about `sentastudio.vercel.app`.

Both test files were committed once green — see Stage 1's re-baseline item. The rule that kept
`schema-coverage.test.ts` out of the tree for a day was that a committed red test only teaches
people to ignore red; it is no longer red.

### Items 5–6 (O-1, O-2) are closed on `main` locally, 2026-09-29

`371c884` and `d476c20`. With the gate closed, Omega Claw work is allowed again, and these two are the
cheap halves of it: the learner-facing copy and the grade test that decides who sees the card.

- `npx tsc --noEmit` → **exit 0**; `npx vitest run --no-file-parallelism` → **714 passed, 0 failed,
  17 skipped** across 83 files (+1 skipped). `VITEST_EXIT=0`. That is 686 + O-1's 11 + O-2's 17, which
  is the arithmetic check on the two commits being the only thing that moved.
- **O-1** — the card printed `Guided hint 2: isolate-step`, the raw MeTTa symbol, while the same response
  carried `hintMessage: "Find the one step you are unsure about…"` (both verified against production).
  Now `lib/omega-claw-copy.ts` renders the server's sentences and the five hardcoded strings are deleted,
  so learner copy exists in one place and it is the place the rules were tested against.
- **O-2** — the card's own `isOmegaClawGrade()` stripped whitespace only, so a `Grade-6` profile got
  `null`; it now calls `showsOmegaClawPath()`, defined as `omegaClawScopeFor(grade) !== 'blocked'`, so
  `SCOPE_BY_GRADE` in the pack mirror is the only place grade membership is decided. A test asserts the
  equivalence instead of a list of expected booleans, so a future edit that re-forks the logic fails.

A second canonicaliser the scope had not named, found by grepping for the bug's shape rather than its
location: `src/curriculum/omega-claw-ai-blockchain.ts` kept its own grade list, so a **teacher** opening a
Grade-6 class was told the grade was out of scope. It delegates to the mirror now. Its
`SENIOR_BAND_LABELS = ["s1","s2","s3"]` widening is recorded in §8 as an input to task #22 — the Rust
service does not accept band labels today, so "one voice" has to decide whether it inherits this or those
classes break.

**Same caveat as above: committed, not pushed, not deployed, not browser-verified.**

---

## 2. The order of work, and why this order

| # | Stage | One-line goal | Why it sits here | Exit evidence |
|---|---|---|---|---|
| **0** | **The gate** | Land a signed-in person on their role dashboard with no re-pressing; four demo roles, no sign-up flow | Owner's call 2026-09-29: *"if one can't pass through the gate, how will they know how good a compound is?"* Every other stage is unreachable behind it | Browser-verified as all four roles on production, from a cold browser and from a returning session |
| **1** | **Truth in the learner data** | Every number the app shows about a learner must come from what the learner actually did | The first real production usage data (2026-09-28) exposed three plumbing defects and one missing surface; analytics built on those numbers would be fiction | Migration applied and verified in the live catalog; defects covered by tests; a live learner row proves each write lands |
| **2** | **Phase 2 analytics** | Teachers and heads see evidence from the real memory layer, not placeholders | Depends on Stage 1: the same charts reading broken counters stay broken | Each panel reads a live table on production and is browser-verified |
| **3** | **Verifiable evidence + ASI** | A class-term Merkle root, signed and anchored, so the platform cannot silently rewrite a cohort's history | Owner signed up for an ASI hackathon: this moved from research to an implementation track. Chain leg stays swappable; the off-chain half is valuable with or without a chain | `/api/verify/[anchorId]` returns a reproducible proof; golden-file tree fixture re-hashes to the recorded root; a devnet transaction exists |
| **4** | **One backend voice (Rust)** | Rust becomes the single place policy, tenancy and data contracts are enforced | Owner's rule 2026-09-29: Python validates things TypeScript does not, so there are two answers to the same question; Omega Claw is already merging in Rust. **Multi-tenancy must not be built on two voices** | Rust service deployed; parity suite green against the Python behaviour it replaces; the retired path is deleted, not dormant |
| **5** | **Phase 3: multi-tenancy + language** | Real schools, real classes, real languages, enforced in the database | Deliberately after Stage 4 (see above). Also after Stage 1, which already adds `school_id`/`classroom_id` to `profiles` | Cross-school reads return nothing under RLS; a learner can actually use Kiswahili or an indigenous language end to end |
| **—** | **Frozen during development** | Payments, M-Pesa, tokens, any value-bearing asset | Owner's rule: *"no cash should be as of now since we are in development"*; ASI agent-commerce is separately rejected in the Stage 3 study | n/a — the constraint is the point |

Two ordering tensions, stated rather than hidden:

1. **Stage 3 before Stage 4 means the anchor job gets ported to Rust later.** Accepted because
   the hackathon has a date and the Rust rewrite does not. Mitigation: the anchor's core is
   pure functions (`evidence-tree.ts`, canonical serialization, Ed25519) with no Next.js
   dependency, so the port moves logic rather than untangling it.
2. **Stage 1 adds columns (`school_id`, `classroom_id`) that Stage 5 will formalise.** Accepted:
   `profiles.school_name` free text is currently the *only* school grouping the app has, and the
   class-scoped leaderboard Stage 2 needs cannot be built on a string a learner can edit.

---

## 3. Stage detail

### Stage 0 — The gate

**Decisions that define it (owner, 2026-09-29):**
- *"we dont need any signups, just the four roles demo accounts"* — account creation is retired
  as a product surface. `student / teacher / parent / head` demo workspaces are the entry.
- Landing on `/` while holding a session must go straight to the role dashboard. No second press.
- The role is read from `profiles.role`. Nothing the browser says is a role.

**Work items**

- [x] `studio/src/lib/auth/role-home.ts` — one role→home map, with a caller-chosen fallback for a
      signed-in visitor whose role maps nowhere (`/auth/onboarding`, not `/login`, which is the
      form they just left).
- [x] `studio/src/lib/auth/redirect-target.ts` — one `?next` validator; `auth/callback` and
      `auth/onboarding` each had their own copy.
- [x] `studio/src/lib/auth/signed-in-destination.ts` — session → `next` → role home, in one place.
- [x] `studio/src/app/page.tsx` — now a server component: a session redirects, only visitors
      without one see the marketing page (`components/landing/landing-content.tsx`).
- [x] `/login`, `/signin` and `/auth/signin` — each forwards a visitor who already has a session,
      instead of showing a credentials form to someone who is signed in.
- [x] `components/auth/role-gate.tsx` — deleted its second, independent role→home map (it lacked
      `county_officer`, which is how a county officer got bounced to a page they could not leave).
- [x] `app/signup/page.tsx` — four nested icon cards became one bordered list; it now says plainly
      that opening a demo replaces the current session, and links back to your own workspace.
- [x] `components/auth/sign-in-form.tsx` — honours `?next` (middleware set it, the form dropped it);
      demo buttons no longer hardcode credentials in the client bundle.
- [x] **Delete the sign-up flow**: `app/auth/signup/page.tsx` and `components/auth/sign-up-form.tsx`
      are gone, along with `signUp()` in `hooks/use-auth.ts` (and its `ProfileSignup` /
      `ProfileInsert` types). Kept: the sign-in form — provisioned accounts (county officer, the
      hand-seeded test learners) sign in with a password and have no other way in. Kept:
      `api/auth/complete-profile`, which `auth/onboarding` uses to create the profile row for an
      account that already exists.
- [x] Cut `components/auth/wallet-auth-button.tsx` and `test-account-quick-login.tsx` (no importer;
      a MetaMask sign-in also contradicts "no wallets for children" in the Stage 3 study).
- [x] `app/login/student/` deleted; `/student/demo` re-pointed at `/signup`. It is the one remaining
      compatibility redirect, so an old bookmark lands on the picker instead of 404ing.
- [x] Dangling references repaired: `auth/error`, `schools/register`,
      `components/test/session-persistence-test.tsx` all pointed at `/auth/signup` or the retired
      emoji demo buttons. A repo-wide grep for the five deleted paths returns only a doc comment.
- [x] `middleware.ts` checked: its matcher and CSP never named a deleted route, so no edge
      behaviour depends on the sign-up flow existing.
- [x] `lib/__tests__/auth-role-routing.test.ts` — 47 tests: the role map (including the
      `county_officer` and `head`/`admin`/`school_head` spellings), the `?next` validator
      (`//evil`, `/\evil`, absolute URLs, the array form), and source contracts for `/`, the three
      sign-in pages, the form's `next` prop, `RoleGate` holding no second map, and the deleted
      sign-up surface staying deleted.

**Exit evidence**: ~~`npx tsc --noEmit` clean~~ **done, exit 0**; ~~the new `auth-role-routing` tests
green~~ **done, 47/47**. Still owed: cold browser → `/` → one click → workspace, for all four roles;
returning session → `/` → workspace with zero clicks. Both need one deploy, so they are the last thing
done to this batch, not the first.

### Stage 1 — Truth in the learner data

Defects found by putting the app in front of real learners (2026-09-28) and reading what the
database actually received.

- [x] **Defect 1** — `chat_sessions.message_count` never moved with the transcript. Now re-counted
      on write, and a failed count read leaves the stored number alone instead of blanking it.
- [x] **Defect 2** — a chat opened from a subject label wrote `competency_code = 'Mathematics'`, so
      progress rows could never match the registry's `MATH.*` codes. Label → competency now resolves
      through `generalCompetencyForSubjectLabel()` in `subject-session.ts`.
- [x] **Defect 3** — streaks and `daily_activity` used UTC days; Kenya is UTC+3, so every evening
      session was credited to the wrong calendar day. `lib/time/activity-date.ts` is the single
      source for "today", and `profiles.timezone` is honoured where a learner has one.
- [x] **Defect 4 — gamification and class scope** (owner approved applying it 2026-09-29, on the
      condition that the reason and the after-the-fact verification be written down; applied and
      verified the same day):
      `supabase/migrations_live/20260929000000_gamification_and_school_scope.sql`.
      - `point_transactions` append-only ledger + `profiles.total_points` cache, maintained by an
        `AFTER INSERT OR DELETE` trigger; a `BEFORE UPDATE` trigger makes `total_points` non-writable
        by the row owner, because `profiles_update_own` is permissive over the whole row and a learner
        could otherwise award themselves anything.
      - `profiles.school_id` / `classroom_id` FKs. **Leaderboard scope: class** (owner's call).
      - `get_leaderboard(...)` / `award_points(...)` as `SECURITY DEFINER`; the leaderboard returns
        only name + points. `getStudentRank()`'s cross-profile count cannot work under owner-only
        `SELECT`, which is why the RPC exists.
      - No backfill of `school_id` from `school_name`. Matching an aggregate by school *name* is how
        one school can read another's numbers; a null is honest, a guess is not.
      - **Applied**: one transaction through the Supabase SQL editor against `tumikgwhrbvirpjswlzh`,
        2026-09-29. Read back from `information_schema`, `pg_trigger`, `pg_policy`, `pg_proc.proacl`,
        `pg_description` and a real `get_leaderboard` call — counts, behaviour and ACLs in the file's
        VERIFICATION block, V1–V7.
      - **Three defects only executing it found.** Reading had caught two earlier (the guard
        reverting its own recompute; a client-callable award path). Applying and probing found:
        (a) Supabase's `ALTER DEFAULT PRIVILEGES` had granted EXECUTE on both new functions to
        `anon`, which `revoke … from public` does not undo — an anonymous caller with the
        publishable key could reach a security-definer writer on a child's points ledger;
        (b) `get_leaderboard`'s own-row branch scanned `profiles` directly, so it ignored the
        requested scope and did not check the id belonged to the caller — a learner could pass
        another learner's uuid and be shown their points; (c) the ledger trigger had no DELETE
        coverage, so the "cache" could sit at 10 over an empty ledger. All three fixed in place and
        re-verified; the fixes are written into the migration file, not just this paragraph.
      - **Why this needed production**: the machine has no `psql`, `docker` or `supabase` CLI, so
        there is no scratch Postgres to have found (a)–(c) in. That is the recorded reason for
        applying under the owner's condition, and the recorded answer to "why not test it first".
      - **Still open**: no classroom-scope functional test (production has 0 `school_classes` and 0
        profiles with a `classroom_id`, so the class board has no rows to rank — code-reviewed only).
        The "nothing in the app calls `award_points`" half of this was closed the same day by the
        code task below, and is **not deployed**, so the learner-visible surface is still zero.
- [x] **Code task opened by defect 4 — awards** (2026-09-29): `points-system.ts` no longer contains a
      client-side read-modify-write. It is now one export, `awardCompetencyMastery()`, which calls
      `rpc('award_points')`; `lib/supabase/types.ts` learned `award_points` and `get_leaderboard`;
      `updateLearningProgress()` returns `{ masteryJustAchieved, competencyCode }` from the same
      branch that awards the `competency_mastered` badge, and `/api/chat` pays the bonus on that
      signal with `supabaseAdmin` — the function is revoked for `authenticated`, so the route's
      user-scoped client would get `42501`. Dead reads deleted rather than rewired:
      `awardPointsForCorrectAnswer`, `awardMasteryBonus`, `awardSubjectMasteryBonus`,
      `getStudentRank`, `getClassLeaderboard`, `getSchoolLeaderboard`,
      `getWeeklyPointsBreakdown` — the module had **no importer anywhere in `src/`**, and per the
      owner's rule the leaderboard stays unbuilt until a component references it.
      Tested red-then-green by `points-award-on-mastery.test.ts` (13 tests).
      - Two boundaries worth knowing about, both recorded in the module header rather than left as
        surprises. There is **no default client** in `points-system.ts` on purpose — a browser cannot
        open the ledger, so a module singleton would be a promise the migration broke deliberately.
        And `point_transactions` has **no unique key** for "this competency already paid its mastery
        bonus", so two concurrent transitions of the same competency could both append; the award is
        issued on the transition branch, which makes it a race rather than a routine double-pay, and
        `p_correlation_id` is the hook for a real idempotency key when one is added.
      - First-write gap: `updateLearningProgress()` reports no transition on the *insert* branch,
        because that branch has never awarded the badge either. Reaching `mastered` on a learner's
        first progress row needs 20+ answers in one call, which no caller does today. Left as-is so
        points and badge cannot diverge; closing it needs a test against the badge path, not just
        the points path.
- [ ] **Code task opened by defect 4 — reads**: rank and class board through `get_leaderboard` with
      scope `classroom`. Blocked on the UI, not on the schema — `components/student/gamification-panel.tsx`
      exists, is unmounted, and takes `points` / `badges` props. Mounting it is a Stage 1 learner-
      visible task and needs one deploy to verify, so it is batched, not sprayed.
- [ ] **Deploy the award path**, then browser-verify a learner who crosses into mastered actually
      gains 50 points. `tsc --noEmit` and the unit suite are green locally on 2026-09-29; production
      knows nothing about this code until a deploy is spent.
- [x] Re-baselined `schema-coverage.test.ts` and **committed it green** (2026-09-29). It was 3 red on
      a stale snapshot; it now reads production as the 2026-09-28 capture **plus** the two migrations
      applied since, listed by name in `APPLIED_LIVE_MIGRATIONS` rather than globbed — an unapplied
      draft must not be able to widen "production" by being saved into `migrations_live/`. That
      union reaches **35**, and `information_schema` was read independently the same day at **35**,
      which is the cross-check the file now asserts.
      - Shipped code reaches 49 tables; **30 of them do not exist in production** and are named in
        the allowlist, down from 21 on the old (wrong) live set — `chat_sessions`,
        `learning_progress`, `chat_messages`, `daily_activity`, `achievements`, `api_usage`,
        `omega_scaffolding_events` and `point_transactions` came off it by being applied. The count
        went *up* because the previous list predated a decade of LMS/teacher/voice call sites it had
        never actually enumerated against a correct live set.
      - Also fixed: its `CREATE TABLE` regex was reading `AS` as a table name out of a string
        literal inside the baseline (`…command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', …)`), which
        is the arithmetic error behind "the file's own hardcoded count says 26 where the catalog says
        27". 93 tables are repo-defined, 72 never applied.
      - Still checked red on purpose, by dropping a file that queries `zzz_ghost_table` — two tests
        fail, deleting it restores seven green. A gate that cannot fail is not a gate.

### Stage 2 — Phase 2 analytics (from the real memory layer)

Build what the frontend already references; delete what nothing references. Owner's rule
2026-09-29: *"as long as its not usable lets cut the components, but if frontend has it, then we can
actually code it."* The cut-or-build list lives in §6.

- [ ] Teacher class overview: per-learner messages, sessions, streaks, weak competencies — from
      `chat_sessions`, `chat_messages`, `daily_activity`, `learning_progress`.
- [ ] Alerts surface (`alerts-panel.tsx`) — needs the `get_teacher_alerts` RPC, which does not exist.
- [ ] Student detail + quick actions (`student-detail-modal.tsx`, `quick-actions.tsx`) — mounted from
      `teacher-dashboard-new.tsx`, which itself is mounted by no page.
- [ ] Report export: `export-report` reads `teacher_students`, a table absent from production. It is
      either a real assignment source or the export is scoped to the class FKs Stage 1 adds.
- [ ] Head-of-school rollup across classes, scoped by `school_id` — not by name.
- [ ] `docs/CONTENT_READINESS.md` regenerated for whatever ships here.

### Stage 3 — Verifiable evidence, then the ASI leg

Full study: [`docs/research/ASI-DAPP-PATH.md`](research/ASI-DAPP-PATH.md). The owner accepted the
Merkle-root design and put it on the implementation track (hackathon registration is the reason).

**Phase 0 — verification without a chain (this is the part that must exist regardless)**
- [ ] `evidence_anchors` migration: `school_id`, `class_id`, `term_label`, `root_hash`,
      `canonicalization_version`, `attestation_signature`, `public_key_jwk`, `anchor_tx_ref` nullable.
- [x] `studio/src/lib/attest/evidence-tree.ts` — deterministic canonical serialization over one
      class-term's evidence, hashed to a Merkle root, with a golden-file fixture. `aa81219`, 2026-09-29:
      20 tests, written red first, contract rules enumerated in §1's `aa81219` subsection and in the file's
      own header. Two things it did **not** do, both recorded rather than smoothed: it has never hashed a real
      row (`learning_evidence` has no writer, reader or generated type — §10 asks which evidence the first
      anchor commits to), and the fixture's recorded root is this implementation's own output, corroborated by
      an independently hand-worked five-row fold rather than by a second language.
- [x] Per-learner inclusion proofs in the same module — `buildInclusionProof` / `verifyInclusionProof`,
      climbing the identical `parentLevel` fold, with an odd node carried as `{ promote: true }` rather than
      duplicated. `73066f7`, 2026-09-29: 29 tests in the file, the last one written red against a verifier
      that ignored `proof.version`. Still nothing behind it but a function — no route, no stored root.
- [ ] `studio/src/lib/attest/sign.ts` — Ed25519 via Node `crypto`; key from `ATTEST_KEY`; refuses to
      run silently if absent.
- [ ] `/api/verify/[anchorId]` — public, rate-limited: root, version, signature, key, per-learner
      inclusion proof for a party who already knows the learner id. Never enumerates children. The proof
      functions it needs now exist (`73066f7`); what is missing is the anchor row to read them from and the
      route itself.
- [ ] Anchor job gated on `learner_consents` — no anchor over a learner without a current consent row.
- [ ] "Verification" card on the parent report and teacher portfolio.

**Phase 1 — the devnet thin slice**
- [ ] `scripts/asi_anchor/` posts one root per class-term to ASI:Chain devnet through its public API;
      explorer URL flows into the Phase 0 verify endpoint. CI mocks the HTTP layer.

**Hard boundaries** (these are the reason the design is defensible, not decoration): no learner
record, no per-learner leaf published next to a school name, no wallet or key held by a child, no
token, nothing value-bearing. Anchor at class-term granularity or coarser.

### Stage 4 — One backend voice (Rust)

- [ ] Deploy `backend/syncsenta-backend` — today it runs nowhere; `/api/v1/:path*` rewrites to
      `localhost:8080` unless `MVP_BACKEND_URL` is set, which is why every `/api/v1` call failed
      silently on the deployed site.
- [ ] Move the `/api/v1` teacher surfaces from the Python service on Render onto the Rust routes.
- [ ] One contract for validation, tenancy and role checks — the reason this stage exists.
- [ ] Port the Stage 3 anchor job's pure functions, and the MeTTa rule pack (#37), rather than
      keeping parallel Python and TypeScript copies.
- [ ] Delete the retired Python path once parity is green. *One voice means one voice.*
- [ ] Prerequisite: the migration history must be authoritative first (#29) — Rust migrations and
      `migrations_live/` cannot both be true.

### Stage 5 — Phase 3: multi-tenancy and language

- [ ] Tenancy enforced in RLS on `school_id`/`classroom_id`; a head reads their school and nothing else.
- [ ] Invite/placement flow for teachers into a class (the `school_classes` +
      `teacher_student_assignments` tables already exist in the live baseline).
- [ ] Language: `language_preference` currently has a `CHECK` allowing only
      `english | kiswahili | mixed`, so Kikuyu or Luo cannot be stored at all. Widen the constraint,
      then make the tutor honour it end to end.
- [ ] Voice interaction, after the memory layer and Rust pipeline exist.

---

## 4. Rules of the map (standing constraints)

- **No cash.** Payments, M-Pesa, and anything value-bearing stay out during development.
- **Rust is the destination, so nothing that hardens a data contract gets built twice on purpose.**
- **Production schema changes are allowed** (owner, 2026-09-29) *on one condition*: the change must be
  verifiable afterwards from the live database, and the reason it was made must be recorded in this
  file. Anything that cannot be verified stays a prepared migration.
- **Vercel deployments are capped per day.** Batch work; earn one deploy; never redeploy to watch.
- **This machine has 3.7 GB RAM.** Check the memory cost of any install, build, or test run first.
  Long foreground commands and chained heavy jobs stall the session — one background job at a time.
- **No secrets in the tree, ever.** Scan every staged diff for `gsk_`, `AIza`, `ghp_`, `gho_`, `sk-`,
  32-hex, `eyJ…` JWTs, and email addresses before committing. Git identity is set per command, never
  via `git config`.
- **Verification before completion.** "Should pass" is not a result. Each claim in §5 names the
  command or the query that produced it.
- **A new Postgres function here is anon-reachable until `revoke … from anon` says otherwise.**
  Supabase's `ALTER DEFAULT PRIVILEGES` grants EXECUTE to `anon`, `authenticated` and `service_role`
  at create time; `revoke all … from public` does not touch those, because a default privilege is a
  grant to each role and not to the pseudo-role PUBLIC. Prove it from `pg_proc.proacl` after the
  migration, not from the text of the revoke. (Cost: defect 4's first application shipped
  `award_points` to anonymous callers.)
- **A security-definer RPC carries its own boundary.** RLS does not apply inside it, so any function
  that reads on behalf of a caller has to check the scope *and* that the id it was handed belongs to
  the caller — `auth.uid()` inside the body, not trust in the argument.
- **A denormalized cache must be maintained on both write directions.** A trigger on INSERT only is
  a second claim that drifts, not a cache. Read it back after a DELETE as well as after an INSERT.

---

## 5. Capability ledger — what "connected to live" actually means

Four separate columns, because collapsing them is how this project got into the position of
claiming dashboards that rendered blank. `?` = not established.

| Capability | Code | Tested | Deployed | Browser-verified on production |
|---|---|---|---|---|
| Sign in as a learner, teacher, parent, head | yes | yes | yes | **yes** (2026-09-28) |
| `/dashboard` blank-page fix | yes | yes | yes | yes (2026-09-28) |
| Landing page routes a session straight to the role dashboard | yes | yes — `auth-role-routing` (47) | **yes** (`ef394e4`) | no — the routes were curl-verified, the landing page itself has not been re-opened in a browser |
| Sign-up flow removed, four demo roles are the entry | yes | yes — deletion is locked | **yes** (`ef394e4`) | no |
| Student tutor (`/api/chat`) | yes | yes | yes | yes (real streamed reply) |
| Chat transcript + counters (Stage 1 defects 1–2) | yes | 16 tests pass | **yes** (`ef394e4`) | no |
| Nairobi-timezone activity days and streaks (defect 3) | yes | same suite | **yes** (`ef394e4`) | no |
| Points ledger, scope columns, leaderboard + award RPCs (defect 4, **schema**) | yes | **yes — against production**, V1–V7 in the migration file: catalog read-back, award recompute, column-guard no-op, real `get_leaderboard` call, `42501` for `authenticated`, cleanup re-read | live in the database (applied 2026-09-29) | n/a — no UI reads it yet |
| Points, mastery award in code (`awardCompetencyMastery` → `award_points`, `/api/chat`) | yes | yes — 13 tests, red-then-green; `tsc --noEmit` clean | **yes** (`ef394e4`) | **no** — nothing has earned 50 points yet; the ledger is live and still empty |
| Points, streak rewards, class leaderboard (**learner-visible**) | **partly** — a balance and a streak already render on `/student` (`app/student/page.tsx:215`, `:243`) reading `profiles.total_points` via `lib/student/home-data.ts:179`, and XP/level render on the subject header from `point_transactions` (`lib/chat/subject-session.ts:162`); what does not exist in any mounted component is a **rank or a class board** — `get_leaderboard()` has zero callers in `src`, and `gamification-panel.tsx` is unmounted | no | the reads are deployed (`ef394e4`), the awarding code is not | no — the balance is there but the ledger is empty, so it shows `0`/`—` and nobody has seen it move |
| Classroom-scoped leaderboard with real rows | code exists | **no** — production has 0 `school_classes` and 0 profiles carrying a `classroom_id`, so there is nothing to rank | live RPC | no |
| Teacher analytics from live tables | partial | no | no | no |
| `get_teacher_students` / `get_teacher_alerts` | called by code | — | **the RPCs do not exist** | no |
| **Omega Claw** — progression + hint rules over HTTP | yes | yes — 17 mirror + 12 route tests | **yes** | **yes** (2026-09-29, signed-in curl on production: clamping, action copy, `400` on unknown outcome, `401` anonymous) |
| **Omega Claw** — grade scope and activity-allowance rules | yes in the TS mirror and the Rust façade | yes — mirror is asserted against the parsed `.metta` file | **no** — the app exposes no route for either | no |
| **Omega Claw** — blocked-topic safety boundary (6 rules) | yes — `omega-claw-safety.ts` on `/api/chat` + all four `/api/generate/*` (`bc61765`) | yes — 29 tests, drift-locked to the pack's own rows | **not deployed**, so no live request has met it | no |
| **Omega Claw** — decision persistence (`omega_decisions`) | `lib/omega-agent/core.ts:403` inserts | no | **the table does not exist** in production or in any migration | no |
| **Omega Claw** — `/student` challenge path (the learner-facing card) | yes, mounted at `app/student/page.tsx:256` | source guards + 17 tests on the copy and grade layers it now delegates to (`omega-claw-copy`, `omega-claw-path`); no render test, because the suite runs in `node`, not jsdom | yes | **no** — SSR HTML is a `Loading your record…` shell by design, so rendering has not been seen in a browser |
| **Omega Claw** — the Rust service behind it | yes (`backend/syncsenta-backend`) | 7 `#[tokio::test]`s now exist; **none executed by `cargo`** — the engine's own logic was executed locally through a transcribed probe (§1, §9), and a `cargo`-running workflow is written but unpushed | **deployed nowhere** | no |
| Offline / PWA | service worker exists | never registered | — | **0% live** |
| Lesson generation (`/lesson-architect/*` on Render) | yes | yes | **not redeployed** | no |
| Rust `/api/v1` backend | yes | no | **deployed nowhere** | no |
| Evidence anchoring / Merkle verification (Stage 3) | yes — `attest/evidence-tree.ts`: canonical serialization, root, and per-learner inclusion proofs (`aa81219`, `73066f7`) | yes — 29 tests, red first, golden fixture | **no** — nothing has signed a root, no `evidence_anchors` table exists, no route serves a proof | no — and the rows it hashes are still invented: `learning_evidence` has no writer (§10 item 8) |
| **Safe data retrieval** — a policy decides what a retrieval may ask for and what a row may contain | yes — `lib/safe-retrieval/redact.ts` and `retrieve.ts`, on branch `feat/safe-data-retrieval` (`5f9c963`, `2098ab8`) | yes — 17 tests, each red first as `Cannot find module`, `tsc --noEmit` exit 0, the eight repository guards green with them | **no** — the branch is unpushed, and there is no connection adapter, route, script or registered table policy behind it | no — no live row has ever been asked for |
| Multi-tenancy, indigenous languages (Stage 5) | no | no | no | no |

### Omega Claw, measured 2026-09-29

"How much of Omega Claw is done?" has no single answer that is not a guess, so it is answered as
counts against named denominators, each with the command that produced it. Read from the tree on `main`
at `ef394e4` plus curl against production.

There are **four things called Omega**, which is the actual diagnosis:

1. **The Omega Claw rule pack** — `backend/syncsenta-backend/data/omega_claw_rules.metta`, 51 lines,
   **35 rule statements in 6 families** (grade scope 6, activity allowance 13, next-action 4, hint
   ladder 4, transfer gate 2, blocked topics 6). Counted with
   `grep -cE '^\(omega-claw|^\(=' data/omega_claw_rules.metta`.
2. **The Rust façade + service** — `src/metta_core/omega_claw.rs` (199 lines, loads the pack with
   `include_str!` into a MeTTa space) and `src/handlers/omega_claw.rs` (189 lines, **4 routes**:
   `/:grade/scope`, `/activity/check`, `/progression`, `/hint`). The real hyperon MeTTa runtime sits
   behind an off-by-default cargo feature (`default = []`, `metta = ["dep:hyperon"]`), so a plain build
   compiles the hand-written fallback parser in `interpreter.rs` instead. Deployed nowhere; no CI
   workflow runs `cargo`, so its 2 `#[tokio::test]`s have never been executed here either (740 MB free
   — an `axum`+`sqlx` workspace build is not attempted on this machine).
3. **The TypeScript mirror** — `studio/src/lib/omega-agent/omega-claw-rules.ts` (230 lines, the
   restatement of the pack's 35 statements, and the file the freeze decision is *about*) +
   `lib/omega-claw-api.ts` (272) + 3 routes + `omega-agent/omega-claw-challenge.ts` (227). This is what
   actually answers in production. Two of those three additions are deliberately outside the freeze:
   `omega-claw-safety.ts` (O-4) and `omega-claw-challenge.ts` (O-5) restate no rule from the pack — one
   translates a child's words into the pack's own blocked-topic ids, the other grades an answer and
   writes a row. Nothing new was added to the restatement itself; `omega-claw-rules.ts` is the same
   230 lines it was when the owner said *no ts now, just rust*. **The consequence to carry into
   cut-over:** `POST /api/omega-claw/challenge` has no Rust counterpart at all — the service's four
   routes are scope, activity-check, progression and hint — so when the mirror is cut, either the Rust
   service grows a persistence route or the path stops persisting. That is a Stage 4 item, listed in §10.
4. **Two unrelated things wearing the name**: `studio/src/lib/omega-agent/metta-core.ts`
   (`evaluateTutoringDecision()`, 857 lines, the scaffolding-intensity engine that `/api/chat` really
   calls — its thresholds are provably in sync with `rust-core/src/agent_runtime.rs`, measured by
   `node studio/scripts/check-omega-thresholds.mjs` → **exit 0, 3 of 3 thresholds match**), and the
   `/omega` page, a demo dashboard on `use-omega-agent.ts` whose Grade 2 activity picker is
   `Math.random()` and which pulls in `omega-agent/core.ts` — the module that inserts into the
   nonexistent `omega_decisions` table.

Percentages, each with its denominator:

| Question asked | Denominator | Measured | Command |
|---|---|---|---|
| Are the pack's rules mirrored in code the app runs? | 6 rule families | **6/6 = 100%** | `omega-claw-rules.test.ts` parses the `.metta` file and fails on disagreement — 17 tests pass |
| …of those, how many can a client ask the deployed app about? | 6 families | **3/6 = 50%** (next-action, hint, transfer) | `find studio/src/app/api/omega-claw -name route.ts` → 2 files; scope and activity have no route |
| …against the Rust service's own surface? | 4 Rust routes | **2/4 = 50%** | `grep '\.route(' handlers/omega_claw.rs` |
| Do the deployed answers match the pack? | 3 probes | **3/3** — clamping, action copy, unknown-outcome `400` | signed-in curl above |
| Is the safety boundary enforced on any request path? | 6 blocked topics | **6/6 = 100%** as of `bc61765` — and **0/6** for every hour before it | `grep -rln detectBlockedOmegaClawContent studio/src/app/api` → chat + all four `/api/generate/*`; the drift lock in `omega-claw-safety.test.ts` parses the pack and refuses a topic with no trigger |
| Is learner progress persisted? | 3 challenge nodes | **3/3 have a write path and a read-back as of `c117bef`** — one `learning_progress` row per node, keyed `omega-claw:<node id>`, read on mount; **0/3** for every hour before it | `find studio/src/app/api/omega-claw -name route.ts` → 3 files; `omega-claw-challenge-progress.test.ts` writes with one client and reads with a second call against the same rows |
| Does the path pay into the ledger? | 3 challenge nodes | **0/3** — the award follows `calculateMasteryLevel()` (20 answered at 90%+), and a 3-node path answered once each sits at 3. The wire is proven; the payment is not reachable yet | `grep -n 'questionsAnswered >= 20' studio/src/lib/progress/progress-tracking.ts` against `OMEGA_CLAW_CHALLENGE_NODES.length` → 3 |
| Is the Rust engine live? | 1 service | **0 deployed, 0 CI runs** — and as of 2026-09-29 it is no longer 0 *correct*: three defects that made it answer `blocked` to everything are fixed locally (`.github/workflows/rust-gates.yml` exists on disk but is unpushed, so no runner has executed `cargo`) | no `cargo` step pushed to `.github/workflows/` |

**Headline, stated as a denominator rather than a vibe: of the 35 rule statements in the pack, 35 are
mirrored in code the app runs, 10 are reachable over a deployed HTTP endpoint (the 4 next-action and 4
hint rows plus the 2 transfer rows; the 6 scope and 13 activity rows have a route only on the undeployed
Rust service), and the 6 blocked topics gated nothing until `bc61765` today — they now gate five request
paths, none of which is deployed yet. And 0 rules have ever been executed by the MeTTa runtime the project
claims.** What changed on 2026-09-29 is not the second number — it is the last one's
cause: the fallback engine was run locally for the first time and answered `blocked` to its own two tests
until three defects were fixed (§1). The learner-facing card renders 3 nodes that now live in one module
rather than inside the component, of which **1 of 3** (`ai-input-output`) is a legal Grade 6 activity in
the pack; `blockchain-consensus` is a Senior School row the pack would refuse for Grade 6, and
`explain-your-thinking` is not in the pack at all. What each of the 3 *does* now have is a
`learning_progress` row behind it (`c117bef`), which is the difference between a path and a quiz.

**Defects found here, and where each stands now** (each is a code task, none is a schema task):
- ~~`interactive-challenge-path.tsx:91` prints the raw symbol~~ — **closed by O-1, `371c884`**: the card
  renders `hintMessage` and `nextActionMessage`, and refuses to print `result.hint`.
- ~~the local copies of the action copy~~ — **closed by O-1, `371c884`**.
- ~~`isOmegaClawGrade()` strips only whitespace~~ — **closed by O-2, `d476c20`**: one canonical parser, and
  the teacher module stops refusing `Grade-6`.
- The Rust engine's three defects — **closed locally 2026-09-29** (`73347f5`, `d984a26`): a query asserted
  instead of asking, a `$` in a stored rule head never matched, and `load()` re-asserted the pack per
  request. Still unproven under `cargo` and still undeployed.
- **Still open** — the three node ids are not `(omega-claw-activity …)` rows, so the path a learner walks
  is not the path the rule pack approved. O-5 moved the list out of the component into
  `omega-claw-challenge.ts`, which means O-3 now has one place to replace rather than two, but the list
  is still three invented nodes. The Rust service can answer that question
  (`{grade, scope, activities[]}`, `2d857a5`), but production reads the frozen TypeScript mirror, which has
  no listing getter; see §10. *(Corrected 2026-09-30: the mirror now **does** have a listing getter,
  `omegaClawActivitiesFor()` in `4e7babb`. What remains true is that production reads it from a mirror rather
  than from the engine, and that nothing calls it yet.)*
- **Still open** — no scope/activity route *deployed*, so nothing in the running app can ask the question
  the pack mostly answers.

This block is the input to task #22 (which language Omega's rules live in) and #37 (mirror the checkable
pedagogy rules into the pack), and to the Stage 4 exit evidence. Until #22 lands, the pack is documentation
with a working TypeScript restatement, not an engine.

**Known measurement gap**: `Code Quality Metrics` in the archived roadmap claimed *"Linting Errors: 0 ✅"*.
That is unsupported. `studio/package.json` declares no `eslint`
dependency and none is installed, `studio/eslint.config.mjs` is an ESLint 9 flat config that
`next lint` on Next 14 does not read (so `npm run lint` hangs on an interactive prompt), and
`next.config.js` sets `eslint.ignoreDuringBuilds: true`, so the build never reports lint either.
Until that is fixed, this roadmap reports `?` for lint rather than `0`.

---

## 6. Cut or build — the unreachable inventory

Grepped 2026-09-29 against `studio/src`. "No importer" means no page or component references it.

| Thing | State | Decision |
|---|---|---|
| `components/auth/wallet-auth-button.tsx` | ~~no importer~~ **deleted 2026-09-29** | **cut** — MetaMask sign-in contradicts the gate and the no-wallets rule |
| `components/auth/test-account-quick-login.tsx` | ~~no importer~~ **deleted 2026-09-29** | **cut** — a second demo entry with its own hardcoded passwords |
| `app/auth/signup/page.tsx` + `sign-up-form.tsx` | ~~reachable, unwanted~~ **deleted 2026-09-29** | **cut** — "we dont need any signups" |
| `app/login/student/page.tsx` **deleted**; `app/student/demo/page.tsx` re-pointed at `/signup` | **done 2026-09-29** | **cut / re-point** — the duplicate is gone, the old bookmark still lands somewhere |
| `components/teacher/teacher-dashboard-new.tsx`, `student-list-view.tsx`, `phase2-teacher-dashboard.tsx` | no importer | **build** — they are the Stage 2 UI; mount them once their data exists |
| `alerts-panel.tsx`, `quick-actions.tsx`, `student-detail-modal.tsx` | imported only by the unmounted dashboards | **build** — each needs a real RPC or table, listed in Stage 2 |
| `lib/gamification/points-system.ts` — seven exported award/read functions, **no importer anywhere in `src/`** | ~~unreachable~~ **rewritten 2026-09-29** | **build** the award, **cut** the reads: `awardCompetencyMastery()` over `rpc('award_points')` is kept because `/api/chat` now calls it; `getStudentRank`, `getClassLeaderboard`, `getSchoolLeaderboard`, `getWeeklyPointsBreakdown` and the three client-side writers are deleted. Their replacement (`get_leaderboard`) is live in the database and waits on the unmounted `gamification-panel.tsx`, not on code |
| `lib/telemetry/*` | zero importers | decide in Stage 4: Rust owns the telemetry path, or it goes |
| `get_teacher_students`, `get_teacher_alerts` | called, do not exist | **build** as `SECURITY DEFINER` RPCs in Stage 2, or stop calling them |
| `school_learning_aggregates` matched by school **name** | live | **fix** in Stage 1/5 — name matching is a cross-school read vector |
| `export-report` claiming PDF | produces JSON/CSV | header corrected; PDF stays unclaimed until something renders it |

---

## 7. Blockers only the account holder can clear

Not engineering tasks — access. Each was re-checked as outstanding on 2026-09-28.

1. Revoke the leaked `gho_…` GitHub token at `github.com/settings/authorizations`.
2. `gh` lacks the `workflow` scope. **As of 2026-09-29 a device flow is live and waiting on the account
   holder**: `gh auth refresh -h github.com -s workflow` printed one-time code **`5D65-86DA`** and is
   blocking on the browser authorisation, which I did not click. Two things are unpushed because of it —
   `studio-gates.yml`'s Node 22 fix (local branch `ci-node22-pending`) and the new
   `.github/workflows/rust-gates.yml`. Until it lands, CI unit tests cannot pass on Node 20 and no runner
   executes `cargo`. The alternative is editing both files in GitHub's web UI.
3. A real `GEMINI_API_KEY` in the Vercel project: the provider chain has exactly one provider, so
   student chat has no fallback when it is down.
4. Render: `Ascendra-1` has not redeployed from this branch, so `/lesson-architect/*` is unmounted.
   Also needs `LLM_PROVIDER=groq` and a working key.
5. Netlify: the retired `syncsenta` site is still linked and fails three checks on every PR.
6. 144 open Dependabot findings.
7. `@syncsenta.dev` has no DNS, which is why the demo and test accounts are hand-seeded.
8. Revoke the test LLM keys when testing ends.
9. **Decide whether this repository stays public, and what gets pushed to it.** `dgithinjibit/Syncsenta` is
   public, and every branch here is cut from `main`, so a push publishes the whole map — which party is
   blocked on which credential, the demo accounts' hand-seeded state, the compose file's default
   `POSTGRES_PASSWORD`, and the fact that six committed `.sql` files are dangling absolute symlinks into a
   machine nobody has. None of it trips the secret scan (all ten patterns print `0`, and the range check for
   emails and `service_role` came back clean), so this is a disclosure judgement rather than a leak. Two
   levers: make the repository private, or push only branches cut from `origin/main` with the map's commits
   left out. Until one is chosen, the safety-retrieval branch and the last five evenings of work exist on one
   3.7 GB laptop and nowhere else.

---

## 8. Decision log

| Date | Decision | By | Consequence |
|---|---|---|---|
| 2026-09-26 | A capability is tracked as implemented / tested / deployed / browser-verified, never as one percentage | owner + agent | §5 exists; percentage claims retired |
| 2026-09-27 | Delete the Firebase-era cookie session rather than repair it | agent | `/dashboard` and the legacy shell read `profiles.role` only |
| 2026-09-28 | Apply the minimal live DDL; hand-seed learner accounts | owner | NULL GoTrue columns documented; test learners exist on `@syncsenta.dev` |
| 2026-09-28 | Work order: Laya PoC → verify studio gates → land the Grade 6 branch; **no cash work** | owner | Payments stay in "frozen" |
| 2026-09-28 | Rust is the primary backend and frontend for the next layer | owner | Stage 4 created |
| 2026-09-28 | Add Montessori, Waldorf and Reggio Emilia to Kumon and Suzuki; one blended registry, no schema change; hybrid reward posture | owner + agent | `docs/research/learning-approaches-montessori-waldorf-reggio.md`, commits `475e666`, `b8ec18b` |
| 2026-09-29 | **Apply the gamification DDL, class-scoped leaderboard** | owner | Stage 1 defect 4 unblocked, with the verification duty attached |
| 2026-09-29 | **Unreachable code: cut what is unusable, build what the frontend references** | owner | §6 is the authoritative list |
| 2026-09-29 | **ASI moves from research to implementation** (hackathon signed up) | owner | Stage 3 gains phases; date still unknown — see §10 |
| 2026-09-29 | **No sign-ups. Four demo roles are the entry.** | owner | Sign-up flow is cut in Stage 0 |
| 2026-09-29 | **Auth first — it is the gateway** | owner | Stage 0 before Stage 1 completion |
| 2026-09-29 | **Rust rewrite precedes multi-tenancy: one voice** | owner | Stage 4 before Stage 5 |
| 2026-09-29 | **Award only what the server already verified; pay points on the mastery transition, not on a single answer** | agent | Stage 1's code task. `updateLearningProgress()`'s transition is the one fact here that a learner cannot claim, and it already issues the badge, so points and badge read the same signal. Correct-answer, difficulty and streak awards stay unwritten until their inputs are decided |
| 2026-09-29 | Production schema may be changed when the change is verifiable afterwards and the reason is recorded here | owner | §4 rule; §3 Stage 1 verification duty |
| 2026-09-29 | **Gamification DDL applied to production and verified** (V1–V7 read back from the live catalog and a real `get_leaderboard` call) | owner's condition met by agent | Stage 1 defect 4's schema half is closed; the ledger is live and empty; the app still has to call it |
| 2026-09-29 | **Applying and probing found three defects reading had missed** — `anon` EXECUTE survived `revoke … from public` because Supabase's default privileges grant per role; `get_leaderboard`'s own-row branch ignored scope and caller identity; the ledger trigger had no DELETE coverage | agent | Fixed in place, re-verified, written into the migration file. Standing lesson in §4: on this project a new function is anon-reachable until `revoke … from anon` says otherwise |
| 2026-09-29 | Leaderboard's own-row lookup is caller-checked, not scope-free: a browser caller may only ever receive their row | agent | Any future RPC added here follows the same rule — the security-definer body carries the boundary, RLS cannot |
| 2026-09-29 | **"Omega Claw" is four things wearing one name** — the MeTTa pack, the undeployed Rust service, the TypeScript mirror that actually answers in production, and two unrelated engine-shaped modules (`metta-core.ts`'s tutoring decision, the `/omega` demo) | agent | Asked for a diagnosis and a percentage. §5's measured block is the answer; it is also the input to #22 and Stage 4's exit evidence. Until one voice is chosen, the pack is documentation with a working restatement, not an engine |
| 2026-09-29 | **`/api/*` is not behind the middleware auth wall, so every route that touches a learner self-authenticates with `auth.getUser()` and 401s otherwise.** `/api/mwalimu` took `userId` from the request body instead | agent | Closes an IDOR the directive had not named: any caller could name any learner. `/api/chat` already did this; the rule now covers both, and `sessionId` is server-assigned for the same reason |
| 2026-09-29 | Unusable code that duplicates a defect class is cut, not patched — `lib/personalized-learning.ts`, the `/api/test-personalization` harness, and `lib/quiz-trigger.ts` | agent | Applies the owner's 2026-09-29 cut rule to three modules with zero importers, each of which kept server state in a `Map` + `localStorage` pair. A guard test keeps each deletion from silently regrowing |
| 2026-09-29 | A percentage for this project must name its denominator and its command, or it is not reported | agent (from the owner's standing rule) | §8 already forbids a single progress %; §5's Omega table is what compliance looks like — 35 mirrored / 10 reachable over HTTP / 0 executed by MeTTa, each from a greppable count |
| 2026-09-29 | **Learner-facing wording comes from the API response, not the component** — `hintMessage` and `nextActionMessage` are rendered; the five hardcoded sentences and the `nextAction === '…'` comparisons are deleted | agent | O-1, commit `371c884`. The server's string is the one the rule pack's tests cover, so a component-local paraphrase can be green and still disagree with the engine. `hintFeedback()` also refuses to print `result.hint`, which is a MeTTa symbol (`isolate-step`), not a sentence |
| 2026-09-29 | **Omega Claw grade membership is decided in exactly one place: `SCOPE_BY_GRADE`.** Two local grade tests deleted; `s1`/`s2`/`s3` are accepted as a named superset in the teacher module | agent | O-2, commit `d476c20`. One card was returning `null` for a `Grade-6` profile the pack covers, and the teacher module was independently telling a teacher that Grade 6 was out of scope. Task #22 must rule on the band labels — the Rust service does not accept them today, so "one voice" inherits this widening or breaks those classes |
| 2026-09-29 | **A safety rule is not implemented until a request path asks it** — the boundary moves from `isBlockedOmegaClawTopic()` (0 callers) to a translator on all five provider paths | agent | O-4, commit `bc61765`. `/api/chat` refuses before the session row, the transcript write and the quota read; the four `/api/generate/*` proxies answer a `400` naming rule + trigger + alternative. Consequence for the next feature that touches a learner: the check goes before the provider, or it does not count as a check |
| 2026-09-29 | **No allow-list beside the blocked-topic triggers; the triggers are written so the approved lesson is not their target** | agent | Same commit. `responsible-digital-citizenship` and `ai-data-literacy` are rows in the same pack, so an allow-list would be a second voice deciding what the first means. Three tests pin the consequence: phone-number digits in a math question, "never share my password", and a class hackathon must all stay answerable |
| 2026-09-29 | **A refusal is streamed as an answer, not returned as an error** | agent | `refusalEventStream()` emits one delta + `[DONE]` with the same headers, and its tests read it through the real `consumeTutorStream()`. A `Response.json({ error })` would render as "the tutor could not answer right now" — indistinguishable from an outage, which teaches a child that asking breaks the app |
| 2026-09-29 | **CI runs the Rust tests**, against a Postgres service container, because 64 `sqlx::query!` macros cannot compile without a live schema | owner | `.github/workflows/rust-gates.yml` (unpushed, §7) runs migrations then `cargo test`. The same constraint blocks the first Render build unless `DATABASE_URL` exists before it — recorded in §1's ADR. Longer-term fix: `sqlx prepare --locked` and a committed `.sqlx/` |
| 2026-09-29 | **The TypeScript mirror is frozen, not extended; it is cut at cut-over, not patched** | owner ("*No ts now, just rust*") | O-1/O-2's canonical parser stays where it is, but no new capability is added to the mirror. Consequence: O-3's card cannot list approved activities until the Rust service answers in production, because the Rust route exists and the mirror has no listing getter — see §10 |
| 2026-09-29 | **The frontend stays Next.js; Rust decides, Next.js renders** | agent, answering the owner's "*can we have frontend as rust instead of next js?*" | Measured rather than felt: 246 `.tsx` files and 129,501 lines of `.ts`+`.tsx` would be rewritten, Vercel cannot host a long-lived Axum process, and an Axum+HTMX rebuild re-derives every bug fixed this week. What the owner actually wanted — one voice for the rules — is got by the API shape `{grade, scope, activities[]}`, not by a rewrite. Full argument in `docs/architecture/decision-one-rule-voice.md` |
| 2026-09-29 | **An engine that answers `blocked` to its own tests is a defect, not a design question** — fix the query/assert split before debating which language owns the rules | agent | §1's three Rust defects. The two pre-existing `#[tokio::test]`s assert `introductory` and so cannot ever have passed, which retires the "0 of 35 executed" line's implied excuse: the missing evidence was a working engine, not a missing runner |
| 2026-09-29 | **Challenge progress goes into `learning_progress`, not a new table** — one row per node under `omega-claw:<node id>` | agent | O-5, commit `c117bef`. No DDL, no §29 migration-history question opened, and the path reads through the same owner-policy table the tutor already writes. The cost: `mastered` for a challenge node means 20 answers, so a 3-node path cannot reach it — stated as 0/3 in §5 rather than hidden by inventing a second, lower threshold |
| 2026-09-29 | **The server grades the answer on any path that can reach the ledger** | agent | Same commit. `/api/omega-claw/progression` still accepts the client's `correct` because it only chooses wording; `/api/omega-claw/challenge` compares the submitted text against the node list it owns and ignores the claim. A rule pack that pays children cannot take "I was right" from the child |
| 2026-09-29 | **The mirror freeze is about the pack's restatement (`omega-claw-rules.ts`), not the app's HTTP layer** | agent, reading the owner's "*No ts now, just rust*" strictly | `omega-claw-rules.ts` is still 230 lines and untouched since `c69af07`, so O-4's safety module and O-5's persistence are not extensions of the mirror. Consequence the owner must rule on at cut-over: `POST /api/omega-claw/challenge` has **no Rust counterpart** — the service routes scope, activity-check, progression and hint only — so Rust must grow a persistence route or the path stops persisting. §10 |
| 2026-09-29 | **Guard the write in the application rather than add a ledger constraint, and say which half that leaves open** | agent | `c71aa18`. The double-pay is a read-modify-write with no condition on its `UPDATE`, and an optimistic lock on the four columns the arithmetic read fixes both the lost answer and the double transition without touching a live school schema — which this machine cannot test against an empty database (§9's own admission). The half it leaves: a `mastered` competency that dips below 90% and re-crosses is still paid twice, because refusing that needs an index on the ledger — `correlation_id` is already a column, and nothing uses it for uniqueness. §10 |
| 2026-09-29 | **Guard on the numbers the arithmetic read, never on a nullable array — and treat "the same bug is one function away" as part of the fix** | agent | `9110da3`. `daily_activity` got the same optimistic lock, but `subjects_practiced` is `string[] \| null`, so making it a guard predicate would let a `null`-vs-`[]` difference reject a write that should land; it is re-unioned from the fresh row on each attempt instead. The wider rule: after guarding one read-modify-write, grep the file for the shape rather than assuming the next function is different — that grep is what found this one, and §9's bullet is what it found next. |
| 2026-09-29 | **A guarded write reports what it wrote** — otherwise the caller keeps a private copy of the arithmetic and the analytics inherit it | agent | `fe44af9`. `224d47a` put the resolution in the guard but left `/api/chat` recomputing the pair for `omega_scaffolding_events`, so the table recorded a browser's claim and the pre-answer snapshot while the row held something else; `ProgressUpdateResult` now carries `hintsUsed` / `consecutiveWrong` out of the attempt that landed. Consequence for the next caller: read the result, do not re-derive it — and a helper whose rules must apply to an insert as well as an update takes the columns it reads (`Pick<…, 'hints_used' \| 'consecutive_wrong'>`), which is what let the insert pass zeros instead of casting a fake row. |
| 2026-09-29 | **The anchor commits to what the learner did, not to what a teacher later said about it** — review columns stay outside `syncsenta-evidence-v1` | agent, following the research note's own argument | `aa81219`. `reviewed_by` / `reviewed_at` / `created_at` / `event_id` are excluded so a review next term cannot move the root that term was anchored under; callers may still pass whole `SELECT *` rows, because keys outside the version are ignored. The version *is* the field set, so adding one means `v2` and a new golden fixture, not an edit |
| 2026-09-29 | **Where a public contract meets an ECMAScript quirk, refuse the input rather than normalise it quietly** | agent | Same commit: an evidence `id` that is not a lowercase canonical uuid throws instead of being sorted by whatever the host defaults to (a Python mirror would sort it differently); a `captured_at` that is not a moment throws instead of becoming a hash of a typo; an empty class-term throws instead of producing a predictable root. Sub-second precision *is* normalised away, and the asymmetry is written into the file header — the difference being that second-precision is stated as the rule, so a mirror can copy it |
| 2026-09-30 | **Submit from this repository, made private first — not from a new clean repo carved for the hackathon** | owner asked which; agent recommended, pending the owner's word | A carve-out costs days for no score: the glass box cannot be lifted out of a Next.js app that needs its Supabase session, curriculum registry and env to run, and `Syncsenta` has no plugin boundary to merge back into. Worse, 20% of the score is *documentation and build process*, and a fresh repo's one squashed commit shows none — these 43 commits, each with its red-first test evidence in the message, **are** that 20%. Flipping to private before pushing keeps the map (§7, §10, the hand-seeded accounts, the named default `POSTGRES_PASSWORD`) out of public history entirely, so the disclosure decision and the submission decision stop competing. Order matters and is in §11: **private → push → fix the `Ascendra` URL → add BASIX.MARKET as a collaborator.** |
| 2026-09-30 | **`docs/BASIX-NORTH-STAR.md` is the operating charter, and it outranks prose in this file** | owner ("*create a parahelp kind of meta prompting to be your north star*") | One sentence the product may say, three claim tiers (proven / recorded-unverified / in-our-docs-and-false), five filters a task passes before entering the plan, and the anti-pattern registry that chose the wrong wall. `AGENTS.md` now points at it at line 3 so every future session inherits it instead of re-deriving it |
| 2026-09-30 | **"Built on Omega" is retired. It was never true** | agent, after repo-wide + history search | `github.com/singnet/Omega` is a Python neural-symbolic **agent framework** (fork of `patham9/mettaclaw`, 1,311 commits, continuous execution loop, NAL + PLN libraries). Zero references to it in our code, docs, specs or commit messages; no NAL, no PLN, no continuous loop here. Hyperon is git-pinned and **feature-gated off** (`syncsenta-backend/Cargo.toml`: `default = []`, `metta = ["dep:hyperon"]`, CI comment "*NOT COVERED HERE*"). We use MeTTa syntax and our own engines. Evidence in `docs/research/BASIX-FINAL-POSITION.md` §3 |
| 2026-09-30 | **The 2026-09-29 decision "CI runs the Rust tests" is not in force, and no Rust test in this repository has ever executed** | agent, Tier A | `git ls-tree origin/main .github/workflows/` lists `fetch-bible-corpus.yml`, `omega-threshold-sync.yml`, `studio-gates.yml` only; `GET /actions/workflows/rust-gates.yml` returns **404**. So `rust-core`'s **99 `#[test]`s** (5,075 lines) and the façade's 24 have never run anywhere. This does not reverse the 2026-09-29 finding that the engine itself was broken — it says the fix is also unproven. Unblocking needs the `workflow` scope on the token, not more code: §7, §9 |
| 2026-09-30 | **The gap we claim narrows: tamper-evident agent records already have prior art** | agent | `docs/PAPERS-AND-POSITIONING.md` §6 asserted verifiable tutor records were unclaimed. They are not — [Agent Audit Trail](https://datatracker.ietf.org/doc/draft-sharif-agent-audit-trail/) (Raza Sharif, IETF **individual** draft, rev 06, updated 29 Sep 2026) specifies tamper-evident chained JSON agent logs for regulatory duties. What stays defensible: **child data, a named teacher as the verifier, and the override wired into the next turn**. My first correction guessed "June 2026" for the date; the fetch said September, and the document now carries the verified date and URL |
| 2026-09-30 | **Deviation from the mirror freeze needs the owner's ruling: `4e7babb` added `omegaClawActivitiesFor` to `omega-claw-rules.ts`** | agent, self-reported | The 2026-09-29 decision says the mirror is frozen, not extended. A listing getter was added to satisfy the frontend card because the Rust service has no activity-listing route; it has **zero importers** today. Either the owner accepts it as the pre-cut-over exception, or the getter is deleted and the card stops asking. Recorded, not quietly kept — §10 |

---

## 9. Standing verification gaps

Things that are *not* proven, restated so nobody (including a future session) has to guess:

- `next build` has never been run locally on this batch, and will not be: it is the heaviest thing on
  a 3.7 GB machine and Vercel runs it anyway on deploy. What was run 2026-09-29: `tsc --noEmit`
  **exit 0**, and `vitest run --no-file-parallelism` **631 passed / 0 failed / 17 skipped** across 74
  files — the first fully green suite in this batch, and Vercel's own build of the same tree went
  `Ready` in 2 minutes, so the build claim is now Vercel's evidence rather than nobody's.
  **Piping vitest through `tail` reports exit code 0 even when tests fail**, so read the output file —
  the run's own `VITEST_EXIT` line, not the shell's.
- The same two commands were re-run after the security gate landed: `tsc --noEmit` **exit 0**, suite
  **686 passed / 0 failed / 17 skipped** across 81 files. Re-run again after O-1 and O-2: **exit 0** and
  **714 passed / 0 failed / 17 skipped** across 83 files, which is the gate's 686 plus 28 tests that
  belong to those two commits and nothing else. Re-run a third time after O-4: `tsc --noEmit` **exit 0** and
  **747 passed / 0 failed / 17 skipped** across 86 files. Re-run a fourth time after O-5: `tsc --noEmit`
  **exit 0** and **767 passed / 0 failed / 17 skipped** across **87 files** (86 + the new
  `omega-claw-challenge-progress.test.ts`; the route tests went into the existing `omega-claw` directory).
  Re-run a fifth time after the ledger race: `tsc --noEmit` **exit 0** and **775 passed / 0 failed /
  17 skipped** across **88 files** (87 + `progress-transition-race.test.ts`).
  Re-run a sixth time after the `daily_activity` race: `tsc --noEmit` **exit 0** and **780 passed /
  0 failed / 17 skipped** across **89 files** (88 + `daily-activity-transition-race.test.ts`); the
  command's own line reads `Test Files 89 passed | 1 skipped (90)`, and the skipped file is
  `ai-metta-e2e.test.ts`, which needs `cargo` and is the reason the two numbers differ.
  Re-run a seventh time after the signal fold: `tsc --noEmit` **exit 0** and **788 passed / 0 failed /
  17 skipped** across **90 files** (`Test Files 90 passed | 1 skipped (91)` — 89 + the new
  `progress-omega-signal-write.test.ts`). `learner-activity-plumbing.test.ts` moved with the code it
  guards, so its count is unchanged.
  Re-run an eighth time for `fe44af9`, fresh at 19:16 rather than quoted from the commit: `tsc --noEmit`
  **exit 0** and **793 passed / 0 failed / 17 skipped** across **90 files**
  (`Test Files 90 passed | 1 skipped (91)`) — five tests added to the same file, no test file added or
  removed, which is what "the write reports what it wrote" should look like in these numbers.
  Re-run a ninth time for `aa81219`: `tsc --noEmit` **exit 0** and **813 passed / 0 failed / 17 skipped**
  across **91 files** (`Test Files 91 passed | 1 skipped (92)`) — one new file,
  `src/lib/attest/__tests__/evidence-tree.test.ts`, carrying 20 tests.
  Re-run a tenth time at 20:27, with the proofs in but the budgets not yet moved: **819 passed / 2 failed /
  17 skipped**, and both failures were `Test timed out` — `grade-cast-guard` at 6.36 s against vitest's 5 s
  default, `schema-coverage`'s symlink walk at 29.3 s against the 20 s its own comment had justified with a
  single 7.2 s measurement. Run alone the same two files take 0.49 s and 9.4 s. The 819 already included all
  26 of the evidence-tree tests then written, so nothing about the new module failed; what failed was a
  filesystem budget guessed from one warm run, which is `3531e08`.
  Re-run an eleventh time at 21:28 for `73066f7` and `3531e08`: `tsc --noEmit` **exit 0** and **822 passed /
  0 failed / 17 skipped** across **91 files** (`Test Files 91 passed | 1 skipped (92)`) in 52.69 s.
  That newest tree has had **no `next build` and no Vercel deploy**, because the day's deploy was spent on
  PR #20 — so for the commits since, the build claim is nobody's evidence yet, and §1's "committed, not
  deployed" is the accurate status.
- **`/api/omega-claw/challenge` has never touched the real database** — same shape of gap as
  `/api/mwalimu` three bullets down, and worth stating separately because this one writes. The 20 O-5
  tests drive
  `updateLearningProgress()` and the ledger against an injected fake that holds rows in memory. What the
  fake cannot answer: that `learning_progress`'s owner policy admits an `INSERT` from a
  cookie-backed route-handler client. `/api/chat` has been doing exactly that against production since
  Stage 1, but nobody has read the row back, so the closest evidence for this route is the same unproven
  path described there. Also unproven: that the insert branch's omitted columns
  (`first_attempted_at`, `practice_count`) really do carry production defaults.
  Closing it is one signed-in answer on the deployed build plus
  `select competency_code, questions_answered, correct_answers from learning_progress where user_id = '<demo learner>'`.
- **The component half of O-5 has never rendered.** The two claims the owner will check in a browser are
  "the ticked nodes survive a refresh" and "the server decides what counts as correct". Both are proven at
  the lib and route layer with an injected fake; neither is proven in the DOM. `interactive-challenge-path.tsx`
  has no test of its own — there is no `@testing-library/react` in this project and `vitest.config.ts` runs
  `environment: 'node'` — so its mount-time `readSavedPath()`, the `mounted` flag that guards a late
  response, and the `setCompleted(earned)` hand-off from the server's answer are all unwired to any
  assertion. The one guard that does exist is a source check: the card may no longer declare a node array
  itself. Closing the rest is one refresh on `/student` — and note which account can do it: the pack covers
  Grade 6, 10, 11 and 12 (`grep -n 'omega-claw-scope-for' backend/syncsenta-backend/data/omega_claw_rules.metta`
  → five rows plus a `blocked` catch-all), so `showsOmegaClawPath()` returns false for the Grade 8 and
  Grade 1 test learners. **Only the Grade 12 demo account can reach the card at all**, which is a content
  gap (the path has no junior coverage) as much as a verification one.
- **`/api/mwalimu` has never touched the real database.** S-4's 21 tests drive `readLearnerState()` and
  `recordTutorTurn()` through an injected fake client, which proves the query shapes and the arithmetic,
  not that production RLS admits them. The precedent that makes this a live risk rather than a formality:
  the browser singleton reaches PostgREST as `anon` from a route handler and `auth.uid() = user_id` rejects
  it, which is why the route takes `createSupabaseRouteHandlerClient()` — but the cookie-backed path with a
  real session, the `message_count` counter self-correcting against `chat_messages`, and the new `401`
  response have all only been seen locally. Closing it needs one signed-in tutor conversation on the
  deployed build and a read-back of the `chat_sessions` row.
- `schema-coverage.test.ts` is green and committed as of 2026-09-29, which changes what the gap means
  rather than removing it. **30 tables that shipped code queries do not exist in production** — every
  one is a runtime PostgREST "Could not find the table" error with a learner's name on it, and the
  teacher roster (`teacher_students`), the alert path (`student_alerts`), `omega_decisions`,
  `payment_transactions` and the whole `lms_*` cluster are in that list. What the gate still does not
  prove: the live set is *derived* from the 2026-09-28 capture plus a named list of applied
  migrations, not re-read from `information_schema` on each run, so it only stays honest if
  `APPLIED_LIVE_MIGRATIONS` is edited when a migration goes in. The independent cross-check that
  holds it truthful today is the 2026-09-29 read of **35 public tables**, against which the union was
  checked once. It is not wired to a live query, because this machine cannot reach the database
  except through a browser session.
- The gamification DDL is now executed and verified **against production**, which is not the same as
  having been tested: this machine has no `psql`, `pg_ctl`, `docker` or `supabase` CLI, so there was
  no scratch database to try it on first. That is why three defects came out of the apply rather than
  the review, and why §4 now records the default-privileges trap. The honest residual: the migration
  has still never been run against an empty database, so a fresh environment built from
  `migrations_live/` in order is unproven.
- **Classroom-scope leaderboard is unproven in production.** The RPC's `classroom` branch was
  code-reviewed and exercised only through the `school` branch, because `school_classes` has 0 rows
  and no profile carries a `classroom_id`. Stage 5's tenancy work is what puts rows there; until
  then the class board the owner asked for is verified as a query, not as a feature.
- **The points code is deployed and still unproven in the only way that matters.** It went to
  production with `ef394e4` on 2026-09-29, so the deployed `points-system.ts` is the ledger-backed one
  and the deployed `types.ts` does carry `award_points`. What has *not* happened is one real learner
  crossing into `mastered` and a `point_transactions` row appearing: the ledger still has 0 rows for
  every account, because the verification award from the DDL apply was cleaned up, and `/student`
  therefore renders `—` rather than a number. The 13 tests assert the wiring at the boundary of a fake
  client; they do not prove the real service key passes `42501`-free on the deployed function. The
  double-transition race is now closed at the writer and not in the ledger: `c71aa18` guards the `UPDATE`
  so two concurrent requests cannot both report the transition, but `point_transactions` still has no
  unique key beyond its own `id` (`sed -n '117,119p' supabase/migrations_live/20260929000000_gamification_and_school_scope.sql`
  → `id uuid primary key`), and the `correlation_id` column the schema reserved for idempotency is indexed
  by nothing, so a competency that re-crosses `mastered` after an accuracy dip is still paid twice. §10
  asks whether to close that with DDL. Closing the *first* half needs no deploy — it needs one chat
  conversation that reaches mastery, read back from the table.
- **The scaffolding telemetry now reports the row; the table still has no reader.** `224d47a` guarded the
  write but left `route.ts` feeding `omega_scaffolding_events` `hintsUsed: newHintsUsed` (the turn's claim,
  floored against the pre-write read) and `consecutiveWrong: contextRow?.consecutive_wrong ?? 0` (the value
  *before* this turn's write), both derived from the early read at `:360`. `fe44af9` closes that with the
  cheaper of the two options named here — `updateLearningProgress()` returns the stored pair instead of the
  caller re-deriving it, so no extra query and no second read to go stale. What remains in this bullet is
  the part no code change can close: `grep -rn "omega_scaffolding_events" src` re-run for this entry returns
  **14** hits across 6 files, and exactly one of them is a query — the `.from(…).insert()` at
  `route.ts:753`. The other thirteen are prose: the file headers and mapping comments in
  `scaffolding-telemetry.ts:9/16/31/51`, the post-mortem comments at `route.ts:31`/`:304` and
  `subject-session.ts:79`, the docstring at `progress-tracking.ts:74`, and the name-lists in
  `learner-activity-plumbing.test.ts` and `schema-coverage.test.ts`. So the stream is now truthful and still
  unread — whoever builds the scaffolding-effectiveness view inherits correct numbers and no dashboard that
  shows them. Also unchanged: `attempts` and
  `correctAttempts` in the same payload are still the pre-answer read, which describes what the engine
  reasoned from rather than what the turn produced.
  What *is* closed, because it is easy to assume the newest endpoint sits outside the guards: the O-5
  challenge path calls `updateLearningProgress()` (`src/lib/omega-agent/omega-claw-challenge.ts:187`), and
  `c71aa18`, `9110da3` and `224d47a` between them guard every read-modify-write in the tutor's own row —
  counters, mastery transition, daily counters, and the two difficulty signals.
- **The evidence tree has never hashed a row that exists, and its golden root is self-produced.**
  `aa81219` proves the *rules* — with `73066f7`'s proofs the file is at 29 tests, including a five-row fold
  worked by hand from the leaf hashes
  upward that does not pass through the implementation's loop — and proves nothing about the data. Two
  separate gaps sit here. First, `learning_evidence` is in the production catalog and has no writer, reader
  or generated type in `studio/src`, so there is no class-term to anchor yet; which evidence the first anchor
  commits to is §10's item 8, and the answer may change the fifteen fields and therefore the version string.
  Second, the fixture's recorded root and five leaf hashes were produced by this implementation and pinned,
  not derived from an independent one; the honest form of that claim is that a second language's mirror is
  what would actually falsify it, and `docs/research/ASI-DAPP-PATH.md` Phase 1's Python verifier is the
  deliverable that closes it. Nothing here needs a deploy, which is why it was built first.
  A third gap is specific to the proofs: they have never been over the wire. `verifyInclusionProof` is typed
  to take an `InclusionProof`, and the route will hand it a parsed JSON body, which is how a `version` field
  the type says is impossible reached the code — the one genuine defect this evening's re-read found. The
  version check is in, and its test forges the object through `as unknown as` precisely because a single
  assertion would not compile. What is still unproven is every other field a caller can send: `steps` as a
  non-array is caught, `combine` as a non-string is not refused so much as folded into a different hash, and
  `leafIndex` is trusted by the reader while the verifier ignores it. That belongs with the route's input
  validation, not with the fold.
- **The repo-walking guards have a runtime range, not a runtime.** `grade-cast-guard` measured 0.49 s alone
  and 6.36 s inside the full serial run; `schema-coverage`'s symlink walk 7.2 s and 9.4 s and 29.3 s on three
  observations of the same assertion. Every one of those was a pass, and one of them was a red suite. Treat a
  "the suite takes N seconds" claim from this laptop as a sample, and when one of these two files fails with
  `Test timed out`, run it alone before believing there is a regression — `3531e08` left the measured ranges in
  the comments next to the budgets so the next person does not have to re-derive them.
- **The blocked-topic boundary (O-4) has never met a real request.** 29 tests cover the translator and the
  wire shape, and the route assertions check *source order* — that `detectBlockedOmegaClawContent(` appears
  before the first provider marker in each of the five route files — not that the route runs. Nobody has
  posted "how do I start a mining wallet" to a deployed `/api/chat` and read the refusal in a browser, and
  no teacher has seen the `400`. The trigger lists are also a judgement, not a derivation: they were written
  from six pack identifiers plus how children phrase things, and the three false-positive tests (phone-number
  digits, "never share my password", a class hackathon) are the only thing standing between a tighter pack
  and a tutor that refuses CBC curriculum. Closing this needs one deploy and one typed sentence.
- **Omega Claw's Rust side has now been executed — but not by `cargo`, and that is the whole gap.** The
  engine was run locally on 2026-09-29 through a transcription of the fallback evaluator's own source
  against the real pack (`~/.cache/syncsenta-probe/run.sh` → **`CHECKS=31 FAILURES=0`**), which is how the
  three defects in §1 were found instead of guessed. What the probe cannot prove, and nobody should read it
  as proving: that the edited `interpreter.rs`/`omega_claw.rs` compile (the syntax gate is
  `rustc --edition 2018 --crate-type lib --emit=metadata`, which catches parse errors but not type errors);
  that the new `#[tokio::test]`s pass (they were written against observed engine behaviour, never run);
  that the crate builds at all here (`cargo` exits 101 — `cc` is zig's musl clang and `ring` cannot parse
  the target query; `ring` is unavoidable via `jsonwebtoken`, `rustls`, `reqwest`, `ethers`, `sqlx`); or
  that the real hyperon engine behaves like the fallback (it is compiled out — `default = []`). The
  honest next evidence is one green `rust-gates.yml` run, which needs the `workflow` scope in §7.
- The same two unknowns the §5 block still cannot settle: whether the shipped service behaves differently
  from the TypeScript mirror under the real hyperon engine, and whether the card on `/student` actually
  paints, since the SSR HTML is a `Loading your record…` shell by design and no browser has looked at it
  since.
- **`retrieveTable` has no caller, and that is the gap on the `feat/safe-data-retrieval` branch, stated
  plainly.** Seventeen tests assert what the two halves do with a row and a query somebody hands them; nothing
  in `src` hands them either, because the third brick — a Supabase adapter behind the `SelectRows` port, one
  real table's policy, and a named environment variable for the salt — does not exist yet. So the claim on
  the ledger above is "code and tests", and the claim that a real production read would be safe is **not**
  made: a policy nobody has written for `profiles` or `chat_sessions` protects nobody, and the adapter is
  where a credential gets chosen, which is why it was not written casually at 22:00. Two further gaps on the
  branch: the full 92-file serial suite was not re-run (the eight repository-walking guards plus this
  directory were, at **153 passed / 0 failed**, and §1 records why that is the right set), and `npx eslint`
  cannot run here at all — `Cannot find package 'eslint'` — so the repo's own lint config has never looked at
  any of it.
- KICD curriculum PDFs are still unread; Grade 12 pathways (#32) rest on secondary sources.
- The archived roadmap's "82-88% complete", "85/100 security rating" and coverage figures have no
  reproducible command behind them and are not carried forward as evidence.

---

## 10. Open questions the owner still owes

1. **The ASI hackathon date and what it expects as a deliverable.** Stage 3's ordering in front of
   Stage 4 depends entirely on this date. If the hackathon wants a running on-chain demo, Phase 1
   needs its own budget of days; if it wants a written architecture plus an off-chain proof, Phase 0
   alone is enough.
2. Which grade-8 / grade-1 / grade-12 test learners are actually logging in, and whether their
   feedback arrives through the `/terms`-adjacent feedback form or the Google Form in the footer.
3. **O-3's card is blocked on a fork in the road, and I will not pick it unilaterally.** *(Half-resolved
   2026-09-30: the getter option (b) now exists as code — `4e7babb` — but nothing calls it, so the fork is
   still open and the card is still unbuilt. §11's clock is what forces an answer by 1 October.)* The Rust service
   now answers "which activities does the pack approve for this grade" (`2d857a5`); production still
   answers every Omega question from the frozen TypeScript mirror, which has no listing getter. So either
   (a) the card waits for the Rust cut-over — no learner-visible change until Render holds the service, or
   (b) the owner permits one getter over the mirror's already-pinned `ACTIVITIES` rows, which is a small
   exception to "*No ts now, just rust*" and is the only way O-3 lands this week. (I tried (b) once and
   reverted it under that instruction.)
4. **Where does the Rust service actually run?** Render has no African region (Oregon/Ohio/Frankfurt/
   Singapore); the African-region alternatives are GCP `africa-south1`, AWS `af-south-1`, or a Hetzner VPS.
   This needs the owner's answer before cut-over step 2, plus: the Supabase project's region, and whether
   there is Render account access at all — there is no `RENDER_API_KEY` in this environment, so I cannot
   deploy or even read the service's build log from here.
5. **Push now, or hold the batch for the deploy cap?** One Vercel deploy was spent today on PR #20 and the
   cap is daily. §1 names the count and the split; everything since `9f86916` has tests and a `tsc` gate
   but no build behind it, so pushing without deploying leaves "committed, not deployed" as the accurate
   status either way.
6. **Does the Rust service grow a persistence route, or does the challenge path stop persisting at
   cut-over?** O-5 put the node list, the grading and the `learning_progress` write behind
   `/api/omega-claw/challenge` — an endpoint that exists only in TypeScript. The Rust service's four routes
   (`grade6/scope`, `activity-check`, `progression`, `hint`) answer rule questions and store nothing, so
   Stage 4's "Rust answers, the mirror is deleted" would leave the path exactly where O-5 found it: React
   state, gone on refresh. It needs either a Rust `challenge` route that writes `learning_progress` and
   calls `award_points()`, or a decision that the path stays on the app while the rules move. This is the
   owner's call, not mine, because it decides what "cut-over" covers.
7. **Do you want the ledger to refuse a second mastery award, which is one `CREATE UNIQUE INDEX`?**
   `c71aa18` stopped two concurrent requests from both reporting the transition, but the database will
   still pay a learner twice for one competency if their accuracy dips below 90% and later recovers:
   `mastery_level` is recomputed from scratch on every write, while `mastered_at` is sticky and already
   carries the fact needed to refuse. Note that the schema was designed for this and stopped half short:
   `point_transactions.correlation_id` exists (`:140`) and `award_points()` accepts
   `p_correlation_id` (`:395`) — but nothing indexes it, so the column that was meant to make an award
   idempotent currently makes it merely traceable. Either a partial unique index on
   `(user_id, correlation_id) where correlation_id is not null` plus deterministic ids from the callers,
   or a narrower one on `(user_id, competency_code) where transaction_type = 'competency_mastered'`.
   Both are DDL on the production database this machine has never been able to exercise against an empty
   schema, and both can be applied and read back the way the gamification migration was — the
   verification loop you authorised for that work. I will not rewrite a live function or add an index to
   a school's ledger on an assumption, so this is your call.
8. **What evidence does the first anchor actually commit to?** The research note names `learning_evidence`
   (`docs/research/ASI-DAPP-PATH.md` Phase 0, item 2) and `aa81219` built the tree over exactly that column
   set — and then the grep showed the table has no writer, no reader and no generated type anywhere in
   `studio/src`. It exists in production and nothing touches it. So either the capture path that fills it
   gets built (a Stage 1/2-sized feature: the tutor, sandbox and uploads would each write an evidence row),
   or the anchor commits to the evidence the app really produces today — `learning_progress` per competency,
   `daily_activity` per day, `chat_sessions` per session — which is a different fifteen columns, a new
   version string, and a new golden fixture. The tree is deliberately shaped so either answer is a field
   list, not a rewrite. My recommendation is the second, because an anchor over an empty table proves
   nothing a child did; but this changes what the hackathon demo claims, so it is yours.
9. **The frontend: take the islands win where it stands, or move the render to Rust?** You asked for this as
   a decision you can proceed on, so it is written as one, with the recommendation first.
   - **What islands actually buy us.** Server components that render the learner's data and ship no JS for it
     deletes the payload for the parts of `/student` that are read-only — the points card, the streak, the
     transcript — and it removes the hydration-mismatch class of bug for that markup, which is the bug family
     that produced the blank `/dashboard` and the CSP finding. It does **not** remove the auth, routing and
     role-at-render decisions; it moves them from the browser to the request. So the honest framing is:
     islands is a payload and correctness win on the read paths, not a fix for the write paths.
   - **The cheap version, in place.** Audit `"use client"` in `studio/src/app` — most of those boundaries are
     probably there because a file needed one `onClick`, not because the subtree is interactive — then push
     the client leaves down and keep the data reads on the server. Measured cost: 20–30 minutes of reading
     plus one `next build` to compare client bundle size before and after. No new dependency, no new language,
     nothing the hackathon can't survive.
   - **Why not Topcoat now.** It is real and it is going fast — `0.9.0` published 2026-09-24, 21 releases in
     under six weeks, 5.7 k stars — and its shape fits this project: entirely server-rendered, no WASM, no
     traditional hydration, signed and encrypted cookies, async server functions that talk to the database.
     But its auth pipelines, form validation and multi-target deployment are the parts the README still calls
     unfinished, and those are precisely the parts this app is made of; there is no 1.0 and no RFC track, and
     the project's own words are "expect breaking changes". Building the 2030 product on a framework whose
     auth story is unwritten is a bet the school data cannot absorb.
   - **Why not Leptos now either.** Server-with-islands in Rust is the credible middle, but the WASM payload
     for the interactive islands is exactly what costs a learner on a Kenyan phone and a metered connection,
     and a Rust frontend rewrite is a two-machine decision — `cargo` cannot link on this laptop (§7), so the
     work would have to be authored here and built elsewhere.
   - **Recommendation, as a proceedable default:** keep Next.js through the hackathon, take the in-place
     islands audit as the next frontend spoon (20–30 min, one build, a before/after number), and revisit
     Topcoat or Leptos at the Stage 4 Rust rewrite, when the backend is one voice and there is a second
     machine to build on. By 2030 the question will be whether Topcoat matured, not whether we guessed early.
     Say the word and the audit is the next spoon; say "rewrite" and it becomes a Stage 4 item with a hardware
     prerequisite, and I will write it here as that.

---

## 11. BASIX MeTTa Omniversity hackathon — the clock, the track, and what that changes here

Added 2026-09-30, 10:20 EAT / 12:50 IST — i.e. 1 h 50 min after the kick-off had already run. Times in this
section are given in both zones because the pack does. Source: the Hacker Pack the owner attached, read
in full. Everything below is quoted or arithmetic from it; where the pack is internally inconsistent, both
numbers are printed rather than one chosen.

### The clock

Kick-off is **today, Wednesday 30 September, 10:30 IST / 08:00 EAT**. Build days are 30 Sep and 1 Oct; 2 Oct
is polish, record and submit. The hard close is **23:59 IST / 21:29 EAT on Friday 2 October**, and the pack
says "no exceptions" for teams and solo hackers alike. Finals and judging are Saturday 3 October,
19:30–21:00 IST. Prize pool $1700; five winners advance to the next BASIX hackathon on 24–25 October.

The owner's framing is a 48-hour budget split into dev then test. Measured from 12:50 IST this morning to
23:59 IST on Friday the clock reads **59 h 09 m**, of which two nights' sleep takes out roughly 15 h — so
**about 44 awake hours**, and the "48" is right to within one night's sleep. But the pack's own run of show
already assigns Friday to polish, record and submit, so the workable split is not 24/24: it is
**~36 hours of build across Wednesday and Thursday, then Friday is not a build day.** That is the split
written below.

**Registration is confirmed in, and it is SOLO — which settles the track question and overrides the table
below.** Screenshot of the owner's platform page, read 2026-09-30: *"You are registered"*, *"Syncsenta —
You lead this team. 1 of 4 spots filled"*, *"You are a solo participant … You build over the regular 48-hour
hackathon runtime — the same window every team gets — **on the Omega track**"*, stage set to *"Early build,
some code written"*, and the invite code `AZF4CQW` marked *"No longer joinable — registration has closed."*
Four consequences, none of them optional:

1. **Track 5, not Track 1.** The pack's own words: *"if you're building solo, you're building on Omega, full
   stop"*. The Glass Box idea survives — it becomes Track 5's **challenge 1, "One agent producing an
   auditable decision"** — but Track 1's more generous framing does not. The track table below is kept
   because it is the reasoning that picked the challenge, not because Track 1 is still live.
2. **AI disclosure is mandatory, and undisclosed use is named as a disqualifying integrity issue.** This
   repository was built with an assistant that wrote code, tests and §1's prose. The disclosure is therefore
   a substantial document, not a footer line, and it has to be written by the owner, in the owner's words.
3. **"No solo hacker attempts a complete platform — one feature, proven, is the whole assignment."** That is
   the pack endorsing this map's spoon discipline, and it is a licence to cut. The one feature is the
   auditable decision; everything else becomes supporting material.
4. **The repo field on the platform is stale and it is not a small thing.** It reads
   `https://github.com/dgithinjibit/Ascendra.git`. There is no `Ascendra` repo — `gh api
   repos/dgithinjibit/Ascendra` resolves to `dgithinjibit/Syncsenta`, public, last pushed
   **2026-09-29T09:17:30Z**, which is **43 commits and one day behind this working tree**. Nothing about the
   map's §7 problem changes by naming it there: the account holder has to fix the URL *and* decide the
   public/private question before either is submitted.

The two contradictory registration dates in the pack (**9/27/2026** in Quick Facts, **9/28/2016** in the row
under it) are now moot on the registration question and live on the deadline question — the submission close
stays **23:59 IST / 18:29 UTC on 2 October**, and the platform's own *"2 days left"* agrees with that.

### The literature position, 2026-09-30 — see `docs/PAPERS-AND-POSITIONING.md`

The owner asked for a pivot off the back of StudentBench (the paper at `emergentmind.com/papers/2609.28470`,
read in full). Short version, with every quote traced in the new file: **the efficacy argument is closed**
(AI ≡ expert human tutoring, p = .015, at 918× lower cost, 2,383 participants), so re-opening on it reads as
behind the field; the open hole is **auditability**, and chain-of-thought is not a fix for it — the best 2026
circuit-guided faithfulness detector still only reaches 78.0% / 77.0%, which means "show your chain of thought"
is the same unsolved problem, not the answer. Two further findings that change our wording: production LLM
tutor pipelines already *"fallback to deterministic finite-state tutors"*, and instructional theory in them is
*"rarely systematically implemented or evaluated"* — the field conceding that the rules are where correctness
lives. And **neural-symbolic knowledge tracing is already published** (arXiv 2604.08263, >0.80 AUC at 10% of
training data, explanations from a *"grounded computation graph that exposes the logic behind each
prediction"*), so this file retires any novelty claim about the architecture and keeps the narrower one that
survives: our trace is **portable and third-party verifiable**, not merely inspectable by the system that made
it. Consequences 1–5 in that file are the ones that bind §11's plan, including replacing the entry text's
on-chain sentence.

### The judging maths, which is not what the repo has been optimising for

All five tracks are judged **30% technical execution · 25% clarity of the 3-minute video · 25% fit to track ·
20% documentation and build process**. Track 1 and Track 2 also publish their own weightings
(Technical Innovation 30 / AGI Potential 30 / Implementation Quality 20 / Docs & Demo 20, and Innovation 30 /
Technical 30 / Sustainability 20 / Presentation 20). Taking the general rubric at face value:

- **70% of the score is decided by things that are not in the repository** — the video, the demo, how well the
  thing reads as an Omega/MeTTa project, and the write-up.
- The stated bar is *"ship a working alpha, not just an experiment — judged on usability and completeness over
  ideation."*
- Consequence for this map: §5's rows are all "implemented and tested, not deployed, not browser-verified",
  which is exactly the half that a judge can see. **A deployed, click-able, recorded slice outscores three
  more correct bricks.** That reverses the priority order in §2 for the next 36 hours.

### Where we stand against the five tracks

| Track | Fit | What already exists here | What is missing |
| --- | --- | --- | --- |
| **1 — MeTTa Foundation, "The Glass Box Agent"** | **strongest** | the 35-statement pack with 6 families; the Rust façade that loads it into a MeTTa space; `omega-claw-hint.ts`'s ladder `notice → isolate-step → representation → worked-example`, which *is* a step-by-step justification; `omega-claw-safety.ts`, which refuses in the learner's own language; `lib/attest/evidence-tree.ts` + inclusion proofs (`aa81219`, `73066f7`) | a surface that renders the derivation where a **teacher** can read it, and an interrupt-and-ask-"why?" control. The transcript itself can be produced today; the box is not yet glass on screen |
| **1 — "The Agent That Grows Up"** | good, and cheap to prove | the drift lock: `omega-claw-rules.test.ts` parses `omega_claw_rules.metta` and fails if the TypeScript table disagrees — that is a real, checked before/after rule diff, on git history | a live correction inside the demo rather than a commit between demos |
| **2 — Omega AI Agents, "The Agent Without Borders"** | second choice | Kiswahili-language refusals already ship; low-bandwidth is this project's whole design constraint (3.7 GB laptop, metered learners) | the pack wants the *explanation* adapted, not the strings translated — that is new work, not a re-skin |
| **3 — The Agent That Can Be Trusted With Money** | decent, wrong story | the audit-trail machinery, and `learning_evidence` rows a skeptical manager could follow | it asks for a *business* decision (vendor quotes, micro-lending, pricing). Forcing the tutor into that frame costs days and abandons the track fit |
| **3 — The NPC That Won't Break Character** | poor | persistent memory exists | it is a game NPC; the demo would be a distraction from an education product |
| **4 — AI Infrastructure Layer** | **not eligible** | — | gated on having completed a prior MeTTa track or BASIX coursework |
| **5 — Solo Track** | applies *if* solo | Omega is already the actual feature, not decoration | **AI disclosure is mandatory**, and undisclosed use is named as a disqualifying integrity issue |

**The call, now settled by the platform rather than by this table:** the entry is **Track 5 (Solo), Omega,
challenge 1 — "One agent producing an auditable decision"**, and the build is the teacher-side glass surface.
The reasoning that picked the Glass Box still holds and is why challenge 1 is the right one of Track 5's five:
the pack's *"a resource-allocation agent with step-by-step justification"* is literally what the hint ladder
does when it chooses among four hints, and Track 5's demand that *"some visible piece of Omega's stateful,
auditable-reasoning architecture must be the actual feature, not decoration"* is satisfied by a derivation
that only the rule pack can produce. Track 1's alternate — *"The Agent That Grows Up"*, before/after rule
diff — is available almost for free as a second scene in the same video, because the drift lock and `4e7babb`
already generate that diff.

### What the pack makes urgent that §7 already blocked

1. **The repository must be shared with BASIX.Market.** That is submission requirement #1, and it collides
   head-on with §7 item 9: the repo is public, every branch is cut from `main`, and the 41 commits above
   `origin/main` are a written map of who is blocked on which credential, the hand-seeded demo accounts, the
   compose file's default `POSTGRES_PASSWORD`, and six dangling `.sql` symlinks. The secret scan prints `0`
   for all ten patterns, so this is disclosure, not leakage — but sharing that history with an external
   organisation is a bigger act than pushing it to GitHub. **A clean branch with the map stripped, or a
   private repo with BASIX.Market added, are the two survivable options**, and the owner has to pick before
   Thursday night. This is now the single hardest blocker on the submission, above the `workflow` scope.
2. **AI disclosure is mandatory** (stated for Solo, sensible for all). Given how this repository was built,
   that statement has to be honest about the assistant's role in writing both the code and this roadmap.
3. **~~Registration may have closed~~ — cleared 2026-09-30:** the owner is registered, solo, on the Omega
   track. Replaced by the item it exposed: the platform's repo field points at a name that no longer exists
   and a tree 43 commits behind. Fix the URL, then resolve the public/private question, then add
   BASIX.MARKET as a collaborator — in that order, because the third depends on the second.
4. **The entry text already on the platform overclaims, and it is the one paragraph a judge reads before the
   code.** It promises *"Web3/on-chain components to securely log student competency milestones as
   privacy-preserving, verifiable credentials (e.g., via Cairo/Starknet or Stellar)"*. What exists in this
   tree is an off-chain SHA-256 Merkle tree over `learning_evidence` with inclusion proofs, and **no chain of
   any kind, no contract, and no verifier** — §5's Stage 3 rows say implemented/tested but not deployed, and
   §10 item 8 still owes the anchor its first commitment. A judge who opens the repo looking for a Cairo
   contract finds a TypeScript hash function. Either the sentence is rewritten to *"a tamper-evident,
   recompute-able evidence anchor, designed to be committed on-chain next"*, or `sign.ts` and the anchor land
   and the on-chain word stays. **This is the single most likely place for the submission to lose credibility,
   and it is fixable in one edit of prose.**

### Track 5's deliverable list, transcribed — this is the definition of "done" now

The pack gives Solo its own list, due **23:59 IST, 2 October**, and it is narrower than the general one:

1. Working GitHub repository, **shared with BASIX.MARKET** — blocked on §7 item 9 and on the stale
   `Ascendra` URL above.
2. Short README: problem, solution, technology, **plus the AI Disclosure statement**. Mandatory, and this
   repository needs it more than most.
3. **One functioning Omega feature.** One, not several. This is the sentence that justifies cutting the rest.
4. A sample reasoning transcript, memory record, or audit trail.
5. A 3-minute demonstration video.
6. A short statement of what you'd build next.

Items 4, 5 and 6 are the ones with no code in them, and between them they are the majority of what a judge
sees. They are also the three that cannot be produced on 2 October in a rush, because each needs the feature
in item 3 to already be running.

### The 36-hour plan this implies

Dev, Wed 30 Sep → end of Thu 1 Oct:

1. Deploy-and-verify before new code: read the background `tsc`, commit or discard the uncommitted Omega
   getter, spend the day's Vercel deploy deliberately, and browser-verify **one learner crossing into mastery
   and earning 50 points** on the live URL. Stage 1's oldest unverified claim, and it is video material.
2. `lib/attest/derive.ts` + `derivation-route.ts` — turn an agent decision into an ordered, printable trail
   (the facts matched, the rule that fired, the conclusion) straight from the pack, so the transcript cannot
   be hand-authored. ~3 hours, tests red first.
3. The teacher-side glass surface: one learner's session, its hints and refusals, each expandable to its
   derivation, plus an interrupt control that re-runs the trail from that point. This is the "why?" the track
   asks for live, and it is what the unmounted teacher dashboard was actually for.
4. The `sign.ts` tail (Ed25519 over the trail, key from `ATTEST_KEY`, refuses silently when absent) — one
   hash on screen turns "trust me" into "verify me", which is the differentiator nobody else in the field has.
5. AI disclosure statement + README (problem / solution / technology) written as the code lands, not on
   Friday.

Test, record and submit, Fri 2 Oct:

1. Freeze features at 10:30 IST. Nothing new after that, only fixes.
2. Browser-verify the deployed app as the demo roles on the live URL; fix what breaks; assume one deploy.
3. Capture the sample reasoning transcript from the running app, not from a fixture.
4. Script and record the 3-minute video — 25% of the score, and the cheapest points available. The
   storyboard is: state the black-box problem, show a learner's hint, ask "why?", show the derivation,
   interrupt it live, show it re-derive, state what's next.
5. Submit before **23:59 IST / 21:29 EAT**: repo shared with BASIX.Market, docs, video, "what you'd build
   next". Leave two hours of margin; the pack says no exceptions twice.

### 2026-09-30, later the same day: the dev half above is superseded, and here is why

The owner asked for the whole research corpus read end to end — `.kiro/specs/**` (9,297 lines), `docs/**`
(13,300+ lines) against the code each of them describes — and said *"i dont think we are to start from
scratch but seems we had our ladder on the wrong wall NGL."* The verdict, with evidence, is
[`docs/research/BASIX-FINAL-POSITION.md`](research/BASIX-FINAL-POSITION.md): the ladder is sound and it is
leaning against a wall we built in Rust and never plugged into the running product. Two corrections to the
plan above follow from it, and they are order-and-scope corrections, not a restart.

1. **The 29 Aug architecture decision is the wrong wall, in writing.** `OMEGA_ARCHITECTURE.md` chose
   thresholds over symbolic reasoning — *"Tutoring decisions don't need symbolic reasoning (just
   thresholds)"*, *"Hyperon not required"*, the MeTTa graph is a *"Conceptual demonstration … Not used in
   production tutoring decisions"*, closing with *"✅ No changes needed — architecture is sound!"*. It was
   a defensible product call (sub-100 ms, $0, metered-data-friendly) and it is the direct opposite of what
   Track 5 asks for. Nothing re-litigates it this week: for the hackathon, the derivation *is* the feature.
2. **Two of the three things Track 5 wants already exist as tested-but-unexecuted code.** `rust-core` is
   5,075 lines with **99 tests nobody has run**; `syncsenta_policy.metta` is 137 lines embedded at
   `rust-core/src/lib.rs:72`; `rust-hyperon-bridge` executes it under a Tier-B record. About **10,000
   lines of rule and decision code exist for one tutor, and production answers from two TypeScript files.**
   The highest-value action is not writing rules — it is making one voice answer, visibly.

The five spoons, in order, each red-first, each its own commit, each sized for this machine:

1. `studio/src/lib/attest/derive.ts` — one Omega decision becomes an **ordered derivation read from
   `omega_claw_rules.metta`**, never a hand-written transcript. ~3 h.
2. Print it where the product already speaks: replace the status string injected at
   `app/api/chat/route.ts:534` (`"MeTTa student-turn boundary: recorded"`) with the derivation. ~2 h.
3. **Make the teacher loop real instead of fictional** — mount the orphaned `feedback-widget.tsx` (zero
   importers), fix the payload↔zod mismatch that 400s it, land the correction as a row the mirror consults
   *before* the pack, naming the teacher and the timestamp; delete the branch that promises tests and an
   email. ~4 h. The semantics are already decided, not invented: `rust-core/src/teacher_adaptation.rs`
   specifies `adapt_next_interaction`, *"changes the interaction plan, not the learner's score"*, and never
   copies teacher text into a prompt.
4. Ed25519 over canonical JSON from `ATTEST_KEY`, refusing honestly when unset. ~2 h.
5. README, mandatory AI disclosure, 3-minute video, "what we'd build next". ~3 h.

Step 1 of the plan above (deploy-and-verify one learner crossing into mastery on the live URL) still comes
first in wall-clock terms — it is Stage 1's oldest unverified claim and it is video material. Friday is
unchanged. Cut for the week, so nobody re-opens it: the on-chain credential sentence, "built on Omega",
every subject except **AI and blockchain**, every grade below **Grade 6**, Leptos/Topcoat, any Rust rewrite
of `studio/`, payments, the three frozen roles, and sign-ups.

### What this does not change

Stages 0–5, §7's blockers and §10's open questions all still stand. What §11 changes is the *order* for two
days: things that make an existing capability visible and checkable outrank things that add capability,
because visibility is 70% of the score and the deadline is a hard one.

---

## 12. How to update this file

At the end of a work session, in the same commit as the work: move the checkboxes, change §1's
"where we are", add a row to §8 for any decision made, and demote anything in §5 whose evidence
turns out not to exist. If a claim cannot be traced to a command, a query, or a URL that was
actually opened, it belongs in §9, not in §5.
