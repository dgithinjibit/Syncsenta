# Decision: one rule voice, what renders it, where it runs, and how it is proved

Status: **accepted, 2026-09-29**. Owner: dgithinjibit.
Closes task #22 ("Decide which language Omega rules live in, and retire the copies").
Extends [`decision-rust-primary-backend.md`](decision-rust-primary-backend.md) — that file
decided *Rust is the authority*; this file decides *what happens to the copies*,
answers the frontend question that decision left open, and records the finding that
changed the plan: **the Rust rule engine could not answer a single question.**

Every claim below is either a command output or a quoted decision from the account
holder. Where a choice was made under a constraint that no longer holds, the constraint
is stated so the choice can be revisited on evidence rather than on memory.

---

## 1. What was decided, in the account holder's words

| # | Decision | Said as |
|---|---|---|
| 1 | Rust is the one voice for Omega Claw rules; no new TypeScript rules | "No ts now, just rust" |
| 2 | The existing TS mirror is frozen and deleted at cut-over, not edited and not deleted today | "Freeze it, cut it at cut-over" |
| 3 | CI runs the Rust tests, because they cannot run on this laptop | "CI runs the Rust tests" |
| 4 | The hybrid stays: Rust decides, Next.js renders | "Next.js as a thin client that renders what Rust tells it" |
| 5 | The frontend question — "can we have frontend as rust instead of next js?" — is answered here, section 4 | — |

Decision 1 was on the table since 2026-09-28 as an *intent*. It is executed as of
2026-09-29: `activities_for()` was written in Rust, and the TypeScript copy of that
rule was reverted rather than added to. That revert is the visible edge of the
decision — the discipline is "a new rule goes into the pack and the Rust façade only".

## 2. Three copies existed; here is what each one was for

| copy | lines | what it legitimately owned | what it illegitimately owned |
|---|---|---|---|
| `backend/…/data/omega_claw_rules.metta` | 51, 35 statements | the rules themselves | nothing — this is the source of truth |
| `backend/…/src/metta_core/omega_claw.rs` + `interpreter.rs` + `handlers/omega_claw.rs` | 1,148 | the typed façade and the HTTP contract | nothing, once it could answer |
| `studio/src/lib/omega-agent/omega-claw-rules.ts` (+ 230-line drift lock, + 164-line API client) | 230 | keeping a learner getting *some* pedagogy while Rust was undeployed | the right to grow new rules |

The third row is the whole problem. It existed because of a measured production
failure — on 2026-09-28 `sentastudio.vercel.app` answered
`503 {"error":"Omega Claw backend is unavailable","backend":"http://127.0.0.1:8080/api/v1"}`
for every hint and every progression request, so the rule pack was dark and the
component's hardcoded strings were the pedagogy. The mirror fixed the outage. It also
created a second voice, which is how `blockchain-consensus` ended up on the Grade 6
card: the React component listed activities the pack refuses for Grade 6, and
`explain-your-thinking`, which the pack has never heard of.

**Rejected: keep both and stay in sync.** Syncing is not a state, it is a job, and the
job was already losing. The drift lock (`omega-claw-rules.test.ts` parses the `.metta`
file row by row) proves the copies *agree*; it cannot prove they *should both exist*.
Two voices means every pedagogical change needs two reviews and one forgetful commit
reintroduces the bug the rule was written to fix.

**Rejected: delete the mirror today.** Vercel cannot reach the Rust service — it is
deployed nowhere, and this laptop cannot compile it (section 6). Deleting the mirror now
re-opens the 503 that is the reason learners got no scaffolding at all. The mirror is the
emergency exit; you remove it once the building is safe, not before.

**Chosen: freeze, then cut at the same commit that flips the switch.** Concretely —
the day `SYNCSENTA_BACKEND_URL` is set in the Vercel project and stays set through one
release, delete `omega-claw-rules.ts`, `__tests__/omega-claw-rules.test.ts`, and the
local-evaluation branch of `omega-claw-api.ts` in that commit. `omega-claw-api.ts`
already transfers authority completely when the variable is non-empty, so the cut is a
deletion, not a migration. Until then the drift lock stays green and the file takes no
new rules.

## 3. The finding that changed the plan: the Rust voice was silent

Wiring the new rule into the HTTP layer meant reading the query path. It had never
worked. Three independent defects, all now fixed, all with a test:

1. **A query was an assertion.** `MettaSpace::query` handed the expression to
   `fallback_backend::eval_top_level`, which treats anything not starting with `(=` or
   `(!` as a *fact to add* and echoes it back. Every caller in the crate passes a bare
   pattern, so `scope_for("Grade 6")` inserted `(omega-claw-scope-for grade6)` into the
   space, received that same string as its "answer", read its last token (`grade6`),
   matched neither `introductory` nor `senior-deep`, and returned **`blocked`**.
   `is_activity_allowed` then refused every activity for every learner, and `atom_count`
   grew by one per request and never came back down.
2. **`$` was only a wildcard on the query side.** Rules are stored as `(lhs, rhs)`
   rewrites, so a rule's variables arrive as the *`atom` argument* of `pattern_match`.
   `(= (omega-claw-can-unlock-transfer $correct $explained) no)` therefore matched
   nothing: any answer that was not exactly `true true` raised "Omega Claw rule returned
   no result" rather than returning `no` — the progression endpoint errored on the common
   case (a wrong answer) and only worked once the learner had already passed. The same
   made `(= (omega-claw-scope-for $lower-grade) blocked)` decorative; `scope_for` reached
   `blocked` only via its own default branch.
3. **`load()` re-asserted the whole pack, and every handler calls it.** Startup plus two
   visitors put three copies of each `(omega-claw-activity …)` row in the space, so the
   Grade 6 path listed nine entries and the space grew 35 atoms per request.

Consequence for the record, stated plainly: **the two pre-existing `#[tokio::test]`s in
`omega_claw.rs` assert `introductory` and therefore cannot ever have passed.** They are
the mechanism behind ROADMAP §5's "0 of 35 statements have ever been executed". Any
earlier claim that "the TS mirror is a copy of working Rust logic" was a claim about code
that had never answered a question — which is exactly why the mirror, not the pack, was
carrying production.

This is not an argument against decision 1. It is the reason decision 3 (CI) had to be
made *before* more rule work, and the reason the next Rust rule cannot be trusted until a
runner has executed it.

## 4. "Can the frontend be Rust instead of Next.js?"

Answered as asked, with the size of the thing measured rather than remembered:
`studio/src` is **246 `.tsx` files and 129,501 lines of TypeScript**, and the deployed
product is the accumulation of corrections found by breaking the live site — the
cookie-aware Supabase route handler that makes RLS apply to a learner's own requests, the
session-that-looked-logged-in fix, the provider-chain fallback, the CSP that was blocking
hydration, plus the route-export gate that only `next build` can enforce.

**Rejected: rewrite `studio/` in Rust now.** A rewrite does not inherit those fixes; it
re-derives the bugs. It also happens in the one area this machine cannot help: 3.7 GB of
RAM, no working Cargo link for this crate, no `npm run build` headroom — so every mistake
surfaces in CI at several times the cost. And it is not a free swap: **Vercel cannot host
a long-lived Rust process**, Node and Edge functions only. Choosing a Rust-rendered UI
means leaving Vercel in the same commit, which is a hosting decision, a rebuild of the
`next/image` and middleware behaviour learners depend on, and a new CSP story — not a
language choice.

**Would be lighter, if the day comes:** Axum + server-rendered templates + a little HTMX
is genuinely smaller over the wire than a Next.js bundle — no client router, no hydration,
no RSC payload. That is the honest version of "faster". What it buys at the same price:
every interaction the studio has today (optimistic gamification updates, the streaming
tutor, the drag-based challenge cards) becomes hand-written endpoints plus partial-HTML
round trips, and the 519-to-714-test suite that keeps learner-visible regressions out
starts from zero.

**Chosen: keep the split, and make it real.** Rust owns the decision, Next.js owns the
screen, and the screen asks. The concrete shape landed on 2026-09-29: `GET
/api/v1/omega-claw/:grade/scope` now answers `{grade, scope, activities[]}`, so the
learner card renders the path the pack itself lists instead of a second written-down
copy. That is the "thin client that renders what Rust tells it" — one endpoint, one voice,
no new runtime. Revisit only if there is a measured reason a web frontend cannot serve it.

## 5. Where the Rust service runs

Measured constraints, not preferences:

| host | can it run Axum? | Africa region | cold start / idle | cost |
|---|---|---|---|---|
| Vercel | **No** — Node/Edge functions only | no | n/a (not applicable) | free tier used |
| Render | Yes (`render.yaml` already declares `syncsenta-backend`, runtime rust) | **No** — Oregon, Ohio, Frankfurt, Singapore | free web services spin down after 15 min idle, ~1 min to wake | free tier, then paid |
| Fly.io | Yes | no Johannesburg; Nairobi/Egypt-adjacent closest | near-instant wake | free allowance, then pay-as-you-go |
| GCP `africa-south1` (Johannesburg) / AWS `af-south-1` (Cape Town) | Yes | **Yes** | none (always-on) | ~US$7–15/mo for a small instance |
| Hetzner VPS (eu-central) | Yes | no | none | cheapest always-on |

**Chosen for the first deploy: Render.** It is not the best answer for latency to Kenya —
it is the answer that costs nothing and is already written down: `render.yaml` declares the
service, the build command (`cargo build --release --package syncsenta-backend`) and the
start command, and nobody has to choose a cloud while the pedagogy is still moving.
Two consequences accepted out loud, because they will be asked about:

- a free Render service **sleeps after 15 minutes idle**, so the first learner of the
  session waits ~1 minute. That is a bad experience for a product whose whole claim is
  responsive scaffolding, and it is the reason to keep a keep-alive (section 7) and the
  reason this is a *first* deploy rather than the final one;
- the nearest honest latency win is a Cape Town or Johannesburg instance, which costs
  money. When there is a real learner cohort, that purchase is the decision, and
  Hetzner is the cheap always-on middle option.

**Constraint that applies to every one of them:** sqlx must pool to Supabase in **session
mode**, not transaction mode. Transaction-mode PgBouncer/Supavisor breaks prepared
statements and `SET LOCAL`-style `request.jwt.claims` setting, which is the mechanism RLS
policies depend on. Getting this wrong does not error loudly; it silently disables
row-level security. See `decision-single-schema-history.md`.

## 6. How any of it is proved: CI runs the Rust tests

`cargo check` and `cargo test` for `syncsenta-backend` both exit 101 on this laptop.
Cause, measured: `cc` is a zig-built musl clang 18.1.6 with no `gcc` on the box, and
`ring` 0.17.14 aborts with "unable to parse target query 'x86_64-unknown-linux-gnu':
UnknownOperatingSystem". `cargo tree -i ring` shows ring is unavoidable — it is a direct
dependency of `jsonwebtoken`, plus `rustls`, `reqwest`, `ethers` and `sqlx`. Installing
`build-essential` needs root and is not this machine's job to assume.

**Rejected: skip the Rust tests and trust the code.** The three defects in section 3 are
exactly the class of bug that survives reading and dies on execution. A suite that has
never run is a file of intentions.

**Rejected: install a toolchain here.** A full rustup + native toolchain on a 3.7 GB
machine is the same memory wall that already stopped `npm run build`, and it would be a
download the account holder did not ask for.

**Chosen: `.github/workflows/rust-gates.yml` runs `cargo test -p syncsenta-backend` on
`ubuntu-latest`,** where gcc exists and ring builds. Pushing that file is blocked until
the `gh` token carries the `workflow` scope (`gh auth refresh -h github.com -s workflow`),
which is why it is written and staged rather than running.

**Interim gate, and the honest shape of it:** the fallback engine is pure Rust with no
external dependencies, so it compiles with bare `rustc` alone. `/tmp` is wiped between
sessions, so the harness lives at `~/.cache/syncsenta-probe/` (`sh run.sh`), holding a
transcribed copy of `fallback_backend` plus a faithful transcription of the façade, and
running the **real** `data/omega_claw_rules.metta` from the repo. 31 assertions: five that
demonstrate each defect still fails when the two pre-fix lines are switched back on, and
26 that pass against the fixed engine — including "120 queries leave the space at 35
atoms" and "200 further `load()` calls leave 35 atoms and one path".

### The constraint that shapes the CI job

Writing the workflow found a fourth fact: **64 of the crate's queries are compile-time
checked `sqlx::query!` macros and there is no committed `.sqlx/` offline data.** A crate
like that does not build without a live schema — so `cargo test` is not a runner problem,
it is a database problem, and it has been unsolvable in every environment that ever tried
it quietly. That is the fuller answer to "why has this suite never run": not only is there
no linker here, there is no schema to compile against anywhere.

`.github/workflows/rust-gates.yml` (written 2026-09-29, pushed as soon as the token has
the `workflow` scope) therefore starts a `postgres:16-alpine` service, applies the crate's
own eight `migrations/`, and then builds and tests. Two things follow:

- **Render has the same requirement.** `render.yaml` runs
  `cargo build --release --package syncsenta-backend`, so `DATABASE_URL` must be set on the
  service **before the first build**, not after it starts. Declaring the variable is not
  enough if the value arrives late — the build step fails with a sqlx macro error that
  looks like a code problem. This is the most likely reason a first Rust deploy goes red.
- **`sqlx prepare --locked` is the better long-term shape.** Committing the generated
  `.sqlx/` would make CI hermetic, remove the Postgres service, and — the part that matters
  for this laptop — let `cargo check` run against the offline data instead of a database.
  It needs one machine with both a working link and a migrated database, which is now CI
  itself. Logged as a follow-up, not done here.

What this proves and what it does not: the probe proves the *engine and façade logic*
against the real pack. It does **not** prove the crate compiles, that the `metta`-feature
path works, or that the Axum handlers serialise what the tests say they do. Those remain
open until CI runs. The probe deliberately stays outside the repo: a second copy of the
engine inside the tree would be the same disease this document is about.

## 7. The Render keep-alive the account holder remembered

Asked on 2026-09-29: "i had a sh file that kept render alive so yeah that was a cron job
if i'm not wrong?" Searched, and it is not here:

- `crontab -l` → "no crontab for skware";
- `~/bin` contains only `shot`; no systemd timer mentions Render;
- the only `schedule:` block in `.github/workflows` is `fetch-bible-corpus.yml`'s weekly
  `17 3 * * 0`;
- `RENDER_API_KEY` appears **by name only** in `.env.example`, `studio/.env.example` and
  `studio/.env.cbc-agent.example`, and is not set in this environment;
- the `.sh` files in the tree are `scripts/rust-adaptive-readiness.sh` (a read-only health
  probe), `scripts/verify-hyperon-bridge.sh`, `scripts/production-readiness.sh`,
  `scripts/start-dev.sh`, `studio/vercel-build.sh`, `.kiro/autonomous-build.sh` — none
  pings a Render URL.

Most likely it lived on another machine or in the Render dashboard itself. Until it is
found or replaced, the free service sleeps, and the keep-alive is an account-holder task
logged in ROADMAP §7 rather than something this repo can do quietly. A `curl` of the
`/healthz` endpoint every 10 minutes from CI would work but spends Actions minutes on a
job that is not testing anything, so the honest options are: pay for a persistent service,
or accept the cold start and tell learners about it.

## 8. What this decision does not cover

- **`rust-core/` + `rust-service/` at the repo root** are a *third* Rust voice: ~5,300
  lines, 17 modules, no omega-claw code at all, absent from `render.yaml`. This document
  chooses `backend/syncsenta-backend` as the rule service; it does not decide what happens
  to the adaptive-service crates. That belongs with the single-schema-history decision,
  which already blocks the first Rust foundation layer.
- **The Python `ai-agents/` service** keeps generation (lessons, schemes, exams) until
  those routes are ported, per the port order in `decision-rust-primary-backend.md`.
- **Everything the mirror is currently load-bearing for** stays with the mirror until the
  cut-over. Production today answers pedagogy from TypeScript. Both facts are in the
  record.

## 9. Cut-over checklist

Ordered; each step is one commit, and the last step is the one that makes this document's
title true.

1. `gh` token gets the `workflow` scope → push `.github/workflows/rust-gates.yml` →
   **first honest red/green on the Rust suite**. If it is red, fix before deploying.
2. Create the Render service from `render.yaml` (`syncsenta-backend`) with **`DATABASE_URL`
   set before the first build** — the 64 compile-time-checked sqlx macros need a schema to
   validate against at build time, not at run time — then `REDIS_URL`, `JWT_SECRET`,
   `PORT`. Deploy.
3. Verify from the outside: `GET /api/v1/omega-claw/grade6/scope` returns
   `scope: "introductory"` and three `activities` — the exact list in section 3 of
   `SCOPE-SECURITY-AND-OMEGA.md`, no more, no less.
4. Set `SYNCSENTA_BACKEND_URL` in Vercel **on a preview first**, keep it set through one
   production release, and watch that no request falls back.
5. Same commit: delete `omega-claw-rules.ts`, `__tests__/omega-claw-rules.test.ts`, and
   the local-evaluation branch of `omega-claw-api.ts`. Update ROADMAP §5 so the ledger says
   the rule pack executes on a real host.
6. Only then does item 10 of the scoreboard (`O-6`, MeTTa executing) close.
