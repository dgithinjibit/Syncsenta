# Curriculum Status Inventory

This is the project-level index for curriculum coverage in code. It separates Traditional CBC subjects, Blockchain Literacy, and AI Literacy / AGI / SI. It distinguishes source files from active product paths and tested behavior.

**A passing test does not prove completeness against the current KICD curriculum or teacher review.** No track should be called fully complete without source comparison and qualified subject review.

## Status Vocabulary

- **Authored data:** structured grade/subject strands or modules exist in source.
- **Learner path:** the student sandbox or chat route consumes the data/policy.
- **Teacher path:** the teacher selector/generator exposes the grade/subject and carries its data into the request.
- **Contract-tested:** tests pin the relevant shape, mapping, or route behavior.
- **Curriculum-validated:** compared with an approved, current source and reviewed by a qualified Kenyan curriculum/subject teacher. Code presence alone cannot establish this.

## Tracks

| Track | Current code picture | Evidence |
|---|---|---|
| [Traditional CBC subjects](traditional-subjects.md) | The learner sandbox has tested curriculum-backed activity mappings for a defined Grades 1–9 subset. The teacher resolver is narrower and uses generic foundations for missing combinations. | `studio/src/lib/sandbox/sandbox-activities.ts`, `studio/src/lib/__tests__/sandbox-coverage.test.ts`, `studio/src/data/curriculum/index.ts` |
| [Blockchain Literacy](blockchain-literacy.md) | Grade 6 has the strongest completion/safety metadata. Grades 7–9 share one junior template; Grades 10–12 share one senior template. | `studio/src/data/curriculum/blockchain.ts`, `studio/src/data/curriculum/grade6-metadata.ts`, `studio/src/data/curriculum/index.test.ts` |
| [AI Literacy, AGI, and SI](ai-literacy-agi-si.md) | AI Literacy has authored Grade 6–12 packs and a locked Grade 8 design pack. A separate Grades 4–9 Superintelligence module is present but no Studio consumer was found. | `studio/src/data/curriculum/senior-school/ai.ts`, `studio/src/lib/__tests__/ai-design-pack.test.ts`, `studio/src/data/curriculum/superintelligence/index.ts` |

## Important Distinction

The student sandbox uses `studio/src/lib/sandbox/sandbox-activities.ts` and `studio/src/lib/curriculum/curriculum-activities-mapper.ts`; the teacher generator uses `studio/src/data/curriculum/index.ts`; subject chat uses `studio/src/lib/learning-track-policy.ts` and its caller pipeline. A data file in one surface does not automatically make the same curriculum available in the others.

When updating a track, record its source/version, grade/subject scope, active consumer, test command, and gaps on its page. Keep **implemented**, **tested**, **teacher-reviewed**, and **deployed** as separate claims.