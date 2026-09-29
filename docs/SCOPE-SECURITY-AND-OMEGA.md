# Scope: harden first, then Omega Claw to 90%

Written 2026-09-29 on `main` at `3128f4d`, immediately after PR #20 landed.
Owner's instruction, verbatim: *"Do not build a single new feature or touch the reasoning engine until
your codebase is hardened. Report back when the security pipeline is green."*
And: *"lets code this omegaclaw to around 90%."* Those two are the same piece of work, sequenced:
items 1–4 are security, items 5–9 are Omega Claw, item 10 is not codeable from this machine.

## The scoreboard (this is what "%" means here)

`docs/ROADMAP.md` §8 forbids one blended progress number, so the percentage has a denominator and a
command:

```
grep -c '^- \[x\]' docs/SCOPE-SECURITY-AND-OMEGA.md    # done
grep -c '^- \[ \]' docs/SCOPE-SECURITY-AND-OMEGA.md    # left
```

9 of 10 = 90%. The one that cannot be ticked from here is #10, which is why 90% is the honest ceiling
for this session and not a rounding choice.

- [x] **1. S-1 — print-window XSS sink removed.** `components/generate-scheme-of-work-dialog.tsx:73`
  builds a whole HTML document by string interpolation and feeds it to `windowWin.document.write`,
  including `${formData.grade}`, `${formData.subject}`, `${formData.strand}`,
  `${formData.subStrand}` and `${printContent.innerHTML}` (lines 97–107). `window.open('')` returns an
  `about:blank` window that inherits the app's origin, so any `<script>` in a teacher-typed field or in
  AI-generated scheme text executes with the app's cookies and its Supabase session. **Fix:** build the
  print document with DOM calls only — `document.title`, `textContent` for each meta value,
  `importNode(printContent, true)` for the body — with the `<style>` block kept as a static string that
  interpolates nothing. **Test:** a hand-built fake `document` object asserting no inserted string ever
  reaches `body.innerHTML`, plus a source-level guard that `document.write` is gone from the file.
  (`vitest.config.ts` sets `environment: 'node'` and there is no jsdom — installing one costs RAM on a
  3.7 GB laptop for one test, so the fake object is the deliberate choice.) ~40 minutes.
- [x] **2. S-2 — identity-bearing ids stop using `Math.random()`.** Real, and one hop away from where
  the directive pointed: `api/mwalimu/route.ts` contains no `Math.random()` — it delegates to
  `lib/personalized-learning.ts:156`, which mints `session_${Date.now()}_${Math.random()…}`, the same
  pattern in `ai/flows/assessment-agent.ts:132,185,581,589` and five chat components. **Fix:**
  `crypto.randomUUID()` in every id whose value leaves the browser; leave the purely cosmetic ones
  (confetti position and delay in `real-time-feedback.tsx:132-137`, the sidebar width at 671) alone and
  say so, because `Math.random()` for a particle is not a vulnerability and pretending otherwise trains
  people to ignore security lists. Severity is lower than the directive claims — see S-4 for why.
  ~25 minutes.
- [x] **3. S-3 — curriculum inputs stop lying about their type.** The directive's *"format string
  injection"* does not describe TypeScript: there are no format strings, and
  `getSubjectsForGrade()` (`data/curriculum/index.ts:31`) matches against allowlists with `.includes()`,
  so an unknown grade falls through rather than breaking out. What is real: `String(grade).replace(/\s+/g,'') as GradeLevel`
  asserts a type for unvalidated input, and the week math at `:297-298`
  (`Math.ceil(authoredLessons / envelope.lessonsPerWeek)`, `lessonsPerWeek * standardAnnualWeeks`) has
  no guard for a subject that resolves to `0` or `NaN`, which yields `Infinity` weeks — a generated
  scheme with an impossible timetable, which is a data-integrity defect a teacher ships. **Fix:** one
  `parseGradeLevel(input): GradeLevel | null` that every caller goes through, and a non-zero divisor
  guard. **Test:** table of hostile/blank/`"__proto__"`/`"5e9"` grade strings plus a zero-lesson subject.
  ~45 minutes.
- [x] **4. S-4 — `/api/mwalimu` stops claiming memory it does not have.** Found while verifying S-2,
  and it is the larger defect the directive did not name: `lib/personalized-learning.ts` keeps profiles,
  sessions and progress in `Map`s and writes them to `localStorage` (`:462-464`), and reads a grade back
  from `localStorage.getItem('studentGrade')` (`:441`). That module runs inside a route handler, where
  `localStorage` does not exist, so every mwalimu conversation forgets everything between two requests
  and `startSession()`'s id protects nothing. Replacing the RNG without fixing this would be cosmetic
  security. **Fix:** point the route at the session store the app already has
  (`lib/chat/subject-session.ts`, backed by live `chat_sessions`), and delete the localStorage paths from
  the server-side module. **Test:** two sequential mwalimu requests in the same session read back the
  first one's state from the fake client. ~1.5 hours, and it is the one item here that changes behaviour
  a teacher can notice.

### Items 1–4 done, 2026-09-29

Verified locally, on this tree: `npx tsc --noEmit` exit 0, and
`npx vitest run --no-file-parallelism` → **686 passed, 17 skipped, 0 failed** (80 files passed, 1
skipped; the 12 skipped MeTTa e2e cases need a running engine). Nothing is pushed or deployed yet, so
none of this is a claim about sentastudio.vercel.app.

- **S-1** — `lib/print-scheme.ts` + `lib/print-lesson-plan.ts` build both print surfaces with DOM calls
  only. Item 1 also caught a second sink the directive had not named: `lesson-plan-dialog.tsx` wrote the
  model's lesson plan into the application's own document with `innerHTML =`, which is worse than the
  pop-up because it does not even need a second window. 12 tests across
  `__tests__/scheme-print-is-not-an-html-sink.test.ts` and `__tests__/lesson-plan-print-is-not-an-html-sink.test.ts`,
  each with a source guard that `document.write(` and `.innerHTML =` stay out of those files.
- **S-2** — `lib/secure-id.ts` (built on `crypto.getRandomValues`, no fallback: it throws
  `SecureRandomUnavailable` rather than reverting to a predictable generator) plus 7 tests and two
  tripwires that walk `src` for `Math.random().toString(` and for `Math.random` in the two files that
  minted identity-bearing ids. 14 call sites converted. Cosmetic randomness (confetti, sidebar width,
  random template picks) is left alone and named in the file, as scoped.
- **S-3** — `data/curriculum/grade-level.ts` `parseGradeLevel()` replaces five `as GradeLevel` casts and
  returns `null` instead of a lie; `getLiteracyScheduleAudit` rejects non-finite or non-positive week
  counts. 10 tests, including 18 malformed inputs and the `'Grade 4 or Grade 6; DROP'` case; 21 adjacent
  curriculum tests still pass.
- **S-4** — `lib/personalized-learning.ts` is deleted, along with the `/api/test-personalization` route,
  its dev page and `lib/api/personalization-client.ts` (nothing in the app called it; it existed to
  exercise the engine). `lib/chat/learner-state.ts` reads `profiles`, `chat_sessions`, `chat_messages`,
  `learning_progress` and `daily_activity` through the caller's client, and `recordTutorTurn()` stores the
  transcript through the existing `addChatMessage()`. `lib/chat/personalized-prompt.ts` is the old prompt
  template with the store removed from it. 21 tests (11 behavioural, 10 guard).

Two things S-4 turned up that were not in the scope when it was written, both now fixed:

1. **`/api/mwalimu` took the learner's identity from the request body** — `input.userId || 'user1'`. Any
   caller could name any learner and get that child's profile, personalisation and progress, and could
   write into their session history; callers who omitted it shared one bucket. The route now authenticates
   with `auth.getUser()` and uses the token subject, 401 otherwise, which is what `/api/chat` already
   did. `sessionId` is no longer read from the body either, for the same reason: a client-supplied id can
   point at another learner's session.
2. **the tutor's personalisation fed every grade through one default.** `orchestrator-agent.ts` called
   `getStudentProfile()` and used `profile.grade` when the request had none, so a Grade 9 learner whose
   request omitted the grade was answered as a Grade 4 by a randomly-named child. The orchestrator now
   passes only what the request states.

The response payload also stops reporting invented facts: `studentName` is `null` when the profile row has
no name (the old engine returned a random pick from a list of Kenyan first names), and
`personalization.hasRecordedName` says so. The learner's name is never guessed at.

**`Math.random` in `generateFriendlyName()`** died with the file, which is why the S-2 tripwire excludes
nothing anymore: the one server-side use of it was on this phantom path.

**S-4 tail — the fourth green grep was not yet true.** Auditing this file's own closing criterion ("no
grade string reaching a `Record<GradeLevel, …>` index without passing `parseGradeLevel`") found two bare
casts left in executable code, so the criterion could not be called green on the strength of item 3
alone:

- `lib/quiz-trigger.ts:129` — `grade: context.grade as GradeLevel`. Nothing imported `QuizTrigger`
  anywhere in `src/`, `docs/`, `ai-agents/` or `backend/`, and the class also carried the S-4 defect shape
  rather than a grade bug: cooldown state in `private static lastQuizTime: Record<string, number>`, wiped
  by every cold start. Unusable code that duplicates a defect class gets cut, not patched —
  `git rm`'d.
- `app/test-schemer/page.tsx:85` — `e.target.value as GradeLevel` on a `<select>`. Kept (the page is the
  curriculum layer's live frontend probe) and routed through `handleGradeChange()` → `parseGradeLevel()`,
  which drops an unrecognised value instead of accepting a lie. The page's three `any`s went with it,
  since AGENTS.md forbids them and the guard now reads the file.

`__tests__/grade-cast-guard.test.ts` (5 tests, checked red first: 4 failing, then green) walks every `.ts`
and `.tsx` under `src/` with comments stripped and asserts `as GradeLevel` is absent from executable code,
`quiz-trigger.ts` stays deleted with no importer, and the schemer page parses rather than casts and holds
no `any`. It is the test that makes this file's "security pipeline green" a checked claim; the third
residual `Math.random` / `document.write` / `localStorage` hit in the greps is doc-comment prose in
`print-scheme.ts:6,10`, `secure-id.ts:6` and `app/api/mwalimu/route.ts:13`, each naming the sink it
removed.
- [x] **5. O-1 — the challenge path renders the words the API already returns.**
  `interactive-challenge-path.tsx:91` prints `Guided hint 2: isolate-step` while the same response
  carries `hintMessage` (verified against production: `"Find the one step you are unsure about…"`);
  `:110-119` discards `nextActionMessage` and keeps a near-identical hardcoded copy, so learner copy
  exists in two places and only the tested one can be trusted. **Fix:** render the API strings, delete
  the duplicates. ~20 minutes.
- [x] **6. O-2 — one canonicaliser.** `:51 isOmegaClawGrade()` strips whitespace only, so a profile
  reading `Grade-6` becomes `grade-6`, fails all three tests and the card returns `null` for a learner
  the rule pack covers; Rust and `omega-claw-rules.ts` both strip `-` and `_`. **Fix:** import
  `canonicalOmegaClawGrade`/`omegaClawScopeFor` from the mirror and delete the local copy. **Test:**
  `Grade-6`, `grade 6`, `G6`, `Grade-13`, `''`. ~30 minutes.

### Items 5–6 done, 2026-09-29 (O-1, O-2)

Verified on this tree: `npx tsc --noEmit` exit 0, and
`npx vitest run --no-file-parallelism` → **714 passed, 17 skipped, 0 failed** (83 files + 1 skipped
MeTTa e2e suite needing a running engine). Commits `371c884` (O-1) and `d476c20` (O-2). Not pushed or
deployed — the day's Vercel deploy was already spent on PR #20.

- **O-1** — `lib/omega-claw-copy.ts` renders the server's `hintMessage` and `nextActionMessage`; the
  card's five hardcoded sentences and its `nextAction === '…'` comparisons are gone, and 11 tests
  enforce both halves. `hintFeedback()` deliberately never falls back to `result.hint`, which is the
  MeTTa symbol a learner cannot read (`isolate-step`), not a sentence.
- **O-2** — `lib/omega-claw-path.ts` `showsOmegaClawPath()` replaces the card's local
  `isOmegaClawGrade()`, and it is defined as `omegaClawScopeFor(grade) !== 'blocked'` so the pack's
  `SCOPE_BY_GRADE` table is the only place grade membership is decided. 6 tests, including an
  equivalence assertion against the mirror rather than a list of expected booleans.

O-2 found a second canonicaliser the scope did not name, and it was the worse of the two:
`src/curriculum/omega-claw-ai-blockchain.ts` had its own `isOmegaClawGrade()` comparing against a
hardcoded list, so a **teacher** opening a Grade-6 class was told the grade was out of scope for a
subject that has its own `SCOPE_BY_GRADE` row. It now delegates to the mirror too, plus a named and
commented `SENIOR_BAND_LABELS = ["s1","s2","s3"]` widening — Cabana band labels, not grade numbers, and
the senior branch already degrades safely when the stage is unknown. Refusing a real senior class on a
naming difference is worse than answering it at band level. **This widening is a decision for task #22**
(one voice): the Rust service does not accept band labels today, so choosing the Rust pack as
authoritative will either inherit it or break those classes. 11 tests in
`src/curriculum/__tests__/omega-claw-grade-spellings.test.ts`, RED at 6 failed first.
`OMEGA_CLAW_CURRICULUM_GRADE = "g6"` is deleted (zero references repo-wide, markdown included); a
constant pinning the module to one grade is what let the second parser drift.
- [ ] **7. O-3 — the nodes come from the pack, and scope/activity get routes.** The card's three ids
  (`ai-input-output`, `blockchain-consensus`, `explain-your-thinking`) are hardcoded, and only the first
  is a legal Grade 6 activity — the second is a Senior School row the pack would refuse, the third is
  absent from the pack entirely. Meanwhile the Rust service exposes 4 routes and the app exposes 2, so
  19 of the pack's 35 statements (6 scope + 13 activity) cannot be asked about at all. **Fix:**
  `POST /api/omega-claw/scope` and `POST /api/omega-claw/activity-check` mirroring the Rust handlers'
  contract, and the card renders activities the engine allows for that learner's grade. **Test:** route
  tests + the mirror's existing pack-parsing assertion extended to the Rust route list. ~2 hours.
- [ ] **8. O-4 — the safety boundary gates something.** 6 `(omega-claw-blocked-topic …)` rules exist
  (crypto-trading, investment-advice, wallet-custody, unsupervised-attack, public-deployment,
  unnecessary-personal-data), `isBlockedOmegaClawTopic()` implements them, 17 tests pass — and no request
  path calls it. `grep -rn isBlockedOmegaClawTopic studio/src` returns only the mirror and its tests.
  A child asking "how do I start a mining wallet" is answered today. **Fix:** check the learner message
  in `/api/chat` and the topic field in the generation routes; refuse with the reason named. This is also
  the item that makes the platform defensible in front of a Kenyan school. ~1 hour.
- [ ] **9. O-5 — progress persists and pays.** `completed` is React state (`:71`), so a refresh erases a
  learner's path; `learning_progress` and `omega_scaffolding_events` are both live tables since the
  2026-09-28 memory migration. **Fix:** write the node completion through the existing
  `updateLearningProgress()`, which already reports `masteryJustAchieved`, so the path also becomes the
  thing that earns the 50-point ledger award Stage 1 shipped. **Test:** a second mount reads back what
  the first one wrote. ~1.5 hours.
- [ ] **10. O-6 — the MeTTa engine actually executes the pack.** Blocked, by definition, on deploying
  `backend/syncsenta-backend` and on task #22 choosing one voice. Note the detail that decides what
  "running MeTTa" would even mean here: `Cargo.toml` sets `default = []` and `metta = ["dep:hyperon"]`,
  so a plain build compiles the hand-written fallback parser in `interpreter.rs`, not hyperon. Until
  this ticks, 0 of 35 statements have ever been executed by the engine the project advertises, and
  9/10 is the ceiling.

## What the directive said, verified against this tree today

The directive was written against PR #8; this repo is at PR #20 and the map has moved under it. Checked
each claim rather than assuming either way:

| Directive claim | Status on `main` 2026-09-29 | Evidence |
|---|---|---|
| SSRF in `lib/scheme-v2-client.ts` | **already closed, and guarded by a test** | the file does not exist; `app/api/schemes/active/route.ts` returns an honest `503 awaiting-backend`; the surviving `scheme-context-client.ts:46` fetches the relative `/api/schemes/active`; `__tests__/student-chat-transport.test.ts:165,167` asserts both `scheme-v2-client.ts` paths stay deleted |
| Insecure randomness in `api/mwalimu/route.ts` | **real, one file deeper** | no `Math.random()` in the route; `personalized-learning.ts:156` is what the route calls — item 2, and item 4 for why it barely matters until persistence is real |
| DOM XSS in `generate-scheme-of-work-dialog.tsx` | **real, and the worst item on the list** | `document.write` at `:73`, six interpolations of teacher- and model-controlled text at `:97-107`, same-origin `about:blank` — item 1 |
| Format string injection in `data/curriculum/index.ts` | **mis-described, real defect underneath** | TypeScript has no format strings and `.includes()` allowlists don't break out; the actual bugs are an `as GradeLevel` cast on unvalidated input and unguarded week division — item 3 |
| "PR #8 failed CodeQL checks" | **not true of current `main`** | `gh pr checks 20` ran CodeQL green — `Analyze (javascript-typescript) pass`, `CodeQL pass`. Green CodeQL and a live XSS sink are not a contradiction: default queries do not model `window.open` + `document.write` as a sink, so the finding stands and the tooling's green does not |
| §2 Anonymous AI workspaces, multi-modal content, visible model uncertainty | **out of this scope, deliberately** | none is a security fix and none is Omega Claw; anonymous chat also cuts against the 2026-09-29 decision *"we dont need any signups, just the four roles"* and against Stage 1's rule that every learner number traces to a real learner. Belongs in §10 as an owner question, not here |
| §3 DCE and SRCL on the reasoning pipeline | **out of this scope, and out before item 10** | both need a deployed backend to hold state; per the owner's own gate they cannot be built on a codebase that still has an open XSS sink. Recording them where they will be picked up, not silently dropping them |

## Sequencing and what is proven at each step

Order is fixed: 1 → 2 → 3 → 4 closes the security gate; 5–9 are Omega Claw; 10 is not ours to tick.
Items 1–3 are independent of each other. Item 4 should land before item 9, because both decide where
learner state lives.

Each item is one vertical slice, TDD: failing test first, minimal code, then `npx tsc --noEmit` and the
full suite (`npx vitest run --no-file-parallelism`, read the `VITEST_EXIT` line rather than the shell's)
before the next one. Nothing here is a schema change, so production is not touched until the batch is
green — and because Vercel caps deploys per day and one is already spent today, the push is one commit
series with one deploy at the end, not one per item. `docs/ROADMAP.md` §1, §5 and §9 get updated in the
same commit series.

**Security pipeline green means:** no `document.write` in `studio/src`, no `Math.random()` in any id that
leaves the browser, no grade string reaching a `Record<GradeLevel, …>` index without passing
`parseGradeLevel`, and no server module touching `localStorage`. Each of those four is a grep that
returns nothing, and each is asserted by a test that fails when the grep would find something.

As of the S-4 tail all four have a named guard suite behind them, each of which reads source rather than
trusting prose: `scheme-print-is-not-an-html-sink` + `lesson-plan-print-is-not-an-html-sink` (sink 1),
`secure-id` (sink 2), `grade-cast-guard` + `grade-level.test` (sink 3), `mwalimu-no-phantom-memory`
(sink 4). **The security gate is closed as of 2026-09-29 on this tree — coded, typechecked, tested green
locally; not yet pushed, deployed or browser-verified.** Items 5–9 are the Omega Claw work the gate was a
precondition for.

