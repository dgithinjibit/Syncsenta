# SyncSenta Roadmap

**Current position:** 2026-11-23

`docs/TASKS.md` is the only active task register. Git history is the record of completed implementation.
This roadmap states current verified and unverified position without converting source or deployment
configuration into proof.

## Current evidence

- Implemented: the architecture handover and current-state documentation are maintained.
- Implemented: the `/head` layout uses the shared role-aware application shell.
- Implemented: student role routing, grade normalization, CSP fixes, and DOM-based scheme printing
  have source-level fixes and focused regression tests in the repository.
- Implemented: the lean Ubuntu devcontainer image and disk-aware Ollama setup have been written.
- Not verified: the Codespace rebuild and container build result.
- Not verified: the focused Studio regression suite, typecheck, test suite, production build, and
  deployed browser flows.
- Not verified: live Supabase schema state and deployed Python/Rust runtime behavior.
- Source-tested on 2026-11-23: 21 focused AI Agents tests and 47 nearby Studio route/transport tests passed.

## Kenyan teacher-assistant product roadmap

Status labels are deliberately narrow:

- **Built**: source implementation exists and can be inspected.
- **Source-tested**: a focused named test or suite passed locally.
- **Integrated**: caller and upstream route are connected in source, but deployment remains unverified.
- **Production-ready**: implementation, tests, deployed HTTP behavior, and browser verification have all been evidenced.
- **Not started**: no meaningful implementation surface exists in the repository.

### Phase 0 — Stabilize the platform, now

1. **Critical route dispatch — handled.** Teacher-generation routes now dispatch through the direct
   `LessonArchitectAgent` path, and `run_omega_task()` exists as a compatibility adapter in
   [server.py](../ai-agents/src/syncsenta_agents/api/server.py). Source evidence: 21 focused AI Agents
   tests passed in the latest run. Deployment and browser verification are not complete.
2. **Authenticated quiz and grading — source-integrated, approximately 70%.** Studio now owns server-side
   quiz/grade proxies in [quiz route](../studio/src/app/api/agents/assessment/quiz/route.ts) and
   [grade route](../studio/src/app/api/agents/assessment/grade/route.ts). The browser no longer sends
   `demo-student` identities, and 6 focused tests pass. Remaining: server-owned quiz persistence and
   submission history, then a browser flow.
3. **Teacher route authorization — source-integrated, approximately 60%.** Scheme, lesson-plan, and exam
   routes derive teacher identity from the authenticated session. See [scheme route](../studio/src/app/api/generate/scheme/route.ts),
   [lesson-plan route](../studio/src/app/api/generate/lesson-plan/route.ts), and
   [exam route](../studio/src/app/api/generate/exam/route.ts). Scheme and exam need focused regression
   suites comparable to the lesson-plan test before browser verification.
4. **Health/readiness reporting — handled for configuration.** `/healthz` now reports mounted state plus
   boolean provider, database, and service-key configuration in [server.py](../ai-agents/src/syncsenta_agents/api/server.py).
   It still does not make a live provider/database probe.
5. **Python suite repair — in progress.** The syntax and stale imports found during collection have been
   reconciled, but the full suite currently hits a pytest/hypothesis plugin internal error. The
   mounted route and lesson-plan suites remain green. Remaining: use compatible test/plugin versions,
   rerun the suite, and classify real failures.
6. **Deployment and migration ownership — not started.** Reconcile Vercel, Render, Docker, Replit, the
   backend Rust workspace, and Supabase source/live migration histories. No hosting config should be
   described as the production authority until provider state, migration state, and commit are recorded.

### Phase 1 — Make curriculum knowledge the foundation

1. **Structured curriculum data — approximately 45% built.** Static curriculum data exists under
   [studio/src/data/curriculum](../studio/src/data/curriculum), with grade normalization in
   [grade-id.ts](../studio/src/lib/curriculum/grade-id.ts). Expand this into an owned, versioned source
   for CBC/BECF categories, strands, sub-strands, learning outcomes, competencies, values, PCIs, and
   official-source citations. Do not depend on a single LLM prompt to discover curriculum truth.
2. **Official-source separation — not started.** Every official curriculum fact needs source, title,
   jurisdiction, effective date, revision, licence, and retrieval record; separate it clearly from
   model-generated teaching suggestions.
3. **Kenyan context and local-language grounding — approximately 25% built.** Partial Kenyan examples
   and Kiswahili/mixed-language fields exist in the app and agents. Add measurable Gĩkũyũ/Kiswahili
   benchmarks only after the Gĩkũyũ/English corpus is tracked and linked to a consumer.

### Phase 2 — Complete core teacher planning

1. **Scheme of work — approximately 60% built, source-tested.** The scheme wizard is implemented at
   [scheme-wizard](../studio/src/app/teacher/scheme-wizard/page.tsx), and generation is implemented at
   [LessonArchitectAgent.generate_scheme](../ai-agents/src/syncsenta_agents/agents/lesson_architect.py).
   Remaining: durable Save to Library, canonical versioning, official curriculum guardrails, and the
   certification gate in front of downstream generation.
2. **Lesson plan — approximately 65% built, source-integrated.** Implemented in
   [lesson-plan route](../studio/src/app/api/generate/lesson-plan/route.ts) and
   [lesson_plan.py](../ai-agents/src/syncsenta_agents/agents/scheme/lesson_plan.py). Remaining: persistent
   lesson-plan records, scheme-to-plan lineage, low-resource mode, and teacher revision/approval.
3. **Lesson notes and text leveling — approximately 50% built.** Text-leveling generation and rendering
   exist in [lesson_architect_api.py](../ai-agents/src/syncsenta_agents/api/lesson_architect_api.py) and
   [text-leveler renderer](../studio/src/components/teacher/text-leveler-renderer.tsx). Add teacher/learner,
   short/detailed, board-work, and revision-note contracts separately.
4. **Worksheet and teaching aids — approximately 55% built.** Worksheet generation exists in
   [worksheet.py](../ai-agents/src/syncsenta_agents/agents/scheme/worksheet.py), with Studio rendering
   and print support. Add charts, flashcards, posters, matching games, crosswords, and board-printing
   as named resource contracts instead of generic prompt variants.
5. **Differentiation — approximately 50% built.** Three-tier differentiation data and rendering exist in
   [differentiation.py](../ai-agents/src/syncsenta_agents/agents/scheme/differentiation.py) and
   [differentiation renderer](../studio/src/components/teacher/differentiation-renderer.tsx). Remaining:
   emerging/expected/exceeding learner persistence, teacher consent, and measurable delivery variants.

### Phase 3 — Assessment and learner performance

1. **CBC assessment — approximately 40% built.** Assessment models, quiz routes, rubrics, and exam
   generation exist under [assessment.py](../ai-agents/src/syncsenta_agents/agents/assessment.py) and
   [exam.py](../ai-agents/src/syncsenta_agents/agents/scheme/exam.py). Remaining: server-owned quiz/
   attempt records, oral/practical/observation/performance-task contracts, and teacher-mark review.
2. **Marks and remediation — approximately 20–30% built.** Markbook, attendance, assignment, and dashboard
   surfaces exist in [teacher dashboard](../studio/src/app/teacher), [mark routes](../studio/src/app/api/exams/mark),
   and Supabase types. Remaining: canonical learner-score storage, competency aggregation, weak-area
   analysis, remediation generation, enrichment paths, and teacher review.
3. **Inclusive education — approximately 20% built.** Differentiation and text-leveling provide a base,
   while there is no complete accessibility profile or evidence-backed adaptation workflow. Next: learner
   profiles, resource constraints, visual/hearing/physical support contracts, and human-review gates.

### Phase 4 — Kenyan context and classroom operations

1. **Kenyan teacher mode — approximately 15% designed, not production-ready.** Introduce one explicit
   context model across grade, subject, term, school type, resources, duration, class size, and learner
   ability. No feature should silently infer these fields differently across routes.
2. **Low-data/offline mode — approximately 30% built.** PWA, offline page, network hooks, and offline
   queue files exist under [studio/src](../studio/src). Remaining: real offline generation/curated
   download, conflict resolution, versioned content caches, and browser/device verification.
3. **Low-resource school mode — not started as a persisted contract.** Add available-resource selection,
   class-size constraints, and resource substitutions before calling them lesson adaptations.
4. **School administration — mostly not started.** Static/mock timetable and communication surfaces exist,
   but durable timetable generation, duty rosters, attendance workflows, meeting minutes, letters,
   notices, certificates, and report comments need canonical data models and authorization.

### Phase 5 — Professional practice and knowledge operations

1. **Teacher professional development — approximately 30% built.** There is a Studio professional-development
   component and AI guidance surfaces. Remaining: Kenyan/TSC attribution, dated professional expectations,
   evidence-backed practice modules, and progress records.
2. **Teaching practicum/TPD — not started.** Add teaching-practice logbooks, observations, mentor comments,
   reflection, evidence, and portfolio contracts only after identity and school-link authorization exist.
3. **Kenyan education information centre — approximately 15% built.** Some policy/curriculum pages exist,
   but there is no maintained source registry, freshness process, or official-versus-generated separation.
4. **WhatsApp/SMS/USSD — not started.** Requires a maintained channel architecture, consent, rate limits,
   identity linkage, data minimization, and explicit offline/low-bandwidth acceptance criteria.

### Product definition of done

A feature advances to production-ready only when its curriculum source is cited, the user identity and role
are server-derived, the database behavior is authorized and tested, provider failures are explicit, the
route is deployed, and the real signed-in browser flow is verified. A prototype/demo is never described
as a production feature simply because a unit test or build passes.

## AI Agents route reconciliation — 2026-11-23

Implemented: teacher-generation endpoints call the existing `LessonArchitectAgent` directly, passing
teacher, grade, and subject context into its task handler. `server.run_omega_task()` is restored as a
compatibility adapter for the former `AgentRequest`/task-context contract. Quiz and grading route tests
assert the mounted direct `AssessmentAgent` contract; no Omega orchestrator is recreated.

Verification: from `ai-agents/`,
`PYTHONPATH=src .venv/bin/python -m pytest -q tests/test_omega_api.py tests/test_deployed_app_routes.py tests/test_lesson_plan.py`
passed: **20 tests**. No deployment or browser verification was performed.

The full `PYTHONPATH=src .venv/bin/python -m pytest -q` run stopped during collection with six
errors: a syntax error in `tests/test_failure_recovery.py`, missing `aiohttp` and `hypothesis`, a
stale `_resolve_teacher_id` import in `tests/test_teacher_connector.py`, and the absent
`reasoning.hyperon_evaluator` module. The full suite did not execute.

## AI Agents architecture scout — 2026-11-20

Initial baseline, before restoring the chat adapter:
`cd ai-agents && PYTHONPATH=src .venv/bin/python -m pytest -q tests/test_deployed_app_routes.py tests/test_omega_api.py`
returned **3 passed, 6 failed**. `/agents/chat` was absent, and five tests referenced
`get_orchestrator()` functions absent from `api/server.py`. This is a historical source baseline,
not deployed behavior.

The owner selected Rust/Hyperon as the target sole authority for structured tutoring policy on
2026-11-20. This is an architecture decision, not evidence that Hyperon is running or Rust is deployed.
Further source review found Studio's learner chat uses `/api/chat`, calls Rust for structured tutoring
decisions, and streams generated content through Studio. Separately, the teacher assessment UI calls
`/api/generate/assessment`. Rust exposes scope, activity, progression, hint, and tutoring endpoints,
but no free-form chat endpoint. Those Rust routes require a short-lived, Studio-signed student
assertion; the AI Agents proxy instead sends a service key and may send `X-Forwarded-User`.

Implemented: the Studio assessment route verifies the cookie-bound user and teacher profile, then
replaces client-supplied identity fields. Python `POST /agents/chat` is restored as a content-only
adapter using the existing multi-provider client; it ignores role/identity fields for authorization
and does not route policy. The Studio proxy now reports configuration failures as 503 and upstream
or provider failures as 502 instead of returning a fabricated assessment.

Verification:

- `cd ai-agents && PYTHONPATH=src .venv/bin/python -m pytest -q tests/test_chat_api.py tests/test_deployed_app_routes.py tests/test_api_auth.py`
  passed: **13 tests**. One existing Starlette deprecation warning remains.
- `cd ai-agents && PYTHONPATH=src .venv/bin/python -m pytest -q tests/test_omega_api.py`
  later reconciled: the legacy Omega dispatcher expectations were replaced with direct
  `AssessmentAgent` and `LessonArchitectAgent` route contracts. This is historical evidence,
  not deployment verification.
- `cd studio && npm test -- src/app/api/generate/assessment/route.test.ts`
  passed: **7 tests**, covering authentication, trusted identity, configuration errors, and upstream
  failures.
- `cd studio && npx tsc --noEmit` failed on the unrelated
  `src/app/api/teacher/resources/route.test.ts(72,28): Expected 1 arguments, but got 0.`
- `cd studio && npm test` failed: **1,058 passed, 18 skipped, 12 failed**. The failures are in the
  existing BASIX sample/docs, schema-coverage, Omega Claw copy, and PWA wiring tests; none cover the
  assessment route.
- `cd studio && npm run build` exited successfully and generated all 112 static pages. It emitted
  existing dependency, dynamic-rendering, metadata, and `localStorage` prerender warnings.

No deployment or browser verification was performed. Python's declared dotenv dependency was added to
`pyproject.toml` because the provider client imports it directly; the local `.venv` was missing it.

## Crypto payment intake scout — ASI:Chain — 2026-11-20

Owner direction: begin with crypto contributions and service-payment intake on ASI:Chain, use Rust for
SyncSenta application integration, and defer internal cash-flow tooling. No Solidity is to be added.
Existing Polygon/Solidity code remains frozen until its deployment and caller status are audited.
This is a planning decision, not an implemented payment feature.

Current official ASI:Chain documentation describes an active DevNet with test tokens that have no real
value, three validators, and an unstable observer. It describes Rholang as the smart-contract language.
The official Rust wallet CLI supports native token transfers and waits for deploy finalization, but
its send path receives the wallet private key to sign the user's transfer. SyncSenta must not collect
or store payer keys. A first slice should avoid project-authored on-chain contract code: the user signs
in their wallet, and a Rust service verifies the submitted transfer proof against a trusted chain
source. If custom on-chain logic later proves necessary, ASI:Chain's Rholang runtime conflicts with a
strict Rust-only contract requirement and requires a new owner decision.

Proposed boundaries:

- Keep contributions, service-payment intents, and learner rewards as separate records.
- Validate the chain/network, recipient, amount, finalized deploy status, and replay/idempotency before
  crediting a payment. Do not put learner identity or other personal data on-chain.
- Do not enable real-value payments until an official ASI:Chain mainnet and supported production asset
  exist, and treasury control, price/quote rules, refunds, legal review, finality, and operational
  monitoring are approved.
- Exclude internal cash-flow management, payouts, DAO voting, M-Pesa, and changes to existing EVM
  contracts from this payment-intake slice. Revisit NEAR only if ASI:Chain is not production-ready at
  the release gate.

Evidence sources: [ASI:Chain overview](https://docs.asichain.io/general/overview/),
[ASI:Chain FAQ](https://docs.asichain.io/faq/),
[transaction flow](https://docs.asichain.io/architecture/sequence-diagrams/transaction/),
[Rust wallet CLI](https://github.com/asi-alliance/asi-chain-wallet-cli), and its
[send implementation](https://github.com/asi-alliance/asi-chain-wallet-cli/blob/main/src/commands/send.rs).
These sources establish the current documented DevNet and client flow only; they do not prove a future
mainnet launch date or production readiness.

## Active work

Use [TASKS.md](TASKS.md) for the live backlog. The current backlog is:

1. Design and implement the ASI:Chain payment-intake slice in Rust, with DevNet-only verification and
   explicit production readiness gates.
2. Rebuild the Codespace and record the container build result.
3. Run the focused Studio regressions.
4. Browser-verify authorized student, teacher, and head flows.
5. Agree on the durable generated-scheme storage contract before implementing Save to Library.

## Working priorities

1. Preserve one rule/decision voice; do not add an active third runtime.
2. Keep Studio, Python, Rust, and Supabase request boundaries explicit.
3. Distinguish implementation, tests, deployment, and browser verification.
4. Finish thin vertical slices and record exact commands and results.
5. Require owner approval for live database, deployment, secret, or public visibility changes.

## Historical record

Historical implementation detail, dated BASIX work, and prior measurements remain in Git history.
The evidence record is [BASIX-FINAL-POSITION.md](research/BASIX-FINAL-POSITION.md), and the claim
rules are [BASIX-NORTH-STAR.md](BASIX-NORTH-STAR.md).
