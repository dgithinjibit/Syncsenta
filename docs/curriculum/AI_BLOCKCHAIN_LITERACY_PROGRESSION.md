# AI and Blockchain Literacy Progression

**Curriculum version:** `2026-09-22.grade6.lovable-import.v1`

SyncSenta now carries the Grade 6 AI literacy pack generated in the Lovable `scheme-scribe-ai` repository on 22 September 2026. The pack is registered in the runtime curriculum registry and remains compatible with the existing Omega-aware synthesis-tutor flow. It does not create a second tutor, a new policy engine, or a crypto workflow.

## Grade 6 entry point

Grade 6 is an introductory, teacher-mediated course with two lessons per week. It introduces intelligence, artificial intelligence in Kenyan daily life, simple data collection and grouping, step-by-step instructions, learning by examples, talking machines, classroom problem-solving, honesty, privacy, and future work. The learning experiences are deliberately unplugged or demonstrative: sorting cards, role-play, posters, class data tables, and supervised examples. Programming, model building, wallets, tokens, seed phrases, real transactions, and unsupervised external AI use are out of scope.

The 66 lessons across 14 sub-strands are organised into five strands:

| Strand | Grade 6 purpose |
|---|---|
| Foundations of Intelligence | Distinguish intelligent behaviour and explain AI in simple language. |
| Data and Representation | Collect, sort, group, and value accurate data. |
| AI Techniques and Programming | Understand instructions, examples, and conversational machines without requiring code. |
| AI System Design and Projects | Identify a local problem and present a simple supervised idea. |
| Ethics, Society and AI Policy | Practise safety, honesty, privacy, and responsible discussion of work. |

## Hardening by grade band

The track should become more rigorous as learners progress, while retaining the same session contract, consent gates, safety checks, evidence prompts, and teacher escalation route.

| Grade band | AI literacy | Blockchain literacy | Required safeguards |
|---|---|---|---|
| Grade 6 | Recognise AI, compare outputs with observation or a teacher-approved source, and use tools safely. | Paper shared-ledger simulation and comparison with an ordinary database. | Teacher mediation; synthetic data; no external actions; no wallets, tokens, seed phrases, or real transactions. |
| Grades 7–9 | Reason about data, models, bias, evidence, uncertainty, and low-risk supervised prototypes. | Hashes, keys, signatures, consensus, governance, privacy, energy, and when a normal database is better. | Source checking; fictional or synthetic cases; no crypto trading, real wallets, financial advice, or public personal records. |
| Grades 10–12 | Evaluate system behaviour, societal trade-offs, policy, and defensible research projects. | Security, privacy, endpoint failure, energy, governance, and comparative system design. | No real money; no identity data on public ledgers; no autonomous high-stakes decisions. |

## Product contract

All three literacy tracks—AI, blockchain, and financial literacy—must use the existing tutor loop: orient, elicit, Socratize, scaffold through Omega, verify, transfer, and close with reflection. Rust remains the explainable policy source of truth. Curriculum content supplies objectives, examples, misconceptions, evidence requirements, and age-band constraints; it must not override consent, child-safety, privacy, or external-action policy.

For AI, the course must distinguish present-day human-made pattern-generating systems from hypothetical AGI. AGI is not presented as a current capability, guaranteed outcome, or build target. For blockchain, the course teaches record-keeping and system trade-offs, not cryptocurrency participation. Learners must never be asked to provide identity data, passwords, PINs, one-time codes, seed phrases, exact locations, or private financial information.

## Source and integration note

The Grade 6 lesson content was ported from `dgithinjibit/scheme-scribe-ai` commit `0fc55c8f` (`Revised curriculum for Grade 6`, Lovable edit ID `edt-d21ac8f5-1723-4600-8940-0552ab43fac4`). The canonical runtime copy is `ai-agents/src/syncsenta_agents/curriculum/ai_literacy.py`; its registry key is `Grade 6|AI`. The import is additive and does not replace existing CBC subject packs.
