# Meta-Prompt Generation Contract

**Contract version:** `2026-09-22.phase1.v1`  
**Applies to:** AI Literacy, Blockchain Literacy, teacher schemes, lessons, activities, and assessments

## Purpose

This contract defines how Syncsenta should use prompts to create curriculum-aligned learning artifacts. It separates the educational decision from the language-model response. The model may draft content, but the curriculum registry, policy engine, validator, and teacher review determine whether that content can be used.

## Required context

Every generation request must identify the learner grade, subject, curriculum version, strand, sub-strand, lesson count, lessons per week, language, teacher inputs, available resources, and whether the source context is authored or synthetic. The request must also include the relevant learning outcomes, inquiry question, suggested experiences, prerequisites, misconceptions, and safety notes when those fields exist.

A missing authored record may use synthetic context only when the caller explicitly allows it. Synthetic context must be labelled as synthetic in logs and must not be described to the teacher as a verified official curriculum source.

## Prompt stages

### 1. Plan

The planner converts the request into a bounded generation brief. It identifies the learning target, prerequisite knowledge, lesson count, evidence of mastery, resources, differentiation needs, and prohibited actions.

The planner must answer these questions before generation:

- What should a learner know, do, or explain by the end?
- What prior step must be secure first?
- What repeated practice will make the next step easier?
- What evidence will show readiness to advance?
- What must the learner not do with real accounts, personal data, money, or external systems?

### 2. Generate

The generator produces only the requested schema. For a scheme row, the minimum fields are week, lesson, strand, sub-strand, specific learning outcome, key inquiry question, learning experiences, learning resources, assessment methods, and reflection. For an activity, the minimum fields are identifier, title, objective, instructions, resources, response mode, mastery check, prerequisites, and safety notes.

The generator must prefer short, concrete instructions. Grade 6 activities should support listening, imitation, guided practice, and explanation. Later grades may require comparison, evidence, design trade-offs, critique, and independent research, but they must preserve prerequisite checks.

### 3. Critique

A critic reviews the draft independently from the generator. The critic must check educational quality, not merely formatting. It must look for hidden jumps in difficulty, repetition without purpose, activities that require unavailable resources, vague success criteria, culturally narrow examples, and instructions that invite unsafe external action.

For AI content, the critic checks that present-day pattern-generating systems are distinguished from hypothetical AGI. For Blockchain content, the critic checks that record-keeping and system trade-offs are distinguished from cryptocurrency participation.

### 4. Verify

Verification is deterministic wherever possible. It checks:

- The curriculum identifier matches the selected registry record.
- The strand and sub-strand names are canonical.
- The generated lesson count equals the allocated count.
- The learning outcomes are age-appropriate and observable.
- The K-S-A structure is present where the scheme contract requires it.
- Activities use fictional or synthetic data.
- No activity asks for a password, PIN, one-time code, seed phrase, private key, exact location, identity record, or private financial information.
- No activity asks a learner to create a wallet, buy or trade a token, make a real transaction, publish a personal record, or contact an external system.
- Teacher review is required before any activity with a new external dependency or sensitive topic is released.

A failed safety check is a hard failure. The system must remove or replace the risky action. It must not merely add a warning after retaining the action.

### 5. Revise

The reviser receives the draft and the failed checks. It changes only the fields necessary to resolve the failure, then sends the artifact through verification again. If the artifact cannot be repaired without changing the learning target, the system returns a teacher-review request rather than inventing a workaround.

### 6. Record

The runtime records the curriculum version, generation-contract version, provider mode, validation results, source-context type, and teacher review state. The record must make it possible to explain which curriculum row produced a scheme row or activity.

## Meta-prompt template

The following template is the canonical conceptual prompt. Runtime code may serialize it differently, but it must preserve the same constraints.

```text
ROLE
You are a curriculum drafting assistant inside Syncsenta. You do not replace the teacher,
policy engine, or curriculum registry.

TASK
Create exactly the requested artifact for:
- Grade: {grade}
- Subject: {subject}
- Curriculum version: {curriculum_version}
- Strand: {strand}
- Sub-strand: {sub_strand}
- Allocated lessons: {lesson_count}
- Lessons per week: {lessons_per_week}

AUTHORED CONTEXT
Learning outcomes: {learning_outcomes}
Key inquiry question: {key_inquiry_question}
Suggested experiences: {suggested_experiences}
Prerequisites: {prerequisites}
Misconceptions: {misconceptions}
Source context type: {authored_or_synthetic}

PEDAGOGY
Use short steps, guided modelling, repeated practice, a visible mastery check, and a
reflection or transfer task. Increase difficulty only when the prerequisite is explicit.
Use fictional or synthetic data. Keep resources available in an ordinary classroom.

SAFETY
Never request passwords, PINs, codes, seed phrases, private keys, identity records,
precise locations, private financial information, wallets, tokens, cryptocurrency trading,
real transactions, or unsupervised external AI use. Blockchain examples are about records,
coordination, evidence, and system choice.

OUTPUT
Return only the requested schema. Do not add unsupported official claims, live links,
external actions, or fields outside the schema.
```

## Phase 1 test contract

The test harness must run the generator with a deterministic offline provider. It must capture the prompts and verify that authored learning outcomes and suggested experiences reach the generator. It must render at least one Grade 7 AI scheme and one Grade 7 Blockchain scheme. It must also verify that Grade 6 paper-block simulations contain multiple offline interactions, including a linkage or tamper-evidence task, without live credentials or transactions.

The validator must test both success and refusal behavior. A safe fictional ledger activity should pass. An activity asking learners to enter a seed phrase or connect a wallet should fail. A missing authored pack may pass only when it is clearly marked as a guided foundation rather than an official curriculum sequence.

## Teacher review boundary

Teachers may adjust examples, pacing, grouping, language, and ordinary classroom resources. A teacher review is required when changing the learning outcome, curriculum identifier, safety boundary, external dependency, or learner-data requirement. The system should preserve the original generated artifact for comparison after review.

## References

[1]: https://github.com/dgithinjibit/Syncsenta "Syncsenta repository"
[2]: https://github.com/dgithinjibit/Syncsenta/pull/13 "Syncsenta AI and Blockchain Literacy curriculum pull request"
