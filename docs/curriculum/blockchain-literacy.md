# Blockchain Literacy

**Status:** structured packs are exposed through the teacher registry. Grade 6 has the strongest completion/safety metadata; the code does not establish a fully KICD-validated course for every grade.

## Authored Data and Wiring

`studio/src/data/curriculum/blockchain.ts` exports packs for Grades 6–12 and `blockchainStrandsByGrade` maps them for `getHardcodedStrands()`. The teacher selector exposes Blockchain Literacy in Grade 6, Grades 7–9, and Grades 10–12. The subject-chat policy in `studio/src/lib/learning-track-policy.ts` supplies a separate Socratic focus and safety block; it is not the same thing as the strand curriculum.

| Grades | Pack implementation | Current distinction |
|---|---|---|
| 6 | Five authored strands passed through `completeGrade6Pack()` | Every sub-strand gains prerequisites, misconceptions, assessment evidence, and safety notes. Tests enforce these fields and fictional/offline safety. |
| 7–9 | `juniorStrands(grade)` | The grade argument does not alter returned content; the three exports share one junior template. |
| 10–12 | `seniorStrands(grade)` | The grade argument does not alter returned content; the three exports share one senior template. |

## Runtime Boundaries

- Blockchain Literacy chat is a subject learning track with safety and Socratic prompt guidance.
- OmegaClaw’s MeTTa rules are a separate decision pack for scope, activity families, hints, progression, and blocked topics. Its scope is Grade 6 introductory and Senior School deep content; it is not the full Blockchain Literacy strand pack.
- The Grade 6 metadata contract should not be assumed to apply to the Junior/Senior templates; `completeGrade6Pack()` wraps Grade 6 only.

## Gaps and Next Review

1. Decide the intended outcomes for Grades 7, 8, and 9 and each Senior School grade; replace shared templates with grade-specific progressions where evidence supports it.
2. Compare packs with an approved curriculum source and record source/version and teacher review. Current tests establish internal shape and safety fields, not official completeness.
3. Add tests preventing grade exports from silently sharing content when distinct progression is required.
4. Keep wallets, tokens, trading, private keys, real transactions, and real personal data out of learner activities; test safeguards at prompt and API boundaries.

## Evidence Paths

- `studio/src/data/curriculum/blockchain.ts`
- `studio/src/data/curriculum/grade6-metadata.ts`
- `studio/src/data/curriculum/index.ts`
- `studio/src/data/curriculum/index.test.ts`
- `studio/src/lib/learning-track-policy.ts`
- `backend/syncsenta-backend/data/omega_claw_rules.metta`