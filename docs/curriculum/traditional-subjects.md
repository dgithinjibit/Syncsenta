# Traditional CBC Subjects

**Status:** mixed coverage. No claim of a complete KICD curriculum across all grades.

## Learner Sandbox

`getActivitiesForGradeSubject()` combines hand-authored activities with curriculum-derived activities and creates a named guided-foundation activity when neither exists. `studio/src/lib/__tests__/sandbox-coverage.test.ts` pins these curriculum-backed mappings:

| Grades | Subjects checked |
|---|---|
| 1–3 | Mathematics, English, Kiswahili, Environmental Activities, CRE, Creative Activities |
| 4–6 | Mathematics, English, Kiswahili, Environmental Activities, Social Studies, CRE, Creative Arts, Indigenous Language |
| 7–9 | Mathematics, English, Environmental Activities (Integrated Science route), Social Studies |

The test checks generated activity IDs and that the activity player resolves them. It does **not** verify every official strand, outcome, assessment standard, or teacher review. Grade 2 also has a more substantial hand-authored activity registry. Canvas readiness is narrower: only activities with a supported manipulative use the interactive canvas; others use the worksheet player.

## Teacher Curriculum Selector

`studio/src/data/curriculum/index.ts` is a separate, narrower registry:

| Grade band | Selector subjects | Limitation |
|---|---|---|
| 1–3 | English/Kiswahili language activities, mathematical/environmental/creative activities, religious education, indigenous language | Strand resolution is authored for selected combinations; missing data may fall through to generic foundations. |
| 4–6 | English, Kiswahili, Mathematics, Agriculture, Science and Technology, Social Studies, Creative Arts, Indigenous Language; Grade 6 adds AI and Blockchain | Some explicit packs exist; other paths use simplified generic strands. |
| 7–9 | AI Literacy, Blockchain Literacy, Computer Science, English | Several traditional subjects available in the learner sandbox are not exposed here. |
| 10–12 | AI Literacy, Blockchain Literacy, Computer Science, English | This is not a full Senior School CBC subject catalogue. |

The teacher resolver has explicit Kiswahili strands for Grades 1–4 and no Grade 7–9 Kiswahili module. Grade 5/6 Kiswahili files exist, but `getHardcodedStrands()` does not select them for those grades. A generic fallback keeps a route playable; it is not curriculum evidence.

## Readiness and Next Review

- **Verified in code:** sandbox coverage tests exercise the grade/subject combinations above and assert generated activity IDs resolve.
- **Not established:** full current KICD coverage, teacher approval, assessment validity, or deployment readiness.
- **Next:** select one grade/subject, record the approved curriculum source/version, compare every strand/sub-strand/outcome, then verify that the reviewed data flows through both teacher and learner routes.

## Evidence Paths

- `studio/src/lib/__tests__/sandbox-coverage.test.ts`
- `studio/src/lib/sandbox/sandbox-activities.ts`
- `studio/src/lib/curriculum/curriculum-activities-mapper.ts`
- `studio/src/data/curriculum/index.ts`
- `studio/src/data/curriculum/`
- `studio/src/curriculum/`