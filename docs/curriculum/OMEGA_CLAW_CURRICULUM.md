# Omega Claw Curriculum Documentation

## Scope at a glance

Omega Claw uses a staged pathway:

| Learner stage | Scope | Allowed depth |
|---|---|---|
| PP1–Grade 5 | No Omega Claw AI/blockchain pathway | Use the learner's normal CBC content |
| Grade 6 | Introduction only | Concepts, examples, safety, privacy, fairness, shared records, and teacher-guided activities |
| Grades 10–12 | Senior School depth | Data, algorithms, evaluation, cybersecurity, governance, distributed systems, supervised practical work, and capstone projects |

The curriculum adapts principles from Suzuki-inspired nurturing and listening, Kumon-inspired diagnostic and mastery progression, Universal Design for Learning, and project-based inquiry. It is not an official Suzuki, Kumon, UDL, or PBL programme.

## Grade 6: First Steps in AI and Blockchain

The Grade 6 course runs for eight weeks and introduces learners to decision-making, AI patterns and outputs, fairness, privacy, misinformation, shared records, blockchain, human-centred technology, and a small community showcase. Learners do not code, trade, invest, manage wallets, deploy public systems, or share personal data.

The Grade 6 lesson routine is: welcome and listen; notice and imitate; small-step practice; choice and connection; reflect and preview. Assessment asks learners to explain concepts in their own words, identify a limitation or risk, and propose a safe human-reviewed use.

## Senior School: Applied AI and Blockchain Systems

The Senior School course is implemented across Grades 10–12.

### Grade 10: Foundations and responsible experimentation

Learners study data, features, labels, algorithms, models, training, validation, inference, and bias. They may use spreadsheets or beginner-friendly code with synthetic datasets. They compare rule-based automation with pattern recognition and study hashes, linked blocks, keys, verification, privacy, consent, and digital identity.

Expected products include a documented classification experiment with an error table and fairness reflection, plus a paper or local simulation showing linked records and tamper detection.

### Grade 11: Applied systems, security, and critical evaluation

Learners study supervised, unsupervised, and reinforcement-learning concepts; data preparation; feature design; train/test separation; accuracy; precision; recall; confusion matrices; explainability; robustness; distributed systems; consensus; permissioned and public networks; smart-contract concepts; threat modelling; cybersecurity; governance; accessibility; and social impact.

Expected products include an auditable model comparison using synthetic data and a permissioned-ledger design with roles, access rules, failure cases, risks, and a non-blockchain alternative.

### Grade 12: Integration, research, and supervised capstone

Learners translate a bounded community problem into requirements, success measures, ethical constraints, and a system design. They build or simulate a prototype in an approved sandbox, validate technical and human outcomes, document limitations and uncertainty, and present findings to technical and non-technical audiences.

The capstone portfolio must contain requirements, data or ledger design, prototype or simulation, tests, risk register, user feedback, reflection, and an ethics statement. The simplest safe solution is preferred; a project may conclude that AI, blockchain, or neither is appropriate.

## Senior School safety boundaries

Senior School depth does not remove supervision. Student work must not involve real-money trading, token sales, wallet custody, financial promotion, unsupervised public deployment, real learner records, credential collection, or attacks on real systems. Datasets must be synthetic, public-domain, anonymised, or teacher-created. Every practical system must document purpose, users, risks, limitations, test evidence, and a stop or rollback procedure.

## Source files

- Curriculum implementation: [`studio/src/curriculum/omega-claw-ai-blockchain.ts`](../../studio/src/curriculum/omega-claw-ai-blockchain.ts)
- Agent routing and guardrails: [`studio/src/ai/flows/cbc-curriculum-agent.ts`](../../studio/src/ai/flows/cbc-curriculum-agent.ts)
- Product roadmap: [`docs/ROADMAP.md`](../ROADMAP.md)
- Learning-method research: [`docs/research/omega-claw-learning-methods.md`](../research/omega-claw-learning-methods.md)
