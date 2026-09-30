# Positioning — what the 2026 literature says about the thing we are building

Written 2026-09-30, for §11 of `ROADMAP.md` (BASIX Omniversity, Track 5 Solo, challenge 1: *one agent
producing an auditable decision*). This file exists so the README, the 3-minute video script and the entry
text all make the same argument, and so every claim in them traces to a source that was actually opened.

Everything quoted below was read on 2026-09-30 from the linked page or abstract. Where a page gave a number,
the number is copied rather than rounded.

## 1. The paper that closes our old opening line

**StudentBench** — Northcutt, Hasmani, Feng, Khangi, Plesner, Mueller, published 23 September 2026
([Emergent Mind papers/2609.28470](https://www.emergentmind.com/papers/2609.28470)). 2,383 participants
randomised into AI, human, or no-tutoring GRE sessions, counterbalanced pre/post tests, expert evaluation.

- *"AI tutoring is statistically equivalent to expert human tutoring for GRE learning gains (p = .015)"*
- one model reached that *"at 918 times lower cost (USD 0.0052 for AI versus USD 4.81 for human, per
  percentage point gained)"*

**What this does to us: it deletes the sentence we have been opening with.** Every SyncSenta write-up so far
argues, implicitly, that an AI tutor can actually teach a child. As of seven days ago that is a settled result
with a platform, a sample size and a cost ratio attached, and re-asserting it in a hackathon entry reads as
behind the field. Anyone can cite StudentBench; nobody at that hackathon can cite our governance story.

It is also good news for the low-resource framing. A 918× cost ratio is the strongest available argument for
putting a tutor in a Kenyan classroom that has never had one, and it costs us nothing to adopt.

## 2. The pivot, stated once

> Not *"AI can teach."* — **"An AI tutor's reasoning cannot be audited, and a teacher has to sign off on what
> a child is told."**

Efficacy is settled (StudentBench). **Accountability is not**, and accountability is the half a Competency-Based
Curriculum actually runs on: a teacher records a competency, a school reports it, an authority checks it. Our
entry is about the checking.

## 3. The evidence that the accountability hole is real, and that post-hoc explanation does not fix it

**Unfaithful reasoning is measurable and still hard.**
*[Detecting Unfaithful Chain-of-Thought via Circuit-Guided Internal-External Discrepancy Scorer](https://arxiv.org/html/2605.25603v1)*
(arXiv 2605.25603, May 2026) states the criterion we should quote verbatim in the video:
*"faithful reasoning traces should align with the model's computational process, whereas unfaithful traces may
diverge from it."* Its detector — comparing the stated trace to the model's internal circuit structure with a
Fused Gromov–Wasserstein distance — reaches **78.0% accuracy on Truthful-QA and 77.0% on HLE-Bio**.
There is a whole [CoT-faithfulness survey](https://github.com/PKU-PILLAR-Group/CoT-Faithfulness-Survey)
(PKU PILLAR, Jan 2026) now.

That 78% is the most useful number in this file. **A 2026 research method, using internal activations, still
gets about one error in five at telling whether an explanation matches what the model did.** So "we show a
chain of thought" is not a solution — it is the same unsolved problem wearing a nicer coat. The only design
that clears the bar is one where the printed trace *is* the computation rather than a report about it. That
is precisely what a rule pack gives you, and it is the argument for MeTTa over a prompted LLM.

**LLM tutors are weak at exactly the decision our agent makes.**
**TutorGym** — Weitekamp et al., AIED 2025
([arXiv 2505.01563](https://arxiv.org/html/2505.01563v1), [tutorgym.ai](https://tutorgym.ai/)) evaluates LLM
agents as tutors against observed classroom tutoring practice. Its finding, in the paper's own terms, is that
simulated tutors *"fail to match real student behavior in dialogue acts"* and are poor at selecting the next
pedagogical action. The gap matters to us because **choosing among four hints *is* a next-pedagogical-action
decision** — `notice → isolate-step → representation → worked-example` is a dialogue-act policy.

Emergent Mind's own
[LLM-Powered Tutoring Solutions](https://www.emergentmind.com/topics/llm-powered-tutoring-solutions) topic
page (Jan 2026) supplies the two sentences to put on a slide:
- instructional theory in these systems is *"rarely systematically implemented or evaluated"*;
- and, most damning for the black-box camp, production pipelines already *"fallback to deterministic
  finite-state tutors"* to stay valid.

**That second one is the field conceding our point.** When an LLM tutor has to be caught by a finite-state
machine, the finite-state machine is where the correctness lives and the LLM is decoration. We might as well
make the rules first-class, printable, and correctable — which is what they are in this repo.

**Our architecture already has a peer-reviewed precedent, and it is not ours.**
*[Neural-Symbolic Knowledge Tracing: Injecting Educational Knowledge into Deep Learning for Responsible
Learner Modelling](https://arxiv.org/abs/2604.08263)* (arXiv 2604.08263, Hooshyar et al.) integrates
*"symbolic educational knowledge (e.g., mastery and non-mastery rules) into sequential neural models"* and
gets its explanations from *"intrinsic interpretability via a grounded computation graph that exposes the
logic behind each prediction"*. Results: **over 0.80 AUC with only 10% of training data, up to 0.90 AUC**.

Three things to take from this and nothing to exaggerate:
1. **"Grounded computation graph that exposes the logic behind each prediction"** is the literature's own
   words for what a glass box is. Quote it; it does our job better than we can.
2. **Data efficiency is the development-context argument.** 0.80 AUC at 10% of the data is what a curriculum
   with one school's worth of logs can afford. Free, and it converts a weakness into a reason.
3. It also means we must **not claim the architecture is novel.** The novelty we can defend is narrower and
   still real: the trace is *portable and verifiable by a third party* (the Merkle anchor over
   `learning_evidence`), not merely inspectable by the system that produced it. That distinction is the one
   thing nobody in this pile of papers has.

## 4. Where the remaining fit is

- *[Towards Pedagogically Aligned LLM Tutors for Math](https://aclanthology.org/2026.bea-1.10.pdf)*
  (BEA 2026, Petukhova et al.) — current work on aligning tutor behaviour to pedagogy; our answer is that
  alignment is enforced structurally by a rule pack rather than trained into a policy, and the drift lock in
  `omega-claw-rules.test.ts` is the test for it.
- *Future of Education with Neuro-Symbolic AI Agents in Self-Improving Adaptive Instructional Systems*
  (July 2026, [ResearchGate](https://www.researchgate.net/publication/383542005_Future_of_Education_with_Neuro-Symbolic_AI_Agents_in_Self-Improving_Adaptive_Instructional_Systems))
  — the title is Track 1's *Agent That Grows Up* problem statement, independently. Useful as cover for the
  self-correction scene in the demo.
- **MeTTa's own foundation**: *[Reflective Metagraph Rewriting as a Foundation for an AGI Programming
  Language](https://arxiv.org/abs/2112.08272)* (arXiv 2112.08272) and SingularityNET's
  [MeTTa page](https://singularitynet.io/research/metta-programming-language/). Cite these when explaining
  *why* the trace can be the computation: rewriting is the execution, so a log of rewrites is a log of what
  happened. Judges include SingularityNET people; this is home-ground vocabulary.

## 5. What this changes in the build, concretely

1. **The video opens on faithfulness, not on efficacy.** First 20 seconds: a model's stated reasoning and its
   actual computation can diverge, research can only detect it ~78% of the time, and a teacher is expected to
   sign a competency off on that. Then show the derivation.
2. **The entry text's chain claim comes out.** *"On-chain verifiable credentials via Cairo/Starknet or
   Stellar"* is not in this repository and every source above is a stronger hook. Replace with *tamper-evident
   recompute-able evidence anchor, designed for later chain commitment* — §11's item 4.
3. **Do not pitch a novel architecture.** Pitch the audit that survives leaving the building: same rule pack,
   printed derivation, hash-anchored, third-party verifiable.
4. **`derive.ts` earns its place.** The module that turns a decision into an ordered trail from the pack is no
   longer demo sugar; it is the artefact that makes the 78%-detector critique inapplicable to us. Keep it
   reading the pack file, never a hand-written transcript.
5. **A cheap, honest second scene:** the drift lock is a real, machine-checked before/after rule diff
   (`4e7babb`). That is the *Agent That Grows Up* material, already in git history, needing no new code.

## 6. What this file does not establish

No claim here has been reproduced by us. StudentBench's equivalence is on GRE tutoring with 2,383 adult
participants, not Kenyan CBC children — the transfer to our population is an assumption, and the entry must
not imply we measured it. TutorGym's numbers are from a testbed, not a deployment. The 78% is that one
circuit-guided detector's accuracy on two benchmarks, not a ceiling for the field. And the neural-symbolic
knowledge-tracing AUCs are that paper's models on its datasets; ours has not been evaluated against anything
yet, because §5's Stage 1 award path is still not browser-verified on live traffic. **If a judge asks "what
have you measured?", the answer is the rule pack's determinism and the anchor's recompute-ability, and nothing
else.**
