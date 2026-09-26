# Working prompt — read this before the next change

Written 2026-09-26. This is the self-brief: the paragraph I re-read at the start of a turn so
the plan lives on screen instead of in working memory. Update the queue in place; do not let
it drift from `AGENTS.md` "Current State", which stays authoritative for facts about the repo.

## The prompt

I am continuing work on SyncSenta, a Kenyan CBC education platform deployed as `studio/` on
Vercel (sentastudio.vercel.app) and `ai-agents/` on Render, with Supabase as the only real
auth and data layer. My job in each turn is one bounded fix, verified, committed thin, and
reported in a form an ADHD reader can act on: next action first, numbered steps, state
restated as "step n of m", concrete time estimates, no preamble and no closing pleasantries.
The platform's centre of gravity is the deterministic tutoring policy
(`evaluateTutoringDecision()`, TypeScript and Rust in byte-for-byte parity) and the honesty
rule that language models render language while that policy decides instruction; open-weight
decision models like Laya are experiments behind `LAYA_AFFECT_ENABLED`, off by default, and
must not enter the scaffolding decision. What keeps breaking is not the AI, it is the shell:
two auth systems still coexist, so the recurring root cause of a blank screen is code reading
a `userRole`/`userEmail` cookie that nothing writes any more — every such reader is a bug, and
the fix is always the same three options: `useAuth()` on the client,
`createSupabaseRouteHandlerClient()` on the server, or a redirect to `/auth/signin`. I do not
claim a gate passes without running it (`npx tsc --noEmit`, `npx vitest run
--no-file-parallelism`), I do not start a download, model, or build on this 3.7GB laptop
without checking the memory cost, I do not touch Supabase, Vercel, Render, or any payment
path (development phase: no cash), I write a failing test before a bugfix and delete nothing
until I have read it, and I hand over the click for anything that publishes, submits, or
spends money, because those are the user's accounts and their name.

## Standing constraints

1. **Machine**: 3.7GB RAM, swap already full. Cap Node heaps
   (`NODE_OPTIONS=--max-old-space-size=1400`), run vitest serially, never run torch or a
   Next production build here. Long jobs go to background and the exit code gets read from
   the output file, not inferred from the notification.
2. **Scope**: no M-Pesa or payment work while in development.
3. **Ownership**: Supabase / Vercel / Render / GitHub are the user's to operate. Read-only
   inspection is fine; changes and publishes are theirs.
4. **Skills applied per change**: `superpowers:systematic-debugging` before any fix,
   `superpowers:test-driven-development` for the failing test,
   `superpowers:verification-before-completion` before claiming green,
   `superpowers:requesting-code-review` on a slice, and `i-have-adhd` on the shape of every
   reply.
5. **Repo rules from `AGENTS.md`**: no new top-level directories, no `unwrap()`/`expect()` in
   non-test Rust, no TODO/FIXME in committed code, no Rust→Go/Node migration suggestions.

## Queue

| # | Step | Time | Done when |
|---|---|---|---|
| 1 | ~~Land the blank-`/dashboard` fix~~ | done | `fd2b98b` on `fix/legacy-auth-surface` |
| 2 | ~~Sidebar + reports read `useAuth()` instead of the `getServerUser()` cookie action~~ | done | `c412087`; repo-wide test bars `"use client"` + `getServerUser()` |
| 3 | ~~Chat survives a single-provider outage~~ | done | `resolveLlmTargets()` in `src/lib/llm/provider-chain.ts`, wired into `app/api/chat/route.ts`; 397 tests green. Still needs a second key on Vercel to actually have a backup |
| 4 | Decide the trust/consent backend: rebuild `getBackendActor()` on Supabase or disable the surface, and note Firestore writes are dead | ~30 min to decide, ~2 h to rebuild | no half-alive privacy endpoint that returns 403 to every real user |
| 5 | Delete the now-unreferenced `getServerUser()`/`signupUser()` actions in `lib/auth.ts`, and fix the sidebar's own `/dashboard` links | ~40 min | the legacy cookie contract is gone, not just unread |
| 6 | Replace the hardcoded `/student` assignments and learning path with real queries, or label them demo in the UI | ~2 h | page state traceable to Supabase rows |
| 7 | Push `fix/legacy-auth-surface`, open the PR, check the Vercel preview as all four demo roles | ~25 min, needs the user's approval to push | preview green; browser pass documented per role |
| 8 | Return to the original order: land `feat/grade6-ai-blockchain-curriculum`, prune merged branches | ~1 h | branch count down; grade-6 work on `main` |

Step 4 is next. Steps 1 to 3 are committed locally and **not deployed** — the live app
still shows the old behaviour until the branch is pushed, reviewed, and merged.
