# Student Content Readiness

**Last updated:** 2026-09-21

This document is the source of truth for what a student can currently do in SyncSenta. It distinguishes a complete learning path from a playable activity, a generated guided foundation, and a route that is not yet available.

## Route model

The student learning model has two intentional subject layouts:

| Subject family | Entry route | Learning interaction |
|---|---|---|
| Core CBC subjects | `/student/sandbox/{grade}/{subject}` | Grade-specific activity overview followed by sandbox activities |
| AI Literacy, Blockchain Literacy, Financial Literacy | `/student/subject/{slug}` | Omega-aware Socratic chat with track-specific prompts |

`/student/learn_by_making` is the unified subject catalog. Selecting a core subject opens its grade-specific sandbox overview. Selecting an extended course opens its chat-first subject page.

## Readiness labels

| Label | Meaning |
|---|---|
| **Canvas-ready** | The activity uses `InteractiveSandbox` with a supported manipulative such as tokens or fraction bars. |
| **Worksheet-ready** | The activity is playable through `GenericActivity`, with questions, choices, hints, feedback, scoring, and completion persistence. |
| **Chat-ready** | The subject has a working Socratic tutor route and Omega-aware scaffolding, but is not a canvas course. |
| **Guided fallback** | A short generated foundation activity exists while the full grade/subject catalogue is authored. It is playable but must not be described as a complete course. |
| **Catalog-only** | A subject card or overview exists, but it does not yet have enough reviewed activities for a complete pathway. |

## Grade 4 initial scope

Grade 4 is the first complete integration target. Every core subject is exposed in the unified subject catalog and routes to a Grade 4 sandbox overview.

| Grade 4 subject | Current route | Current readiness | Notes |
|---|---|---|---|
| Mathematics | `/student/sandbox/g4/mathematics` | Worksheet-ready | The catalogue is generated from Grade 4 Mathematics strands and sub-strands; canvas manipulatives remain to be authored. |
| English | `/student/sandbox/g4/english` | Worksheet-ready | Grade 4 English curriculum activities are merged with the legacy guided-foundation compatibility activity. |
| Kiswahili | `/student/sandbox/g4/kiswahili` | Worksheet-ready | The catalogue is generated from Grade 4 Kiswahili strands and sub-strands. |
| Environmental Activities | `/student/sandbox/g4/environmental` | Worksheet-ready | Uses the repository’s Grade 4 Science & Technology curriculum source under the existing Environmental Activities route. |
| Social Studies | `/student/sandbox/g4/social-studies` | Worksheet-ready | The catalogue is generated from Grade 4 Social Studies strands and sub-strands. |
| Creative Arts | `/student/sandbox/g4/creative` | Worksheet-ready | The catalogue is generated from Grade 4 Creative Arts strands and sub-strands. |
| Religious Education | `/student/sandbox/g4/cre` | Worksheet-ready | The catalogue is generated from the Grade 4 CRE curriculum source. |
| Indigenous Language | `/student/sandbox/g4/indigenous` | Worksheet-ready | The catalogue is generated from Grade 4 Indigenous Language curriculum strands; language-specific review remains required. |

Grade 4 now has a curriculum-backed worksheet catalogue for every core subject. The activities are deterministic, use the repository’s strand and sub-strand objectives, and are transparent about their guided practice format. They are not yet a full canvas course: direct-manipulation activities and richer subject-specific question banks still require authoring and review.

## All-grade curriculum coverage

The sandbox generator now consumes every available curriculum strand in the repository for Grades 1–9. It does not invent curriculum where the repository has no source; those grade/subject routes retain the safe guided fallback contract.

| CBC band | Curriculum-backed core coverage |
|---|---|
| Grades 1–3 | Mathematics, English Activities, Kiswahili, Environmental Activities, CRE, and Creative Activities |
| Grades 4–6 | Mathematics, English, Kiswahili, Science & Technology through Environmental Activities, Social Studies, CRE, Creative Arts, and Indigenous Language |
| Grades 7–9 | Mathematics, English, Integrated Science through Environmental Activities, and Social Studies |

Every generated activity uses the same stable `{grade}-{subject}-s{strand}-ss{sub-strand}` identifier and is resolved by the activity player. Where a subject is not listed for a grade band, the learner receives a labelled guided foundation instead of a broken or silently substituted route.

## Extended Grade 4 courses

| Course | Route | Current readiness |
|---|---|---|
| AI Literacy | `/student/subject/ai` | Chat-ready |
| Blockchain Literacy | `/student/subject/blockchain` | Chat-ready |
| Financial Literacy | `/student/subject/financial-literacy` | Chat-ready |

These courses remain chat-first by design. They should not be forced into the core draggable canvas model until there are reviewed, age-appropriate activity specifications for evidence, source verification, financial-safety boundaries, and teacher oversight.

## Existing authored sandbox content

The current repository contains explicit Grade 2 activity sets for Mathematics, English, Kiswahili, Environmental Activities, CRE, Creative Arts, and Indigenous Language. Grade 2 Mathematics, English, and Kiswahili also merge curriculum-generated question activities.

Only activities that declare a supported `manipulative` are rendered by `InteractiveSandbox`. Other activities remain fully playable through `GenericActivity` and should be labelled worksheet-ready rather than canvas-ready.

The initial canvas implementation supports:

- Counting-token activities.
- Fraction-bar activities when authored with the corresponding manipulative.
- Multiple variations and mastery thresholds.
- Hints, completion persistence, partial-progress resume, and learning telemetry.

## Content and routing invariants

1. Every activity returned by `getActivitiesForGradeSubject()` must be resolvable by `getActivityById()`.
2. A generated guided-foundation activity must never be presented as a full course.
3. Core subject cards must route to `/student/sandbox/{grade}/{subject}` before a learner chooses an activity.
4. Extended courses must remain chat-first unless a reviewed activity specification is added.
5. Unsupported subjects must show a matter-of-fact availability message rather than silently routing to another subject.
6. Activity persistence and teacher-visible evidence must remain on the existing submission and learning-session paths.

## Expansion plan

The next curriculum and interaction phase should proceed in this order:

1. Review and enrich the generated Grade 4 question banks with subject-specific distractors, explanations, and culturally grounded examples.
2. Add canvas manipulatives only where the learning objective benefits from direct manipulation.
3. Keep worksheet activities for reading, language, social studies, and concepts where multiple-choice or short-response interaction is clearer.
4. Add regression tests for every subject overview and every first recommended activity.
5. Review the all-grade generated catalogues with teachers before marking them complete.

A subject is not considered complete until its route, first recommended activity, activity-player lookup, progress persistence, and teacher-visible evidence are all tested together.

## Related contracts

- `studio/src/lib/sandbox/sandbox-activities.ts` — activity registry and guided fallback generation.
- `studio/src/lib/sandbox-preparation.ts` — subject and grade route preparation.
- `studio/src/app/student/learn_by_making/page.tsx` — unified subject catalog.
- `studio/src/app/student/sandbox/[grade]/[subject]/page.tsx` — activity overview.
- `studio/src/app/student/sandbox/[grade]/[subject]/[activityId]/page.tsx` — activity player.
- `studio/src/lib/chat/subject-session.ts` — chat/sandbox subject registry.
- `studio/src/components/student/interactive-sandbox.tsx` — canvas interaction.
- `studio/src/components/sandbox/activities/GenericActivity.tsx` — worksheet interaction.

The document follows the repository’s skill-first and TDD workflow: readiness claims must be backed by route tests, activity-resolution tests, and production-build verification.
