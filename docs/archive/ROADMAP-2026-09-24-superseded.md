# Syncsenta Evidence-Driven Roadmap

**Project**: Syncsenta - AI-Powered Education Platform for Kenya

**North star**: Validate a pluggable education Omega Claw with Kenya CBC before expanding to other curricula

**Last Updated**: 2026-09-24

**Active recovery specification**:
[`main-stability-and-branch-consolidation`](../.kiro/specs/main-stability-and-branch-consolidation/requirements.md)

**Omega/Hyperon review update**: 2026-09-08 — representative Hyperon
dependents reviewed; adapter input validation and fallback telemetry contract
hardening started. See [`HYPERON_DEPENDENT_PROJECTS.md`](HYPERON_DEPENDENT_PROJECTS.md).

---

## Current Status: Recovery baseline in progress

Previous percentage estimates are retained below as historical planning data,
not as release evidence. A capability is now tracked separately as
**implemented**, **tested**, **deployed**, and **browser-verified**. Current
`main` has a reported role-dashboard access regression, `npm ci` cannot install
from the committed Studio lockfile, and local Rust verification is unavailable
until a Rust toolchain is present. These are release blockers rather than
percentage adjustments.

### Now / Next / Later

| Horizon | Priority | Outcome | Exit evidence |
|---|---|---|---|
| **Now** | P0 | Restore canonical student, teacher, parent, and admin dashboard entry paths | Regression tests, Studio gates, and browser smoke tests pass |
| **Now** | P0 | Restore reproducible verification on clean `main` | `npm ci` succeeds; documented test commands exist; Rust gates run in CI/toolchain environment |
| **Next** | P1 | Classify and consolidate remote branches | Every branch has containment, unique-diff, PR, architecture-impact, and test evidence |
| **Next** | P1 | Document-digitization OCR via a pluggable provider adapter (Baidu first) | Provider contract tests pass; quota/cost telemetry proven; English + Kiswahili CBC worksheet samples extracted with reviewed accuracy |
| **Next** | P1 | Make architecture documentation trustworthy | Current and target states are labeled; deployed boundaries have resolvable source evidence |
| **Later** | P2 | Strengthen the Rust Omega service behind stable contracts | TypeScript/Rust parity, timeout, observability, fallback, and rollback gates pass |
| **Later** | P2 | Extract universal education adapters from Kenya evidence | Curriculum, policy, localization, assessment, and LMS contracts validated against CBC |

### Merge policy

- Architecture-preserving fixes may merge only after their required gates pass.
- Architecture-changing branches require an explicit benefit/tradeoff decision before merge.
- Dashboard smoke tests run after every accepted branch; a regression stops the queue.
- Branch deletion is outside this roadmap and happens only after integration is proven.

### Recent Progress
- ✅ Task 5: MeTTa/Hyperon telemetry integration (COMPLETE)
- ✅ Comprehensive code completion analysis (82-88%)
- ✅ Security audit completed (85/100 rating)
- ✅ Rate limiting & CSRF protection implemented
- ✅ Grade 2 student workflow designed (95% complete)
- ✅ Grade selection now shows an explicit personalization/loading state before dashboard navigation
- ✅ LMS domain contracts and authenticated organisation/programme/cohort/enrollment API foundation added
- ✅ Grade 4 core subjects now share the unified subject catalog and grade-specific sandbox overview contract
- ✅ Generated guided-foundation activities now resolve through the activity player
- ✅ Added `docs/CONTENT_READINESS.md` to keep canvas, worksheet, chat, and fallback claims explicit

### 2026-09-21 — Grade 4 unified subject-overview slice ✅

- ✅ Made `/student/learn_by_making` the unified subject catalog entry point.
- ✅ Routed core subjects to `/student/sandbox/{grade}/{subject}` overviews.
- ✅ Preserved AI Literacy, Blockchain Literacy, and Financial Literacy as chat-first courses.
- ✅ Added Social Studies to the core subject contract and Grade 4 catalog.
- ✅ Fixed generated guided-foundation activity resolution so catalog activities open in the player instead of returning `Activity Not Found`.
- ✅ Preserved the legacy Grade 4 English plural fallback identifier for existing links and tests.
- ✅ Added the Grade 4 content-readiness matrix covering canvas-ready, worksheet-ready, chat-ready, guided fallback, and catalog-only states.
- ✅ Added regression coverage for Grade 4 Mathematics fallback resolution and core/extended subject routing.
- ✅ Verified with focused tests, TypeScript, lint, production build, and `git diff --check`.

### 2026-09-21 — Chat reliability and Grade 4 sandbox coverage ✅

- ✅ Kept the student chat page renderable when optional chat-session creation or history reads fail.
- ✅ Moved API chat-session creation to the authenticated request-scoped Supabase client.
- ✅ Preserved model streaming when persistence is temporarily unavailable; persistence failures remain logged rather than blocking the learner.
- ✅ Added curriculum-backed Grade 4 activity generation for Mathematics, English, Kiswahili, Environmental Activities, Social Studies, Creative Arts, CRE, and Indigenous Language.
- ✅ Added deterministic Grade 4 activity IDs, prerequisite sequencing, term assignment, subject icons, and activity-player resolution.
- ✅ Kept the legacy guided-foundation IDs resolvable for existing bookmarks and compatibility tests.
- ✅ Added regression coverage for all eight Grade 4 core subject catalogues.
- ✅ Verified the chatbot/sandbox changes with 19 focused tests, TypeScript, lint, and production build.

### 2026-09-21 — All available curriculum data wired into sandboxes ✅

- ✅ Generalized the deterministic sandbox activity generator from Grade 4 to Grades 1–9.
- ✅ Consumed all available repository curriculum strands for lower primary, upper primary, and junior secondary core subjects.
- ✅ Added subject-key normalization for English Activities, Creative Activities, Science & Technology, Integrated Science, CRE, Social Studies, Kiswahili, Mathematics, and Indigenous Language.
- ✅ Added stable all-grade activity IDs, term assignment, prerequisite sequencing, subject icons, and activity-player resolution.
- ✅ Preserved authored activities and the Grade 2 curriculum mapper without replacing existing routes or progress behavior.
- ✅ Retained safe guided fallbacks for grade/subject combinations where the repository has no curriculum source.
- ✅ Added all-grade regression coverage for every curriculum combination represented in the repository.

The full multi-phase roadmap is not 78% complete: mobile, collaboration,
NEMIS, multi-tenancy, full indigenous-language support, voice, and advanced
analytics remain future scope.

### Completed ✅
- [x] **Core Architecture** (100%)
  - Next.js 14 App Router frontend
  - Python FastAPI backend with multi-agent system
  - Supabase PostgreSQL database with RLS
  - Hyperon MeTTa reasoning engine integration
  
- [x] **Authentication & Authorization** (100%)
  - Supabase Auth implementation
  - JWT session management
  - Role-based access control (Teacher, Student, Parent, Admin)
  - Fixed cookie-based auth issues (replaced with proper Supabase session)

- [x] **AI Agent System** (100%)
  - ✅ LessonArchitect agent (lesson planning)
  - ✅ AssessmentAgent (test generation)
  - ✅ WorksheetAgent (worksheet creation)
  - ✅ ExamAgent (exam generation)
  - ✅ DifferentiationAgent (personalized content)
  - ✅ Multi-provider LLM client (OpenAI, Anthropic, Google)
  - ✅ MeTTa policy integration with Hyperon runtime + fallback
  - ✅ Telemetry pipeline with policy evaluation (Task 5 COMPLETE)

- [x] **Database & RAG** (90%)
  - ✅ Supabase schema design
  - ✅ Row Level Security (RLS) policies
  - ✅ Curriculum knowledge base
  - ✅ Vector search with pgvector
  - ⚠️ Indigenous language support (partial)

- [x] **Frontend Dashboard** (95%)
  - ✅ Teacher dashboard
  - ✅ Student dashboard (Grade 2 workflow researched & documented)
  - ✅ Parent dashboard (Grade 2 reporting included)
  - ✅ School admin dashboard (demo data with disclaimer)
  - ✅ National admin dashboard (demo data with disclaimer)
  - ✅ Fixed dead navigation links
  - ✅ Removed hardcoded mock data
  - ✅ Dark mode support
  - ✅ **Grade 2: 70+ activities implemented across 7 subjects**
  - ⚠️ Grade 2: Onboarding wizard needed (final 5%)

- [x] **Deployment Infrastructure** (100%)
  - ✅ Vercel deployment (frontend) - sentastudio
  - ✅ Render deployment (backend Python service)
  - ✅ CI/CD pipelines via GitHub Actions
  - ✅ Environment variable management

- [x] **Dependency security audit**
  - ✅ Studio `npm audit` reports zero vulnerabilities
  - ✅ Scheme Scribe `npm audit` reports zero vulnerabilities
  - ✅ Python `pip-audit` reports no known vulnerabilities

---

## In Progress 🚧

### Architecture Refactoring (Current - 10%)
**Priority**: HIGH  
**Based on 2025/2026 best practices research**

**Status**: 
- ✅ Created AGENTS.md for AI-assisted development
- ✅ Created ROADMAP.md for tracking progress
- ✅ Researched 2025/2026 best practices
- 🚧 Need to reorganize code structure

**Next Steps**:
1. Reorganize Python agents by domain
2. Add comprehensive docstrings
3. Frontend component reorganization
4. Improve test coverage to 80%

#### Omega / Hyperon boundary hardening
- [x] Review representative Hyperon dependent projects and record reusable patterns
- [x] Keep raw policy-atom construction inside the Python Hyperon adapter
- [x] Reject malformed dynamic policy symbols with a fail-closed verdict
- [x] Stabilize the fallback evaluator label used by telemetry consumers
- [x] Route every student chat turn through the request-scoped MeTTa boundary before Omega policy selection
- [x] Normalize all subject labels before MeTTa parsing and test the subject-agnostic contract
- [x] Keep every sandbox subject playable with a guided-foundations fallback while authored content expands
- [ ] Add explicit Hyperon runtime/version contract and readiness checks
- [ ] Restore and validate the deployed AI backend used by student chat
- [ ] Author equivalent curriculum activities for every listed CBC subject and grade (fallback currently verified)
- [ ] Add durable, versioned Omega knowledge/session persistence with restart tests
- [ ] Add timeout, cancellation, resource limits, and bounded concurrency around Hyperon calls
- [ ] Add policy decision audit fields: correlation ID, policy version, evaluator, reason, latency
- [ ] Make adapter, persistence, replay, and end-to-end policy tests required CI gates

---

## Remaining Work (15%) 📋

### 1. Architecture Refactoring (10% of remaining)
**Priority**: HIGH  
**Based on 2025/2026 best practices research**

#### Current Issues:
- Monorepo structure not optimized for AI tools
- Missing standardized context management
- Inconsistent file organization patterns

#### Planned Improvements:
- [ ] Reorganize `ai-agents/src/syncsenta_agents/` for better discoverability
  - Group by domain (pedagogy, assessment, monitoring) not by type
- [ ] Add comprehensive docstrings to all Python modules (Google style)
- [ ] Implement context management strategy:
  - Add detailed type definitions
  - Create architecture diagrams
  - Document inter-agent dependencies
- [ ] Frontend component reorganization:
  - Group by feature domain (assessment, lessons, monitoring)
  - Extract shared business logic to `lib/`
- [ ] Add missing test coverage to reach 80% target

**References Applied**:
- [PropelCode 2025 Guide](https://www.propelcode.ai/blog/structuring-codebases-for-ai-tools-2025-guide)
- [FastAPI LLM Production Template](https://activewizards.com/blog/fastapi-for-llm-systems-production-langchain-template)
- [Monorepo Best Practices](https://graphite.com/guides/monorepo-frontend-backend-best-practices)

### 1. Security Hardening (3% of remaining) -> IN PROGRESS ✨
**Priority**: CRITICAL

- [x] Security audit completed (85/100 rating)
- [x] Rate limiting middleware created (`middleware-rate-limit.ts`)
- [x] CSRF protection implemented (`csrf-protection.ts`)
- [x] CSRF token API endpoint (`/api/csrf-token`)
- [ ] Enable rate limiting in production (configure Upstash Redis)
- [ ] Apply CSRF protection to state-changing endpoints
- [ ] Run npm audit and pip-audit
- [ ] Integrate Sentry for error monitoring
- [ ] Add security headers validation
- [ ] Privacy policy and terms of service pages

### 3. Performance Optimization (2% of remaining)
**Priority**: MEDIUM

- [ ] Implement LLM response streaming
- [ ] Add caching layer for frequent queries
- [ ] Optimize Supabase queries (add indexes)
- [ ] Lazy load dashboard components
- [ ] Image optimization audit
- [ ] Add Suspense boundaries to async components
- [ ] Database connection pooling

### 4. Documentation & Developer Experience
**Priority**: MEDIUM

- [x] Create AGENTS.md for AI-assisted development
- [x] Add API documentation (FastAPI exposes OpenAPI/Swagger at `/docs` and `/openapi.json`)
- [x] Create deployment runbook (`docs/DEPLOYMENT_RUNBOOK.md`)
- [x] Add troubleshooting guide (`docs/TROUBLESHOOTING.md`)
- [ ] Document environment variable requirements
- [ ] Create video walkthrough for developers

### 5. Document Digitisation OCR (Baidu-first provider adapter)
**Priority**: HIGH (feeds the teacher content pipeline: scanned worksheets, textbook pages, handwritten answers)

**Design decision (senior-dev call)**: OCR is an *adapter*, not a feature coupled to one vendor.
SyncSenta already runs a multi-provider LLM client; the same pattern applies here so a future
curriculum locale can swap providers without touching product code.

- [ ] Define an `OcrProvider` contract in the Python `ai-agents` service: `extract(document, langs) -> { blocks[], confidence, language }` with timeout, retry, and per-request cost/quota accounting.
- [ ] Implement `BaiduOcrProvider` (Baidu general text recognition, accurate/standard variants) using AK/SK from Render environment variables only — never committed, never client-side.
- [ ] Keep the existing vision-LLM path (Groq multimodal, see `provider-capability-evidence.md`) as the registered fallback provider behind the same contract.
- [ ] Verify Baidu's actual free quota and pricing for the account tier before claiming "unlimited" — the roadmap tracks quotas as evidence, not assumption; add a usage counter exposed in the admin dashboard.
- [ ] Kenya-first validation set: CBC worksheets and exam papers in English and Kiswahili (printed), plus a handwritten-sample slice; record extraction accuracy per document type.
- [ ] Wire the first consumer end-to-end: teacher uploads scanned worksheet → OCR text → existing question-bank/lesson-plan generators.
- [ ] Track each stage separately: implemented / tested (contract + fixture tests in CI) / deployed (Render) / browser-verified (sentastudio).

**Why Rust/Omega is not in this path yet**: extraction is I/O-bound provider calling, which the
stable Python agent boundary already handles; the Omega Claw consumes OCR output as structured
knowledge, so the contract above is what the Rust side will later depend on.

---

## Post-MVP Features (Future)

### Phase 2: Enhanced Features
- [ ] Real-time collaboration (WebSockets)
- [ ] Advanced analytics dashboard with real data
- [ ] Mobile app (React Native)
- [ ] Offline mode support
- [ ] Parent-teacher messaging
- [ ] Automated report card generation
- [ ] Integration with Kenya Education Management System (NEMIS)
- [ ] Deploy and stage-test LMS organisations, programmes, cohorts, and consent-aware enrollments
- [ ] Add teacher LMS interface for mentor assignment, learner enrollment, and cohort progress
- [ ] Add guardian consent and enrollment lifecycle UI
- [ ] Review and enrich generated Grade 4 question banks with subject-specific distractors, explanations, and cultural examples
- [ ] Add Grade 4 canvas manipulatives where direct manipulation improves the learning objective
- [ ] Add browser-level smoke tests for chatbot rendering and every core subject overview
- [ ] Teacher-review generated all-grade curriculum activities before marking them complete

### Phase 3: Scale & Localization
- [ ] Multi-tenancy for multiple schools
- [ ] Full indigenous language support (Swahili, Kikuyu, Luo, etc.)
- [ ] Voice interaction support
- [ ] Regional curriculum adaptations
- [ ] Advanced accessibility features (WCAG AAA)

---

## Known Issues & Technical Debt

### Critical
- None currently blocking MVP launch

### High Priority
- [ ] Telemetry pipeline not fully wired (Task 5 in progress)
- [ ] Some dashboard components still have empty states (student monitoring)
- [ ] Limited test coverage in frontend (needs Jest setup)

### Medium Priority
- [ ] Hyperon runtime installation not automated (graceful fallback working)
- [x] Dependency vulnerability audits run for Studio, Scheme Scribe, and Python requirements
- [ ] Missing API documentation for Python backend
- [ ] Frontend bundle size not optimized

### Low Priority
- [ ] Dark mode has minor style inconsistencies
- [ ] Some TypeScript types are `any` (need strict typing)
- [ ] Console warnings in development mode
- [ ] Missing PropTypes for some components

---

## Code Quality Metrics

### Current State
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Backend Test Coverage** | 80% | ~75% | 🟡 |
| **Frontend Test Coverage** | 80% | ~10% | 🔴 |
| **TypeScript Strict Mode** | 100% | 100% | ✅ |
| **Python Type Hints** | 100% | ~90% | 🟡 |
| **Linting Errors** | 0 | 0 | ✅ |
| **Security Vulnerabilities** | 0 | ? | 🟡 (needs audit) |
| **API Documentation** | 100% | 30% | 🔴 |

### Code Complexity
- **Python**: Average cyclomatic complexity < 10 ✅
- **TypeScript**: Average component complexity < 15 ✅
- **File Size**: No files > 500 lines ✅

---

## Dependencies Status

### Frontend (Next.js)
- ✅ Next.js 14.x (latest stable)
- ✅ React 18.x
- ✅ Supabase JS client (latest)
- ✅ Tailwind CSS 3.x
- ✅ Shadcn/ui components (up to date)
- ⚠️ Need to audit for security vulnerabilities

### Backend (Python)
- ✅ FastAPI 0.115.x (latest)
- ✅ Pydantic 2.x
- ✅ Supabase Python client
- ✅ OpenAI, Anthropic, Google SDKs (latest)
- ✅ Hyperon (optional, with fallback)
- ⚠️ Need to run `pip-audit` for vulnerabilities

---

## Deployment Checklist

### Pre-Production
- [ ] Complete Task 5 (telemetry integration)
- [ ] Run security audit
- [ ] Complete architecture refactoring
- [ ] Add comprehensive error handling
- [ ] Set up monitoring & alerting (Sentry, LogRocket, etc.)
- [ ] Load testing with realistic data
- [ ] Backup strategy for production database

### Production Launch
- [ ] Deploy to Vercel production (main branch)
- [ ] Deploy Python backend to Render production
- [ ] Configure production environment variables
- [ ] Enable Supabase production mode
- [ ] Confirm and set up the canonical Syncsenta custom domain
- [ ] SSL certificate configuration
- [ ] CDN setup for static assets
- [ ] Database backup automation

### Post-Launch
- [ ] Monitor error rates
- [ ] Track performance metrics
- [ ] Gather user feedback
- [ ] Plan iteration based on usage data
- [ ] Scale infrastructure as needed

---

## Team Responsibilities

### Frontend Development
- Dashboard UI/UX improvements
- Component refactoring
- Test coverage improvement
- Accessibility compliance

### Backend Development
- Complete telemetry integration (Task 5)
- Security hardening
- API documentation
- Performance optimization

### DevOps
- Monitoring setup
- CI/CD optimization
- Infrastructure scaling
- Backup automation

### QA
- End-to-end testing
- Security testing
- Load testing
- Accessibility testing

---

## Success Metrics

### Technical
- ✅ 99.9% uptime
- ✅ < 2s page load time
- ✅ < 5s LLM response time (p95)
- ✅ 80%+ test coverage
- ✅ Zero critical security vulnerabilities

### User Experience
- Teacher can generate lesson plan in < 3 minutes
- Assessment creation takes < 5 minutes
- Student can complete assignment seamlessly
- Parent can view progress without confusion

### Business
- Support 100+ concurrent teachers
- Handle 1000+ students
- Process 10,000+ AI requests/day
- 95%+ user satisfaction rating

---

## Commit Log (Recent Changes)

### 2026-08-29 - Task 5 Complete: Telemetry + Policy Integration
- ✅ Wired HyperonEvaluator into TelemetryAgent.process_events()
- ✅ Added policy_verdict field to BehavioralProfile dataclass
- ✅ Policy evaluation now runs on every telemetry session capture
- ✅ Telemetry data (erasure_count, dwell_time, mastery, etc.) passed to policy
- ✅ Policy verdict serialized in to_dict() for database storage
- ✅ Created comprehensive test suite (test_telemetry_policy_integration.py)
- ✅ Logging includes policy approval status and evaluator type
- 🎯 Task 5 Status: **100% COMPLETE**

### 2026-08-29 - Architecture Documentation & Cleanup
- ✅ Created AGENTS.md for AI-assisted development context
- ✅ Created ROADMAP.md for MVP tracking
- ✅ Deleted `datasets/superintelligence/Jss.md` (unnecessary curriculum file)
- ✅ Researched 2025/2026 best practices for Next.js + Python AI architecture
- 🎯 Current focus: Refactoring to 100% MVP readiness

### Previous (from context)
- ✅ Fixed 9 critical dashboard issues (auth, dead links, hardcoded data)
- ✅ Integrated Hyperon MeTTa runtime with Python fallback
- ✅ Created HyperonEvaluator with comprehensive test suite
- ✅ Updated all policy checks in metta_engine.py
- ✅ Fixed Supabase auth in lib/auth.ts and dashboard pages
- ✅ Removed broken blockchain section
- ✅ Added "Demo Data" disclaimers to admin dashboards

---

## Contact & Support

**Project Lead**: [Your Name]  
**Repository**: https://github.com/dgithinjibit/Syncsenta
**Documentation**: See `CODE_MAP.md`, `AGENTS.md`, and `docs/`

---

**Next Immediate Action**: Complete Task 5 (Telemetry Integration), then proceed with architecture refactoring based on 2025/2026 best practices.
