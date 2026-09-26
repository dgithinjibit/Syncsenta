# Submitting "what we have" to an AGI / AI-in-education venue

Date: 2026-09-26. Status: planning document — nothing has been submitted.

## First, which "AGI Summit"

The name is overloaded, and the three events that answer to it are in very different
positions today (2026-09-26). Facts below were checked against each organiser's own
page; anything I could not confirm is marked as such.

| Event | What it is | When / where | Submission status |
|---|---|---|---|
| **AGI-26** — 19th Conference on Artificial General Intelligence | Peer-reviewed academic series, proceedings via Springer (LNAI). Full papers ≤15 pages, "Short Technical Communications" ≤4 pages. | San Francisco, **27–30 July 2026** | **Closed** — papers were due 20 April 2026 and the event has already run. |
| **AGI-27** — 20th AGI Conference | Same series. | Summer 2027, city not announced | CFP "opens in early 2027". The series centres on cognitive architecture and theory; applied classroom systems are not explicitly in scope. |
| **AGI Summit** (agisummit.ai) | Commercial/industry summit, not a paper venue. | **21–22 November 2026**, Santa Clara | No call for papers. Participation is via speaker / pitch / demo application. A third-party listing also advertised a *different* "AGI Summit 2026" (Bay AI Circle, 18–19 July, Palace of Fine Arts) that has already passed — do not confuse the two, and re-verify any application link on the organiser's own site before submitting personal or project details to it. |

Two adjacent venues fit our material better than the AGI series, because both ask for
deployed systems rather than theory:

- **AIED** (International Conference on Artificial Intelligence in Education). The 2026
  call opened submissions on 20 December 2025 with full papers due 2 February 2026, and
  explicitly encouraged work in **"low-resource and development contexts"**, plus
  practitioner/industry, late-breaking and interactive/demo tracks. Expect **AIED 2027**
  to open around December 2026 — roughly ten weeks from now — with full papers ~14 pages
  and short ~8.
- **AI for Good Global Summit** (ITU, Geneva). Homepage did not expose 2027 dates or an
  application route at fetch time; **unverified**. Worth a manual check — it is the
  natural home for "AI tutoring as a public good in Kenya".

**Recommendation:** aim the *research* submission at **AIED 2027** (short paper or
late-breaking/demo: it wants exactly our profile and our context is underrepresented),
and treat **AGI-27** as an optional 4-page architecture communication if we can frame the
deterministic-policy claim as cognitive-architecture work. Use the November industry
summit only if the goal is visibility rather than a citable publication. Whichever it is,
the artefact below is the same: an abstract plus a measured-evidence plan.

## What we actually have that survives review

Everything here is in the repository and reproducible, which is the bar a reviewer sets:

1. **A pedagogical policy that is not an LLM.** `evaluateTutoringDecision()`
   (`studio/src/lib/omega-agent/metta-core.ts:810`) maps integer mastery + hint count +
   one boolean to Independent / Guided / Intensive, with thresholds
   `{40, 80, ≥2 hints}`, and is kept byte-for-byte with
   `rust-core/src/agent_runtime.rs`. Cost: microseconds. Replayable. The LLM is a
   renderer, not a decider.
2. **Affect as a measured input, not a vibe.** The emotion channel is a keyword scanner
   (`studio/src/lib/omega/emotional-intelligence.ts`) whose only job is to raise
   `frustrationSignal`. We ported it to Python and *proved* behavioural identity with a
   differential harness that compiles the real TypeScript and runs generated text through
   both: **4,000 cases, 0 mismatches**
   (`ai-agents/scripts/check_keyword_baseline_parity.py`,
   `ai-agents/tests/test_keyword_baseline.py`). The port deliberately reproduces the
   scanner's failure modes (`'help'` → frustrated, punctuation → excited) rather than
   hiding them.
3. **A fail-open System-1 experiment, gated off.** `AffectRouter`
   (`ai-agents/src/syncsenta_agents/decisions/affect.py`) asks
   [Laya](https://huggingface.co/convaiinnovations/laya) — a 421M Apache-2.0 ModernBERT
   decision model — for frustration / teacher-alert / urgency in one forward pass, and on
   *any* failure returns the keyword baseline with a `fallback_reason`. It never raises,
   and it is behind `LAYA_AFFECT_ENABLED`, off by default. The design note
   (`docs/architecture/laya-decision-router.md`) records the part of the loop it must not
   enter.
4. **A real constraint as the research question.** Rural Kenyan connectivity, shared
   low-end devices, intermittent power, Kiswahili/Sheng code-switching, CBC competency
   structure. That is the setting AIED's "low-resource and development contexts" line is
   about, and we are inside it rather than describing it.
5. **Trust mechanics under audit.** Self-sovereign learner identity (W3C DID +
   verifiable credentials) is in the requirements, and we just closed a live
   privilege-grant bug where an unauthenticated endpoint minted role cookies — a
   concrete, dated case study in what breaks when an education platform moves auth
   systems underneath itself.

## What we do not have, and a reviewer will ask for

Do not submit until at least the first two are closed. Claiming otherwise is how a
short paper becomes a rejection.

1. **No learning-outcome data.** We can show the system makes decisions; we cannot yet
   show students learn more. Needs: pre/post mastery on one strand, even one classroom.
2. **No latency numbers for the affect path on target hardware.** Laya's published ~33 ms
   is on a T4. The development machine used for this work has 3.7 GB RAM and cannot host
   torch, so CPU-only latency in the 250 ms budget is **measured: no**.
3. **No accuracy of the scanner on Kiswahili/Sheng.** The keyword lists are English. We
   know it misfires on English edge cases; the Kiswahili error rate is unknown, not zero.
4. **Four demo identities, not a cohort.** `student01/teacher01/head01/parent01` are
   development accounts; nothing in this repo evidences real multi-school usage.
5. **The Rust/TypeScript parity gate is asserted, not enforced in CI** for every path —
   see `.kiro/specs/main-stability-and-branch-consolidation/`.

## Abstract draft (~230 words, venue-agnostic)

> **Deciding, not guessing: a deterministic policy layer for an AI tutor that has to work
> offline.** Most AI tutoring systems delegate the pedagogical decision — how much help to
> give, and when — to a language model, which makes the system's central behaviour
> non-deterministic, unreplayable, and expensive at the latency and cost envelope of a
> phone in a rural Kenyan classroom. SyncSenta inverts that: a language model generates
> language, while a deterministic engine decides instruction. Mastery bands and a hint
> counter select Independent, Guided, or Intensive scaffolding through a rule kept in
> byte-for-byte parity across a TypeScript client and a Rust core, so a tutoring decision
> can be replayed and audited. Affect enters as a narrow boolean signal from a keyword
> scanner; we reimplemented that scanner in Python and verified behavioural identity over
> 4,000 differential cases with zero mismatches, then used the same harness to bracket an
> open-weight 421M "System 1" decision model that scores frustration, teacher-alert and
> urgency in one forward pass. The model is fail-open by construction — every failure
> returns the rule-based baseline with a logged reason — and is disabled by default,
> because our measurements, not its published benchmarks, decide where it is allowed to
> sit in the loop. We report the architecture, the parity method, the failure modes the
> scanner still carries for Kiswahili and Sheng, and the outcome data we do not yet have.

## Shape of the paper (short / late-breaking, 6–8 pages)

1. Setting and constraint — what "must work offline on a shared phone" rules out.
2. Architecture — language model as renderer, deterministic policy as decider, affect as a
   single boolean.
3. Method — differential porting as a safety harness (TS↔Python, TS↔Rust).
4. Results — 4,000-case parity, zero mismatches; enumerated scanner failure modes; the
   cost of the alternative.
5. The fail-open experiment — what the System-1 model can and may not touch, and why the
   flag is off.
6. Limitations and what would change the design — the unmeasured list above.
7. Availability — which parts are open source and under what licence.

## Sequence

| # | Step | Owner | Notes |
|---|---|---|---|
| 1 | Confirm target venue and its real deadline on the organiser's own site | User | AIED 2027 CFP expected ~Dec 2026; AGI Summit Nov 2026 is speaker/pitch, not a paper. |
| 2 | Pick the submission form: research short paper vs demo/late-breaking vs talk proposal | User + assistant | Changes what evidence is required. |
| 3 | Close evidence gap 1: one strand, pre/post mastery in a real classroom | User (needs school access) | Also the product's own justification. |
| 4 | Close evidence gap 2: Laya CPU latency on a low-end machine | Assistant, needs different hardware or a paid T4/Colab session | Deliberately not attempted on this laptop. |
| 5 | Close evidence gap 3: label ~200 Kiswahili/Sheng learner messages, score the scanner | Assistant + User for native labelling | Cheap and high-value. |
| 6 | Write to the outline above, in Springer LNCS style | Assistant | Repo already has every artefact cited here. |
| 7 | Submit | **User only** | Requires the user's own accounts, profile and consent; no submission is made on their behalf, and nothing goes to an unverified form. |
| 8 | Meanwhile: land the dashboard fix, grade-6 branch, and the `AUTH_WALL` audit | Assistant | The paper's credibility rests on the deployment actually working. |
