# AI and Blockchain Literacy Curriculum Roadmap

**Status:** Phase 1 in progress  
**Owner:** Syncsenta curriculum and learning-platform team  
**Baseline:** `2026-09-22.grade6.lovable-import.v1`

## Purpose

This roadmap turns the current Grade 6–12 AI and Blockchain Literacy work into a controlled delivery sequence. Grade 6 remains the accessible entry point. Each later grade adds reasoning depth, evidence requirements, system complexity, and learner independence without removing teacher mediation or child-safety controls.

The roadmap uses two operating ideas. **Parallel-help** means that curriculum, architecture, pedagogy, and safety are reviewed as separate lanes before their outputs are merged. **Meta-prompting** means that generated material passes through a deliberate cycle of planning, generation, critique, verification, and revision rather than being accepted after one model response.

## Delivery principles

The course must remain additive to Syncsenta's existing architecture. Curriculum data supplies objectives, strands, sub-strands, activities, misconceptions, and evidence prompts. It must not bypass consent, privacy, child-safety, teacher-escalation, or external-action policy.

The instructional pattern combines short demonstrations, repeated practice, gradual release, and reflection. Suzuki-inspired elements are used as a progression pattern: listen, observe, imitate, practise, and explain. Kumon-inspired elements are used as a mastery pattern: small steps, visible prerequisites, independent repetition, and advancement after demonstrated readiness. These are design choices for this course, not claims that either method is a universal solution.

All activities use fictional or synthetic data. Learners must not be asked for passwords, PINs, one-time codes, seed phrases, private keys, precise locations, identity records, or private financial information. Blockchain is taught as a system for records and coordination, not as an invitation to trade cryptocurrency.

## Phase map

| Phase | Focus | Primary result | Exit gate |
|---|---|---|---|
| 1 | Foundation contract | Versioned curriculum contract, meta-prompt contract, safety rubric, and test harness | A teacher can select a Grade 6–12 AI or Blockchain strand, generate a local scheme, and inspect safe activity metadata |
| 2 | Grade 6 complete pack | Fully authored introductory AI and Blockchain sequences with offline activities and teacher notes | Every Grade 6 sub-strand has outcomes, inquiry question, experiences, assessment evidence, and safety notes |
| 3 | Grades 7–9 hardening | Progression from recognition to explanation, evidence, comparison, and supervised design | Each grade introduces new complexity without skipping prerequisites or introducing real external actions |
| 4 | Grades 10–12 capstone | Research, policy, architecture, security, governance, and comparative system-design projects | Capstones have source requirements, review checkpoints, privacy controls, and teacher approval gates |
| 5 | Teacher and learner integration | Scheme wizard, activity player, tutor loop, reflection evidence, and differentiated support operate on one contract | Generated schemes and activities remain traceable to curriculum identifiers and render offline-safe fallbacks |
| 6 | Evaluation and release | Quality dashboard, pilot feedback, regression suite, and release checklist | Curriculum, pedagogy, safety, accessibility, and technical checks pass for the release candidate |

## Parallel-help operating model

Each phase is reviewed through four lanes. The **curriculum lane** checks scope, sequence, outcomes, strand integrity, and assessment evidence. The **pedagogy lane** checks cognitive load, repetition, independence, differentiation, and teacher usability. The **architecture lane** checks data contracts, registry keys, scheme ingestion, activity mapping, and regression coverage. The **safety lane** checks privacy, external-action boundaries, age appropriateness, misinformation, and escalation routes.

The lanes should work independently first. A short synthesis step then resolves conflicts. The synthesis must record which proposal was accepted, which was rejected, and which assumption remains open. No single generated response is sufficient evidence for a curriculum decision.

## Meta-prompt operating loop

Every generated scheme, lesson sequence, activity set, or assessment uses the following loop:

1. **Plan.** Identify the grade, subject, strand, sub-strand, prerequisites, lesson count, teacher context, and safety boundary.
2. **Generate.** Produce only the requested artifact fields. Use the authored curriculum context before synthetic fallback context.
3. **Critique.** Check progression, cognitive load, K-S-A balance, repetition, ambiguity, cultural fit, and whether the activity is actually feasible with available resources.
4. **Verify.** Check exact lesson count, strand identifiers, learning outcomes, age band, privacy constraints, no-real-transaction constraints, and traceability to the source curriculum record.
5. **Revise.** Repair failed checks. If a safety or policy check fails, remove the risky action rather than softening its wording.
6. **Record.** Save the curriculum version, prompt-contract version, model/provider mode, validation results, and teacher review state.

The generated artifact is not releasable until the verification step is green. A teacher may still edit ordinary pedagogical wording, but edits must not remove safety boundaries or change the curriculum identifier without a new review.

## Phase 1: Foundation contract

Phase 1 is the current work package. It establishes the common language that later authoring and engineering work will use.

### Phase 1 work items

The first item is a **curriculum contract**. It defines the shared fields for grade, subject, strand, sub-strand, lessons, learning outcomes, key inquiry question, suggested experiences, resources, assessment methods, misconceptions, prerequisites, safety notes, and evidence prompts. The contract must support both the frontend teacher registry and the backend scheme generator without maintaining divergent names.

The second item is a **generation contract**. It defines the meta-prompt loop, required inputs, output fields, refusal conditions, validation rules, and the difference between authored context and synthetic fallback context. It is documented in `META_PROMPT_GENERATION_CONTRACT.md`.

The third item is a **progression matrix**. It records what becomes harder from Grade 6 through Grade 12. Hardening must be visible in concepts, verbs, evidence, independence, and project complexity. Adding technical vocabulary alone does not count as progression.

The fourth item is a **local test harness**. It must render at least one Grade 7 AI scheme and one Grade 7 Blockchain scheme using a deterministic offline provider. It must verify strand and sub-strand traceability, exact lesson counts, offline-safe experiences, and rejection of real credentials or transactions.

The fifth item is a **teacher review surface**. The scheme wizard must expose strand and sub-strand choices from the same registry used by the generator. A missing authored pack must produce a clearly labelled guided foundation rather than an empty activity screen or an invented official claim.

### Phase 1 acceptance criteria

Phase 1 is complete when the following statements are true:

- Grade 6–12 AI and Blockchain subjects resolve through the canonical registry.
- The teacher-facing registry and backend scheme generator use matching strand and sub-strand identifiers.
- A deterministic local test renders Grade 7 AI and Blockchain schemes without an external API key.
- Paper-block simulations contain multiple interactive, offline-friendly experiences and no live credential or transaction path.
- Generated activity records contain a traceable curriculum identifier or an explicit guided-foundation label.
- The meta-prompt contract defines plan, generate, critique, verify, revise, and record steps.
- Frontend and relevant backend regression suites pass.

## Risks and controls

The main risk is **parallel drift**, in which frontend and backend packs use similar but non-identical names. The control is one identifier test that compares both registries.

The second risk is **false hardening**, in which later grades merely receive harder vocabulary. The control is a progression matrix that changes evidence, reasoning, independence, and system trade-offs.

The third risk is **unsafe realism**, in which a generated activity accidentally asks learners to use wallets, tokens, accounts, or personal data. The control is a hard safety validator and a synthetic-data-only activity policy.

The fourth risk is **empty-content failure**, in which missing authored curriculum prevents a learner from starting. The control is a bounded guided-foundation fallback that is clearly labelled and does not claim to be an official subject sequence.

## Immediate next actions

The parallel-help review completed its first pass across pedagogy, architecture, and safety/meta-prompt design. It confirmed that the progression itself is directionally sound, but identified **contract drift** as the first blocker. The frontend and backend do not yet share one versioned envelope, Grade 7–9 discoverability was incomplete, compact and spaced grade labels could resolve differently, and the scheme generator could fall through to a plausible-looking generic scaffold. The review also identified a cadence conflict: some authored AI packs declare three or four lessons per week while the current literacy runtime uses two. This roadmap intentionally does not guess that annual cadence; it remains a Phase 1 decision requiring an explicit schedule test and teacher-visible consolidation weeks.

The first implementation checkpoint therefore normalizes grade and subject aliases at the backend scheme boundary, exposes Grades 7–9 in the frontend selector, and adds regression coverage for both behaviors. The next checkpoint is the shared versioned curriculum envelope and fail-closed authored-pack lookup. The safety review requires that envelope to carry teacher mediation, synthetic-data status, source/evidence requirements, prohibited operations, and release state while leaving Rust as the policy source of truth.

## References

[1]: https://github.com/dgithinjibit/Syncsenta "Syncsenta repository"
[2]: https://github.com/dgithinjibit/Syncsenta/pull/13 "Syncsenta AI and Blockchain Literacy curriculum pull request"
[3]: https://github.com/dgithinjibit/scheme-scribe-ai "Lovable curriculum source repository"
