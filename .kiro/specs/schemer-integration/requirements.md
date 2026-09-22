# Requirements Document

## Introduction

This spec covers the integration of the Schemer v2.0 repository (`scheme-scribe-ai`) into SyncSenta as the production-grade scheme-of-work generation and assessment layer for teachers and students. The Schemer v2.0 is a complete, tested CBC scheme generator (React/TypeScript/Vite) with a full KICD curriculum data layer, a six-step generation wizard, AI-powered content generation, DOCX/PDF export, per-lesson lesson plan generation, **and comprehensive exam generation with auto-marking capabilities**. The goal is to stitch it into SyncSenta — replacing the placeholder `schemer-generator.tsx`, wiring AI generation to the Rust/Axum backend, connecting generated schemes to the student side, enabling Mwalimu AI to use scheme data as tutoring context, and integrating the exam generation system for complete assessment workflows. Nothing is degraded; the Schemer's guardrails, data fidelity, and export quality are fully preserved and where possible improved.

This is not an MVP integration. The full system is deployed and tested with one real teacher, one real student, and one real headteacher.

## Glossary

- **Schemer**: The integrated scheme-of-work generation and assessment subsystem, ported from the `scheme-scribe-ai` repository (v2.0) into SyncSenta
- **Scheme_Generator**: The frontend component (ported `SchemeGeneratorDialog`) that guides a teacher through the six-step scheme creation wizard
- **Scheme_Preview**: The frontend component (ported `SchemePreview`) that renders the completed scheme table with CBC column headers
- **Lesson_Plan_Dialog**: The frontend component (ported `LessonPlanDialog`) that generates and displays a detailed per-lesson plan
- **Exam_Runner**: The frontend component (ported `ExamRunner`) that delivers interactive exams to students with auto-marking capabilities
- **Exam_Generator**: The AI-powered exam generation system that creates MCQ, short answer, and long answer questions from scheme content
- **Curriculum_Data_Layer**: The unified curriculum data module at `frontend/src/data/curriculum/` containing KICD CBC data for PP1–Grade 6 across all subjects, ported from the Schemer v2.0 repo and merged with SyncSenta's existing data
- **SchemeRow**: The canonical data type representing one lesson row in a scheme of work: `{ week, lesson, strand, subStrand, specificLearningOutcome, keyInquiryQuestion, learningExperiences, learningResources, assessmentMethods, reflection }`
- **ExamQuestion**: The canonical data type for exam questions: `{ type: "mcq" | "short" | "long", strand, subStrand, question, marks, ... }` with type-specific fields for options, answers, rubrics
- **Scheme_Service**: The Rust/Axum backend service (`services/scheme.rs`) responsible for AI-powered scheme generation, persistence, and retrieval
- **Exam_Service**: The Rust/Axum backend service (`services/exam.rs`) responsible for AI-powered exam generation, auto-marking, and results storage
- **Scheme_Library**: The teacher's personal collection of saved schemes, stored in PostgreSQL and referenced via IPFS CIDs
- **Exam_Library**: The teacher's collection of generated exams and student results, stored in PostgreSQL with detailed analytics
- **Mwalimu_AI**: The adaptive AI tutor component that uses scheme context to ground tutoring responses in the teacher's current curriculum plan
- **Scheme_Context**: A subset of a `SchemeRow` (strand, sub-strand, learning outcomes) injected into Mwalimu AI's system prompt to contextualize student tutoring
- **Term_Allocation**: The logic that distributes strands and sub-strands across the three CBC terms for non-language subjects
- **Weekly_Distribution**: The logic that distributes language subject content across weeks within a term
- **Indigenous_Language**: One of 38 Kenyan indigenous languages supported as a subject option for language activities
- **KICD**: Kenya Institute of Curriculum Development — the authority defining CBC standards
- **CBC**: Kenya's Competency-Based Curriculum covering PP1 through Grade 6 (lower and upper primary) in this integration
- **DOCX_Exporter**: The export utility (ported `exportDocx.ts`) that produces a `.docx` file from a completed scheme
- **Blockchain_Layer**: The Polygon smart contract layer used to issue micro-credentials for scheme creation milestones
- **IPFS_Storage**: The decentralized storage layer where scheme JSON is pinned and referenced by CID
- **Teacher**: An authenticated SyncSenta user with the Teacher role who creates and manages schemes
- **Student**: An authenticated SyncSenta user with the Student role who views schemes and receives Mwalimu AI tutoring grounded in those schemes
- **Headteacher**: An authenticated SyncSenta user with the School_Head role who can view all schemes created by teachers in their school

---

## Requirements

### Requirement 1: Unified CBC Curriculum Data Layer

**User Story:** As a teacher, I want the scheme generator to know the complete KICD CBC curriculum for every grade and subject, so that I never have to manually look up strands, sub-strands, or term allocations.

#### Acceptance Criteria

1. THE Curriculum_Data_Layer SHALL provide strand and sub-strand data for all grades from PP1 through Grade 6 across all KICD CBC subjects including English Activities, Kiswahili Language Activities, Mathematical Activities, Environmental Activities, Creative Activities, CRE, HRE, IRE (lower primary) and English, Kiswahili, Mathematics, Agriculture, Science and Technology, Social Studies, Creative Arts, and Indigenous Language (upper primary)
2. THE Curriculum_Data_Layer SHALL support all 38 Kenyan indigenous languages as selectable options when the subject is Indigenous Language
3. WHEN a grade and subject are provided, THE Curriculum_Data_Layer SHALL return the correct strands for that grade-subject combination as defined by KICD
4. WHEN a grade, subject, and strand are provided, THE Curriculum_Data_Layer SHALL return the correct sub-strands for that strand
5. WHEN a grade, subject, and term are provided, THE Curriculum_Data_Layer SHALL return the term allocation mapping that distributes strands and sub-strands across that term for non-language subjects
6. WHEN a grade, subject, and term are provided for a language subject, THE Curriculum_Data_Layer SHALL return the weekly distribution of content across the weeks of that term
7. THE Curriculum_Data_Layer SHALL export the canonical `SchemeRow` type, `SubStrandInfo` type, `StrandInfo` type, and all accessor functions (`getSubjectsForGrade`, `getHardcodedStrands`, `getSubStrandsForStrand`, `getLessonsPerWeek`, `columnHeaders`) with no breaking changes to the Schemer's existing call signatures
8. IF a requested grade-subject-strand combination does not exist in the KICD data, THEN THE Curriculum_Data_Layer SHALL return an empty array and log a descriptive warning rather than throwing an exception
9. FOR ALL valid grade-subject combinations, THE Curriculum_Data_Layer SHALL return at least one strand with at least one sub-strand (round-trip completeness invariant)

---

### Requirement 2: Six-Step Scheme Generation Wizard

**User Story:** As a teacher, I want a guided multi-step wizard to create a complete CBC scheme of work, so that I can produce a professional, KICD-aligned scheme without needing to know the curriculum structure by heart.

#### Acceptance Criteria

1. THE Scheme_Generator SHALL present a six-step wizard: (1) grade selection, (2) subject selection, (3) term selection, (4) strand and sub-strand selection, (5) teacher inputs, (6) preview
2. WHEN a teacher selects a grade in Step 1, THE Scheme_Generator SHALL update the available subjects in Step 2 to show only subjects valid for that grade as defined by the Curriculum_Data_Layer
3. WHEN a teacher selects a language subject in Step 2, THE Scheme_Generator SHALL present weekly distribution controls in Step 4 instead of term allocation controls
4. WHEN a teacher selects a non-language subject in Step 2, THE Scheme_Generator SHALL present term allocation controls in Step 4
5. WHEN a teacher selects Indigenous Language as the subject in Step 2, THE Scheme_Generator SHALL present a searchable list of all 38 supported indigenous languages before proceeding to Step 3
6. WHEN a teacher completes Step 5 (teacher inputs), THE Scheme_Generator SHALL collect: Key Inquiry Question (KIQ), specific learning outcomes, suggested learning experiences, learning resources, and assessment methods
7. WHEN a teacher reaches Step 6, THE Scheme_Generator SHALL display the Scheme_Preview populated with all collected inputs and AI-generated content
8. WHEN a teacher navigates backward in the wizard, THE Scheme_Generator SHALL preserve all previously entered data for that session
9. IF a teacher attempts to proceed from any step with required fields empty, THEN THE Scheme_Generator SHALL display a descriptive validation message and prevent navigation to the next step
10. THE Scheme_Generator SHALL be accessible from the Teacher Dashboard as the primary scheme creation entry point, replacing the existing placeholder `schemer-generator.tsx`

---

### Requirement 3: AI-Powered Scheme Generation via Backend

**User Story:** As a teacher, I want the AI to generate a complete, CBC-grounded scheme of work based on my inputs, so that I get a professional document without writing every cell manually.

#### Acceptance Criteria

1. WHEN a teacher submits scheme generation inputs, THE Scheme_Service SHALL generate a complete scheme by calling the configured AI model (GPT-4o) with a CBC-grounded prompt
2. THE Scheme_Service SHALL generate scheme content in either weekly mode (for language subjects) or term mode (for non-language subjects) based on the subject type
3. THE Scheme_Service SHALL enforce week numbering: all generated `SchemeRow` entries SHALL have sequential week numbers starting from 1, with no gaps and no duplicates within a subject-term combination
4. THE Scheme_Service SHALL enforce lesson numbering: all generated `SchemeRow` entries for a given week SHALL have sequential lesson numbers starting from 1
5. THE Scheme_Service SHALL sanitize all AI-generated field values: each field in a `SchemeRow` SHALL contain only printable characters, with a maximum length of 1000 characters per field
6. IF the AI model returns malformed or unparseable JSON, THEN THE Scheme_Service SHALL attempt JSON recovery using a structured fallback parser before returning an error
7. IF JSON recovery fails, THEN THE Scheme_Service SHALL return a descriptive error to the frontend without crashing the service
8. THE Scheme_Service SHALL complete scheme generation and return a response within 60 seconds for a standard term-length scheme (up to 13 weeks)
9. WHEN scheme generation completes, THE Scheme_Service SHALL return a complete array of `SchemeRow` objects covering all weeks and lessons for the selected term
10. THE Scheme_Generator frontend component SHALL call the SyncSenta Rust/Axum backend API for all AI generation — it SHALL NOT call Supabase edge functions

---

### Requirement 4: Scheme Guardrails

**User Story:** As a teacher, I want the generated scheme to always be structurally correct and CBC-compliant, so that I can trust the output without manually checking every row.

#### Acceptance Criteria

1. THE Scheme_Service SHALL validate that every `SchemeRow` in a generated scheme contains non-empty values for: `strand`, `subStrand`, `specificLearningOutcome`, `keyInquiryQuestion`, `learningExperiences`, `learningResources`, and `assessmentMethods`
2. THE Scheme_Service SHALL validate that `week` values in a generated scheme form a contiguous sequence starting at 1 with no missing weeks
3. THE Scheme_Service SHALL validate that `lesson` values within each week form a contiguous sequence starting at 1
4. IF any `SchemeRow` fails validation, THEN THE Scheme_Service SHALL replace the invalid field with a KICD-compliant placeholder derived from the strand and sub-strand data rather than returning an error to the teacher
5. THE Scheme_Service SHALL strip all HTML tags and control characters from AI-generated field values before returning them to the frontend
6. THE Scheme_Service SHALL ensure that the `strand` and `subStrand` values in every generated `SchemeRow` match the strand and sub-strand selected by the teacher in the wizard — AI generation SHALL NOT override the teacher's curriculum selection
7. FOR ALL valid `SchemeRow` arrays, the serialization of the array to JSON and deserialization back to `SchemeRow[]` SHALL produce an array equal to the original (round-trip property)

---

### Requirement 5: Scheme Preview and Export

**User Story:** As a teacher, I want to preview my completed scheme in a formatted table and export it as a DOCX or PDF, so that I can submit it to my school administration.

#### Acceptance Criteria

1. THE Scheme_Preview SHALL render the scheme as a table with the following CBC column headers in both English and Kiswahili: Week, Lesson, Strand/Mada, Sub-Strand/Mada Ndogo, Specific Learning Outcome/Matokeo Maalum, Key Inquiry Question/Swali Dadisi, Learning Experiences/Shughuli za Ujifunzaji, Learning Resources/Vifaa vya Kujifunzia, Assessment Methods/Tathmini, Reflection/Tafakari
2. WHEN a teacher clicks "Export DOCX", THE DOCX_Exporter SHALL produce a `.docx` file containing the complete scheme table with all CBC column headers and all `SchemeRow` data
3. WHEN a teacher clicks "Print / Export PDF", THE Scheme_Preview SHALL trigger the browser print dialog with the scheme table formatted for A4 paper
4. THE DOCX_Exporter SHALL include the teacher's name, school name, grade, subject, and term as a header section in the exported document
5. WHEN a teacher clicks "Generate Lesson Plan" on any row in the Scheme_Preview, THE Lesson_Plan_Dialog SHALL open and display a detailed per-lesson plan for that specific `SchemeRow`
6. THE Lesson_Plan_Dialog SHALL display: lesson objectives, introduction activity, main activity, closing activity, assessment strategy, and required resources — all grounded in the `SchemeRow`'s strand and sub-strand
7. IF the Lesson_Plan_Dialog content has not yet been generated for a given row, THEN THE Lesson_Plan_Dialog SHALL call the backend to generate it on demand and display a loading indicator while waiting

---

### Requirement 6: Scheme Library

**User Story:** As a teacher, I want to save my generated schemes and access them later, so that I can reuse, update, and build on my previous work across terms.

#### Acceptance Criteria

1. WHEN a teacher saves a scheme from the Scheme_Preview, THE Scheme_Service SHALL persist the scheme to PostgreSQL with the teacher's ID, grade, subject, term, curriculum reference, and the full `SchemeRow[]` array as a JSONB column
2. WHEN a scheme is saved, THE Scheme_Service SHALL upload the scheme JSON to IPFS and store the resulting CID in the database record
3. THE Scheme_Library SHALL display all schemes saved by the authenticated teacher, ordered by creation date descending
4. WHEN a teacher selects a saved scheme from the Scheme_Library, THE Scheme_Generator SHALL load that scheme's data and display it in the Scheme_Preview
5. WHEN a teacher selects a saved scheme and clicks "Edit", THE Scheme_Generator SHALL open the wizard pre-populated with that scheme's grade, subject, term, strand, and sub-strand selections
6. THE Scheme_Service SHALL support updating an existing scheme: WHEN a teacher saves changes to a previously saved scheme, THE Scheme_Service SHALL update the database record and upload a new IPFS version
7. THE Scheme_Library SHALL display the IPFS CID for each saved scheme as a verifiable content reference
8. IF a teacher attempts to save a scheme with an identical curriculum reference (same grade, subject, term, strand, sub-strand) as an existing saved scheme, THEN THE Scheme_Service SHALL prompt the teacher to confirm whether to overwrite or save as a new version

---

### Requirement 7: Student Scheme Visibility

**User Story:** As a student, I want to see the scheme of work my teacher has created for my class, so that I know what topics are coming up and can prepare accordingly.

#### Acceptance Criteria

1. WHEN an authenticated Student requests schemes for their class, THE Scheme_Service SHALL return all schemes saved by the teacher of that class for the current term, filtered by the student's grade level
2. THE Scheme_Service SHALL enforce that a Student can only retrieve schemes from teachers they are enrolled under — a Student SHALL NOT be able to retrieve schemes from teachers of other classes
3. WHEN a Student views a scheme, THE Scheme_Preview SHALL render the scheme in read-only mode with no edit, save, or export controls visible
4. THE Scheme_Service SHALL return scheme data to students within 2 seconds for a standard term scheme
5. WHEN a Headteacher requests schemes for their school, THE Scheme_Service SHALL return all schemes created by all teachers in that school, with teacher name and class information included

---

### Requirement 8: Mwalimu AI Scheme Context Integration

**User Story:** As a student, I want Mwalimu AI to know what topic my teacher is currently teaching, so that the AI tutor's explanations and examples are aligned with what I am learning in class.

#### Acceptance Criteria

1. WHEN a Student initiates a Mwalimu AI session, THE Mwalimu_AI SHALL query the Scheme_Service for the most recent active scheme for that student's class and current term
2. WHEN an active scheme is found, THE Mwalimu_AI SHALL inject the current week's `SchemeRow` data (strand, sub-strand, specific learning outcome, key inquiry question) into the system prompt as Scheme_Context
3. WHEN Scheme_Context is present, THE Mwalimu_AI SHALL ground all tutoring responses in the strand and sub-strand specified in the Scheme_Context
4. WHEN Scheme_Context is present, THE Mwalimu_AI SHALL use the key inquiry question from the Scheme_Context as a framing device for explanations when relevant
5. IF no active scheme is found for the student's class, THEN THE Mwalimu_AI SHALL operate without Scheme_Context and SHALL NOT surface an error to the student
6. THE Mwalimu_AI SHALL ensure that Scheme_Context from one student's session is never visible in another student's session — Scheme_Context is scoped to the individual session
7. FOR ALL valid Scheme_Context inputs, the Mwalimu AI system prompt SHALL contain the strand name, sub-strand name, and at least one learning outcome from the Scheme_Context (verifiable property)

---

### Requirement 9: Per-Lesson Lesson Plan Generation

**User Story:** As a teacher, I want to generate a detailed lesson plan for any individual lesson in my scheme, so that I have a ready-to-use teaching guide for each class session.

#### Acceptance Criteria

1. WHEN a teacher requests a lesson plan for a specific `SchemeRow`, THE Scheme_Service SHALL generate a detailed lesson plan containing: lesson title, duration, learning objectives, introduction activity (5–10 minutes), main activity (20–25 minutes), closing activity (5–10 minutes), assessment strategy, and required resources
2. THE Scheme_Service SHALL ensure the generated lesson plan's strand and sub-strand match the `strand` and `subStrand` fields of the source `SchemeRow`
3. THE Scheme_Service SHALL generate lesson plans using the same AI model and CBC-grounded prompting as scheme generation
4. WHEN a lesson plan is generated, THE Scheme_Service SHALL cache it against the `SchemeRow`'s week and lesson number so that subsequent requests for the same lesson return the cached version without re-calling the AI
5. WHEN a teacher requests a lesson plan for a row that already has a cached plan, THE Scheme_Service SHALL return the cached plan within 500 milliseconds
6. THE Lesson_Plan_Dialog SHALL allow the teacher to export the lesson plan as a DOCX file using the DOCX_Exporter

---

### Requirement 10: Blockchain Credential for Scheme Milestones

**User Story:** As a teacher, I want to receive a verifiable blockchain credential when I reach scheme creation milestones, so that my professional contribution to CBC curriculum delivery is permanently recorded.

#### Acceptance Criteria

1. WHEN a teacher saves their first scheme on the platform, THE Blockchain_Layer SHALL issue a "First Scheme Created" micro-credential to the teacher's wallet address
2. WHEN a teacher has saved schemes covering all subjects for a given grade and term, THE Blockchain_Layer SHALL issue a "Complete Term Coverage" micro-credential
3. THE Blockchain_Layer SHALL record the IPFS CID of the scheme as metadata in the issued credential, creating a verifiable link between the credential and the scheme content
4. WHEN a credential is issued, THE Scheme_Service SHALL notify the teacher via the in-app notification system within 30 seconds
5. IF the Blockchain_Layer is unavailable, THEN THE Scheme_Service SHALL queue the credential issuance for retry and SHALL NOT block the scheme save operation

---

### Requirement 12: Comprehensive Exam Generation and Auto-Marking

**User Story:** As a teacher, I want to generate comprehensive exams from my schemes and have them automatically marked, so that I can assess student understanding efficiently without manual grading overhead.

#### Acceptance Criteria

1. WHEN a teacher requests an exam from a saved scheme, THE Exam_Service SHALL generate a comprehensive exam containing multiple choice questions (MCQ), short answer questions, and long answer questions distributed across all strands and sub-strands in the scheme
2. THE Exam_Service SHALL generate exams with configurable question distribution: MCQ (40-60%), short answer (20-30%), long answer (10-20%) with total marks between 50-100
3. WHEN generating MCQ questions, THE Exam_Service SHALL create 4 plausible options with exactly one correct answer and store the correct answer index
4. WHEN generating short answer questions, THE Exam_Service SHALL provide expected answers and acceptable keyword lists for auto-marking
5. WHEN generating long answer questions, THE Exam_Service SHALL provide detailed marking rubrics with point allocation criteria
6. THE Exam_Runner SHALL present exams to students with a clean, distraction-free interface including timer, progress bar, and keyboard navigation support
7. WHEN a student submits an exam, THE Exam_Service SHALL auto-mark MCQ and short answer questions within 5 seconds and provide immediate feedback
8. THE Exam_Service SHALL generate detailed results showing: total score, strand-wise performance, weak areas identification, and personalized improvement recommendations
9. WHEN an exam is completed, THE Exam_Service SHALL store results in PostgreSQL with timestamp, student ID, teacher ID, scheme reference, and detailed question-by-question breakdown
10. THE Exam_Runner SHALL support exam retakes with question shuffling and provide "Practice Weak Areas" functionality that generates targeted mini-exams for improvement
11. THE Exam_Service SHALL generate printable exam papers (PDF) for offline administration with answer sheets and marking guides
12. WHEN a teacher views exam results, THE system SHALL provide class-wide analytics showing average scores, question difficulty analysis, and curriculum coverage gaps

---

### Requirement 13: Scheme Data Integrity and Type Safety

**User Story:** As a developer, I want all scheme data types to be strictly typed and validated end-to-end, so that data corruption is caught at compile time or at the API boundary rather than silently corrupting teacher documents.

#### Acceptance Criteria

1. THE Curriculum_Data_Layer SHALL export all types (`SchemeRow`, `ExamQuestion`, `SubStrandInfo`, `StrandInfo`) with no `any` types in TypeScript — all fields SHALL have explicit types
2. THE Scheme_Generator, Scheme_Preview, Lesson_Plan_Dialog, Exam_Runner, and DOCX_Exporter components SHALL use the canonical types from the Curriculum_Data_Layer — no component SHALL define its own local data types
3. THE Scheme_Service and Exam_Service backends SHALL validate all incoming requests against defined schemas before processing — invalid requests SHALL be rejected with HTTP 422 and descriptive error bodies
4. THE backend services SHALL validate all data before persisting to PostgreSQL — invalid data SHALL be rejected with descriptive errors
5. FOR ALL valid data objects, serialization to JSON and deserialization back SHALL produce objects equal to the original with no field loss or type coercion (round-trip property)
6. THE backend services SHALL use `sqlx::query!` macros for all database operations — no raw string queries are permitted
