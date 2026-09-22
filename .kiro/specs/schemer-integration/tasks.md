# Implementation Plan: Schemer v2.0 Integration

## Overview

This implementation plan integrates the complete Schemer v2.0 system into SyncSenta, transforming it into a production-grade CBC curriculum delivery platform. The integration includes unified curriculum data, AI-powered scheme generation, comprehensive exam system, student visibility, Mwalimu AI integration, and blockchain credentials.

## Tasks

- [ ] 1. Set up unified CBC curriculum data layer
  - [ ] 1.1 Create curriculum data module structure
    - Create `frontend/src/data/curriculum/` directory structure
    - Define core TypeScript interfaces: `SchemeRow`, `ExamQuestion`, `StrandInfo`, `SubStrandInfo`
    - Set up curriculum data accessor functions with proper typing
    - _Requirements: 1.1, 1.7, 13.1_

  - [ ]* 1.2 Write property test for curriculum data completeness
    - **Property 1: Curriculum Data Completeness**
    - **Validates: Requirements 1.9**

  - [ ] 1.3 Implement KICD CBC data for all grades and subjects
    - Port complete curriculum data from Schemer v2.0 for PP1-Grade 6
    - Implement strand and sub-strand data for all KICD CBC subjects
    - Add support for 38 Kenyan indigenous languages
    - _Requirements: 1.1, 1.2_

  - [ ]* 1.4 Write property tests for curriculum data consistency
    - **Property 2: Curriculum Data Lookup Consistency**
    - **Property 3: Hierarchical Data Integrity**
    - **Validates: Requirements 1.3, 1.4**

  - [ ] 1.5 Implement term allocation and weekly distribution logic
    - Create term allocation mapping for non-language subjects
    - Implement weekly distribution for language subjects
    - Add error handling with graceful degradation
    - _Requirements: 1.5, 1.6, 1.8_

  - [ ]* 1.6 Write property tests for term allocation and distribution
    - **Property 4: Term Allocation Completeness**
    - **Property 5: Weekly Distribution Coverage**
    - **Property 6: Error Handling Graceful Degradation**
    - **Validates: Requirements 1.5, 1.6, 1.8**

- [ ] 2. Implement six-step scheme generation wizard
  - [ ] 2.1 Create scheme generator component structure
    - Replace `frontend/src/components/mvp/schemer-generator.tsx` with full wizard
    - Implement step navigation with state management using Zustand
    - Create wizard step components with proper TypeScript typing
    - _Requirements: 2.1, 13.2_

  - [ ] 2.2 Implement grade and subject selection steps
    - Create grade selection (PP1-Grade 6) with subject filtering
    - Implement subject selection with curriculum data integration
    - Add indigenous language selection for Indigenous Language subject
    - _Requirements: 2.2, 2.5_

  - [ ]* 2.3 Write property tests for UI state consistency
    - **Property 7: UI State Consistency**
    - **Property 8: Conditional UI Rendering**
    - **Validates: Requirements 2.2, 2.3, 2.4**

  - [ ] 2.4 Implement term and strand selection steps
    - Create term selection (Terms 1-3) with academic year context
    - Implement strand/sub-strand selection with term allocation controls
    - Add weekly distribution controls for language subjects
    - _Requirements: 2.3, 2.4_

  - [ ] 2.5 Implement teacher inputs and preview steps
    - Create teacher inputs form (KIQ, learning outcomes, experiences, resources, assessment)
    - Implement scheme preview with AI generation integration
    - Add form validation and navigation data persistence
    - _Requirements: 2.6, 2.7, 2.8, 2.9_

  - [ ]* 2.6 Write property tests for navigation and validation
    - **Property 9: Navigation Data Persistence**
    - **Property 10: Form Validation Enforcement**
    - **Validates: Requirements 2.8, 2.9**

- [ ] 3. Checkpoint - Ensure frontend wizard compiles and renders
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Extend backend scheme service for AI generation
  - [ ] 4.1 Enhance scheme service with AI integration
    - Extend `backend/syncsenta-backend/src/services/scheme.rs` with v2.0 functionality
    - Implement GPT-4o integration for scheme generation
    - Add weekly mode (language subjects) and term mode (non-language subjects)
    - _Requirements: 3.1, 3.2, 3.10_

  - [ ]* 4.2 Write property tests for scheme generation invariants
    - **Property 11: Complete Scheme Generation**
    - **Property 12: Subject-Based Generation Mode**
    - **Property 13: Week Numbering Invariant**
    - **Property 14: Lesson Numbering Invariant**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [ ] 4.3 Implement scheme validation and guardrails
    - Add week and lesson numbering validation
    - Implement content sanitization for AI-generated fields
    - Create JSON recovery for malformed AI responses
    - _Requirements: 3.3, 3.4, 3.5, 3.6_

  - [ ]* 4.4 Write property tests for content validation
    - **Property 15: Content Sanitization**
    - **Property 16: JSON Recovery Attempt**
    - **Property 17: Scheme Coverage Completeness**
    - **Validates: Requirements 3.5, 3.6, 3.9**

  - [ ] 4.5 Implement scheme guardrails and curriculum alignment
    - Add required field validation for all SchemeRow objects
    - Implement KICD-compliant placeholder generation for invalid fields
    - Ensure curriculum alignment preservation
    - _Requirements: 4.1, 4.4, 4.6_

  - [ ]* 4.6 Write property tests for guardrails
    - **Property 18: Required Field Validation**
    - **Property 19: Validation Error Recovery**
    - **Property 20: Curriculum Alignment Preservation**
    - **Property 21: SchemeRow Serialization Round-trip**
    - **Validates: Requirements 4.1, 4.4, 4.6, 4.7**

- [ ] 5. Implement scheme preview and export functionality
  - [ ] 5.1 Create scheme preview component
    - Port `SchemePreview` component with CBC column headers (English/Kiswahili)
    - Implement read-only mode for students
    - Add per-row lesson plan generation integration
    - _Requirements: 5.1, 5.5_

  - [ ] 5.2 Implement DOCX and PDF export
    - Port `exportDocx.ts` utility for DOCX export
    - Implement browser print dialog for PDF export
    - Add teacher/school metadata in exported documents
    - _Requirements: 5.2, 5.3, 5.4_

  - [ ] 5.3 Create lesson plan dialog component
    - Port `LessonPlanDialog` with detailed lesson structure
    - Implement on-demand lesson plan generation
    - Add DOCX export for individual lesson plans
    - _Requirements: 5.6, 5.7, 9.6_

- [ ] 6. Implement database schema extensions
  - [ ] 6.1 Create enhanced schemes table
    - Add enhanced schemes table with JSONB scheme_rows column
    - Include IPFS CID and blockchain transaction hash fields
    - Add unique constraint for curriculum reference per teacher/term
    - _Requirements: 6.1, 6.2_

  - [ ] 6.2 Create lesson plans table
    - Add lesson_plans table with scheme_id foreign key
    - Include structured lesson content fields
    - Add unique constraint for week/lesson per scheme
    - _Requirements: 9.4_

  - [ ] 6.3 Create exam-related tables
    - Add exams table with JSONB questions column
    - Create exam_sessions table for student attempts
    - Add exam_results table for analytics and weak areas
    - Create scheme_credentials table for blockchain integration
    - _Requirements: 12.9, 10.1_

- [ ] 7. Implement scheme library and persistence
  - [ ] 7.1 Implement scheme saving and IPFS integration
    - Add scheme persistence to PostgreSQL with JSONB storage
    - Implement IPFS upload for scheme JSON with CID storage
    - Add scheme updating with versioning support
    - _Requirements: 6.1, 6.2, 6.6_

  - [ ] 7.2 Create scheme library component
    - Implement teacher's scheme library with date ordering
    - Add scheme loading and editing functionality
    - Display IPFS CIDs for content verification
    - _Requirements: 6.3, 6.4, 6.5, 6.7_

  - [ ] 7.3 Implement student scheme visibility
    - Add student scheme retrieval with class filtering
    - Enforce student access controls (only own class schemes)
    - Add headteacher access to all school schemes
    - _Requirements: 7.1, 7.2, 7.5_

- [ ] 8. Checkpoint - Ensure scheme library functionality works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement comprehensive exam system
  - [ ] 9.1 Create exam service backend
    - Implement `backend/syncsenta-backend/src/services/exam.rs`
    - Add exam generation from schemes with configurable distribution
    - Implement MCQ, short answer, and long answer question generation
    - _Requirements: 12.1, 12.2_

  - [ ]* 9.2 Write property tests for exam generation
    - **Property 22: Comprehensive Exam Generation**
    - **Property 23: Exam Distribution Constraints**
    - **Property 24: MCQ Structure Validation**
    - **Property 25: Short Answer Auto-marking Support**
    - **Property 26: Long Answer Rubric Provision**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**

  - [ ] 9.3 Implement exam runner component
    - Create `ExamRunner` component with clean, distraction-free interface
    - Add timer, progress tracking, and keyboard navigation
    - Implement auto-save functionality for student answers
    - _Requirements: 12.6_

  - [ ] 9.4 Implement auto-marking system
    - Add MCQ and short answer auto-marking within 5 seconds
    - Implement keyword-based marking for short answers
    - Generate detailed results with strand-wise performance
    - _Requirements: 12.7, 12.8_

  - [ ]* 9.5 Write property tests for exam results and analytics
    - **Property 27: Exam Results Completeness**
    - **Property 28: Exam Storage Completeness**
    - **Property 29: Retake Question Shuffling**
    - **Validates: Requirements 12.8, 12.9, 12.10**

  - [ ] 9.6 Implement exam analytics and export
    - Add class-wide analytics with average scores and difficulty analysis
    - Implement printable exam generation (PDF) with answer sheets
    - Create weak area identification and practice exam generation
    - _Requirements: 12.11, 12.12_

  - [ ]* 9.7 Write property tests for printable exams and analytics
    - **Property 30: Printable Exam Completeness**
    - **Property 31: Class Analytics Completeness**
    - **Validates: Requirements 12.11, 12.12**

- [ ] 10. Implement Mwalimu AI scheme context integration
  - [ ] 10.1 Enhance Mwalimu AI with scheme context
    - Query scheme service for current active scheme in student's class
    - Inject current week's SchemeRow data into system prompt
    - Ground tutoring responses in strand and sub-strand context
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 10.2 Implement scheme context scoping and error handling
    - Ensure scheme context is scoped to individual sessions
    - Handle cases where no active scheme exists gracefully
    - Use key inquiry questions as framing devices when relevant
    - _Requirements: 8.4, 8.5, 8.6_

  - [ ]* 10.3 Write property test for scheme context integration
    - **Property 7: Mwalimu AI Scheme Context**
    - **Validates: Requirements 8.7**

- [ ] 11. Implement per-lesson lesson plan generation
  - [ ] 11.1 Add lesson plan generation to scheme service
    - Implement detailed lesson plan generation for individual SchemeRow objects
    - Include lesson structure: title, duration, objectives, activities, assessment
    - Ensure curriculum alignment with source SchemeRow
    - _Requirements: 9.1, 9.2_

  - [ ] 11.2 Implement lesson plan caching and performance
    - Add lesson plan caching against week/lesson numbers
    - Return cached plans within 500ms for subsequent requests
    - Use same AI model and CBC-grounded prompting as schemes
    - _Requirements: 9.3, 9.4, 9.5_

- [ ] 12. Implement blockchain credential system
  - [ ] 12.1 Create blockchain integration for scheme milestones
    - Issue "First Scheme Created" micro-credential for first saved scheme
    - Issue "Complete Term Coverage" credential for full subject coverage
    - Record IPFS CID as metadata in issued credentials
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ] 12.2 Implement credential notification and error handling
    - Add in-app notifications for issued credentials within 30 seconds
    - Queue credential issuance for retry if blockchain unavailable
    - Ensure scheme saving is not blocked by blockchain failures
    - _Requirements: 10.4, 10.5_

- [ ] 13. Implement comprehensive API endpoints
  - [ ] 13.1 Create scheme management endpoints
    - `POST /api/v1/schemes/generate` - Generate new scheme
    - `GET /api/v1/schemes/teacher/{teacher_id}` - Get teacher's schemes
    - `GET /api/v1/schemes/student/{student_id}` - Get student's visible schemes
    - `POST /api/v1/schemes/{scheme_id}/save` - Save scheme to library
    - _Requirements: 3.1, 6.3, 7.1_

  - [ ] 13.2 Create exam management endpoints
    - `POST /api/v1/exams/generate` - Generate exam from scheme
    - `POST /api/v1/exams/{exam_id}/start` - Start exam session
    - `POST /api/v1/exams/sessions/{session_id}/submit` - Submit complete exam
    - `GET /api/v1/exams/results/{session_id}` - Get exam results
    - _Requirements: 12.1, 12.6, 12.7, 12.8_

  - [ ] 13.3 Create export service endpoints
    - `POST /api/v1/export/scheme/{scheme_id}/docx` - Export scheme as DOCX
    - `POST /api/v1/export/lesson-plan/{plan_id}/docx` - Export lesson plan as DOCX
    - `POST /api/v1/export/exam/{exam_id}/pdf` - Export printable exam as PDF
    - _Requirements: 5.2, 9.6, 12.11_

  - [ ]* 13.4 Write property tests for API validation
    - **Property 32: Request Validation Enforcement**
    - **Property 33: Data Validation Before Persistence**
    - **Property 34: Data Object Serialization Round-trip**
    - **Validates: Requirements 13.3, 13.4, 13.5**

- [ ] 14. Implement comprehensive error handling
  - [ ] 14.1 Add AI generation error handling
    - Implement structured JSON recovery for malformed AI responses
    - Add exponential backoff for rate limiting with user notification
    - Sanitize and regenerate content policy violations
    - Handle timeouts with partial results and continuation tokens

  - [ ] 14.2 Add database and external service error handling
    - Implement connection pooling with automatic retry for database
    - Add fallback to database storage for IPFS failures
    - Queue blockchain operations for retry without blocking user workflow
    - Return descriptive validation errors for constraint violations

- [ ] 15. Final integration and testing
  - [ ] 15.1 Integration testing and validation
    - Run complete end-to-end tests for scheme generation workflow
    - Test exam generation and auto-marking with real data
    - Validate Mwalimu AI integration with scheme context
    - Verify blockchain credential issuance

  - [ ]* 15.2 Run comprehensive property test suite
    - Execute all 34 property tests with minimum 100 iterations each
    - Validate curriculum data completeness and consistency
    - Test scheme generation invariants and guardrails
    - Verify exam system correctness properties

  - [ ] 15.3 Performance and deployment validation
    - Ensure scheme generation completes within 60 seconds
    - Validate auto-marking completes within 5 seconds
    - Test system with realistic load (multiple concurrent users)
    - Verify all exports (DOCX/PDF) generate correctly

- [ ] 16. Final checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at major milestones
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and error conditions
- The integration preserves all Schemer v2.0 guardrails and data quality
- TypeScript strict mode enforced - no `any` types permitted
- Rust backend uses `sqlx::query!` macros for compile-time query validation
- All AI generation centralized through SyncSenta's GPT-4o configuration