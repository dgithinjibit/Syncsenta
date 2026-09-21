# SyncSenta AI Literacy Curriculum and CodeYetu-Compatible LMS Guide

**Status:** formal curriculum and product architecture baseline

**Prepared for:** SyncSenta and a potential CodeYetu partnership

**Author:** Manus AI

**Date:** 21 September 2026

## Executive conclusion

SyncSenta should **keep the current Synthesis Tutor architecture** and extend it into a pluggable learning-management system rather than replace it with a policy repository, a single workshop curriculum, or a new tutoring engine. The product should use one shared Omega-aware tutor, a versioned AI-literacy curriculum pack, and an LMS shell that can host one-to-one virtual lessons, in-person coding clubs, community-centre cohorts, mentor relationships, trial lessons, projects, and offline evidence of learning.

The supplied repositories should be used as **reference layers with different responsibilities**. The Africa AI policy collection should inform regional governance, data protection, inclusion, and public-interest framing. The general AI-policy collection should inform research-monitoring and source maintenance. The fellowship collection should inform mentor and facilitator development, not child curriculum content. *Beyond AI Hype* should inform age-appropriate critical AI-literacy activities, especially its sequence from AI foundations to data and algorithms, bias, generative AI, and ethical use. The academic-writing repository should inform the structure and citation discipline of this document and future teacher-facing materials. PHYS108 should inform the design of small, inspectable, hands-on computational activities; it should not be copied as a physics course or treated as an LMS architecture.

None of these repositories is the curriculum authority. The authoritative chain should be: **Kenyan curriculum requirements and law; school and safeguarding policy; reviewed learning objectives; teacher and community review; evidence-based instructional design; then repository and workshop references**. The current SyncSenta plan is therefore the correct product foundation, while these repositories provide content, governance, activity, and research methods that should be incorporated through explicit versioned curriculum modules.

## 1. Authority and evidence model

A policy resource library answers the question, “What should institutions consider when governing AI?” A curriculum answers a different question: “What should this learner be able to understand, do, explain, and question at a particular age, in a particular learning context?” Confusing those purposes would make the course either too abstract for children or too operationally risky.

SyncSenta should maintain four evidence layers:

| Layer | Purpose | Authority in SyncSenta |
|---|---|---|
| Kenyan curriculum, law, and safeguarding requirements | Establish learner, school, privacy, inclusion, and child-protection obligations | Binding product constraint |
| International and regional guidance | Provide principles for human rights, safety, equity, data governance, and responsible AI | Normative reference, subject to local review |
| Reviewed curriculum and instructional design | Define objectives, activities, misconceptions, assessment, language, accessibility, and progression | Curriculum authority for each module |
| Repository and workshop references | Supply examples, activities, research pathways, and source discovery | Adaptable evidence, never copied as policy authority |

The AI policy repositories are valuable because they make a changing policy landscape visible. Their links must be dated, checked, and assigned an owner. A link in a repository is not by itself evidence that a legal rule applies to SyncSenta. The LMS should record the source, publication date, jurisdiction, reviewer, review date, and the curriculum claims supported by each module.

The existing SyncSenta architecture already supports this separation. Rust can own deterministic policy decisions; TypeScript can orchestrate the session and render prompts; Supabase and Redis can retain the existing application state; and teacher or content workflows can remain in the existing Python service. The new curriculum layer should be data and policy, not a second AI runtime.

## 2. How each supplied repository should be used

### Africa AI policy resources

The Africa-focused collection is most useful for regional context. It links the African Union Continental Artificial Intelligence Strategy, the AU Data Policy Framework, the Malabo Convention, African policy trackers, regional statements, African research centres, and scholarship on responsible and decolonised AI governance [1]. It should inform SyncSenta’s governance register, source-monitoring process, examples of African public-interest questions, and teacher-facing professional learning.

It should not be copied into child-facing lessons as a list of laws or policy documents. Younger learners need concrete questions such as who benefits, who is missing from the data, who can challenge a decision, and what information should remain private. Older learners can examine a carefully selected and teacher-reviewed case study about language inclusion, public services, agriculture, accessibility, or data protection.

### General AI policy resources

The general collection is a research index. It includes policy trackers, AI indices, progress trackers, incident databases, energy calculators, and other monitoring tools [2]. SyncSenta should use it to maintain a quarterly research review and to flag curriculum claims that may become outdated. It should not use every index as a learning objective. A ranking or dashboard is an observation about a measurement system, not a complete account of whether an AI system is good, fair, safe, or useful.

A practical governance rule is that a production module may cite a tracker for context, but any learner-facing factual claim must also state its date and source type. The tutor should teach learners to ask what was measured, who selected the measure, what is absent, and whether the result applies to their community.

### AI policy fellowships

The fellowship repository is a professional-development resource for graduate students and early- and mid-career professionals [3]. Its direct child-curriculum value is limited. Its important contribution is the recognition that responsible AI requires people who can connect technical facts, law, public administration, human rights, economics, and community experience.

SyncSenta should adapt this principle into a facilitator pathway. CodeYetu mentors and teachers can receive short professional-learning units on explaining AI uncertainty, protecting learner data, identifying unsafe requests, handling source disagreements, and escalating safeguarding concerns. The fellowship list itself should not become a learner course, a career promise, or a claim that policy work follows one institutional pathway.

### *Beyond AI Hype*

*Beyond AI Hype* is the most directly transferable curriculum reference. Its README describes a five-session workshop for middle and high school students covering AI foundations, data and algorithms, algorithmic and dataset bias, generative AI, and experimentation with generative tools [4]. The lesson plans use a clear pattern: an opening discussion, a short explanation, a hands-on activity, a presentation or debrief, and reflection. The sessions also ask learners to examine limitations and ethical implications rather than treating AI as magic.

SyncSenta should adapt this sequence, not copy it unchanged. The original activities often depend on external websites, current commercial tools, articles, and videos. A child-safe Kenyan LMS needs teacher-mediated alternatives, synthetic data, low-bandwidth and offline modes, explicit consent, source review, and options for learners who cannot access or should not use a public generative-AI service. The core progression remains strong:

1. What AI is and where people encounter it.
2. How data and algorithms influence outputs.
3. How bias can enter data, models, and decisions.
4. How generative systems produce and misproduce content.
5. How to use, question, and govern AI responsibly.

### Academic writing

The academic-writing repository is a concise resource list rather than a curriculum framework [5]. Its value for SyncSenta is methodological. Formal documents should lead with a clear claim, build paragraphs around one contribution, distinguish evidence from interpretation, use consistent citations, and make the limits of a source visible. The same discipline should apply to teacher guides, curriculum modules, policy notes, and evaluation reports.

A curriculum authoring workflow should therefore require a module claim, learner objective, activity evidence, assessment evidence, safety review, local adaptation note, source record, and next review date. This makes the curriculum maintainable rather than a collection of uncited prompt text.

### PHYS108

PHYS108 is a collection of creative solutions to homework problems from a programming-for-scientists-and-engineers course [6]. Its small programs illustrate a useful activity principle: learners can understand computation by manipulating state, observing a result, testing an assumption, and debugging a rule. Its memory-game example creates a hidden board, exposes selected items, checks matches, and updates visible state. Its plotting and encryption examples similarly make a process inspectable.

PHYS108 should inform the **activity grammar** of the SyncSenta sandbox, not its subject matter or code stack. SyncSenta should use Rust and the browser-safe existing stack rather than requiring MATLAB. AI-literacy activities can use synthetic cards, tables, simple rule engines, classification games, prompt comparisons, and visual traces. Every sandbox action should have a reset, a bounded input, an observable output, a teacher explanation, and an offline equivalent.

## 3. AI-literacy curriculum model

The curriculum should define AI literacy as the ability to understand what an AI-enabled system is doing, question its evidence and limits, protect people affected by it, and make responsible decisions about when human judgment must remain in control. It should not define literacy as frequent tool use, prompt tricks, or the ability to produce impressive outputs.

Each module should include the following fields:

```text
module_id
content_version
age_band
CBC_competency
language_options
learning_objective
success_evidence
key_terms
prior_knowledge
misconceptions
activity_steps
socratic_questions
hint_ladder
sandbox_or_offline_mode
privacy_and_safety_constraints
teacher_mediation_level
assessment_rubric
source_records
review_due_at
```

The shared Synthesis Tutor loop should remain stable across modules:

```text
orient -> elicit -> investigate -> reason -> scaffold -> verify -> transfer -> reflect
```

The tutor should ask one focused question at a time. It should prefer a learner’s observation, prediction, comparison, or explanation before giving a complete answer. It should offer a smaller step when needed and finish with a check for transfer. A sandbox is an instrument for inquiry, not a substitute for the teacher or the learner’s explanation.

## 4. Age-band progression

### PP1–Grade 2

Learners should encounter AI through stories, pictures, sorting, role-play, and examples of tools made by people. The central distinctions are tool versus person, output versus feeling, and guess versus evidence. Activities should be unplugged or teacher-mediated. The tutor should not expose children to open-ended public generative-AI tools or ask for personal information.

A suitable activity is a “human or machine rule?” card game. The learner sorts examples such as counting, choosing a colour, recognising a repeated pattern, and showing kindness. The teacher asks what information the rule needs and who is responsible when the result is wrong.

### Grades 3–6

Learners should investigate data, rules, categories, errors, privacy, and human oversight. They can compare two small synthetic datasets, test a simple classifier, identify a missing group, and explain why an output needs checking. They should learn that a system can be useful and still be wrong, unfair, incomplete, or unsuitable for a particular task.

The recommended first CodeYetu-compatible module is a 40–60 minute mentor-mediated lesson titled **“Evidence Before Trust.”** It begins with a local scenario such as sorting recyclable items or classifying weather cards. Learners make a prediction, train or configure a simple rule-based sandbox, test examples it has not seen, record errors, and explain what a teacher should check before using the result.

### Grades 7–9

Learners can examine data representation, probability, model evaluation, prompt and context effects, bias, generative systems, privacy, energy, labour, governance, and responsible use. They should distinguish fact, forecast, opinion, advertisement, and generated content. They may use a constrained sandbox with synthetic data and teacher-approved tools, but they should not be required to submit private work or personal images to a public AI service.

A suitable progression is the five-session structure adapted from *Beyond AI Hype*: foundations; data and algorithms; bias and case studies; generative systems and verification; and responsible experimentation. Each session should have an offline path and should end with a learner explanation rather than a score based only on tool performance.

## 5. CodeYetu-compatible LMS architecture

CodeYetu’s public programme description shows a delivery model that includes virtual one-to-one classes, in-person Saturday classes at community organisations, coding clubs, flexible mentor scheduling, and trial lessons for learners and parents [7]. SyncSenta should model this as a **delivery-aware LMS**, not only as a course catalogue.

The LMS should provide six independent but connected surfaces:

| Surface | CodeYetu use case | SyncSenta responsibility |
|---|---|---|
| Learner workspace | One-to-one lessons and club activities | Short lesson turns, sandbox, projects, offline evidence, reflection |
| Mentor workspace | Paired virtual teaching and in-person facilitation | Lesson plans, prompts, attendance, notes, feedback, escalation |
| Cohort and club workspace | Community-centre and Saturday classes | Rosters, schedules, group projects, shared resources, consent status |
| Guardian and institution workspace | Trial approval and learner support | Consent, attendance visibility, safe progress summaries, contact route |
| Programme operations | Flexible time slots and multiple locations | Mentor matching, session scheduling, location/connectivity profile, reporting |
| Curriculum studio | Reusable AI, coding, and community projects | Versioned modules, source records, rubrics, translations, review workflow |

The public student experience should remain compatible with the existing Studio routes. The LMS domain model should be additive:

```text
Organisation
  -> Programme
      -> Cohort or Club
          -> Enrollment
              -> Learner
                  -> Course Module
                      -> Lesson Session
                          -> Activity Attempt
                              -> Evidence and Reflection
```

A learner may belong to more than one programme or club, but each enrollment must carry its own consent, mentor, grade or age band, language preference, accessibility needs, connectivity profile, and safeguarding route. The system must not infer sensitive traits from response speed, camera data, voice, or facial expression.

For the first implementation, the existing Supabase tables and session pathways should remain the persistence boundary. Rust should receive typed, minimal learning-state inputs for deterministic Omega decisions. The curriculum studio can remain a versioned content contract consumed by TypeScript. A future Rust service may validate lesson state and safety invariants, but it should not force a network hop for every learner turn until parity and availability have been demonstrated.

## 6. AI sandbox design

The sandbox should be a collection of small inquiry instruments rather than a general-purpose coding environment. Each instrument should expose a limited concept, synthetic input, visible state, a reset action, and a teacher-readable explanation.

The initial instruments should be:

1. **Rule sorter:** the learner changes a rule and observes which examples move categories.
2. **Dataset balance board:** the learner adds or removes synthetic examples and observes how representation changes.
3. **Error explorer:** the learner tests known and unknown examples and records false positives and false negatives.
4. **Prompt comparison:** the learner changes one instruction or piece of context and compares outputs using fictional content.
5. **Source checker:** the learner compares a generated claim with a teacher-approved source and labels it supported, uncertain, or unsupported.
6. **Human-approval checkpoint:** the learner decides whether a fictional system may proceed, must be checked, or must stop.

PHYS108 suggests the value of stateful activities such as a memory board, controlled inputs, visible transitions, and feedback after each move [6]. SyncSenta should adapt those properties to a browser-safe educational environment. It should not expose arbitrary file access, unrestricted network requests, process execution, package installation, secret inputs, or model-generated code execution.

Every sandbox activity must have an offline equivalent. For example, the dataset balance board can be a set of coloured cards; the source checker can use printed statements and a textbook; and the human-approval checkpoint can be a classroom role-play. This is essential for community centres, shared devices, low-bandwidth classes, and learners who require non-screen alternatives.

## 7. Governance and child safety

The AI curriculum must be safer than a general-purpose AI product. The LMS should require age-appropriate mediation, guardian or institution consent where applicable, data minimisation, clear escalation routes, and teacher review. The platform should never request passwords, national identifiers, PINs, one-time codes, private photographs, private family finances, exact location, or personal data that is unnecessary for the learning objective.

Learner evidence should be stored as the smallest useful record. Prefer a rubric result, short learner explanation, selected misconception, and teacher note over a permanent transcript of every exploratory message. Do not put identifiable learner records on a public or immutable ledger.

The tutor may explain AI risks but must not make safeguarding, medical, legal, disciplinary, credit, investment, or identity decisions autonomously. A report of abuse, coercion, fraud, distress, or a real-world financial problem must leave the lesson path and route to an approved trusted adult or safeguarding process.

The policy repositories should be monitored through a **source register** with these fields:

```text
source_id
jurisdiction
source_type
publication_date
last_checked_at
owner
claim_supported
curriculum_modules_affected
review_status
supersedes
```

A source update should trigger human review of affected modules. It should not automatically rewrite prompts or policies in production.

## 8. Assessment and evidence

Assessment should measure understanding and transfer, not only engagement or successful tool interaction. A module should ask the learner to explain what happened, identify evidence, name an uncertainty or limitation, and apply the idea to a new fictional or local scenario.

A practical rubric has four dimensions:

| Dimension | Beginning | Developing | Secure |
|---|---|---|---|
| Concept | Repeats a term without distinguishing it | Describes the process with a prompt or example | Explains the process and its limits in their own words |
| Evidence | Accepts an output without checking | Checks one part of a claim with support | Compares evidence, identifies uncertainty, and explains why it is sufficient or insufficient |
| Responsibility | Focuses only on whether the tool works | Notices one risk after prompting | Identifies who may be affected and when human review is required |
| Transfer | Copies the activity | Applies the idea to a similar case | Applies it to a new case and chooses a safe next action |

The LMS should retain structured evidence and teacher review, not only a model-generated score. Rust policy decisions should be traceable by policy version and reason code. The tutor should not silently turn an exploratory mistake into a permanent ability label.

## 9. Implementation roadmap

### Phase 1: formal curriculum and source register

Create the versioned module schema, source register, teacher review workflow, age-band rules, safety boundaries, and three pilot modules. Start with Grades 4–6 and a teacher-mediated CodeYetu-style class because this provides enough reasoning depth without requiring unrestricted public AI access.

### Phase 2: LMS delivery foundation

Add additive domain contracts for programmes, cohorts, enrollments, mentors, lesson sessions, activities, evidence, and consent. Preserve existing learner routes and chat contracts. Support one-to-one and club delivery through the same session model, with different participant and scheduling metadata.

### Phase 3: sandbox instruments

Implement the rule sorter, dataset balance board, error explorer, source checker, and human-approval checkpoint using synthetic data. Each instrument should have a reset, an offline alternative, a teacher explanation, and tests for invalid or unsafe input.

### Phase 4: CodeYetu pilot adapter

Create a configuration profile rather than a hard-coded fork. The profile should define organisation branding, programme types, age bands, session duration, mentor workflow, consent requirements, class locations, connectivity options, and curriculum packs. This makes SyncSenta pluggable for CodeYetu and other organisations without changing the core tutoring engine.

### Phase 5: evaluation and expansion

Run a small teacher-mediated pilot across virtual one-to-one and in-person club contexts. Compare concept understanding, transfer, source checking, safe decision-making, completion, accessibility, and mentor workload. Expand only after review of safety incidents, consent quality, offline usability, and learner evidence.

## 10. Decision for implementation

The answer to the original question is **not “follow the repositories” or “ignore them.”** The correct approach is to keep the current SyncSenta product architecture and use each repository at the layer where it is strongest:

- Use policy resources for governance and source discovery.
- Use *Beyond AI Hype* for the first critical AI-literacy sequence.
- Use the fellowship collection for mentor and facilitator development.
- Use academic-writing guidance for formal curriculum authoring and evidence discipline.
- Use PHYS108 for small, inspectable, stateful activity design.
- Use CodeYetu’s public programme model for the LMS delivery model: mentors, clubs, one-to-one classes, flexible scheduling, trials, community locations, and low-connectivity support.

The product should remain a **full LMS with a pluggable Synthesis Tutor**, not a chatbot attached to a course catalogue. The tutor, curriculum, sandbox, mentor workflow, consent model, scheduling model, and evidence model should be separate contracts that fit together through the existing Rust-first architecture.

## References

[1]: https://github.com/dgithinjibit/africaAIPolicyResources "Africa AI and Digital Policy Resources"

[2]: https://github.com/chinasatokolo/aiPolicyResources "AI Policy Resources"

[3]: https://github.com/chinasatokolo/aiPolicyFellowships "AI Policy Fellowships"

[4]: https://github.com/chinasatokolo/BeyondAIHype "Beyond AI Hype workshop curriculum and lesson plans"

[5]: https://github.com/chinasatokolo/academic_writing "Academic Writing resources"

[6]: https://github.com/chinasatokolo/PHYS108 "PHYS108 programming-for-scientists-and-engineers solutions"

[7]: https://codeyetu.org/program "CodeYetu Programs"

[8]: https://kicd.ac.ke/wp-content/uploads/2017/10/CURRICULUMFRAMEWORK.pdf "Kenya Institute of Curriculum Development, Basic Education Curriculum Framework"

[9]: https://unesdoc.unesco.org/ark:/48223/pf0000391105 "UNESCO, AI Competency Framework for Students"

[10]: https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research "UNESCO, Guidance for Generative AI in Education and Research"

[11]: https://www.unicef.org/innocenti/reports/policy-guidance-ai-children "UNICEF Innocenti, Guidance on AI and Children"

[12]: https://www.odpc.go.ke/wp-content/uploads/2024/02/ODPC-Guidance-Note-for-the-Education-Sector.pdf "Kenya Office of the Data Protection Commissioner, Guidance Note for the Education Sector"

[13]: https://au.int/en/documents/20240809/continental-artificial-intelligence-strategy "African Union, Continental Artificial Intelligence Strategy"

[14]: https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-ai-profile "NIST, Artificial Intelligence Risk Management Framework: Generative AI Profile"

[15]: https://www.oecd.org/financial-education/ "OECD, Financial education and literacy resources"
