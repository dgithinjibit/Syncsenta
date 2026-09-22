# Product Manager Guide: SyncSenta — Web4 Education Operating System

## Waterfall (Phase-Gated) Developer-Only Implementation Guide

This is structured for engineering execution across a **6-year horizon (2026–2030)**, targeting a Kenya-first launch scaling to a global Web4 education utility. Phase 1 targets 100K+ concurrent users in Kenya. Phase 3 targets 10M+ globally.

---

## 0. Engineering Principles (Non-Negotiables)

- **Offline-first architecture** (critical for Kenyan connectivity realities)
- **Strict role hierarchy enforcement** (7-tier RBAC + approval chains)
- **Event-driven backend + async processing**
- **Observability-first** (logs, metrics, auditability)
- **AI abstraction layer** (models swappable — GPT-4o today, AGI-lite by 2030)
- **Privacy by design** (Kenya DPA 2019, AU AI Strategy, GDPR-ready)
- **Blockchain-ready architecture** (credential minting, smart contracts, DAO path)
- **Competency-based progression** (mastery gating, not time-based advancement)
- **SEL-integrated** (Social-Emotional Learning woven into every feature)
- **Decentralization path** (every component has a Web4 upgrade path)

---

## 1. Phase 1 — Requirements Finalization & System Blueprint

### 1.1 Repository Structure & Integration Map

**Cloned Repositories:**

| Repository | Purpose | Integration Point |
|------------|---------|-------------------|
| `studio/` | Main frontend (Next.js + React + TypeScript) | Primary UI - use as base |
| `scheme-scribe-ai/` | AI-driven CBC scheme generation | Backend service integration |
| `scheme-genie/` | Additional scheme generation | Backend service integration |
| `LughaBridge/` | Multilingual translation pipeline | Backend translation service |
| `igbo-bilingual-chat/` | Bilingual chat engine | Mwalimu AI integration |
| `Syncsenta_local/` | Offline-first PWA sync layer | Frontend PWA + sync engine |
| `hexstrike-ai/` | Core AI inference orchestration | AI routing layer |
| `thrml/` | High-level ML abstractions | Rust WASM module |
| `candle/` | Rust-based ML inference | Rust WASM module |
| `best-of-ml-rust/` | Rust ML resources & examples | Reference for Rust ML |
| `aditicha/` | Supplementary educational content | Content seeding |

**Project Folders:**
- `frontend/` - Consolidated frontend (merge from `studio/`)
- `backend/` - Rust Axum backend + integrations

### 1.2 Functional Modules (Lock Scope)

**Core Systems:**
- Authentication & RBAC
- Approval Workflow Engine
- Academic Management (Lessons, Assignments, Reports)
- Virtual Classroom
- Mwalimu AI 2.0 (using `hexstrike-ai/`, `igbo-bilingual-chat/`)
- Payments (M-Pesa)
- Communication Hub (SMS + in-app)
- Analytics Engine
- Content Marketplace
- Offline Sync Engine (using `Syncsenta_local/`)

**Non-Functional Requirements:**
- 100K concurrent users
- <300ms API latency (p95)
- Offline mode support (PWA + sync engine)
- Horizontal scalability
- 99.5% uptime target

### 1.3 System Architecture (High-Level)

```
[ Next.js PWA (studio/) + React + TS + Tailwind + Shadcn ]
                 |
                 v
         [ API Gateway Layer ]
                 |
     ----------------------------
     |            |             |
[Supabase]   [Rust Engine]   [3rd Party]
(Auth, DB,   (candle +        (M-Pesa,
 Storage,     thrml +          SMS, Jitsi)
 Realtime)    hexstrike-ai)
     |            |             |
     v            v             v
[LughaBridge] [Syncsenta_   [scheme-scribe-ai
 Translation]  local Sync]    + scheme-genie]
```

### 1.4 Key Architectural Decisions

| Area | Choice | Why | Source Repo |
|------|--------|-----|-------------|
| Frontend | Next.js + React + TypeScript | SSR, maintainability, ecosystem | `studio/` |
| Backend | Rust Axum | Performance, type safety | `backend/` (new) |
| Database | PostgreSQL + pgvector | Supabase compatibility, vector search | Supabase |
| AI Layer | Rust + candle + thrml | Performance + offline inference | `candle/`, `thrml/`, `hexstrike-ai/` |
| Translation | LughaBridge | Multilingual support | `LughaBridge/` |
| Scheme Gen | AI-powered CBC schemes | Curriculum alignment | `scheme-scribe-ai/`, `scheme-genie/` |
| Chat Engine | Bilingual chat | English/Swahili/indigenous | `igbo-bilingual-chat/` |
| Offline Sync | Custom Rust Sync Engine | Deterministic sync | `Syncsenta_local/` |
| Video | Jitsi | Open-source + scalable | External |
| Payments | M-Pesa Daraja | Local dominance | External API |

---

## 2. Phase 2 — System Design (Detailed)

### 2.1 Database Design (PostgreSQL + pgvector)

**Core Tables:**

**Users & Roles:**
```sql
users
- id (uuid)
- email
- phone
- role (enum: student, parent, teacher, admin...)
- status (pending, approved, rejected)
- created_at

user_relationships
- parent_id
- student_id
```

**Approval Workflow:**
```sql
approvals
- id
- requester_id
- approver_role
- status
- metadata
- created_at
```

**Academic System:**
```sql
classes
subjects
lessons
assignments
submissions
grades
report_cards
attendance
timetables
```

**Content System:**
```sql
content_library
- id
- type (video/pdf/quiz)
- owner_id
- is_paid
- price

marketplace_transactions
```

**AI + Analytics:**
```sql
learning_paths
ai_interactions
student_metrics
risk_flags
```

**Payments:**
```sql
payments
- id
- user_id
- amount
- status
- mpesa_reference
```

**Audit Logs:**
```sql
audit_logs
- id
- actor_id
- action
- entity
- timestamp
```

### 2.2 API Design (REST + Edge Functions)

**Core APIs:**

**Auth:**
- `POST /auth/register`
- `POST /auth/login`

**Approval:**
- `POST /approvals/request`
- `POST /approvals/approve`
- `GET /approvals/pending`

**Academic:**
- CRUD `/lessons`
- CRUD `/assignments`
- `POST /submissions`
- `GET /report-cards`

**AI:**
- `POST /ai/tutor`
- `POST /ai/voice`
- `GET /learning-path`

**Payments:**
- `POST /payments/mpesa/initiate`
- `POST /payments/mpesa/callback`

**Sync:**
- `POST /sync/pull`
- `POST /sync/push`

### 2.3 Rust Engine Design

**Components:**
```
[ Sync Engine ]
- Conflict resolution
- Delta sync
- Local caching

[ Inference Engine ]
- Runs candle models
- Offline predictions
- AI fallback system
```

**Sync Strategy:**
- CRDT or last-write-wins (choose based on complexity)
- Local IndexedDB cache
- Sync triggers:
  - app start
  - reconnect
  - periodic

### 2.4 AI Layer (Mwalimu AI 2.0)

**Architecture:**
```
User Input (Voice/Text)
         |
         v
[ API Layer ]
         |
         v
[ AI Router ]
   |     |     |
 GPT   Gemini  Local (Rust)
         |
    Response + TTS
```

**Responsibilities:**
- Adaptive tutoring
- Question answering
- Learning path generation
- Performance prediction

### 2.5 Virtual Classroom

- Jitsi JWT authentication
- Room naming convention: `schoolId_classId_subjectId_timestamp`
- Recording support (optional)

---

## 3. Phase 3 — Infrastructure Setup

### 3.1 Environments

- Dev
- Staging
- Production

### 3.2 Deployment Stack

| Component | Tool |
|-----------|------|
| Frontend | Vercel / Cloudflare |
| Backend | Supabase |
| Rust Engine | Docker + Kubernetes |
| Storage | Supabase Storage |
| CDN | Cloudflare |

### 3.3 CI/CD Pipeline

**Steps:**
1. Lint
2. Unit tests
3. Build
4. Deploy (staging → prod approval)

### 3.4 Observability

- **Logging:** structured logs
- **Metrics:** Prometheus/Grafana
- **Errors:** Sentry
- **Audit logs:** DB

---

## 4. Phase 4 — Implementation Order

### 4.1 Step 1: Project Foundation
- Copy `studio/` → `frontend/` (Next.js + React + TS + Tailwind + Shadcn)
- Initialize Cargo workspace in `backend/` (Axum + sqlx + tokio)
- Create `syncsenta-wasm` crate using `candle/` + `thrml/`
- Set up PostgreSQL + pgvector + Redis
- Configure `.env` for all services

### 4.2 Step 2: Auth + RBAC
- Implement 7-tier role hierarchy (Student → NationalAdmin)
- JWT auth with `jsonwebtoken` crate
- Enforce permissions at API level via Tower middleware

### 4.3 Step 3: Approval Workflow
- Multi-tier approvals: National → County → Head → Admin → Teacher
- SMS notifications via Africa's Talking on approval/rejection

### 4.4 Step 4: Academic Core
- Lessons + multimedia (videos, PDFs, quizzes)
- Assignments + submissions + grading
- Report card generation (PDF)
- Attendance tracking
- Timetable with conflict detection
- **Scheme generation** from `scheme-scribe-ai/` + `scheme-genie/`

### 4.5 Step 5: Mwalimu AI 2.0
- AI orchestration from `hexstrike-ai/`
- Bilingual chat engine from `igbo-bilingual-chat/`
- Translation pipeline from `LughaBridge/`
- Offline inference via `candle/` + `thrml/` compiled to WASM
- Voice pipeline: ElevenLabs TTS + Whisper STT

### 4.6 Step 6: Content Library + Marketplace
- Upload system (S3-compatible storage, max 500MB)
- Payment gating via M-Pesa
- Ownership tracking + full-text search
- Seed educational content from `aditicha/`

### 4.7 Step 7: Payments Integration
- M-Pesa STK Push via Daraja API
- Callback handling + reconciliation logic
- Fee structure management per school/grade

### 4.8 Step 8: Virtual Classroom
- Jitsi JWT authentication
- Room naming: `schoolId_classId_subjectId_timestamp`
- Attendance auto-tracking via webhooks
- Session recording to object storage

### 4.9 Step 9: Offline Sync Engine
- Port `Syncsenta_local/` logic to Rust WASM
- IndexedDB queue in browser
- Conflict resolution: server wins for grades, last-write-wins for drafts
- Background sync on reconnect

### 4.10 Step 10: Analytics Engine
- Risk scoring model (logistic regression via `linfa`)
- Predictive at-risk student detection
- Comparative dashboards (class → school → county → national)

### 4.11 Step 11: Communication System
- SMS integration (Africa's Talking)
- In-app notifications + announcements
- Discussion forums with teacher moderation
- Weekly email digest (Monday)

---

## 5. Phase 5 — Testing Strategy

### 5.1 Test Types

| Type | Scope |
|------|-------|
| Unit | Functions |
| Integration | APIs |
| E2E | Full flows |
| Load | 100K users |
| Security | Auth, data |

### 5.2 Critical Scenarios

- Offline → online sync
- Payment success/failure
- AI fallback
- Approval chain integrity

---

## 6. Phase 6 — Deployment & Rollout

### 6.1 Rollout Plan

- **Stage 1:** 2–3 pilot schools
- **Stage 2:** 1 county
- **Stage 3:** National rollout

### 6.2 Feature Flags

- AI features
- Marketplace
- Virtual classrooms

---

## 7. Phase 7 — Maintenance & Scaling

### 7.1 Scaling Strategy

- Horizontal scaling (Rust + APIs)
- DB read replicas
- CDN caching

### 7.2 Performance Optimization

- Query indexing
- Edge caching
- AI response caching

### 7.3 Risk Areas

| Risk | Mitigation |
|------|------------|
| Sync conflicts | CRDT / versioning |
| AI cost | caching + fallback |
| Payments failures | retries + logs |
| Load spikes | autoscaling |

---

## 8. Key Trade-offs

| Decision | Trade-off |
|----------|-----------|
| Supabase vs custom backend | speed vs flexibility |
| Rust engine | complexity vs performance |
| Multi-AI | cost vs accuracy |
| Offline-first | complexity vs usability |

---

## 9. Final Developer Notes

- Build modular services, not tightly coupled logic
- Treat AI as assistive, not authoritative
- Prioritize data integrity over speed
- Expect network instability as default condition
- Keep audit logs immutable

---

## 10. Immediate Next Steps (Execution)

### Phase 0: Repository Integration (Week 1)

1. **Consolidate Frontend:**
   - Copy `studio/` contents to `frontend/`
   - Review and adapt Next.js configuration
   - Audit existing components and pages
   - Identify reusable UI patterns

2. **Set Up Backend Structure:**
   - Initialize Cargo workspace in `backend/`
   - Create crates: `syncsenta-backend`, `syncsenta-wasm`, `syncsenta-common`
   - Set up Axum web server skeleton

3. **Integrate Cloned Repos:**
   - Extract scheme generation logic from `scheme-scribe-ai/` and `scheme-genie/`
   - Integrate `LughaBridge/` translation pipeline
   - Adapt `hexstrike-ai/` for AI orchestration
   - Port `Syncsenta_local/` sync logic to Rust WASM
   - Reference `candle/` and `thrml/` for ML inference
   - Seed content from `aditicha/`

### Phase 1: Core Infrastructure (Week 2-3)

4. Finalize DB schema (PostgreSQL + pgvector)
5. Set up Supabase project (Auth, Storage, Realtime)
6. Configure environment variables (.env files)
7. Set up CI/CD pipeline (GitHub Actions)

### Phase 2: Authentication & RBAC (Week 4-5)

8. Build Auth + RBAC first (7-tier hierarchy)
9. Implement approval workflow engine
10. Create role-specific middleware

### Phase 3: Academic Core (Week 6-8)

11. Implement lessons, assignments, submissions
12. Build grading and report card generation
13. Integrate scheme generation services

### Phase 4: AI & Advanced Features (Week 9-12)

14. Stand up Rust AI service (candle + thrml)
15. Integrate Mwalimu AI 2.0 (hexstrike-ai + bilingual chat)
16. Implement offline sync engine
17. Build analytics and risk detection

### Phase 5: Payments & Communication (Week 13-14)

18. Integrate M-Pesa Daraja API
19. Set up SMS gateway (Africa's Talking)
20. Build communication hub

### Phase 6: Testing & Deployment (Week 15-16)

21. Comprehensive testing (unit, integration, E2E, load)
22. Pilot deployment (2-3 schools)
23. Iterate based on feedback

---

## Success Metrics

- **10,000+ active students** in first 3 months
- **95%+ user satisfaction** score
- **<5% churn rate**
- **80%+ lesson completion** rate
- **AI tutor accuracy >90%**

---

## Contact & Escalation

For technical decisions requiring PM input:
- Architecture changes
- Scope modifications
- Timeline adjustments
- Resource allocation

---

*Document Version: 1.0*  
*Last Updated: 2026-04-26*

---

## Web4 Phases (2027–2030)

### Phase 8 — Blockchain Credentials & Token Economy (2027)

**Objective:** Issue verifiable, portable micro-credentials on blockchain. Launch Learn-to-Earn economy.

**Implementation Order:**
1. Deploy `SyncSentaCredentials.sol` on Polygon testnet
2. Integrate mastery engine with credential minting
3. Implement W3C Verifiable Credentials API
4. Launch employer verification portal
5. Deploy `SyncToken.sol` (ERC-20)
6. Implement token minting on milestone completion
7. Implement token redemption system
8. Launch corporate partner token distribution

**Key Trade-offs:**
| Decision | Trade-off |
|----------|-----------|
| Polygon vs Ethereum | Lower gas fees vs wider adoption |
| ERC-721 vs ERC-1155 | Simplicity vs batch minting efficiency |
| On-chain vs off-chain metadata | Immutability vs storage cost |

---

### Phase 9 — Competency-Based Mastery & SEL (2027)

**Objective:** Replace time-based progression with mastery gating. Integrate SEL into all learning.

**Implementation Order:**
1. Implement `MasteryEngine` with 90% threshold + consistency window
2. Implement spaced repetition scheduler (SM-2 algorithm)
3. Add SEL dimension tagging to all activities
4. Implement emotional state detection in Mwalimu AI
5. Replace leaderboards with mastery badges
6. Launch collaborative challenge system
7. Implement real-world impact project tracking

---

### Phase 10 — Immersive Reality Layer (2027–2028)

**Objective:** Extend learning into VR/AR environments.

**Implementation Order:**
1. Implement WebXR foundation (360° video, AR overlays)
2. Integrate Mwalimu AI into VR environments
3. Launch holographic classroom (WebRTC + spatial audio)
4. Implement haptic feedback API support
5. Build persistent metaverse campus (Three.js/Babylon.js)

---

### Phase 11 — Lifelong Learning & Global Scale (2028)

**Objective:** Remove age/geography restrictions. Scale to East Africa and beyond.

**Implementation Order:**
1. Extend user profiles for all life stages (5–80+)
2. Implement portable learning history (xAPI, IMS Global)
3. Launch corporate upskilling module
4. Implement federated learning pipeline
5. Add 20+ language support
6. Launch in Uganda, Tanzania, Rwanda
7. Implement W3C DID authentication

---

### Phase 12 — DAO Governance & SSI (2029)

**Objective:** Transition to community ownership. Give learners full data sovereignty.

**Implementation Order:**
1. Deploy `CurriculumDAO.sol` governance contracts
2. Launch DAO frontend (proposals, voting, execution)
3. Implement SSI wallet for learners
4. Implement zero-knowledge proof credentials
5. Transition storage to IPFS/Filecoin
6. Launch 100-language support

---

### Phase 13 — Global Disruption (2030)

**Objective:** Render traditional degrees obsolete. 10M+ learners. Full decentralization.

**Milestones:**
- 80% Fortune 500 companies hiring directly from platform
- 10M+ active learners globally
- AGI-lite tutor integration
- Neural interface (BCI) pilot
- Full DAO governance operational
- Zero-knowledge proof credentials standard

---

## Key Metrics by Phase

| Phase | Users | Credentials | Languages | Countries |
|-------|-------|-------------|-----------|-----------|
| **Phase 1–7 (2026)** | 100K | — | 5 | Kenya |
| **Phase 8–9 (2027)** | 500K | 100K | 5 | Kenya |
| **Phase 10–11 (2028)** | 1M+ | 500K | 20 | East Africa |
| **Phase 12 (2029)** | 5M+ | 2M | 50 | Africa |
| **Phase 13 (2030)** | 10M+ | 10M | 100+ | Global |

---

## Risk Register (Web4 Additions)

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Blockchain regulation** | Medium | High | Start with Polygon testnet, engage regulators early |
| **VR hardware cost** | High | Medium | Mobile-first VR, subsidize via token economy |
| **DAO governance attacks** | Low | High | 20% voting cap, time-locks, multi-sig |
| **AI bias at scale** | Medium | High | Monthly audits, diverse training data, human oversight |
| **Digital divide (VR)** | High | High | Mobile-first, offline-first, hardware subsidy program |
| **Regulatory (BCI)** | High | Medium | Non-invasive only, opt-in, regulatory engagement |
| **Token speculation** | Medium | Medium | Utility-only tokens, no trading on launch |

---

*Document Version: 3.0 (Web4)*
*Last Updated: 2026-04-27*
*Horizon: 2026–2030*
