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

Evidence for that sentence, run on this machine on 2026-09-29 against the uncommitted batch:

- `npx tsc --noEmit` → **exit 0, no diagnostics.** This is what proves the deletions were clean:
  the sign-up page, the sign-up form, the wallet button, the quick-login component and
  `/login/student` are gone, and no remaining module imports them or calls `signUp()`.
- `npx vitest run --no-file-parallelism` → **627 passed, 3 failed, 17 skipped** across 74 files
  (`VITEST_EXIT=1`). All three failures are in `src/lib/__tests__/schema-coverage.test.ts`, the
  untracked re-baseline item already listed under Stage 1 — it is red because its hardcoded live
  count does not match the catalog (read 2026-09-29: **35 public tables**), and its allowlist names
  21 of the 38 tables shipped code reaches that production does not have. **It was red before this
  batch and is red independently of it**; it is deliberately not committed until re-baselined, so CI
  stays green and the finding stays here.
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

Committed locally, **nothing pushed** (deliberately — Vercel caps deployments per day, so a batch of
work earns one deploy rather than six). `git diff origin/main HEAD` is the real delta, because PR #17
was squash-merged and `origin/main..HEAD` overcounts; 36 files, +3117 / −1475 as of 2026-09-29.

| Commit | What it is |
|---|---|
| `62acc87` | this map, rewritten to cover the work actually in flight; the previous map archived; `docs/research/ASI-DAPP-PATH.md` added |
| `2a101a2` | Stage 1 defects 1–3 — transcript count, subject→competency resolution, Nairobi calendar days |
| `2be809e` + `fd97acb` | Stage 1 defect 4 — the ledger DDL, then its apply and the three defects running it found. **Production holds this** |
| `2916dd5` | Stage 0 — one gate: a signed-in visitor is never asked to sign in again; sign-up deleted |
| uncommitted | the points code task below: `points-system.ts`, `progress-tracking.ts`, `/api/chat`, `types.ts`, `points-award-on-mastery.test.ts` |

`studio/src/lib/__tests__/schema-coverage.test.ts` stays untracked until it is re-baselined: a
committed red test only teaches people to ignore red.

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
- [ ] Re-baseline `schema-coverage.test.ts` (untracked since 2026-09-28; reports 38 gaps against a
      21-name allowlist) so the allowlist reflects the live schema — **35 public tables as read from
      `information_schema` on 2026-09-29**, `point_transactions` included. The file's own hardcoded
      counts (26, then 27, then 34 in various places) have all been guesses; re-baseline from this
      read and nothing else.

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
| Landing page routes a session straight to the role dashboard | yes | yes — `auth-role-routing` (47) | **no** | no |
| Sign-up flow removed, four demo roles are the entry | yes | yes — deletion is locked | **no** | no |
| Student tutor (`/api/chat`) | yes | yes | yes | yes (real streamed reply) |
| Chat transcript + counters (Stage 1 defects 1–2) | yes | 16 tests pass | **no** | no |
| Nairobi-timezone activity days and streaks (defect 3) | yes | same suite | no | no |
| Points ledger, scope columns, leaderboard + award RPCs (defect 4, **schema**) | yes | **yes — against production**, V1–V7 in the migration file: catalog read-back, award recompute, column-guard no-op, real `get_leaderboard` call, `42501` for `authenticated`, cleanup re-read | live in the database (applied 2026-09-29) | n/a — no UI reads it yet |
| Points, mastery award in code (`awardCompetencyMastery` → `award_points`, `/api/chat`) | yes | yes — 13 tests, red-then-green; `tsc --noEmit` clean | **no** — local commit only | no |
| Points, streak rewards, class leaderboard (**learner-visible**) | **no** — the ledger is written by code that is not deployed, and nothing renders a board | no | no | no |
| Classroom-scoped leaderboard with real rows | code exists | **no** — production has 0 `school_classes` and 0 profiles carrying a `classroom_id`, so there is nothing to rank | live RPC | no |
| Teacher analytics from live tables | partial | no | no | no |
| `get_teacher_students` / `get_teacher_alerts` | called by code | — | **the RPCs do not exist** | no |
| Offline / PWA | service worker exists | never registered | — | **0% live** |
| Lesson generation (`/lesson-architect/*` on Render) | yes | yes | **not redeployed** | no |
| Rust `/api/v1` backend | yes | no | **deployed nowhere** | no |
| Evidence anchoring / Merkle verification (Stage 3) | no | no | no | no |
| Multi-tenancy, indigenous languages (Stage 5) | no | no | no | no |

**Known measurement gap**: `Code Quality Metrics` in the archived roadmap claimed
*"Linting Errors: 0 ✅"*. That is unsupported. `studio/package.json` declares no `eslint`
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
2. `gh` lacks the `workflow` scope, so `studio-gates.yml`'s Node 22 fix sits on the local branch
   `ci-node22-pending`. Either `gh auth refresh -s workflow` or edit the file in GitHub's web UI.
   Until then CI unit tests cannot pass on Node 20.
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

---

## 9. Standing verification gaps

Things that are *not* proven, restated so nobody (including a future session) has to guess:

- `next build` has never been run locally on this batch, and will not be: it is the heaviest thing on
  a 3.7 GB machine and Vercel runs it anyway on deploy. What was run 2026-09-29: `tsc --noEmit`
  **exit 0**, and `vitest run --no-file-parallelism` **627 passed / 3 failed / 17 skipped** across 74
  files, the three
  failures all in the untracked, not-yet-re-baselined `schema-coverage.test.ts`.
  **Piping vitest through `tail` reports exit code 0 even when tests fail**, so read the output file —
  the run's own `VITEST_EXIT` line, not the shell's.
- `schema-coverage.test.ts` is the map's own blind spot made visible: 38 tables that shipped code
  queries do not exist in production, against a 21-name allowlist, and its hardcoded live count is a
  guess. Read from `information_schema` on 2026-09-29 the live count is **35 public tables**, which
  matches none of the numbers this file has carried. Re-baseline it against that read, then commit
  it. Until then it stays untracked, because a committed red test would only teach people to ignore
  red.
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
- **The points code is unit-green and production-blind.** `award_points` now has a caller — but only
  in a local commit. Nothing has been deployed since the ledger went in, so on
  `sentastudio.vercel.app` a learner who masters a competency still gets 0 points, and the deployed
  build could not reach the ledger if it wanted to: `types.ts` there has no `award_points` entry and
  `points-system.ts` there is still the read-modify-write. The 13 tests assert the wiring at the
  boundary of a fake client; they do not prove the real service key passes `42501`-free, and a
  double-transition race has no idempotency key underneath it yet. What closes this is one deploy and
  one real learner crossing into `mastered`, read back from `point_transactions`.
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

---

## 11. How to update this file

At the end of a work session, in the same commit as the work: move the checkboxes, change §1's
"where we are", add a row to §8 for any decision made, and demote anything in §5 whose evidence
turns out not to exist. If a claim cannot be traced to a command, a query, or a URL that was
actually opened, it belongs in §9, not in §5.
