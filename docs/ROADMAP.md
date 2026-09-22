# SyncSenta Roadmap

This roadmap combines the existing SyncSenta product review with the relevant interaction and engineering practices from [`dgithinjibit/i-have-adhd`](https://github.com/dgithinjibit/i-have-adhd) and [`dgithinjibit/skills`](https://github.com/dgithinjibit/skills). The goal is to make SyncSenta clearer for learners and teachers, safer for Grade 6 Omega Claw learning, and more predictable to maintain.

## Roadmap principles

1. **Make the next action obvious.** Every learner, teacher, and agent screen should have one primary action, clear labels, and a visible completion state.
2. **Reduce working-memory load.** Use short instructions, numbered multi-step activities, progressive disclosure, saved progress, and concise error messages.
3. **Keep humans in control.** AI suggestions require checking, teacher review, and clear responsibility. Omega Claw is introductory in Grade 6 and becomes deeper only in supervised Senior School Grades 10–12.
4. **Use small, verifiable changes.** Features should be implemented in narrow slices with a test, review, and documented acceptance criteria.
5. **Prefer accessible defaults.** Keyboard navigation, readable contrast, reduced motion, clear focus states, and mobile-friendly tap targets are part of the definition of done.

## SyncSenta student interaction model

The student side is an **activity-first learning experience**, not an open-ended chatbot. The child should learn by acting on a bounded challenge, seeing what changes, receiving immediate guidance, and trying again. Student-facing copy and components should use **SyncSenta** and **Omega Claw** language; do not introduce Mwalimu as the product or student-tutor name in new work.

### Interaction loop

```text
Orient the learner to one concept
        ↓
Present one concrete challenge
        ↓
Child clicks, drags, groups, selects, types, or manipulates
        ↓
SyncSenta observes the response
        ↓
Give immediate visual, text, or optional spoken feedback
        ↓
Scaffold the misconception with a smaller step or hint
        ↓
Child retries and explains the idea
        ↓
Unlock the next bounded node or recommend revision
```

### Student-side requirements

- [ ] Make interactive tasks the primary learning surface; do not make a long AI chat the default lesson experience.
- [ ] Support clicking, dragging, grouping, visual grids, number pads, sorting, connecting, and direct manipulation as reusable activity primitives.
- [ ] Provide immediate feedback through colour/state changes, highlighted objects, concise text, optional spoken guidance, progress indicators, trophies, and celebration states.
- [ ] Treat mistakes as learning evidence: show a smaller step, ask one guiding question, highlight the relevant object, and allow retry before revealing a worked answer.
- [ ] Organise lessons into short bounded rounds with a visible question count, node state, pause/resume, and a clear next action.
- [ ] Require transfer after success: apply the idea to a new example or explain it back in the learner's own words.
- [ ] Provide a text-first and printable equivalent for every essential activity so the experience works with limited internet.
- [ ] Track evidence of understanding, not just completion: action, answer, hint level, misconception, retry, mastery state, and next recommendation.
- [ ] Gate AI and blockchain activity visibility to Grade 6 introductory scope and Senior School Grades 10–12; do not expose this pathway to lower grades.

## Omega Claw as the SyncSenta backbone

Omega Claw is the **curriculum, activity, progression, and evidence backbone** for SyncSenta. It is not only a subject label or a chatbot prompt. Every eligible student activity, teacher-generated lesson, revision set, and progress record should be able to resolve through Omega Claw's scope and learning-state rules.

Omega Claw should own the following contracts:

| Backbone responsibility | Required behavior |
|---|---|
| Curriculum scope | Grade 6 introduces AI and blockchain conceptually; Grades 10–12 provide deeper supervised study; lower grades are excluded from this pathway. |
| Activity registry | Store reusable challenge types, prompts, widgets, hints, answer checks, and offline equivalents. |
| Progression | Move from orientation to challenge, scaffold, retry, mastery, and transfer rather than advancing on completion alone. |
| Safety boundaries | Block crypto trading, investment advice, wallet custody, unsupervised attacks, public deployment, and unnecessary personal-data collection. |
| Teacher control | Generated activities remain drafts until a teacher reviews and approves them. |
| Evidence | Record the learner's attempt, response, hint usage, misconception category, mastery state, and recommended next action. |
| Delivery | Support online interactive mode, low-bandwidth text mode, printable mode, and optional audio. |
| Auditability | Keep curriculum source, grade, strand, activity version, teacher approval, and update date attached to learning content. |

### Backbone implementation sequence

1. Define a typed Omega Claw activity contract for challenge nodes, widgets, hints, mastery checks, and offline fallbacks.
2. Add a registry that maps grade, subject, concept, strand, and learning outcome to approved activity nodes.
3. Add a student activity runner that renders one node at a time and records attempts without requiring an AI call.
4. Add a bounded guidance service that selects the next hint or question from the node's approved scaffolding rules.
5. Add teacher review and approval states before activities can be assigned to learners.
6. Add progress and evidence reporting for learners, teachers, and parents using minimum necessary data.
7. Add tests proving Grade 6 accepts introductory AI/blockchain nodes, Senior School accepts deeper nodes, and lower grades reject them.

## Priority 0: Make the current product trustworthy

Target: immediate foundation work before adding more learning features.

### Product and website

- [ ] Connect a production custom domain and update canonical URLs, sitemap, robots, Open Graph metadata, and structured data.
- [ ] Rewrite the homepage hero so a first-time visitor understands what SyncSenta does, who it serves, and the next action within five seconds.
- [ ] Make the primary CTA visible above the fold and repeat it at meaningful decision points.
- [ ] Verify the contact flow end to end: validation, loading, success, failure, spam protection, notification, safe storage, and privacy notice.
- [ ] Add the minimum legal and trust surfaces: privacy policy, terms where needed, founder/team context, and at least one proof point.

### Accessibility and performance

- [ ] Add a skip link, logical heading order, accessible names, visible focus states, and keyboard-only navigation.
- [ ] Respect `prefers-reduced-motion` and verify color contrast, form labels, error announcements, image alt text, and tap-target size.
- [ ] Optimize hero media, fonts, JavaScript bundles, third-party scripts, and layout stability.
- [ ] Add branded loading, error, and 404 states so users are never left with a blank screen.
- [ ] Run Lighthouse on desktop and mobile; record LCP, INP, CLS, and the follow-up fixes.

## Priority 1: ADHD-friendly learner and teacher experience

Target: reduce friction in the student, teacher, and agent workflows. These items are adapted from the rules in [`i-have-adhd/skills/i-have-adhd/SKILL.md`](https://github.com/dgithinjibit/i-have-adhd/blob/main/skills/i-have-adhd/SKILL.md); they are product behavior guidelines, not a medical diagnosis or treatment feature.

### Interaction patterns

- [x] Position the install-app prompt at the bottom-left so it stays visible without covering primary lesson content or bottom navigation.
- [ ] Put one clear **Next step** on every lesson, quiz, resource, and setup screen.
- [ ] Convert long instructions into short numbered steps, with one action per step and a visible progress indicator.
- [ ] Preserve learner state across navigation and sessions: current lesson, last completed step, saved draft, and next recommended action.
- [ ] Show concrete wins immediately: completed activity, earned competency, saved resource, or teacher feedback received.
- [ ] Use matter-of-fact error messages that state the cause and the next recovery action; do not hide failures behind generic toasts.

### Focus-supportive controls

- [ ] Add optional focus mode for lessons: one task at a time, reduced visual noise, pause/resume, and a clear return point.
- [ ] Add optional short work intervals and break reminders without forcing timers on learners.
- [ ] Keep lists and choices small by default; group secondary actions under progressive disclosure.
- [ ] Add learner-controlled notification preferences and avoid interrupting active learning with non-essential prompts.
- [ ] Test all focus features with teachers and learners before making them defaults.

## Priority 2: Grade 6 Omega Claw learning pathway

Target: provide a safe, introductory AI and blockchain pathway for Grade 6 only.

- [x] Define a Grade 6-only curriculum guide covering AI concepts, blockchain as a shared record, and responsible digital citizenship.
- [x] Block AI/blockchain Omega Claw content for PP1–Grade 5 before backend retrieval or generation.
- [x] Keep the pathway conceptual and teacher-guided; exclude advanced coding, crypto trading, investment advice, and personal-data collection.
- [ ] Add a learner-facing pathway page with three short strands: “What is AI?”, “What is blockchain?”, and “Responsible digital citizenship”.
- [ ] Add teacher review controls for every generated Omega Claw activity, with an explicit Grade 6 and introductory-scope check.
- [ ] Add age-appropriate formative checks: explain the concept in own words, identify one limitation or risk, and propose one safe human-reviewed use.
- [ ] Add offline-friendly paper or classroom activities, including AI example sorting, a paper blockchain chain, and privacy/fairness scenarios.
- [ ] Add automated tests for Grade 6 acceptance and Grade 1–5 rejection cases.

## Priority 3: Senior School Omega Claw pathway

Target: provide deeper AI and blockchain study in Grades 10–12 without weakening privacy, safety, ethics, or human accountability.

- [x] Define Grade 10–12 progression from foundations and experimentation to applied systems and supervised capstone work.
- [x] Add AI data literacy, algorithms, evaluation, bias, explainability, cybersecurity, governance, distributed systems, consensus, and smart-contract concepts.
- [x] Add practical project requirements for evidence, reproducibility, accessibility, risk assessment, and a simpler non-blockchain alternative.
- [x] Keep real-money trading, token sales, wallet custody, financial promotion, unsupervised attacks, and public deployment out of student work.
- [ ] Add Senior School learner-facing modules, code or spreadsheet sandboxes, and teacher-approved datasets.
- [ ] Add Grade 10, Grade 11, and Grade 12 diagnostic, mastery, and capstone rubrics.
- [ ] Add automated tests for Senior School acceptance and lower-grade rejection cases.

## Priority 4: Teacher-first, low-bandwidth lesson planning and revision

Target: make the teacher side the next product focus. SyncSenta should help schools with limited internet create, revise, save, and reuse curriculum-aligned lessons without requiring a continuous connection or advanced technical skills.

### Core teacher workflow

- [x] Route Grade 6 and Senior School Omega Claw context into lesson-plan and scheme-of-work generation.
- [x] Expose Grades 1–12 in the scheme-of-work generator.
- [ ] Create a clear teacher onboarding path: choose school and grade, select subject, choose curriculum strand, generate a first draft, review, save offline, and share or print.
- [ ] Add a teacher workspace with Drafts, Saved Lessons, Schemes, Revision Sets, and Review Queue.
- [ ] Add a visible curriculum context panel showing grade, subject, strand, sub-strand, learning outcomes, source, and last updated date before generation.
- [ ] Add teacher approval as a required state before a generated lesson can be shared with students.
- [ ] Add revision tools: simplify language, add local examples, differentiate support, create a retrieval-practice set, translate to Kiswahili, and produce an offline printable version.
- [ ] Preserve the original draft, every revision, teacher notes, and the final approved version.

### Limited-internet requirements

- [ ] Cache the last approved lesson, scheme, quiz, and revision set for offline viewing.
- [ ] Queue generation requests locally when the connection is unavailable and show a clear Pending Sync state.
- [ ] Make all core teacher outputs exportable to Markdown, PDF, and print-friendly HTML.
- [ ] Keep generated lessons usable without video, external links, or live AI during classroom delivery.
- [ ] Provide low-bandwidth mode with reduced media, compressed assets, short prompts, and resumable uploads.
- [ ] Show connection status, last successful sync, retry action, and whether content is local, synced, or awaiting review.

### Teacher-side acceptance criteria

- [ ] A teacher can create a Grade 11 AI or blockchain scheme from a curriculum context and see the expected learning outcomes, practical work, ethics, and safety boundaries.
- [ ] A teacher can revise the generated content without losing the original, then approve and export it.
- [ ] A teacher can prepare a lesson using the output while offline after the initial sync.
- [ ] A teacher can generate a quiz or revision set from the same approved lesson without curriculum drift.
- [ ] The interface states when content is AI-generated, when it is teacher-approved, and which curriculum source informed it.

## Priority 5: Serious-reviewer proof, trust, and school adoption

Target: demonstrate that SyncSenta is a working, safe, curriculum-aligned platform rather than a list of features. Each proof item must link to a real artifact, screenshot, recording, or verified workflow.

### Live product evidence

- [ ] Publish a live demo with a stable URL and a seeded, non-personal demo account or guided tour.
- [ ] Capture real screenshots of the teacher dashboard, student experience, parent dashboard, progress dashboard, lesson review, and low-bandwidth states.
- [ ] Record a short demo video showing onboarding, lesson generation, teacher revision, approval, offline access, quiz creation, and student results.
- [ ] Provide a sample lesson library covering Grade 6 introduction and Senior School Grades 10–12 depth.
- [ ] Demonstrate a complete sample quiz flow from teacher creation through student attempt, marking, feedback, and revision recommendation.
- [ ] Demonstrate the voice tutor with a controlled, age-appropriate script, transcript, consent notice, and fallback text mode.

### School and family trust evidence

- [ ] Build a parent dashboard showing assigned work, participation where applicable, progress, teacher comments, and next steps without exposing unnecessary learner data.
- [ ] Generate a parent report that explains progress in plain language, includes evidence, and clearly distinguishes teacher judgement from AI assistance.
- [ ] Add a school pricing page with transparent plan limits, onboarding/support inclusions, pilot terms, and a contact path for institutions.
- [ ] Add terms of service, a privacy policy, a child safety policy, an acceptable-use policy, and a data-retention/deletion explanation.
- [ ] Add a contact and support process with response expectations, escalation path, safeguarding contact, and service-status communication.
- [ ] Collect permissioned testimonials from teachers, parents, and school leaders; label pilots, quotes, dates, and outcomes accurately.
- [ ] Publish at least three case studies with the school context, problem, workflow, screenshots, teacher role, learner evidence, outcome, limitations, and next step.

### Minor safety and data governance

- [x] Add experimental frontend routes for privacy, child safety, data retention, AI limitations, parental consent, reporting, support, school controls, and student-data ownership; clearly label them as demo/prototype surfaces.
- [x] Add guarded backend endpoints for trust requests, parental consent, student-data rights, and school-control actions; keep demo mode non-persistent by default and enable Firestore writes only with an explicit environment flag.
- [ ] Add a privacy policy written for parents, schools, teachers, and learners, including data categories, purposes, processors, transfers, rights, and contact details.
- [ ] Add a parental consent flow for child accounts, school-managed accounts, voice features, communications, and any optional data collection; record consent version and withdrawal.
- [ ] Publish a data-retention and deletion policy with retention periods by record type, school controls, parent requests, learner-account closure, backups, and deletion verification.
- [ ] Add content moderation and safeguarding controls for learner prompts, generated content, uploads, voice interactions, reporting, escalation, audit logs, and human review.
- [ ] Add a prominent AI limitation disclaimer: generated content may be wrong, biased, incomplete, or unsuitable; teachers remain responsible for review and decisions.
- [ ] Replace demo role cookies with secure authenticated sessions for any real school or learner data; enforce server-side authorization on every school, parent, teacher, and student resource.
- [ ] Add school-admin controls for staff invitations, role assignment, class membership, curriculum permissions, consent status, exports, deletion requests, audit logs, and account suspension.
- [ ] Document student progress data ownership, access rights, correction/export/deletion procedures, school responsibilities, and what happens when a learner changes school.
- [ ] Conduct a child-safety, privacy, and security review before using live minor data or making public claims about learner outcomes.

### Curriculum and outcomes evidence

- [ ] Publish curriculum mapping details for each supported grade and subject: source, strand, sub-strand, learning outcomes, activities, competencies, values, assessment evidence, and update date.
- [ ] Show the Grade 6 AI/blockchain boundary and the Senior School Grade 10–12 progression in the product and documentation.
- [ ] Publish anonymised student-result examples with baseline, intervention, assessment method, sample size, time period, and limitations.
- [ ] Add a curriculum-alignment evidence view to generated teacher resources so reviewers can inspect why a lesson is aligned.
- [ ] Establish a teacher review panel or pilot protocol before making learning-outcome claims publicly.

### Onboarding proof

- [ ] Design a five-step onboarding flow: school profile, teacher role, curriculum level, first lesson, and review/export.
- [ ] Include a sample mode so a reviewer can experience the product without creating real student records.
- [ ] Provide an explicit next action on every onboarding screen and a visible completion state.
- [ ] Add a 90-second guided tour and a one-page teacher quick-start guide.

## Priority 6: Agent operating model and shared project language

Target: make Omega Claw and future agents consistent, explainable, and easier to maintain.

The selected practices come from the reusable engineering and productivity skills in [`dgithinjibit/skills`](https://github.com/dgithinjibit/skills), especially `grill-with-docs`, `domain-modeling`, `to-spec`, `to-tickets`, `implement`, `tdd`, `diagnosing-bugs`, `code-review`, `research`, `writing-for-agents`, and `handoff`.

### Context and alignment

- [ ] Create a concise `CONTEXT.md` for SyncSenta covering CBC terminology, learner roles, teacher roles, Omega Claw scope, and safety boundaries.
- [ ] Add an agent-facing pointer from the relevant instructions to the curriculum guide, with explicit triggers for Grade 6 AI/blockchain requests.
- [ ] Use a short discovery or “grill with docs” pass for ambiguous product changes before implementation.
- [ ] Record durable product and architecture decisions as ADRs instead of leaving them only in chat or issue comments.

### Spec-to-implementation workflow

- [ ] Convert each roadmap item into a small acceptance-tested ticket with dependencies and a named validation command.
- [ ] Implement one vertical slice at a time: UI, data contract, agent behavior, test, and user-visible state.
- [ ] Use red-green-refactor for new guardrails and regression-sensitive behavior, beginning with Grade 6 and lower-grade rejection tests.
- [ ] Run a two-part review before merge: standards/code quality and fidelity to the agreed specification.
- [ ] Use disciplined diagnosis for named bugs and regressions: reproduce, minimise, hypothesise, instrument, fix, and add a regression test.

### Research and handoff

- [ ] Store research findings as cited Markdown in `docs/` when a decision depends on external curriculum, accessibility, or platform guidance.
- [ ] Redact credentials, cookies, personal data, and learner information before any log or artifact is shared with an agent or issue tracker.
- [ ] Keep a compact handoff document for unfinished work: current state, decisions, failing checks, and one next action.
- [ ] Use a plain-language re-explanation path when a learner or teacher indicates that an instruction was not understood.

## Priority 7: Conversion, trust, and operational readiness

Target: turn the public site into a credible studio and product entry point after the foundation is stable.

- [ ] Turn at least three portfolio items into case studies with problem, role, process, solution, outcome, visuals, and a related CTA.
- [ ] Improve service descriptions so each explains audience, problem, outcome, process, and deliverables.
- [ ] Add an about/process section, testimonials or proof points, social links, and a reliable booking or inquiry path.
- [ ] Add privacy-aware analytics for pageviews, CTA clicks, form submissions, portfolio clicks, performance, and errors.
- [ ] Add an insights or documentation section only when there is a sustainable publishing plan.

## Definition of done

A roadmap item is complete when:

- The user-facing behavior is implemented and understandable without extra explanation.
- The relevant accessibility and mobile behavior has been checked.
- Acceptance criteria and regression tests exist for important logic.
- Errors and recovery actions are visible.
- Documentation or agent guidance is updated when the behavior changes.
- The validation result and any unrelated baseline failures are recorded.

## Source mapping

| Source | Relevant material used | SyncSenta application |
|---|---|---|
| [`i-have-adhd`](https://github.com/dgithinjibit/i-have-adhd) | Action-first output, numbered steps, state restatement, visible progress, concrete next action, concise errors, reduced tangents | Learner and teacher lesson flows, agent responses, onboarding, and focus-supportive UI |
| [`skills`](https://github.com/dgithinjibit/skills) | Shared project language, discovery before implementation, specs and tickets, TDD, diagnosis, code review, research, handoff | Omega Claw agent reliability, engineering workflow, documentation, and regression prevention |
| Attached SyncSenta review provided with the task | Domain, messaging, portfolio, contact, SEO, accessibility, performance, trust, analytics, and QA priorities | Public website readiness and conversion roadmap |

## Suggested first implementation slice

1. Add `CONTEXT.md` with the Omega Claw scope and core CBC terms.
2. Add Grade 6 and Grade 1–5 automated tests for the existing curriculum guardrail.
3. Build the three-strand Grade 6 learner pathway with one activity per strand.
4. Run the accessibility checklist and Lighthouse against that pathway.
5. Record the result in a short handoff document with the next action.
