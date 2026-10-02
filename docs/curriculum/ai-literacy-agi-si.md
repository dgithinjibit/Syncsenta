# AI Literacy, AGI, and SI

**Status:** AI Literacy has authored Grade 6–12 data exposed to the teacher registry. The separate AGI/Superintelligence outline is present in source but no Studio consumer was found. Neither fact alone proves official completeness or deployment.

## AI Literacy Curriculum

`studio/src/data/curriculum/senior-school/ai.ts` defines distinct packs for Grades 6–12. `getSubjectsForGrade()` exposes AI Literacy for Grade 6, Grades 7–9, and Grades 10–12; `getHardcodedStrands()` selects the corresponding grade export.

- The source organizes content into five strand families: foundations, data/representation, techniques/programming, system design/projects, and ethics/society/policy.
- Grade 6 has a 66-lesson introductory design. Its sub-strands pass through `completeGrade6Pack()`, adding prerequisites, misconceptions, assessment evidence, and safety notes.
- A registry test flags Grade 7's schedule as requiring extension; do not describe the nominal annual allocation as fitting until that is resolved.
- Grade 8 is a substantial authored pack and the source for `studio/public/omega/ai_g8_design.metta`. A generator and tests lock that pack to its TypeScript source and preserve source-line provenance for the scheme checker.
- Grades 9–12 have distinct exports. Their existence and selector wiring do not establish external teacher validation.

## OmegaClaw Scope Is Separate

The teacher AI registry includes Grades 7–9, but the OmegaClaw student-learning MeTTa pack scopes its AI/blockchain pathway to a Grade 6 introduction and Senior School Grades 10–12. Junior School AI strand packs and OmegaClaw challenge progression are separate code surfaces. Do not claim that OmegaClaw MeTTa governs every Grade 7–9 AI lesson.

The Grade 8 AI scheme checker is another separate path: `ai_g8_design.metta` contains curriculum facts, `scheme_check.metta` contains hand-authored checking policy, and the browser/CLI uses a TypeScript subset derivation engine. This is not the Rust Hyperon runtime.

## AGI and Superintelligence (SI)

`studio/src/data/curriculum/superintelligence/index.ts` defines outline modules for Grades 4–9. A search of Studio source found no import or call site outside that module, so **the module is present but not wired into a learner or teacher curriculum route**. Treat it as dormant source material, not a delivered AGI/SI course.

The active `agi` learning track in `studio/src/lib/learning-track-policy.ts` supplies generic prompt focus and safety guidance. It describes AGI as hypothetical and not a current capability or evidence of consciousness; this prompt policy does not consume the separate Superintelligence module outline.

## Gaps and Next Review

1. Decide whether the product offers AI Literacy only or also a distinct AGI/SI course; keep their scopes explicit.
2. If AGI/SI is intended for learners, wire the outline to a route and test which grade/module reaches the prompt. Otherwise label it as a proposal or archive it to prevent false claims.
3. Reconcile Junior School AI pack exposure with OmegaClaw's Grade 6/Senior School rule scope before describing one coherent Omega curriculum.
4. Resolve Grade 7's schedule extension and compare active grade packs with approved sources and teacher review.
5. Keep the Grade 8 design-pack provenance test, scheme-policy tests, and activity-safety tests as separate gates; they prove different things.

## Evidence Paths

- `studio/src/data/curriculum/senior-school/ai.ts`
- `studio/src/data/curriculum/superintelligence/index.ts`
- `studio/src/data/curriculum/index.ts`
- `studio/src/data/curriculum/index.test.ts`
- `studio/src/lib/__tests__/ai-design-pack.test.ts`
- `studio/src/curriculum/omega-claw-ai-blockchain.ts`
- `studio/src/lib/learning-track-policy.ts`
- `backend/syncsenta-backend/data/omega_claw_rules.metta`