# Decision: Rust is the primary backend — and what that does *not* mean

Status: **accepted, 2026-09-28**. Owner: dgithinjibit. Supersedes any earlier
note that described the Rust service as "not deployed" without saying what
should replace it.

## What was decided

> "rust is going to be our primary backend and frontend as of now … whatever we
> are to start now should be foundation, there will be no change lets say next
> year or even later on … a stone foundation."

Two things are bundled in that sentence, and they have to be separated, because
one is a sound engineering decision and the other would end the product.

1. **Rust as the authority for logic and data.** Agreed, and it is already true
   in the code: `rust-core/` is the adaptive-policy source of truth,
   `backend/syncsenta-backend/` owns `/api/v1/omega-claw/*`, and the MeTTa rule
   pack lives in `data/omega_claw_rules.metta`.
2. **Rust as the delivered UI.** Not agreed as a rewrite of `studio/`. This is
   the part that needs a second look, and the reason is in the next section.

## Why "Rust frontend" cannot mean rewriting `studio/` today

The deployed product is `sentastudio.vercel.app`. What lives in it is not
scaffolding that can be re-implemented elsewhere — it is the accumulated
corrections of the last two days, each one found by breaking the live site:

- the Supabase cookie-aware route handler that makes RLS apply to a learner's
  own requests (`lib/supabase/route-handler.ts`), after the service-role client
  was found silently bypassing row-level security;
- the legacy-shell identity fix, where a session that looked logged in was not;
- the provider-chain fallback that stops one retired Groq model from ending
  every conversation;
- the Omega Claw rule mirror, which is the only reason a Grade 6 learner gets a
  pedagogical next-action instead of a 503;
- 519 passing tests, and gates that run the same way locally, in CI, and on
  Vercel (Node 22).

A rewrite in Leptos or Yew starts at zero on all of that. It does not inherit
the fixes; it re-derives the bugs. And the rewrite would happen in the one area
where this machine cannot help: it has 3.7 GB of RAM and cannot run
`npm run build`, let alone a Cargo+wasm toolchain, so every mistake would be
discovered in CI at several times the cost.

**The foundation the learner needs is not a language. It is one source of truth
per fact.** That is the actual stone. Rust can be the authority for the facts
that matter most — the adaptive policy, the rule pack, the persistence — and the
product still has to be a web app children can open today.

## The position this document takes

| Concern | Authority | Delivery mechanism |
|---|---|---|
| Adaptive policy, pedagogy rules | Rust + MeTTa pack | Compiled service; TS mirror until it is not needed |
| Auth, sessions, RLS, learner data | Supabase Postgres | Either runtime, same tables, no second store |
| Screen, interaction, accessibility | `studio/` (Next.js/TS) | Vercel |
| Generation (lessons, schemes, exams) | `ai-agents/` FastAPI | Render, moving behind Rust as routes are ported |

TypeScript is the delivery mechanism, not the source of truth. That is a
sustainable split, and it is the only version of "Rust primary" that leaves a
working site at the end of it.

## The condition that makes this real, instead of aspirational

The TypeScript mirror in `studio/src/lib/omega-agent/omega-claw-rules.ts` is
scaffolding. It is allowed to exist **only** while all three are true:

1. `backend/syncsenta-backend` is not deployed where Vercel can reach it;
2. the mirror is pinned to the MeTTa pack by a test that parses
   `data/omega_claw_rules.metta` and compares row for row
   (`studio/src/lib/__tests__/omega-claw-rules.test.ts`);
3. `SYNCSENTA_BACKEND_URL` being set immediately and completely transfers
   authority to Rust — which it does, because the proxy path is taken when the
   variable is non-empty and there is no loopback default.

**When `SYNCSENTA_BACKEND_URL` is set in production and stays set through one
release, the mirror and its drift lock should be deleted.** Two copies of the
same pedagogy is precisely the disease; the mirror is a temporary, monitored
exception to the rule, not an exception that quietly becomes the architecture.
The drift lock is the alarm that keeps it temporary.

## What changes for the roadmap

- **Frozen, not deleted:** `parent`, `county_officer`, `national_admin`. The
  three live roles are `student`, `teacher`, `head`. The other roles stay in
  the schema so that unfreezing later is a config change, not a migration — see
  the role source-of-truth decision.
- **No payments** while this is development. The M-Pesa routes remain in the
  tree and their variables must never be set.
- **Port order, when Rust goes live:** persistence and consent first (that is
  where child-data law bites), then the Omega Claw decision endpoints, then
  generation. UI is last, and only if there is a reason a web frontend cannot
  serve it.
- **Every port must delete the copy it replaces.** A new Rust route that leaves
  the TS version running is a third runtime holding the same truth.

## Unresolved, honestly

This decision is written before Rust has been deployed anywhere. Until
`/api/v1/omega-claw/*` answers from a real host, "Rust is primary" describes the
target, not the running system — and the running system is TypeScript answering
pedagogy questions locally because the alternative is a 503. Both statements
belong in the record; only pretending the second one is untrue is not allowed.
