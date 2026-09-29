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
learner-visible surface: nothing on the site shows a point yet, because the code that pays them is
committed locally only.**

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

Working tree clean. `HEAD` is **18 commits ahead of `origin/main`** (`git rev-list --left-right count
origin/main...HEAD` → `0 18`): nine for the security gate and O-1/O-2, four for the Rust engine slice, and
the rest are this map being brought up to date with them, plus O-4. Nothing here is pushed or deployed —
see the `workflow` scope in §7 and the spent deploy cap below.

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
- [ ] `studio/src/lib/attest/evidence-tree.ts` — deterministic canonical serialization over one
      class-term's evidence, hashed to a Merkle root, with a golden-file fixture.
- [ ] `studio/src/lib/attest/sign.ts` — Ed25519 via Node `crypto`; key from `ATTEST_KEY`; refuses to
      run silently if absent.
- [ ] `/api/verify/[anchorId]` — public, rate-limited: root, version, signature, key, per-learner
      inclusion proof for a party who already knows the learner id. Never enumerates children.
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
| Points, streak rewards, class leaderboard (**learner-visible**) | **no** — the award is deployed but nothing renders a board or a balance | no | no | no |
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
| Evidence anchoring / Merkle verification (Stage 3) | no | no | no | no |
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
3. **The TypeScript mirror** — `studio/src/lib/omega-agent/omega-claw-rules.ts` (230 lines) + `lib/omega-claw-api.ts`
   (164) + 2 routes. This is what actually answers in production.
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
| Is learner progress persisted? | — | **0** — `completed` is React state; no write | `interactive-challenge-path.tsx:71` |
| Is the Rust engine live? | 1 service | **0 deployed, 0 CI runs** — and as of 2026-09-29 it is no longer 0 *correct*: three defects that made it answer `blocked` to everything are fixed locally (`.github/workflows/rust-gates.yml` exists on disk but is unpushed, so no runner has executed `cargo`) | no `cargo` step pushed to `.github/workflows/` |

**Headline, stated as a denominator rather than a vibe: of the 35 rule statements in the pack, 35 are
mirrored in code the app runs, 10 are reachable over a deployed HTTP endpoint (the 4 next-action and 4
hint rows plus the 2 transfer rows; the 6 scope and 13 activity rows have a route only on the undeployed
Rust service), and the 6 blocked topics gated nothing until `bc61765` today — they now gate five request
paths, none of which is deployed yet. And 0 rules have ever been executed by the MeTTa runtime the project
claims.** What changed on 2026-09-29 is not the second number — it is the last one's
cause: the fallback engine was run locally for the first time and answered `blocked` to its own two tests
until three defects were fixed (§1). The learner-facing card that renders them has 3 hardcoded nodes, of
which **1 of 3** (`ai-input-output`) is a legal Grade 6 activity in the pack; `blockchain-consensus` is a
Senior School row the pack would refuse for Grade 6, and `explain-your-thinking` is not in the pack at all.

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
  is not the path the rule pack approved. The Rust service can now answer that question
  (`{grade, scope, activities[]}`, `2d857a5`), but production reads the frozen TypeScript mirror, which has
  no listing getter; see §10.
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
  **747 passed / 0 failed / 17 skipped** across 86 files. That newest tree has had **no `next build` and
  no Vercel deploy**, because the day's deploy was spent on PR #20 — so for the commits since, the build
  claim is nobody's evidence yet, and §1's "committed, not deployed" is the accurate status.
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
  client; they do not prove the real service key passes `42501`-free on the deployed function, and a
  double-transition race still has no idempotency key underneath it. Closing this needs no deploy —
  it needs one chat conversation that reaches mastery, read back from the table.
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
3. **O-3's card is blocked on a fork in the road, and I will not pick it unilaterally.** The Rust service
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
   cap is daily. Eight of the 14 unpushed commits are already verified by tests but not by a build, so
   pushing without deploying leaves §1's "committed, not deployed" as the accurate status either way.

---

## 11. How to update this file

At the end of a work session, in the same commit as the work: move the checkboxes, change §1's
"where we are", add a row to §8 for any decision made, and demote anything in §5 whose evidence
turns out not to exist. If a claim cannot be traced to a command, a query, or a URL that was
actually opened, it belongs in §9, not in §5.
