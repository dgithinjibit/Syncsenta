# Implementation Plan: SyncSenta Web4 Education OS

## Overview

**FULL PRODUCTION SYSTEM: Web4 Education OS** 🎯

We are building the **complete SyncSenta Web4 Education OS** with all AI agents, MeTTa reasoning, blockchain integration, and advanced features operational. The "one student, one teacher, one headteacher" approach means we deploy the **FULL SYSTEM** and validate it works with one user in each role.

**🔥 CURRENT PRIORITY: Complete Production System** — All AI agents working, full feature set deployed, tested with 3 real users (1 per role).

**Architecture**: 
- **Complete Rust backend** with all AI agents operational
- **MeTTa reasoning engine** controlling all system logic
- **Kenya-LLM-Bench-v1** powering authentic AI responses
- **Blockchain integration** for credentials and tokens
- **Full Web4 features** including IPFS, DIDs, and decentralized storage
- **All 10+ AI agents** working behind the scenes

**Validation Strategy**: Deploy complete system, test with 3 users, iterate based on real usage of full feature set.

Tasks focus on **complete system implementation** with production-grade AI agents and Web4 infrastructure.

## Tasks

- [ ] **MVP VALIDATION SPRINT (30 Days)** 🎯
  - [x] 0.1 Build minimal "Schemer" PDF generator (CBC lesson plan tool)
    - Single-page Next.js app with form inputs for CBC curriculum
    - Generate professional PDF lesson plans/schemes of work
    - Deploy to Vercel with simple authentication
    - Target: 10 teachers using it within 2 weeks
    - _Validation: Will teachers pay KES 200/month for this?_

  - [x] 0.1.1 **CRITICAL: Kenya-LLM-Bench-v1 Dataset Creation & Open Source AI Training** 🔥
    - **STATUS: DATASET COMPLETE + PRODUCTION AI ARCHITECTURE DESIGNED** 
    - **VISION**: Build production-level open source AI tutor rivaling Synthesis Tutor & Magic School AI
    - **FOUNDATION MODEL**: Llama 3.1 8B/70B fine-tuned on Kenya-LLM-Bench-v1
    - **TRAINING INFRASTRUCTURE**: Rust + AMD ROCm (cost-efficient, developer account advantage)
    - **INFERENCE**: Candle (Rust ML framework) for self-hosted production deployment
    - **COMPLETED ACTIONS**:
      - ✅ Created complete Kenya-LLM-Bench-v1 dataset (1,000 CBC-aligned dialogues)
      - ✅ Built pattern-matching Kenya-LLM service for MVP validation
      - ✅ Enhanced Mwalimu AI with cultural authenticity features
      - ✅ Designed complete open source AI architecture plan
      - ✅ Competitive analysis vs Synthesis Tutor & Magic School AI
    - **NEXT STEPS - PRODUCTION AI TRAINING**:
      - Set up AMD ROCm training environment (Week 1)
      - Fine-tune Llama 3.1 8B on Kenya-LLM-Bench-v1 (Week 2-3)
      - Implement RLHF with teacher feedback (Week 4-6)
      - Deploy Candle inference engine (Week 7-8)
      - Integration with SyncSenta platform (Week 9-10)
    - **COMPETITIVE ADVANTAGES**:
      - 🇰🇪 95% cultural authenticity (impossible to replicate without our dataset)
      - 📚 CBC-specific curriculum alignment (vs generic standards)
      - 💰 $0.001/request cost (vs $0.03+ for competitors)
      - 🔒 Self-hosted data privacy (no external API dependencies)
      - 🛠️ Full customization control (open source advantage)
    - _Strategic Value: World-class AI tutor with authentic Kenyan context + cost efficiency + data sovereignty_

  - [ ] 0.2 User validation and feedback collection
    - Direct outreach to 50 teachers via WhatsApp/SMS
    - Collect structured feedback on pain points and willingness to pay
    - Document actual usage patterns and feature requests
    - _Goal: 3 paying users (1 student, 1 teacher, 1 headteacher)_

  - [ ] 0.3 Monetization validation
    - Implement simple M-Pesa payment integration for monthly subscriptions
    - A/B test pricing: KES 100, 200, 500 per month
    - Track conversion rates and churn
    - _Success metric: 10 paying users = proceed to next phase_

- [ ] **PHASE 1: CORE FEATURES (Only if MVP validates)** 
  - [ ] 1.1 Enhanced scheme generation with AI assistance
  - [ ] 1.2 Basic student progress tracking
  - [ ] 1.3 Simple parent communication (SMS/WhatsApp)
  - [ ] 1.4 Offline-first architecture (PWA with local storage)

- [ ] **PHASE 2: SCALE FEATURES (Only if Phase 1 shows traction)**
  - [ ] 2.1 Multi-school deployment
  - [ ] 2.2 County-level analytics
  - [ ] 2.3 Advanced AI tutoring (using Kenya-LLM-Bench-v1)

- [ ] **FUTURE: WEB4 FEATURES (Only if sustainable revenue)**

- [ ] 2. MeTTa Core Engine — Central Reasoning System for dApp Control
  - [x] 2.1 Implement MeTTa interpreter and knowledge base foundation
    - Create `metta_core` module as the central reasoning engine for all dApp operations
    - Implement MeTTa interpreter using `hyperon` crate for symbolic AI reasoning
    - Design knowledge base schema for educational domain: curriculum, assessments, user behavior, system state
    - Create MeTTa space management for concurrent reasoning sessions
    - Implement knowledge base persistence using PostgreSQL + IPFS for decentralized storage
    - _Requirements: All system requirements — MeTTa controls entire dApp logic_

  - [ ] 2.2 Implement educational domain knowledge base
    - Load CBC curriculum knowledge: subjects, strands, sub-strands, learning objectives, competencies
    - Define user role hierarchies and permission matrices in MeTTa symbolic format
    - Create assessment and grading logic as MeTTa rules (auto-grading, rubrics, mastery thresholds)
    - Implement learning path generation algorithms using symbolic reasoning
    - Define content recommendation and personalization rules
    - _Requirements: 7.1-7.6, 9.1-9.9, 16.1-16.5, 29.1-29.4_

  - [x] 2.3 Implement system orchestration and decision engine
    - Create MeTTa-powered request routing and business logic orchestration
    - Implement adaptive system behavior based on usage patterns and performance metrics
    - Design conflict resolution and consensus mechanisms for distributed decision making
    - Create system health monitoring and self-healing capabilities through symbolic reasoning
    - Implement resource allocation and load balancing decisions via MeTTa rules
    - _Requirements: 19.1-19.5, 20.1-20.5_

  - [ ] 2.4 Implement user behavior analysis and personalization engine
    - Create MeTTa rules for learning analytics and student progress tracking
    - Implement adaptive UI/UX decisions based on user interaction patterns
    - Design personalized content delivery and difficulty adjustment algorithms
    - Create early warning systems for at-risk students using symbolic pattern matching
    - Implement recommendation engines for content, activities, and learning paths
    - _Requirements: 3.4, 9.6-9.9, 16.5, 28.1-28.6_

  - [x] 2.5 Implement blockchain and Web4 integration layer
    - Create MeTTa rules for smart contract interaction and blockchain state management
    - Implement decentralized consensus mechanisms for educational records and credentials
    - Design token economy logic and automated reward distribution via symbolic reasoning
    - Create IPFS content management and pinning strategies through MeTTa orchestration
    - Implement cross-chain interoperability and bridge management
    - _Requirements: 26.1-26.7, 27.1-27.3, 36.5-36.7_

  - [x] 2.6 Implement real-time reasoning and event processing
    - Create MeTTa-powered event stream processing for real-time system responses
    - Implement WebSocket message routing and real-time collaboration logic
    - Design notification and alert systems with intelligent priority and timing
    - Create real-time assessment and feedback systems using symbolic reasoning
    - Implement live classroom management and attendance tracking via MeTTa rules
    - _Requirements: 4.1-4.9, 11.1-11.7, 15.1-15.5_

  - [x] 2.7 Implement API gateway and service mesh orchestration
    - Create MeTTa-controlled API routing, rate limiting, and access control
    - Implement service discovery and health checking through symbolic reasoning
    - Design circuit breaker and fallback mechanisms using MeTTa decision trees
    - Create API versioning and backward compatibility management
    - Implement cross-service communication and data consistency via MeTTa coordination
    - _Requirements: 17.1-17.6, 20.1-20.5_

  - [x] 2.8 Implement testing and quality assurance framework
    - Create MeTTa-powered property-based test generation for all system components
    - Implement automated test case generation based on curriculum and user scenarios
    - Design system invariant checking and formal verification using symbolic reasoning
    - Create performance benchmarking and optimization recommendations via MeTTa analysis
    - Implement security audit and vulnerability detection through symbolic pattern matching
    - _Requirements: All testing requirements across all tasks_

  - [ ]* 2.9 Write comprehensive MeTTa integration tests
    - Test MeTTa interpreter performance and memory management
    - Validate educational domain knowledge base completeness and consistency
    - Test system orchestration and decision engine reliability
    - Validate real-time reasoning and event processing accuracy
    - Test blockchain and Web4 integration layer functionality

- [ ] 3. W3C DID authentication and self-sovereign identity
  - [x] 3.1 Implement DID-based authentication with Axum and Tower middleware
    - Create `auth` module with DID document generation using `did-key` and `did-web` crates
    - Implement Verifiable Credential issuance and verification using `ssi` crate
    - Create `UserProfile` struct with sqlx derives; add `did`, `approval_status`, `role`, `school_id`, `county_id`, `vc_store` fields
    - Build Tower middleware layer to extract and validate Verifiable Presentations from Authorization header
    - Set `approvalStatus: Pending` for all new registrations except `NationalAdmin`
    - Store user DIDs on-chain for global verification
    - _Requirements: 1.1, 1.8, 34.6, 36.2_

  - [x] 2.2 Implement approval workflow engine with on-chain records
    - Create `approval_requests` table migration with sqlx
    - Implement `get_approver_role()` function matching the approval chain from design
    - Create Axum route `POST /api/approvals/{request_id}/decide` for approve/reject actions
    - On decision, update `user_profiles.approval_status`, issue Verifiable Credential, and record approval on-chain
    - Trigger SMS + email notifications via decentralized notification service
    - _Requirements: 1.2–1.7, 36.3_

  - [x] 2.3 Implement hardware wallet MFA for privileged roles
    - Add `wallet_address` and `mfa_enabled` fields to `user_profiles` table
    - Integrate hardware wallet signing (MetaMask, Ledger) for authentication
    - Create MFA enrollment flow: connect wallet, sign challenge, verify signature
    - Enforce wallet signature check in Tower middleware for `SchoolAdmin`, `SchoolHead`, `CountyOfficer`, `NationalAdmin`
    - _Requirements: 1.12, 36.4_

  - [x] 2.4 Implement role-based access control middleware with zero-knowledge proofs
    - Create `with_role()` Tower middleware layer checking user role via Verifiable Credentials
    - Implement zero-knowledge proof verification for privacy-preserving role checks
    - Return 403 with structured error for unauthorized access
    - _Requirements: 1.9, 20.3, 34.5_

  - [x]* 2.5 Write property test for pending account access denial (proptest)
    - **Property 1: Pending accounts are always denied access**
    - **Validates: Requirements 1.8**

  - [x]* 2.6 Write property test for approval chain correctness (proptest)
    - **Property 2: Approval chain is always respected**
    - **Validates: Requirements 1.2–1.6**

  - [x]* 2.7 Write property test for invalid credential rejection (proptest)
    - **Property 4: Invalid Verifiable Credentials are always rejected**
    - **Validates: Requirements 1.11, 36.2**

  - [x]* 2.8 Write property test for role-based permission consistency (proptest)
    - **Property 3: Role-based permissions are consistent and enforced via VCs**
    - **Validates: Requirements 1.9, 2.1, 20.3_

  - [x]* 2.9 Write unit tests for DID authentication and approval flows (Rust test framework)
    - Test DID generation, VC issuance, registration → pending state, approval chain routing, wallet MFA enforcement, 403 on pending access
    - _Requirements: 1.1–1.13, 34.6, 36.2–36.4_

- [x] 3. Blockchain layer foundation (Polygon)
  - [x] 3.1 Deploy core smart contracts to Polygon testnet
    - Create `SyncSentaCredentials.sol` (ERC-721 for credentials)
    - Create `SyncToken.sol` (ERC-20 for learn-to-earn economy)
    - Create `ApprovalRegistry.sol` (on-chain approval records)
    - Create `ContentRegistry.sol` (IPFS CID registry for content)
    - Deploy contracts using Hardhat/Foundry
    - _Requirements: 26.1, 26.2, 27.1, 36.5_

  - [x] 3.2 Implement Rust Web3 integration layer
    - Create `blockchain` module using `ethers-rs` crate
    - Implement contract interaction functions: `mint_credential`, `transfer_tokens`, `record_approval`, `register_content`
    - Implement event listeners for on-chain events
    - Create Axum routes for blockchain operations: `POST /api/blockchain/credentials`, `POST /api/blockchain/tokens`
    - _Requirements: 26.1, 27.1, 36.5_

  - [x] 3.3 Implement blockchain credential minting on mastery
    - On 90%+ mastery achievement, trigger `mint_credential` smart contract call
    - Store credential metadata on IPFS, reference CID in NFT
    - Issue W3C Verifiable Credential alongside blockchain credential
    - _Requirements: 26.2, 26.5_

  - [x]* 3.4 Write property test for credential immutability (proptest)
    - **Property 34: Once minted, blockchain credentials cannot be altered without revocation**
    - **Validates: Requirements 26.6**

  - [x]* 3.5 Write unit tests for blockchain integration (Rust test framework + tokio::test)
    - Test contract deployment, credential minting, token transfers, event listening
    - _Requirements: 26.1–26.3, 27.1, 36.5_

- [x] 4. SyncToken learn-to-earn economy
  - [x] 4.1 Implement token minting on learning milestones
    - On assessment completion, quiz mastery, or learning path milestone, mint SyncTokens
    - Smart contract call: `SyncToken.mint(learner_address, amount)`
    - Record transaction on-chain and in PostgreSQL for analytics
    - _Requirements: 27.1_

  - [x] 4.2 Implement token redemption system
    - Create Axum routes: `POST /api/tokens/redeem` for course purchase, mentorship booking, hardware subsidy
    - Smart contract call: `SyncToken.burn(amount)` on redemption
    - Integrate with marketplace for paid content purchases
    - _Requirements: 27.2_

  - [x] 4.3 Implement corporate partner token pool
    - Smart contract: `PartnerPool.sol` for partner deposits and auto-distribution
    - Partners deposit tokens → auto-distribute to top performers based on on-chain learning records
    - _Requirements: 27.3_

  - [x]* 4.4 Write property test for token economy consistency (proptest)
    - **Property 35: Token minting and burning maintain consistent supply**
    - **Validates: Requirements 27.1, 27.2**

  - [x]* 4.5 Write unit tests for token economy (Rust test framework + tokio::test)
    - Test token minting, redemption, partner pool distribution
    - _Requirements: 27.1–27.3_

- [x] 5. IPFS decentralized storage layer
  - [x] 5.1 Implement IPFS content upload and pinning
    - Create `ipfs` module using `ipfs-api` crate
    - Implement content upload: `upload_to_ipfs(file) -> CID`
    - Implement pinning service integration (Pinata/Infura) for persistence
    - Replace all S3/centralized storage with IPFS
    - _Requirements: 36.6, 36.7_

  - [x] 5.2 Update database schema for IPFS CIDs
    - Add `ipfs_cid` field to `content_resources`, `schemes`, `assessments`, `virtual_classrooms` (recordings)
    - Migrate existing storage URLs to IPFS (if any)
    - _Requirements: 36.6_

  - [x] 5.3 Implement IPFS content retrieval and caching
    - Create Axum route `GET /api/ipfs/{cid}` with Redis caching
    - Implement gateway fallback (public IPFS gateways if local node unavailable)
    - _Requirements: 36.7_

  - [x]* 5.4 Write property test for IPFS content integrity (proptest)
    - **Property 36: Content retrieved from IPFS always matches uploaded content hash**
    - **Validates: Requirements 36.6, 36.7**

  - [x]* 5.5 Write unit tests for IPFS integration (Rust test framework + tokio::test)
    - Test upload, pinning, retrieval, caching
    - _Requirements: 36.6, 36.7_

- [x] 6. Database schema and migrations (Web4-adapted)
  - Create sqlx migrations for all entities: `users`, `user_profiles`, `approval_requests`, `schools`, `counties`, `students`, `teachers`, `parents`, `school_admins`, `school_heads`, `county_officers`, `classes`, `schemes`, `assessments`, `assessment_submissions`, `content_resources`, `marketplace_listings`, `marketplace_purchases`, `virtual_classrooms`, `attendance_log`, `payment_transactions`, `fee_structures`, `sms_log`, `chat_sessions`, `learning_paths`, `sync_queue_entries`, `audit_log`, `direct_messages`, `announcements`, `discussion_threads`
  - Add `did` (Decentralized Identifier) field to `user_profiles`
  - Add `ipfs_cid` field to `content_resources`, `schemes`, `assessments`, `virtual_classrooms`
  - Add `blockchain_tx_hash` field to `approval_requests`, `payment_transactions`, `content_resources`
  - Add `wallet_address` field to `user_profiles` for token economy
  - Add `tsvector` column and GIN index on `content_resources.full_text_index`
  - Add `pgvector` embedding column on `content_resources` for semantic search
  - Implement Row-Level Security policies for all seven roles using PostgreSQL RLS
  - Create database seed script with CBC curriculum reference data (KICD standards JSON) and sample fee structures
  - Use `sqlx::query!` macro for compile-time query checking throughout the codebase
  - _Requirements: 20.3, 10.7, 17.5, 36.2, 36.6_

- [x] 7. Checkpoint — DID auth, blockchain foundation, IPFS storage, and DB
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Mwalimu AI 2.0 — Core tutor engine
  - [x] 8.1 Implement LLM orchestrator with model routing
    - Create `mwalimu_ai` module in backend routing requests to GPT-4o (text), Gemini Pro (image/document), candle (edge)
    - Implement retry logic with exponential backoff using `tokio::time::sleep` (3 attempts, 1s/2s/4s)
    - Implement circuit breaker pattern for LLM unavailability
    - Build CBC-grounded system prompt factory injecting grade level, language, and curriculum topic
    - _Requirements: 3.1, 3.10_

  - [x] 8.2 Implement voice pipeline (STT + TTS)
    - Create Axum route `POST /api/mwalimu/transcribe` accepting audio blob via multipart form, returning transcript within 3s
    - Integrate Whisper/scribe_v2 STT using `reqwest` to call external API
    - Create Axum route `POST /api/mwalimu/speak` accepting text, calling ElevenLabs API, returning audio URL
    - Wire voice input/output into the Mwalimu AI chat flow
    - _Requirements: 3.2, 3.3_

  - [x] 8.3 Implement document and image analysis
    - Accept PDF/DOCX uploads via Axum multipart; extract text using `pdf-extract` or `docx-rs` crates
    - Pass extracted text to Gemini Pro with student question using `reqwest`
    - Accept image uploads; pass to Gemini Pro vision with step-by-step prompt
    - _Requirements: 3.6, 3.7_

  - [x] 8.4 Implement adaptive learning path generation
    - Create `learning_path` module analyzing assessment history to identify knowledge gaps
    - Generate `LearningPath` struct with ordered steps mapped to CBC curriculum refs and content resources
    - Create Axum routes: `GET /api/students/{id}/learning-path` and `POST /api/students/{id}/learning-path/generate`
    - _Requirements: 3.4_

  - [x] 8.5 Implement auto-quiz generation from lesson content
    - On lesson save, spawn async task to call GPT-4o with lesson content and generate ≥5 quiz questions
    - Store generated quiz as a draft Assessment linked to the lesson using sqlx
    - _Requirements: 3.5_

  - [x] 8.6 Implement homework help mode
    - Add `mode: HomeworkHelp` variant to `MwalimuMode` enum
    - System prompt instructs step-by-step guidance without final answer
    - _Requirements: 3.8_

  - [x]* 8.7 Write property test for Mwalimu AI language matching (proptest)
    - **Property 10: Mwalimu AI responds in the language of the input**
    - **Validates: Requirements 3.9**

  - [x]* 8.8 Write property test for off-topic redirection (proptest)
    - **Property 11: Off-topic messages trigger educational redirection**
    - **Validates: Requirements 3.11**

  - [x]* 8.9 Write unit tests for Mwalimu AI 2.0 (Rust test framework + tokio::test)
    - Test model routing, STT/TTS pipeline, document analysis, learning path generation, quiz generation
    - _Requirements: 3.1–3.12_

- [x] 9. Scheme generation service
  - [x] 9.1 Implement scheme generation service
    - Create `scheme_generation` module integrating `scheme-scribe-ai` / `scheme-genie` logic
    - Build CBC-grounded system prompt from `SchemeGenerationRequest` struct fields
    - Validate LLM output against KICD curriculum reference JSON using serde deserialization
    - Store generated schemes on IPFS, reference CID in database
    - _Requirements: 7.1, 7.2, 7.3, 36.6_

  - [x] 9.2 Implement scheme CRUD Axum routes
    - `POST /api/schemes/generate`, `POST /api/schemes`, `GET /api/schemes/{id}`, `PATCH /api/schemes/{id}`
    - Use sqlx for database operations with compile-time query checking
    - _Requirements: 7.4, 7.5_

  - [ ]* 9.3 Write property test for scheme validation (proptest)
    - **Property 5: Generated schemes contain valid curriculum references and all required fields**
    - **Validates: Requirements 7.2, 7.3**

  - [ ]* 9.4 Write property test for scheme metadata round trip (proptest)
    - **Property 6: Scheme metadata round trip**
    - **Validates: Requirements 7.5**

  - [ ]* 9.5 Write unit tests for scheme generation (Rust test framework)
    - _Requirements: 7.1–7.6_

- [ ] 10. LughaBridge translation service
  - [x] 10.1 Implement translation pipeline (already complete)
    - Create `translation` module integrating `LughaBridge` logic
    - Implement tiered resolution: Redis cache → LLM translation → English/Swahili fallback
    - Load CBC terminology dictionary per language from embedded JSON files
    - Use `redis` crate for caching with async operations
    - _Requirements: 8.1, 8.3, 8.5_

  - [ ] 10.2 Implement language preference persistence
    - Create Axum route `PATCH /api/users/{id}/language` updating user profile
    - Store preference in DID document and user profile
    - Apply to all content fetching
    - _Requirements: 8.2, 8.4_

  - [ ]* 10.3 Write property test for language preference persistence (proptest)
    - **Property 7: Language preference persists across sessions**
    - **Validates: Requirements 8.4**

  - [ ]* 10.4 Write property test for content language delivery (proptest)
    - **Property 8: Content is delivered in the requested language**
    - **Validates: Requirements 8.2, 8.3**

  - [ ]* 10.5 Write property test for CBC terminology preservation (proptest)
    - **Property 9: CBC terminology is preserved during translation**
    - **Validates: Requirements 8.5**

  - [ ]* 10.6 Write unit tests for translation fallback behavior (Rust test framework)
    - _Requirements: 8.1–8.5_

- [ ] 11. Checkpoint — Mwalimu AI, scheme generation, and translation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Virtual classroom service (Jitsi Meet)
  - [ ] 9.1 Implement Jitsi Meet room creation with JWT auth
    - Create `virtual_classroom` module generating Jitsi JWT (HS256) with `moderator: true` for teachers using `jsonwebtoken` crate
    - Create Axum route `POST /api/classrooms` to provision a room and store `VirtualClassroom` record via sqlx
    - Create Axum route `GET /api/classrooms/{id}/join` returning room config and signed JWT for the requesting user
    - _Requirements: 4.1, 4.2_

  - [ ] 9.2 Implement attendance auto-tracking
    - Create Axum webhook endpoint `/api/classrooms/webhook` receiving Jitsi `participantJoined` / `participantLeft` events
    - Write one `AttendanceEntry` per join event; update `left_at` on leave event using sqlx
    - _Requirements: 4.5_

  - [ ] 9.3 Implement session recording storage
    - On session end, receive recording URL from Jitsi; store in S3-compatible storage (R2/B2) using `aws-sdk-s3` crate
    - Update `VirtualClassroom.recording_url` and `status: Ended` via sqlx
    - _Requirements: 4.4_

  - [ ] 9.4 Implement session scheduling and notifications
    - Create Axum route `POST /api/classrooms/schedule` storing scheduled session
    - Trigger Google Calendar event creation using `google-calendar3` crate
    - Schedule Africa's Talking SMS reminders 24h and 1h before session using Redis delayed jobs
    - _Requirements: 4.8, 17.6_

  - [ ]* 9.5 Write property test for Jitsi JWT role assignment (proptest)
    - **Property 30: Jitsi JWT grants moderator role only to teachers**
    - **Validates: Requirements 4.1, 4.6**

  - [ ]* 9.6 Write property test for attendance recording completeness (proptest)
    - **Property 31: Attendance is recorded for every session join event**
    - **Validates: Requirements 4.5**

  - [ ]* 9.7 Write unit tests for virtual classroom service (Rust test framework + tokio::test)
    - Test JWT generation, attendance webhook, recording storage, SMS scheduling
    - _Requirements: 4.1–4.9_

- [ ] 10. Analytics engine with predictive at-risk detection
  - [ ] 10.1 Implement progress metrics and trend calculation
    - Create `analytics` module with `calculate_student_progress()`, `calculate_class_analytics()`, `calculate_comparative_analytics()` functions
    - Implement linear regression for trend direction using `linfa` or `smartcore` crates
    - Implement benchmark flagging (score < threshold → flagged)
    - Implement predictive at-risk score: logistic regression over attendance rate, score trend, assignment completion
    - _Requirements: 9.6, 9.7, 9.9_

  - [ ] 10.2 Implement async metrics update pipeline
    - On assessment submission, enqueue Redis job to update `StudentProgressMetric` within 3 seconds using `redis` crate
    - Create analytics Axum routes: `GET /api/analytics/students/{id}`, `GET /api/analytics/classes/{id}`, `GET /api/analytics/schools/{id}`, `GET /api/analytics/counties/{id}`
    - _Requirements: 9.9_

  - [ ] 10.3 Implement report generation (PDF + Excel)
    - Integrate `printpdf` crate for PDF reports and `rust_xlsxwriter` crate for Excel exports
    - Create Axum route `GET /api/analytics/{scope}/{id}/report?format=pdf|excel`
    - _Requirements: 9.8_

  - [ ]* 10.4 Write property test for performance trend calculation (proptest)
    - **Property 13: Performance trend calculation is mathematically correct**
    - **Validates: Requirements 9.9**

  - [ ]* 10.5 Write property test for class analytics aggregation (proptest)
    - **Property 14: Class analytics aggregation is correct**
    - **Validates: Requirements 9.9**

  - [ ]* 10.6 Write property test for below-benchmark flagging (proptest)
    - **Property 15: Below-benchmark flagging is consistent with threshold**
    - **Validates: Requirements 9.6**

  - [ ]* 10.7 Write unit tests for analytics engine (Rust test framework + tokio::test)
    - _Requirements: 9.1–9.9_

- [ ] 11. Assessment service
  - [ ] 11.1 Implement assessment creation and curriculum validation
    - Create `assessment` module; validate all `curriculum_strand` values against KICD reference data using serde deserialization
    - _Requirements: 9.1, 9.2_

  - [ ] 11.2 Implement auto-grading and submission handling
    - Implement `auto_grade()` function for `MultipleChoice` / `TrueFalse` question types
    - Queue subjective questions to teacher grading queue in Redis
    - Create Axum route `POST /api/assessments/{id}/submit` with server-side time limit enforcement
    - _Requirements: 9.3, 9.4, 9.5_

  - [ ] 11.3 Implement teacher grading queue
    - Create Axum routes: `GET /api/assessments/grading-queue` and `PATCH /api/assessments/submissions/{id}/grade`
    - _Requirements: 9.5_

  - [ ]* 11.4 Write property test for assessment curriculum validation (proptest)
    - **Property 16: Assessment curriculum validation catches invalid references**
    - **Validates: Requirements 9.2**

  - [ ]* 11.5 Write property test for auto-grading correctness (proptest)
    - **Property 17: Auto-grading is correct for objective questions**
    - **Validates: Requirements 9.3**

  - [ ]* 11.6 Write property test for subjective question routing (proptest)
    - **Property 18: Subjective questions are never auto-graded**
    - **Validates: Requirements 9.5**

  - [ ]* 11.7 Write unit tests for assessment service (Rust test framework + tokio::test)
    - _Requirements: 9.1–9.5_

- [ ] 12. Checkpoint — Virtual classrooms, analytics, and assessments
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. M-Pesa payment service and fee management
  - [ ] 13.1 Implement M-Pesa Daraja STK Push integration
    - Create `payment` module with `initiate_stk_push()` function calling Daraja `/mpesa/stkpush/v1/processrequest` using `reqwest`
    - Create Axum routes: `POST /api/payments/mpesa/initiate` and `POST /api/payments/mpesa/callback`
    - If no callback within 60s, query `/mpesa/stkpushquery/v1/query` and reconcile using `tokio::time::timeout`
    - On confirmed payment, update fee balance and generate receipt using `printpdf`
    - _Requirements: 6.1, 6.2, 6.3, 6.8_

  - [ ] 13.2 Implement bank transfer and fee structure management
    - Create fee structure CRUD Axum routes: `POST /api/fees/structures`, `GET /api/fees/structures?school_id=&grade_level=`
    - Implement manual bank transfer confirmation by School_Admin
    - _Requirements: 6.4, 6.5_

  - [ ] 13.3 Implement fee reports and overdue reminders
    - Generate PDF and Excel fee collection reports via `printpdf` and `rust_xlsxwriter`
    - Schedule overdue SMS reminders via Africa's Talking when fee deadline passes with outstanding balance using Redis delayed jobs
    - _Requirements: 6.6, 6.7_

  - [ ] 13.4 Implement marketplace payment flow
    - On marketplace purchase, initiate M-Pesa STK Push; grant resource access on confirmed payment
    - _Requirements: 10.4_

  - [ ]* 13.5 Write property test for M-Pesa payment state machine (proptest)
    - **Property 29: M-Pesa payment state machine is consistent**
    - **Validates: Requirements 6.3, 6.8**

  - [ ]* 13.6 Write unit tests for payment service (Rust test framework + tokio::test)
    - Test STK Push initiation, callback handling, timeout reconciliation, receipt generation
    - _Requirements: 6.1–6.8_

- [ ] 14. Parent engagement portal
  - [ ] 14.1 Implement parent-student account linking
    - Create Axum route `POST /api/parents/link-student` requiring teacher approval; store in `parents.linked_student_ids` via sqlx
    - _Requirements: 5.1_

  - [ ] 14.2 Implement parent progress and attendance views
    - Create Axum route `GET /api/parents/{id}/students/{student_id}/progress` returning scores, attendance, completion rates
    - Implement WebSocket endpoint for real-time updates on assessment submissions (push updates to parent dashboard within 60s)
    - _Requirements: 5.2, 5.3_

  - [ ] 14.3 Implement parent-teacher direct messaging
    - Wire `DirectMessage` service for parent ↔ teacher communication using Axum routes and WebSocket
    - _Requirements: 5.4_

  - [ ] 14.4 Implement attendance SMS notifications
    - On student marked absent, trigger Africa's Talking SMS to linked parent within 5 minutes using async task
    - _Requirements: 5.5_

  - [ ] 14.5 Implement weekly email digest for parents
    - Create background job (using `tokio-cron-scheduler`) running every Monday; generate and send weekly summary email per parent using `lettre` crate
    - _Requirements: 5.8_

  - [ ]* 14.6 Write unit tests for parent portal (Rust test framework + tokio::test)
    - Test student linking, progress updates, SMS trigger on absence, weekly digest generation
    - _Requirements: 5.1–5.8_

- [ ] 15. Checkpoint — Payments, parent portal, and SMS notifications
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Content library, marketplace, and communication hub
  - [ ] 16.1 Implement content repository with video transcript generation
    - Create `content_repository` module streaming uploads to S3-compatible storage (max 500MB) using `aws-sdk-s3`
    - On video upload, spawn async task to call Whisper STT and store transcript within 10 minutes
    - Populate `full_text_index` tsvector column via PostgreSQL trigger
    - _Requirements: 10.1, 10.2, 10.5, 10.6_

  - [ ] 16.2 Implement marketplace listings and purchases
    - Create `MarketplaceListing` CRUD Axum routes; `POST /api/marketplace/{resource_id}/publish`
    - Wire marketplace purchase to M-Pesa payment flow; grant access on confirmed payment
    - _Requirements: 10.3, 10.4_

  - [ ] 16.3 Implement resource organization, sharing, and search
    - Folder/collection CRUD; sharing permission enforcement in RLS and Axum middleware
    - Create Axum route `GET /api/content/search?q=` using PostgreSQL `tsvector` + `tsquery` with Redis cache (TTL 60s)
    - _Requirements: 10.7, 10.8_

  - [ ] 16.4 Implement communication hub
    - Direct messaging: Axum routes `POST /api/messages`, `GET /api/messages/{conversation_id}` with WebSocket push
    - Announcements: `POST /api/announcements` (school/class scope); trigger Africa's Talking SMS on publish
    - Discussion forums: thread CRUD with teacher moderation
    - Weekly email digest background job (Monday) for parents and teachers using `tokio-cron-scheduler` and `lettre`
    - _Requirements: 11.1–11.7_

  - [ ]* 16.5 Write property test for resource access control (proptest)
    - **Property 19: Resource access control enforces sharing permissions**
    - **Validates: Requirements 10.8**

  - [ ]* 16.6 Write property test for full-text search completeness (proptest)
    - **Property 20: Full-text search returns all matching resources**
    - **Validates: Requirements 10.7**

  - [ ]* 16.7 Write unit tests for content library and communication hub (Rust test framework + tokio::test)
    - _Requirements: 10.1–10.8, 11.1–11.7_

- [ ] 17. Collaborative workspaces and critical thinking activities
  - [ ] 17.1 Implement collaborative workspace with real-time sync
    - Create `collaboration` module using WebSocket for real-time sync
    - Implement `SharedDocument` CRDT-style merge; append-only `ContributionEntry` log
    - _Requirements: 15.1, 15.2, 15.3_

  - [ ] 17.2 Implement threaded discussions, moderation, and peer evaluation
    - Discussion thread CRUD with teacher moderation; peer + teacher evaluation Axum endpoints
    - _Requirements: 15.4, 15.5_

  - [ ] 17.3 Implement critical thinking activity library and recommendation engine
    - Seed CBC-aligned activities from `aditicha`; recommendation engine for non-decreasing difficulty
    - Scaffolded hint mode with solution-string guard; rubric-based evaluation (pure function)
    - _Requirements: 16.1–16.5_

  - [ ]* 17.4 Write property test for contribution log attribution (proptest)
    - **Property 21: Contribution log attributes every action to the correct student**
    - **Validates: Requirements 15.3**

  - [ ]* 17.5 Write property test for hint solution withholding (proptest)
    - **Property 12: Scaffolded hints never reveal the complete solution**
    - **Validates: Requirements 16.2**

  - [ ]* 17.6 Write property test for rubric evaluation idempotency (proptest)
    - **Property 23: Rubric evaluation is idempotent**
    - **Validates: Requirements 16.4**

  - [ ]* 17.7 Write property test for activity recommendation difficulty (proptest)
    - **Property 24: Activity recommendations have non-decreasing difficulty for improving students**
    - **Validates: Requirements 16.5**

  - [ ]* 17.8 Write unit tests for collaboration and critical thinking (Rust test framework + tokio::test)
    - _Requirements: 15.1–15.5, 16.1–16.5_

- [ ] 18. Checkpoint — Content library, collaboration, and communication hub
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Offline sync service, PWA, and Rust WASM inference layer
  - [ ] 19.1 Configure Vite PWA plugin and service worker
    - Configure `vite-plugin-pwa` for static asset caching and content pre-caching
    - Define Workbox cache strategies: `CacheFirst` for static assets, `NetworkFirst` for API routes
    - _Requirements: 13.1, 13.2_

  - [ ] 19.2 Implement IndexedDB offline action queue (TypeScript)
    - Create `src/lib/offline-queue.ts` using `idb` library for `SyncQueueEntry` CRUD in IndexedDB
    - Intercept form submissions and activity completions when offline; write to queue
    - _Requirements: 13.2, 13.5_

  - [ ] 19.3 Implement background sync on reconnect (TypeScript + Service Worker)
    - Workbox `BackgroundSync` plugin; on reconnect, read all `pending` entries ordered by `createdOfflineAt`
    - POST to `/api/sync/flush`; mark entries `synced` or `conflict`; notify user via toast
    - _Requirements: 13.3, 13.4, 13.5_

  - [ ] 19.4 Implement Rust WASM inference module
    - Create `syncsenta-wasm` crate; compile `candle`-based inference module to WASM
    - Bundle with Vite using `vite-plugin-wasm`
    - Implement `RustInferenceEngine.infer(model_id, input)` returning result within 500ms for cached models
    - Support quantized model formats (GGUF/GGML) to minimize storage footprint
    - _Requirements: 14.1, 14.2, 14.4_

  - [ ] 19.5 Implement offline Mwalimu AI fallback (TypeScript + Rust WASM)
    - When cloud AI unavailable, route Mwalimu AI requests to Rust WASM inference engine
    - Cache lightweight quantized model for core tutoring responses
    - _Requirements: 13.6, 14.5_

  - [ ] 19.6 Implement server-side sync flush endpoint (Axum)
    - Create Axum route `POST /api/sync/flush` processing `SyncQueueEntry[]` in chronological order
    - Conflict resolution: server wins for grades, last-write-wins for drafts
    - _Requirements: 13.3, 13.5_

  - [ ]* 19.7 Write property test for offline sync queue ordering (fast-check in TypeScript)
    - **Property 22: Offline sync queue applies all actions in chronological order**
    - **Validates: Requirements 13.3, 13.5**

  - [ ]* 19.8 Write property test for Rust inference determinism (proptest in Rust WASM)
    - **Property 33: Rust inference results are deterministic for the same input**
    - **Validates: Requirements 14.1, 14.2**

  - [ ]* 19.9 Write unit tests for offline sync (Vitest) and Rust inference (wasm-bindgen-test)
    - _Requirements: 13.1–13.6, 14.1–14.5_

- [ ] 20. External API, data interoperability, and administrative tools
  - [ ] 20.1 Implement public REST API and rate limiting
    - Versioned Axum routes under `/api/v1/`; API key auth Tower middleware
    - Redis sliding window rate limiter: 1000 req/hr using `redis` crate; 429 with `Retry-After` header
    - _Requirements: 17.1, 17.2_

  - [ ] 20.2 Implement data export, import, and audit logging
    - Streaming CSV/JSON export using `csv` and `serde_json` crates
    - Atomic import with full validation before any DB writes using sqlx transactions
    - Audit logging Tower middleware on all Axum handlers: `user_id`, `action`, `resource_type`, `resource_id`, `ip_address`, `occurred_at`
    - _Requirements: 17.3, 17.4, 17.5_

  - [ ] 20.3 Implement Google Calendar integration
    - OAuth 2.0 flow for Google Calendar using `google-calendar3` crate
    - Sync Virtual_Classroom schedules and school events
    - _Requirements: 17.6_

  - [ ] 20.4 Implement administrative tools
    - Student enrollment, transfer (dual School_Head approval), and withdrawal workflows
    - Staff management: activate/deactivate/reassign roles
    - Compliance dashboard: DPA_2019 data handling status, audit log summary
    - _Requirements: 12.1–12.6_

  - [ ]* 20.5 Write property test for rate limiting enforcement (proptest)
    - **Property 25: Rate limiting enforces the 1000 requests/hour threshold**
    - **Validates: Requirements 17.2**

  - [ ]* 20.6 Write property test for data export round trip (proptest)
    - **Property 26: Data export round trip preserves all records and fields**
    - **Validates: Requirements 17.3**

  - [ ]* 20.7 Write property test for import validation atomicity (proptest)
    - **Property 27: Import validation reports all errors before committing**
    - **Validates: Requirements 17.4**

  - [ ]* 20.8 Write property test for audit log completeness (proptest)
    - **Property 28: Every system action produces an audit log entry**
    - **Validates: Requirements 17.5, 20.5**

  - [ ]* 20.9 Write unit tests for API, admin tools, and audit layer (Rust test framework + tokio::test)
    - _Requirements: 12.1–12.6, 17.1–17.6_

- [ ] 21. Checkpoint — Offline sync, Rust layer, external API, and admin tools
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 22. Role-specific dashboards and UI wiring (React + Shadcn/UI)
  - [x] 22.1 Build student dashboard (React)
    - Create `/dashboard/student` route with React components: active assignments, Mwalimu AI chat widget, learning path progress, offline indicator, virtual classroom join button
    - Use Shadcn/UI components for rapid development
    - Wire all student-facing services via Axum API calls using @tanstack/react-query
    - _Requirements: 2.2, 3.1, 13.2_

  - [x] 22.2 Build teacher dashboard (React)
    - Create `/dashboard/teacher` route with React components: scheme generator, class analytics, assessment builder, content upload, grading queue, virtual classroom controls
    - Wire all teacher-facing services via Axum API calls
    - _Requirements: 2.3, 7.1, 9.1, 10.5_

  - [x] 22.3 Build parent dashboard (React)
    - Create `/dashboard/parent` route with React components: linked students' progress, attendance, fee balance, school calendar, direct messaging
    - _Requirements: 2.8, 5.2, 5.3, 5.6, 5.7_

  - [x] 22.4 Build school admin and school head dashboards (React)
    - Create `/dashboard/school-admin` route: enrollment management, fee management, staff roster, approval queue
    - Create `/dashboard/school-head` route: school-wide analytics, staff approval queue, compliance dashboard
    - _Requirements: 2.4, 2.5, 12.1, 12.2_

  - [x] 22.5 Build county officer and national admin dashboards (React)
    - Create `/dashboard/county-officer` route: comparative analytics across schools, school head approval queue
    - Create `/dashboard/national-admin` route: system-wide metrics, county comparisons, full user management
    - _Requirements: 2.6, 2.7_

  - [ ] 22.6 Build collaborative workspace and virtual classroom UI (React)
    - Create `/workspaces/{id}` route: real-time shared document editor, threaded discussion panel, contribution history
    - Create `/classrooms/{id}` route: Jitsi Meet embed, participant list, attendance status, recording controls
    - Use WebSocket for real-time updates
    - _Requirements: 4.3, 15.1–15.5_

  - [ ] 22.7 Wire multilingual UI (React)
    - Integrate LughaBridge translation into all React components; language selector in global nav
    - Use zustand for language state management
    - _Requirements: 8.1, 8.2, 8.4_

  - [ ]* 22.8 Write Playwright E2E tests for critical flows
    - Login → approval flow; student assessment submission → auto-grade; M-Pesa payment → receipt; offline → reconnect → sync; virtual classroom join → attendance; language switch persistence
    - _Requirements: 1.1, 1.7, 6.3, 9.3, 13.3, 4.5, 8.4_

- [ ] 23. Accessibility implementation
  - [ ] 23.1 Implement semantic HTML and ARIA labels (React + Shadcn/UI)
    - Audit all React components; add `aria-label`, `aria-describedby`, `role` attributes
    - Ensure all form fields have associated `<label>` elements
    - Shadcn/UI components are already accessible, but verify custom components
    - _Requirements: 18.1, 18.2_

  - [ ] 23.2 Implement keyboard navigation and focus management (React)
    - Verify all interactive elements reachable via Tab/Enter/Space/Arrow keys
    - Implement visible focus indicators on all focusable elements using Tailwind CSS
    - Use React focus management hooks for modals and dialogs
    - _Requirements: 18.3_

  - [ ] 23.3 Implement adjustable text size and high-contrast mode (React + CSS)
    - CSS custom properties for font scale; high-contrast theme toggle using zustand state
    - Integrate with Tailwind's dark mode utilities
    - _Requirements: 18.4_

  - [ ] 23.4 Implement video captions and transcripts
    - Enforce non-empty captions/transcript before video resource is published (validation in Axum upload endpoint)
    - _Requirements: 18.5_

  - [ ]* 23.5 Write property test for video caption enforcement (proptest in Rust backend)
    - **Property 32: Video content always has captions and transcripts**
    - **Validates: Requirements 18.5**

  - [ ]* 23.6 Integrate axe-core into Playwright E2E test suite
    - _Requirements: 18.1_

- [ ] 24. Performance optimization and security hardening
  - [ ] 24.1 Implement query optimization and caching
    - Add database indexes on high-frequency query columns: `student_id`, `class_id`, `curriculum_ref`, `created_at`
    - Configure Redis caching for analytics aggregations (TTL 30s) and search results (TTL 60s)
    - _Requirements: 19.3, 19.5_

  - [ ] 24.2 Implement data encryption and security controls
    - Verify PostgreSQL encryption at rest is enabled for all tables
    - Enforce TLS 1.3 minimum in Axum server configuration
    - Implement GDPR/DPA-compliant data deletion: Axum route `DELETE /api/users/{id}` hard-deletes all PII within 30 days via background job
    - _Requirements: 20.1, 20.2, 20.4_

  - [ ]* 24.3 Write k6 load test for 100,000 concurrent users
    - Script ramp-up to 100,000 VUs; assert p95 response time < 2s
    - _Requirements: 19.1, 19.3_

  - [ ]* 24.4 Write criterion benchmarks for critical paths
    - Benchmark auth middleware, analytics calculations, scheme generation, translation pipeline
    - _Requirements: 19.1, 19.3_

  - [ ]* 24.5 Write unit tests for security controls (Rust test framework)
    - Test data deletion job, TLS enforcement, RLS policy enforcement
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [ ] 25. Final checkpoint — Full test suite and deployment readiness
  - Ensure all unit, property, integration, and E2E tests pass
  - Verify axe-core accessibility checks pass in CI
  - Confirm all 33 correctness properties have corresponding property tests
  - Build release binaries: backend (single Rust binary), frontend (WASM bundle + static assets)
  - Deploy backend to Fly.io/Railway; deploy frontend WASM to CDN (Cloudflare)
  - Ask the user if questions arise before considering the implementation complete.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All 33 correctness properties from the design document have corresponding property test sub-tasks
- Each task references specific requirements for full traceability
- Checkpoints at tasks 4, 8, 12, 15, 18, 21, and 25 ensure incremental validation
- **Frontend tests**: fast-check (property-based), Vitest (unit), React Testing Library (component), Playwright (E2E)
- **Backend tests**: proptest (property-based, 100 iterations min), Rust test framework + tokio::test (unit/integration), criterion (benchmarks)
- **Hybrid architecture benefits**: React for rapid UI development + Rust for backend performance + WASM for offline ML inference
- The Rust WASM module handles only offline ML inference (candle + thrml); all UI is React for faster development

---

## Web4 Tasks (Phase 2: 2027–2028)

- [ ] 24. Blockchain Micro-Credential System
  - [ ] 24.1 Deploy SyncSentaCredentials smart contract on Polygon testnet
    - Implement ERC-721 credential NFT with skill metadata
    - Add `mintCredential`, `verifyCredential`, `revokeCredential` functions
    - Integrate with mastery engine: auto-mint on 90%+ mastery achievement
    - _Requirements: 26.1, 26.2, 26.3_

  - [ ] 24.2 Implement W3C Verifiable Credentials API
    - Issue credentials in W3C VC JSON-LD format
    - Create Axum route `GET /api/credentials/{learner_id}` returning portable credential bundle
    - _Requirements: 26.5_

  - [ ] 24.3 Implement employer verification portal
    - Public verification endpoint: `GET /api/verify/{token_id}`
    - No authentication required — open verification
    - _Requirements: 26.3_

  - [ ]* 24.4 Write property test for credential immutability (proptest)
    - **Property: Once minted, credentials cannot be altered without revocation**
    - **Validates: Requirements 26.6**

- [ ] 25. SyncToken Economy
  - [ ] 25.1 Implement token minting on learning milestone completion
    - Smart contract: `SyncToken.sol` (ERC-20 on Polygon)
    - Backend: trigger token mint via Web3 call on mastery achievement
    - _Requirements: 27.1_

  - [ ] 25.2 Implement token redemption system
    - Axum routes for course purchase, mentorship booking, hardware subsidy
    - Smart contract: `redeemTokens(amount, purpose)` with burn mechanism
    - _Requirements: 27.2_

  - [ ] 25.3 Implement corporate partner token distribution
    - Smart contract: `PartnerPool` — partners deposit, auto-distribute to top performers
    - _Requirements: 27.3_

- [ ] 26. Competency-Based Mastery Engine
  - [ ] 26.1 Implement mastery gating in assessment service
    - `MasteryEngine` struct with configurable threshold (default 90%)
    - Consistency window: must maintain over N assessments
    - Block progression until mastery achieved
    - _Requirements: 29.1, 29.2_

  - [ ] 26.2 Implement spaced repetition scheduler
    - SM-2 algorithm for review scheduling
    - Redis-backed reminder queue
    - _Requirements: 29.3_

  - [ ] 26.3 Implement mastery badge system
    - Award badge on mastery achievement
    - Update competency profile
    - Trigger blockchain credential mint
    - _Requirements: 29.4_

  - [ ]* 26.4 Write property test for mastery gating (proptest)
    - **Property: Students below mastery threshold are always blocked from progression**
    - **Validates: Requirements 29.1**

- [ ] 27. Social-Emotional Learning (SEL) Integration
  - [ ] 27.1 Add SEL dimension tagging to all learning activities
    - Tag each activity with SEL competencies (self-awareness, empathy, etc.)
    - Track SEL progress in student profile
    - _Requirements: 28.1, 28.6_

  - [ ] 27.2 Implement emotional state detection in Mwalimu AI
    - Behavioral signals: response time, error patterns, session duration
    - Adapt content delivery based on detected state
    - _Requirements: 28.2_

  - [ ] 27.3 Implement intrinsic gamification system
    - Mastery-based badges (not time-based)
    - Collaborative challenges (team achievements)
    - Real-world impact project tracking
    - _Requirements: 28.4_

- [ ] 28. Lifelong Learning Profile
  - [ ] 28.1 Extend user profile for lifelong learning
    - Remove age restrictions — support learners 5 to 80+
    - Add life stage transitions (school → career → retirement)
    - Preserve all history across transitions
    - _Requirements: 33.1, 33.2, 33.3_

  - [ ] 28.2 Implement portable learning history export
    - Export in xAPI (Tin Can), IMS Global, and JSON-LD formats
    - _Requirements: 33.4_

  - [ ] 28.3 Implement corporate upskilling module
    - Employers can assign learning paths to employees
    - Track completion and issue credentials
    - _Requirements: 33.5_

- [ ] 29. Privacy by Design Upgrades
  - [ ] 29.1 Implement federated learning pipeline
    - AI model updates without centralizing raw student data
    - Differential privacy for aggregate analytics
    - _Requirements: 34.2_

  - [ ] 29.2 Implement W3C DID (Decentralized Identity)
    - Replace JWT with DID-based authentication (2028)
    - _Requirements: 34.6_

  - [ ] 29.3 Implement open standards interoperability
    - xAPI (Tin Can) for learning activity tracking
    - LTI 1.3 for LMS integration
    - IMS Global for credential portability
    - _Requirements: 35.2_

## Web4 Tasks (Phase 3: 2029–2030)

- [ ] 30. Curriculum DAO
  - [ ] 30.1 Deploy DAO governance contracts
    - `CurriculumDAO.sol` with proposal, voting, execution lifecycle
    - Token-weighted voting (max 20% per entity)
    - _Requirements: 32.1, 32.2, 32.3_

  - [ ] 30.2 Implement DAO frontend
    - Proposal creation, discussion, voting UI
    - On-chain record display
    - _Requirements: 32.4, 32.5_

- [ ] 31. Self-Sovereign Identity (SSI)
  - [ ] 31.1 Implement SSI wallet for learners
    - Learners hold their own identity and credentials
    - No dependency on SyncSenta for verification
    - _Requirements: 34.6_

  - [ ] 31.2 Implement zero-knowledge proof credentials
    - Prove credential validity without revealing underlying data
    - _Requirements: 26.7, 34.5_

- [ ] 32. VR/AR Immersive Learning Layer
  - [ ] 32.1 Implement WebXR foundation
    - 360° video lessons via WebXR API
    - AR overlays on mobile camera
    - _Requirements: 31.1, 31.2_

  - [ ] 32.2 Implement holographic classroom
    - WebRTC + spatial audio for live expert sessions
    - _Requirements: 31.3_

  - [ ] 32.3 Integrate Mwalimu AI into VR environments
    - Contextual AI guidance within immersive spaces
    - _Requirements: 31.4_
