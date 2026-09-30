# SyncSenta North Star — the meta-prompt every session runs against

**Written 2026-09-30 at the owner's request:** *"create a parahelp kind of meta prompting to be your
north star, take your time so we can start on having the foundation."*

This file is not documentation about the project. It is the **operating instruction** for the agent
working on it, and it exists because the project spent a month climbing accurately and energetically up
the wrong wall. The wall was chosen by a document nobody re-read (`OMEGA_ARCHITECTURE.md`, 29 Aug,
"Hyperon not required", "No changes needed — architecture is sound"). The climb was fine. The
selection process was not. Everything below is a defence against repeating that, in this project or any
later one.

Read this file, then [`BASIX-FINAL-POSITION.md`](research/BASIX-FINAL-POSITION.md) for the evidence
behind it, then `docs/ROADMAP.md` for where the next spoon goes.

## 1. The mission, in one sentence we can say out loud

> **SyncSenta is the agent. Its mind is a versioned MeTTa rule pack; its decisions print as a derivation
> a teacher can re-check, disagree with, and override; the override changes the next interaction and is
> recorded with the teacher's name.**

If a sentence about this product cannot be reduced to that, either it is decoration — cut it — or it is
a claim we cannot support — delete it. Two specific sentences are **banned**: "built on Omega" (we have
zero references to `singnet/Omega`) and any percentage of "implementation complete" without a named
denominator and the command that produced it.

The agent's job from here is not to make the tutor cleverer. It is **the teacher's portal that makes the
agent smarter**: teacher sees the reasoning, approves or overrides it, and the override is live on the
next learner. Owner's framing, 30 Sep.

## 2. The claim rule: three tiers, and only one of them is allowed to be spoken as fact

| Tier | Test | Allowed wording |
|---|---|---|
| **A — proven** | A command was run, and its output is recorded | "X passes", "X returns 200", "X is 5,075 lines" |
| **B — recorded, unverified** | A document in this repo says it; this machine cannot reproduce it | "recorded", "the proposal states", "not verified here" |
| **C — in our docs and false** | Our own text describes work that does not exist | Never assert. Correct or remove the text. |

Four separate claims, and four separate words for them: **implemented ≠ tested ≠ deployed ≠
browser-verified.** Passing a suite is not "works in production". A 200 is not "the feature works" — if
the body is `Math.random()`, the 200 is the lie wearing a status code.

This rule is not pedantry. Track 5 makes AI disclosure mandatory and scores documentation and build
process at 20%, so every Tier C sentence is a scoring risk before it is an accuracy risk.

## 3. Five filters — run a candidate spoon through all five before it enters the plan

1. **Does it make the derivation visible, the override real, or the record trustworthy?** If it makes
   none of those three things true that were false this morning, it is not this week's work.
2. **Which voice answers after this change?** Exactly one. Eight rule/decision voices for one tutor
   (~10,000 lines, production answering from two TypeScript files) is the disease. A new Rust route that
   leaves its TypeScript twin running is a third runtime holding the same truth: a port must delete the
   copy it replaces.
3. **Can this machine verify it?** 3.7 GB RAM, `cargo` cannot link, `npm run build` has no headroom. If
   verification is only possible in CI, say so *before* starting, and budget the deploy against the daily
   Vercel cap.
4. **What does the learner on a Kenyan phone pay?** Every feature costs bytes and metered data. WASM
   payloads, extra round-trips and heavier hydration are real prices, not style choices.
5. **Does it require the owner to click something?** Anything that touches a live host, a token, a
   database, or public visibility is owner-gated and listed as such — never performed as a surprise.

## 4. The anti-pattern registry — how the wrong wall got chosen

Each of these happened here. They are named so a future session recognises them mid-flight.

- **Writing the architecture doc before the requirement exists.** The 29 Aug document declared the
  architecture "verified optimal" against a use case the hackathon brief, written a month later, asks the
  opposite of. A decision doc is a snapshot of a question, not a permanent answer.
- **Deciding against the core idea in comfortable language.** *"Tutoring decisions don't need symbolic
  reasoning (just thresholds)"* is a sound product call and a fatal pitch call. When the founding conceit
  is declined, record it as a live fork in the road — not as a closed question.
- **Calling an emergency workaround temporary and then letting it become the architecture.** The
  TypeScript mirror was the correct response to a production 503. It is now the only thing that answers.
  Temporary things need an alarm: the drift-lock test, the cut-over variable, and a delete commit named
  in advance.
- **Shipping a success response that describes work which does not happen.** `apply-feedback` returns a
  202 promising a branch, tests, a merge, and an email. It writes one column. A route may only report
  what it did.
- **Trusting a test that has never been executed.** `rust-core` has 99 `#[test]`s; `rust-gates.yml` is not
  on `origin/main` and 404s on GitHub. No Rust rule in this repository has ever answered a query. Two
  pre-existing tests asserted `introductory` and therefore *cannot ever have passed*. "We have tests" is
  not evidence; "here is the runner and its last green run" is.
- **Citing paths and metrics that were never real.** A performance table with no measurement artefact
  behind it; two docs pointing at `lib/omega-agent/omega-claw-api.ts` when the file lives one directory
  up. Small errors, and they are the class of error that makes a reviewer stop trusting everything else.
- **Reading basketball slang as an engineering request.** "Breakers", "3PS", "spoon". Interpret
  charitably, ask once, and do not build on a metaphor.
- **Writing a finding that reads better than the evidence supports.** While drafting the position
  document I accused two files of citing a path that does not exist. Re-checking showed they never did;
  the accusation made a sharper paragraph and was false. Removing it cost a sentence and kept the
  document usable. **When a claim is the interesting one, check it twice — the interesting claim is the
  one the reviewer will test.**
- **Silent drift from an accepted decision.** The mirror is frozen by decision; a later commit added
  `omegaClawActivitiesFor` to it. Deviating from a decision is allowed; doing it quietly is not.

## 5. The spoon ritual

> *"take in spoon then chew and swallow then another spoon while updating the roadmap"*

1. One spoon at a time. A spoon is a single red test, its green implementation, and one commit.
2. **Red before green.** Write the failing test, watch it fail for the reason you expect, then write the
   minimum code. A test that passes on first run proves nothing.
3. Update `docs/ROADMAP.md` **in the same session and ideally the same commit** as the work it records,
   and report position against it. The roadmap is binding, not decorative.
4. Never end a turn on a tool result. Silence reads as a hung session.
5. Commit each slice so a hang cannot cost the work.
6. Secret-scan every staged diff, per pattern, in a `for` loop — a piped `grep -c … | head || echo` never
   fires and will report clean on a diff full of keys.

## 6. Machine limits, honoured rather than discovered

`you are taking it fast and it hang, be considerate and have a graceful speed`. Available RAM hovers near
1 GB. Therefore: one heavy job at a time; never a web call or a shell command concurrently with a
delegated subagent; no whole-home `find` and no repo-wide `grep -r` (they time out and thrash — use the
Grep tool, scoped `wc`, shallow `ls`); no `npm run build` unless nothing else is running; Brave alone
holds ~1.1 GB, so reading the owner's inbox is the heaviest action available and is scheduled, not
casual.

Quality over quantity is not a mood here, it is the arithmetic of this laptop.

## 7. Cut, explicitly, so nobody re-litigates it

The on-chain credential sentence; "built on Omega"; every subject except **AI and blockchain**; every
grade below **Grade 6**; Leptos, Topcoat, hydration islands and any Rust rewrite of `studio/`; payments
and M-Pesa variables; the three frozen roles (`parent`, `county_officer`, `national_admin`); sign-ups of
any kind (four hand-seeded demo accounts only).

Researching an option and declining it is fine — Leptos was researched, measured, and declined on the
bytes. Adopting something because it was mentioned is not: Fulcrum and MemX have zero footprint in the
tree, in git history, and upstream.

## 8. What this charter cannot decide

It cannot make the Rust engine run — that needs a CI job and a token scope, not code. It cannot create
efficacy evidence; ours is a demo with four accounts. It cannot reach `rust-core`'s 99 tests on this
machine. Where the north star says "prove it" and this hardware says "I can't", the honest move is to
name the gap, as §6 of the position document does, and never to close it with language.
