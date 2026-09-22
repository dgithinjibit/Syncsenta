# SyncSenta Current-State Assessment and Business Architecture

**Prepared:** 21 September 2026  
**Repository:** `dgithinjibit/Syncsenta`  
**Deployment inspected:** `https://sentastudio.vercel.app`  
**Author:** Manus AI

## Executive conclusion

SyncSenta should **not** be split into four separate products for CBC, crypto, blockchain, AGI, and financial literacy. That would multiply curriculum, safety, distribution, and support costs before the core learning loop is proven.

The stronger architecture is:

> **SyncSenta is an adaptive learning platform for Kenyan learners. CBC is the initial distribution wedge; blockchain, financial literacy, and AI/AGI are future-economy learning packs delivered through the same learner, competency, session, evidence, and teacher-feedback platform.**

CBC is indeed large. That is a reason to narrow the first commercial release, not to abandon CBC. The recommended starting point is **one measurable CBC use case**, such as Grade 2–4 mathematics and teacher intervention support, while designing the underlying platform so every subject is represented as a versioned learning pack rather than a hard-coded product branch.

The current repository contains a substantial prototype and several working production paths. It is **not yet a clean production platform**. The immediate priority should be consolidation and operational reliability, not adding more AI agents or a full MeTTa/Hyperon rewrite.

## What was inspected

The repository is a public monorepo whose primary application is `studio/`, a Next.js application deployed on Vercel. It also contains a Python FastAPI service, Supabase migrations, Upstash Redis session state, a Rust adaptive-service prototype, a separate Scheme Scribe application, and experimental MeTTa/Hyperon components.

The public deployment returned HTTP 200 and identified itself as **“Syncsenta - Kenyan CBC Learning for Students and Schools.”** The deployed shell is a Next.js application. The repository’s latest visible commit is `3d36f40`, dated shortly before this assessment.

The source documentation describes ten or more subject entries. Seven are CBC-oriented sandbox subjects, while blockchain, financial literacy, artificial intelligence, and superintelligence are chat-first subjects. The main student chat path performs authentication, reads learning-progress data, computes an Omega scaffolding decision, builds a dynamic system prompt, calls Groq or Gemini, streams the response, and persists chat and progress data.

## Current state by capability

| Capability | Current state | Assessment |
|---|---|---|
| Student web experience | Live Next.js application with student routes, subject pages, sandbox activities, chat, XP, and resume state | Real product foundation |
| Teacher experience | Dashboard, student subject summaries, scheme and lesson generators, assessment tools, feedback-related routes | Broad but unevenly integrated |
| Guardian and school roles | Auth and dashboard foundations, guardian links, school/class migrations, demo flows | Partially productized; needs pilot validation |
| Adaptive tutoring | TypeScript Omega decision engine is active in the `/api/chat` path | Most credible differentiator today |
| AI generation | Separate direct Groq/Gemini student path and FastAPI teacher-agent path | Functional concept, fragmented contract |
| Persistence | Supabase for structured data and Upstash Redis for short-lived learning-session state | Reasonable split, but durability boundaries need clarification |
| MeTTa/Hyperon | Mostly archived or prototype code; request-scoped references and documentation are inconsistent | Do not expand until the boundary is simplified |
| Rust adaptive service | Built locally but not verified as production-wired | Remove from the critical path or deploy deliberately |
| Commercial monetization | M-Pesa environment variables exist | Payment infrastructure is a placeholder, not a business model |
| Operations | Vercel and Render manifests exist | Full-system health is not currently verifiable because the Render health endpoint timed out |

## Verified technical holes

### 1. The repository does not currently pass its own typecheck

`npm run typecheck` failed with errors in both archived MeTTa files and active code. The active-path failures include missing `MeTTaSession` and `MeTTaEducationKnowledgeGraph` symbols in `studio/src/app/api/chat/route.ts`, a missing `omega_scaffolding_events` relation in generated Supabase types, and missing `getStudentId` references in the student page.

The archived MeTTa prototype also fails typechecking because it was moved without updating its imports. Archiving code without excluding it from `tsconfig`, lint, and test discovery has created a false boundary: the code is described as archived but still affects the project’s quality gates.

**Priority:** P0. A senior development workflow should not merge new product work while the main typecheck is red.

**Fix:** Either remove the archived prototype from the TypeScript project and test scope, or restore it as a coherent package with its own build boundary. Then repair the active chat-route imports and regenerate database types after confirming the migration exists in the deployed Supabase project.

### 2. The test suite is red and exposes real product drift

The Studio test run produced **285 passing tests, 8 failing tests, and 17 skipped tests across 45 test files**. The failures include:

- MeTTa tests attempting to instantiate exports that no longer exist.
- Sandbox coverage tests expecting a Grade 4 English guided-foundation activity that is not returned by the current activity catalogue.
- Activity lookup failure for the corresponding generated activity ID.

These are not cosmetic failures. They indicate that the repository’s implementation, test fixtures, and architecture documentation have diverged.

**Priority:** P0 for the affected paths. Fix or explicitly delete stale tests before treating the suite as a release signal.

### 3. Linting is technically noisy and currently has a blocking error

The lint run reported **one error and approximately 889 warnings**. The error is in the archived MeTTa page, where a function is accessed before declaration. The warning volume includes extensive `any` usage, unused variables, React effect issues, and code in archived modules.

**Priority:** P1. Exclude archived material from production linting immediately, then set a warning budget for active code. Do not attempt to resolve hundreds of warnings in a single refactor; reduce them by product domain.

### 4. The Render AI backend did not pass the readiness check

Both `https://ascendra-1.onrender.com/healthz` and `/openapi.json` timed out after 20 seconds during inspection. The Vercel CSRF-token endpoint responded successfully, so this is a partial-system failure rather than a complete outage of the public shell.

The repository’s deployment runbook correctly says that a Render timeout must not be treated as a healthy cold start. Until the backend health endpoint responds, teacher generation and other FastAPI-backed workflows should be treated as unavailable or unverified.

**Priority:** P0 for any pilot relying on teacher generators. Verify Render service state, logs, cold-start limits, environment variables, database connectivity, and the deployed commit before changing application code.

### 5. There are two AI delivery architectures without a shared contract

The student chat path calls Groq or Gemini directly from Next.js. Teacher generators and other agent workflows call the FastAPI service. These paths have different request shapes, error behavior, retry behavior, observability, and fallback assumptions.

The project task notes explicitly identify this as a problem. A failure in the teacher generator can therefore look different from a failure in student chat, making support and product analytics harder.

**Priority:** P1.

**Fix:** Define a shared AI contract containing request ID, actor, role, learning-pack ID, competency, safety policy version, provider, model, latency, token/cost metadata, response status, and fallback reason. The frontend may still use different transport paths, but the domain contract and telemetry should be one system.

### 6. Rate limiting is strongest on chat, not uniformly on expensive AI actions

The active chat route calls the Upstash rate limiter. The project task notes identify teacher generators and external API calls as insufficiently protected. This creates a quota-burn and denial-of-service risk on the most expensive endpoints.

**Priority:** P1.

**Fix:** Apply actor-, school-, endpoint-, and provider-aware limits to lesson, scheme, assessment, exam, voice, and future content-pack generation. Record rejected requests and provider spend in a usage ledger.

### 7. The current learning state is not yet a complete cross-subject learning model

The subject registry gives every subject a slug, label, layout, and XP prefix. That is a useful start, but it is not yet a domain model for cross-subject learning. Blockchain, AI, and financial literacy are currently chat-first subjects with general competency codes, while core CBC subjects have sandbox activities and richer competency structures.

If the product must support comments or teacher participation across all sessions, the platform needs a first-class **Learning Session** entity independent of rendering mode. A session should link learner, teacher/classroom, learning pack, competency, evidence, chat/activity events, comments, interventions, and consent context.

**Priority:** P1 for the requested “comment on all sessions” capability.

### 8. MeTTa/Hyperon is creating architectural confusion

The codebase contains a TypeScript Omega decision engine that is active, a Rust implementation that is not production-wired, Python Hyperon policy code, and an archived MeTTa prototype. The repository documentation acknowledges that the broader MeTTa system is mostly not used in production, yet active routes and tests still reference pieces of it.

The current evidence supports using Omega as a small, testable policy component. It does not support replacing Supabase queries, authorization, audit, or the entire learning platform with AtomSpace/DAS.

**Priority:** P1.

**Recommendation:** Keep MeTTa/Hyperon behind a narrow adapter for experiments and policy evaluation. Make TypeScript Omega the explicit production source of truth until a deployed, observable, restart-safe alternative proves better outcomes.

### 9. Multi-tenancy and school operations are not yet a complete commercial foundation

The repository has school, class, guardian, onboarding, attendance, and role-related migrations. However, the roadmap still lists multi-tenancy, NEMIS integration, advanced analytics, messaging, and other school-scale capabilities as future work. The existence of tables and RLS policies is not equivalent to a validated school operating model.

Before selling to schools, validate the complete lifecycle: school creation, staff invitation, class assignment, learner import, guardian consent, teacher visibility boundaries, transfer between classes, learner deletion/export, and school-level billing.

**Priority:** P1 for B2B school sales.

### 10. Compliance, child safety, and AI governance are not yet a product capability

The security documents identify missing or incomplete privacy policy, terms, retention, data-subject rights, monitoring, and prompt-injection defenses. These matter more because the product serves children and stores learning histories, behavioral signals, and chat data.

For crypto and financial literacy, the platform must also distinguish education from financial advice. Content needs age bands, suitability rules, prohibited recommendations, source/version metadata, and a visible “learning only, not financial advice” boundary for older learners.

**Priority:** P0 before broad child-facing or financial-content distribution.

## Recommended business architecture

### The product promise

The product promise should be narrow enough to sell and broad enough to extend:

> **SyncSenta helps Kenyan schools and learners turn curriculum activity into measurable progress, with an AI tutor and teacher intervention loop that adapts to each learner.**

The platform should not lead with “AGI,” “blockchain,” or “MeTTa.” Those are technology or content themes. The customer buys improved learning outcomes, teacher productivity, learner engagement, and trustworthy reporting.

### The four-layer model

#### Layer 1: The platform core

This layer is shared by every learning pack:

- Identity, roles, school/classroom membership, and guardian relationships.
- Learning sessions with comments, teacher notes, mentions, and moderation.
- Versioned competency and content-pack registry.
- Activity and chat event capture.
- Evidence, mastery, XP, interventions, and teacher feedback.
- AI gateway with provider routing, safety policy, rate limits, cost controls, and audit trails.
- Search and retrieval over approved curriculum or course sources.
- Consent, privacy, retention, export, and deletion controls.

This is where the long-term defensibility lives. The interface can change. The model provider can change. The content pack can change. The learning evidence and intervention loop remain.

#### Layer 2: CBC learning packs

CBC should be the first commercial pack because it matches the current brand, content, teacher workflows, and Kenyan school distribution path. Do not attempt full PP1–Grade 9 depth before validating one segment.

A practical first wedge is:

- Grades 2–4.
- Mathematics as the deepest subject.
- English and Environmental Activities as supporting subjects.
- Teacher dashboard focused on misconceptions and next-best intervention.
- Parent or guardian reporting as a secondary trust feature.

Each pack should be versioned and mapped to grade, subject, strand, sub-strand, competency, language, term, and approved evidence. The platform should report which curriculum version produced a recommendation.

#### Layer 3: Future-economy learning packs

Blockchain, financial literacy, and AI/AGI should be grouped under a coherent category such as **Future Economy and Digital Intelligence**. They should not appear as unrelated tabs.

A sensible sequence is:

1. **Financial literacy:** budgeting, saving, risk, interest, scams, digital payments, and responsible decision-making.
2. **Digital and AI literacy:** how software, data, models, automation, and AI systems work; how to use them safely and critically.
3. **Blockchain literacy:** ledgers, consensus, identity, provenance, smart contracts, and real-world use cases.
4. **Crypto awareness for older learners:** volatility, custody, scams, regulation, and risk. This should be educational and age-gated, not a trading or investment recommendation product.

The same session, evidence, and teacher-comment model should power these packs. A learner can move from a CBC mathematics competency on percentages into financial literacy on interest and risk without creating a second user identity or second LMS.

#### Layer 4: Intelligence and research services

Omega should remain a bounded tutoring-policy service. It can decide how much scaffolding a learner needs. It should not silently decide curriculum truth, student eligibility, disciplinary action, financial advice, or high-impact school decisions.

MeTTa/Hyperon can be used later for explainable rule evaluation, competency relationships, and bounded knowledge queries. It should not replace Supabase for authentication, structured records, RLS, or auditability.

## Cross-session commenting architecture

If “comment on all sessions” means that a teacher, mentor, or authorized operator should be able to comment on any learner session, implement it as a platform capability rather than adding ad hoc comments to each subject page.

A minimal domain model is:

| Entity | Purpose |
|---|---|
| `learning_sessions` | One learner’s bounded interaction context for a pack, subject, competency, or assignment |
| `session_events` | Immutable activity, chat, assessment, and intervention events |
| `session_comments` | Teacher, mentor, guardian, or system comments with visibility and moderation state |
| `session_participants` | Explicit authorization for who can view or comment |
| `learning_evidence` | Links a claim of progress to observable work or responses |
| `interventions` | A teacher action, recommendation, status, and outcome |
| `content_pack_versions` | The curriculum/course version used by the session |

Comments should support at least `private_teacher`, `school_staff`, `guardian_summary`, and `learner_visible` visibility. The system should record author, timestamp, role, target event, moderation status, and whether an AI-generated draft was accepted or edited by a human.

The comment API should enforce authorization through classroom membership and guardian relationships. It should not rely on a client-supplied teacher ID. Comments should be searchable from the teacher dashboard and included in the evidence timeline, but they should not be used as unreviewed training data.

## Commercial architecture

### Recommended beachhead

The first buyer should be a **school or teacher group**, not a general consumer audience. The product already has teacher and school concepts, and the teacher intervention loop creates a stronger willingness to pay than a generic chatbot.

The initial offer can be:

- A school pilot for one grade band.
- Teacher dashboard and AI-assisted planning.
- Student adaptive practice and tutoring.
- Guardian progress summaries.
- A defined reporting pack for school leadership.

A direct-to-consumer learner plan can follow after the core learning loop has evidence. It should not become the main architecture before school operations are reliable.

### Revenue layers

The business can evolve through three revenue layers:

1. **School subscription:** priced by active learner, class, or school size, with teacher tools and reporting.
2. **Premium learning packs:** future-economy courses, exam preparation, or teacher professional development.
3. **Institutional and partner deployments:** NGOs, universities, workforce programs, or financial-literacy sponsors.

Avoid building a complex wallet, token, or crypto payment system as a prerequisite. M-Pesa and ordinary invoicing are more aligned with the first Kenyan school motion. Crypto should initially be a learning topic, not the platform’s settlement mechanism.

### North-star metric

The north-star metric should be an outcome measure, not chat volume:

> **Verified competency progress per active learner per learning week, with teacher-confirmed usefulness.**

Supporting metrics should include weekly active learners, completed learning loops, time to teacher intervention, misconception resolution, teacher planning time saved, retention, AI cost per successful learning loop, and safety incidents per 1,000 sessions.

## Product sequencing

### Phase 0: Stabilize the platform core

Before adding new content, make the repository trustworthy. Exclude or properly package archived MeTTa code. Repair active type errors. Bring tests to green. Verify the Render service. Add CI for typecheck, lint, tests, build, dependency audit, and backend health. Unify AI telemetry and error contracts.

### Phase 1: Prove the CBC wedge

Choose one grade band and one measurable subject outcome. Implement the complete loop from learner activity to teacher insight to intervention to follow-up evidence. Add session comments to this loop. Validate with real teachers and a small number of schools.

### Phase 2: Generalize into learning packs

Move subject metadata, competencies, activities, prompts, safety rules, sources, and assessment rubrics into a versioned content-pack model. Add financial literacy first because it connects naturally to mathematics and everyday decisions. Then add AI literacy and blockchain literacy as age-appropriate packs.

### Phase 3: Scale school operations

Complete multi-tenancy, school onboarding, billing, guardian consent, reporting, exports, retention, and observability. Add partner APIs only after tenant isolation and audit trails are proven.

### Phase 4: Advanced intelligence

Evaluate whether MeTTa/Hyperon or the Rust service improves measurable outcomes, explainability, latency, or cost. Promote components only when they have a production contract, readiness checks, replayable tests, and an observable fallback.

## Decision framework for new features

A proposed feature should be accepted only if it answers all of the following questions:

1. Which learner, teacher, guardian, or school problem does it solve?
2. Which learning outcome or operational metric should improve?
3. Which learning pack does it belong to?
4. Does it use the shared session, evidence, comment, and authorization model?
5. What is the child-safety and privacy impact?
6. What is the AI cost and fallback behavior?
7. How will a teacher or administrator verify that it worked?

If a feature cannot answer these questions, it is probably a research prototype rather than a product priority.

## Recommended immediate engineering backlog

| Priority | Work | Exit condition |
|---|---|---|
| P0 | Repair TypeScript errors and define the archived-prototype boundary | `npm run typecheck` passes |
| P0 | Repair or remove the eight failing Studio tests | `npm test` passes with an explicit skip policy |
| P0 | Verify and restore Render `/healthz` | Health endpoint responds consistently |
| P0 | Add child-safety, privacy, retention, and financial-content policy gates | Policy is enforced and tested on every learning pack |
| P1 | Introduce a shared AI contract and telemetry envelope | Student and teacher AI paths produce one trace shape |
| P1 | Rate-limit every expensive AI route | Limits and spend alerts cover chat, generation, voice, and exports |
| P1 | Create first-class `learning_sessions` and `session_comments` | Authorized teacher comments appear across all session types |
| P1 | Formalize versioned content packs | CBC and future-economy content share one registry and evidence model |
| P1 | Select a Grade 2–4 CBC pilot and define outcome metrics | Pilot can measure competency progress and teacher usefulness |
| P2 | Decide the fate of Rust adaptive service and broad MeTTa prototype | One documented production path; no ambiguous duplicate runtime |
| P2 | Complete school tenancy, billing, guardian, export, and retention workflows | A school can onboard, operate, pay, and leave safely |

## Overall readiness judgment

| Audience | Judgment | Reason |
|---|---|---|
| Internal demo | Ready with caveats | The public shell and several flows exist, but demo data and fallback paths need clear labeling |
| Small controlled pilot | **Possible after P0 fixes** | The adaptive tutoring and school concepts are promising, but the red quality gates and backend timeout must be resolved |
| Paid school rollout | Not ready yet | Tenant operations, observability, supportability, privacy controls, and reliable AI backend need proof |
| Broad child-facing launch | Not ready | Child-safety, retention, monitoring, content governance, and reliability need production evidence |
| Full multi-domain LMS across CBC, crypto, blockchain, and AGI | Not advisable as the next build step | It expands scope before the core learning and teacher-intervention loop is validated |

## Final recommendation

Keep the SyncSenta name and CBC positioning. Build a single adaptive-learning core. Treat CBC, financial literacy, AI literacy, and blockchain literacy as **governed content packs**, not separate applications. Launch with one CBC wedge, prove the learner-to-teacher intervention loop, and then extend into future-economy education using the same session and evidence architecture.

The best strategic sentence is therefore:

> **CBC is the beachhead; adaptive learning infrastructure is the company; future-economy literacy is the expansion path.**

## References

[1]: https://github.com/dgithinjibit/Syncsenta "SyncSenta GitHub repository"

[2]: https://sentastudio.vercel.app "SyncSenta deployed Studio application"

[3]: https://ascendra-1.onrender.com/healthz "SyncSenta AI backend health endpoint"

[4]: https://supabase.com/docs/guides/auth/server-side/nextjs "Supabase server-side authentication for Next.js"

[5]: https://www.unicef.org/innocenti/reports/policy-guidance-ai-children "UNICEF policy guidance on AI for children"

[6]: https://www.centralbank.go.ke/virtual-assets-and-virtual-asset-service-providers/ "Central Bank of Kenya virtual-assets information"

[7]: https://www.odpc.go.ke/ "Office of the Data Protection Commissioner, Kenya"

[8]: https://www.knqa.go.ke/ "Kenya National Qualifications Authority"
