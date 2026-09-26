# Laya as SyncSenta's System-1 decision router

Status: proposal, unadopted. PoC: [`ai-agents/src/syncsenta_agents/decisions/`](../../ai-agents/src/syncsenta_agents/decisions/).
Date: 2026-09-26.

[Laya](https://huggingface.co/convaiinnovations/laya) is a 421M-parameter ModernBERT
"System 1" decision model, Apache-2.0, self-hostable. It takes structured state plus
typed questions and returns typed answers with calibrated probabilities in a single
forward pass — about 33 ms for one question on a T4, ~7 ms per question batched. It
never generates text, so it cannot hallucinate an answer and needs no output parsing.
It is the open-weight alternative to the Jev decision model that
[Jev-Claw](https://github.com/dgithinjibit/Jev-Claw) currently wraps.

This document records where that fits in SyncSenta, and — just as importantly — the
part of the tutoring loop it must not touch.

## Do not put a model in the scaffolding decision

`evaluateTutoringDecision()` in `studio/src/lib/omega-agent/metta-core.ts:810` already
computes Independent / Guided / Intensive from integer mastery, a hint count, and one
boolean. It is deterministic, costs microseconds, and is kept in byte-for-byte parity
with `rust-core/src/agent_runtime.rs` (see the parity note at `metta-core.ts:790-794`).

Replacing a free exact rule with a 33 ms probabilistic model would be a regression on
every axis that rule exists to protect: latency, determinism, replay, and the
TypeScript/Rust parity gate that `.kiro/specs/main-stability-and-branch-consolidation/`
is still working to enforce. **Laya stays out of this function.**

## The actual weak link is the signal feeding that rule

`evaluateTutoringDecision()` receives `frustrationSignal: boolean` as an input
(`metta-core.ts:814`), and one `true` is enough to force Intensive scaffolding
(`metta-core.ts:827-830`). That boolean is produced by a keyword scan.

`studio/src/lib/chat/subject-session.ts:176-183` sets `frustrationSignal` from three
consecutive wrong turns **or** `analyzeEmotionalState()` in
`studio/src/lib/emotional-intelligence.ts:23`. The keyword lists are the problem:

| Keyword in the list | Effect | What it actually catches |
|---|---|---|
| `'help'` (`emotional-intelligence.ts:34`) | → `frustrated` | "Can you help me spell 'butterfly'?" — help-seeking, not frustration |
| `'why'`, `'what is'`, `'how do'`, `'explain'` (`:39`) | → `confused` | Exactly the Socratic curiosity the tutor is instructed to reward |
| `'!'`, `'nice'`, `'great'` (`:52-53`) | → `excited` | Any emphatic child, including an angry one |
| `'i think i know'` (`:46`) | → `confident` | A hedged guess, then Intensive is skipped at the moment scaffolding is needed |

Confidence is not measured either: it is a hardcoded literal per branch (`0.2`, `0.4`,
`0.8`, `0.9` at `:62`, `:70`, `:78`, `:86`). A false positive on `frustrationSignal`
demotes a capable learner to intensive hand-holding; a false negative leaves a
frustrated child without the smallest-step treatment that is the platform's headline
promise. Both are silent, because the rule looks like it made the decision.

That is the seam for a calibrated classifier: same input (student free text plus short
history), same output type (a boolean), one better estimate of the probability behind
it.

## Proposed shape

```
student turn
   ├─ deterministic counters (attempts, correct, hints)      ── unchanged, in TS
   ├─ affect / escalation decision  ── Laya, in ai-agents ──┐
   │     falls back to the keyword rule when unavailable ────┤
   └─ scaffolding rule (metta-core.ts, TS/Rust parity)  ◄────┘
         └─ chat generation (LLM)  — routing optional, see below
```

Three rules make this safe to ship:

1. **Language boundary, not model boundary.** The classifier lives in `ai-agents/`
   (Render, PyTorch-native), not in `studio/` (Vercel, no process to hold 850 MB of
   weights). `studio/` calls it over HTTP with a hard timeout.
2. **Fail open to today's behaviour.** If the service is slow, cold, or down, the
   keyword rule answers. The platform cannot regress below its current accuracy, so
   adoption is a strict improvement or a no-op.
3. **Log the decision it did not take.** Every call records probability, threshold,
   model id, and fallback flag into the existing scaffolding telemetry
   (`studio/src/lib/omega-agent/scaffolding-telemetry.ts:26`, table
   `scaffolding_decisions`). Teachers see an explainable scaffolding level, and the
   threshold can be retuned against real logs instead of opinion.

Suggested typed questions, using Laya's three native types:

| Question | Type | Consumed by |
|---|---|---|
| Is this learner frustrated rather than merely asking for help? | `noul` → p | `frustrationSignal` |
| Which state best fits: confused / stuck / disengaged / on-track | `choice` | teacher alert text in `server-enrichment.ts` |
| How likely is this turn to need escalation to a human teacher? | `score` | alert threshold |

## Model/provider routing — the second, cheaper win

`render.yaml` gives `ai-agents/` keys for Groq, Gemini, and OpenAI, so the service
already has to pick a provider per request. Laya's `Router` is built for exactly that:
classify the turn, send routine turns to a small fast model and genuinely hard ones to
the large one. This changes cost and latency, never pedagogical state, so it can ship
before the affect work and needs no telemetry schema.

## What must be measured, not assumed

- **Kiswahili, Sheng, and code-mixed input.** The English checkpoint caps at 512
  tokens; `laya-multilingual` covers 100+ languages at 1024. PP1–Grade 9 learners
  writing "Nimechoka, hii ni ngumu sana" decide whether this works in the classrooms
  being sold to. Benchmark both checkpoints on a mixed-language set before choosing.
- **CPU-only latency.** The 33 ms figure is a T4 number. `ai-agents/` on a Render free
  tier has no GPU; the PoC benchmark reports CPU latency per query, and that number
  gates the rollout.
- **Label quality.** The PoC's gold set is authored from the live keyword lists'
  failure modes, so it flatters the model by construction. Before adoption, relabel a
  sample of real `scaffolding_decisions` rows with a teacher.
- **Calibration.** A probability is only useful if 0.7 means 70%. Report the
  reliability of the chosen threshold on real data before letting it move a child's
  scaffolding level.

## Non-goals

- Not a tutor. Laya generates no text; the Socratic response path is unaffected.
- Not a replacement for `OMEGA_THRESHOLDS` or the Rust parity contract.
- Not a MeTTa/Hyperon substitute. `docs/HYPERON_DEPENDENT_PROJECTS.md` governs that
  boundary; Laya is a classifier, not a reasoning engine.
- No student text leaves to a hosted API. Apache-2.0 and self-hosting are the point.

## Rollout

1. Land the PoC benchmark in `ai-agents/`, report CPU latency and mixed-language
   accuracy. No behaviour change.
2. Ship the endpoint dark, behind `LAYA_AFFECT_ENABLED`, logging probability and
   fallback alongside the keyword rule's answer. Compare on production traffic.
3. Promote to decision-maker for `frustrationSignal` only if it wins on teacher-
   relabelled data, keeping the keyword rule as the fail-open path.
4. Revisit provider routing separately; it is orthogonal and can land at any point.
