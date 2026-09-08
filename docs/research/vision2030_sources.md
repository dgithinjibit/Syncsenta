# SyncSenta research notes

## Kenya Vision 2030 official source

The official Kenya Vision 2030 site states that the vision aims to transform Kenya into a newly industrializing, middle-income country providing a high quality of life to all citizens by 2030 in a clean and secure environment.

Source: [Kenya Vision 2030](https://vision2030.go.ke/)

Initial product implication: SyncSenta should frame educational intelligence as an enabling layer for quality of life, skills, equitable access, and secure participation, not merely as a chatbot feature. The official site exposes economic, social, political, and foundation/enabler pillars, so future routing and telemetry should preserve the ability to map outcomes to pillar-aligned goals without hard-coding a single narrow objective.

## Kenya Vision 2030 Social Pillar

The official Social Pillar page frames the goal as a just and cohesive society with equitable social development in a clean and secure environment. It names Education & Training among the key social sectors and explicitly provides for people with disabilities and previously marginalized communities.

Source: [Social Pillar](https://vision2030.go.ke/social-pillar/)

Initial product implication: every agent route should carry inclusion and accessibility context, and the main agent should treat disability, marginalization, language, connectivity, and safeguarding as first-class constraints rather than optional personalization.

## Education and Training sector inventory

The official Education and Training sector page lists policy/legal/institutional reform, education in arid and semi-arid lands, TVET infrastructure and equipment, artisan training, EMIS centres, a laptop programme, and other education programmes.

Source: [Education and Training | Sector](https://vision2030.go.ke/sectors/education_and_training/)

Initial product implication: the main agent should support grade/subject/competency context, teacher and learner workflows, TVET/skills pathways, arid and semi-arid connectivity assumptions, and structured analytics/export rather than treating all interactions as free-form chat.

## ICT development project

The official ICT development project page says ICT education and training should address institutional ICT policies and strategic plans and strengthen ICT human capacity. It describes scaling an e-school programme, increasing institutions with ICT resources for effective delivery of education content in the digital and knowledge economy, and providing assistive technology for special-needs education. Its stated impact is improved teaching and learning and networked campuses.

Source: [Information Communication and Technology (ICT) Development](https://vision2030.go.ke/project/information-communication-and-technology-ict-development/)

Initial product implication: the new core needs an explicit offline/low-bandwidth mode, capability-aware routing, assistive/accessibility metadata, and audit-friendly outcomes for institutional ICT programmes.

## Child-centred AI and generative-AI risk

UNICEF’s current Guidance on AI and children highlights five directly relevant requirements: safety; protection of children’s data and privacy; non-discrimination and fairness; transparency, explainability, and accountability; and support for children’s best interests, development, and well-being.

Source: [UNICEF Guidance on AI and children, version 3.0](https://www.unicef.org/innocenti/reports/policy-guidance-ai-children)

Initial product implication: Syncsenta’s main agent should expose a decision trace, apply child-safety and privacy policy before specialist routing, and fail closed to a teacher/guardian review path when age, consent, or risk context is insufficient.

NIST publishes the Generative AI Profile as a companion to AI RMF 1.0 and provides an authoritative risk-management reference for generative-AI systems.

Source: [NIST AI RMF: Generative Artificial Intelligence Profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence)

Initial product implication: route selection and synthesis should be observable and testable; external knowledge should be provenance-tagged; prompt injection, data leakage, hallucination, bias, and unsafe outputs should be explicit failure modes rather than implicit assumptions.

## Kenya ODPC guidance inventory

The Office of the Data Protection Commissioner’s official guidelines index lists dedicated guidance notes for processing children’s data, the education sector, biometric data, consent, data-protection impact assessments, data sharing, and data-protection officers.

Source: [ODPC Guidelines](https://www.odpc.go.ke/guidelines-2/)

Relevant linked documents include [Guidance Notes for Processing Children’s Data](https://www.odpc.go.ke/wp-content/uploads/2025/11/ODPC-–-Guidance-Note-for-Processing-Childrens-Data.pdf), [Guidance Note for the Education Sector](https://www.odpc.go.ke/wp-content/uploads/2024/02/ODPC-Guidance-Note-for-the-Education-Sector.pdf), [Guidance Notes on Biometric Data](https://www.odpc.go.ke/wp-content/uploads/2025/11/ODPC-–-Guidance-Note-on-Biometric-Data.pdf), and [Guidance Note on Consent](https://www.odpc.go.ke/wp-content/uploads/2025/09/Guidance-note-on-Consent.pdf).

Initial product implication: the Rust core should not store raw learner identifiers in decision traces by default; it should model consent, data minimization, retention, sharing scope, and human-review escalation as explicit request constraints. Biometric or attendance data must not be silently routed into educational personalization.

## Rust/MeTTa runtime reference

The official Hyperon experimental repository describes MeTTa as an active pre-alpha language/runtime implemented around a Rust workspace with Python and C interfaces. Its documented build path requires stable Rust and native build tooling, and it recommends `cargo test` for the Rust implementation.

Source: [trueagi-io/hyperon-experimental](https://github.com/trueagi-io/hyperon-experimental)

Initial product implication: the Syncsenta core should isolate the MeTTa boundary behind a stable Rust trait, keep a deterministic pure-Rust fallback for CI/offline operation, and avoid making core safety depend on a native Hyperon installation being present.

## MoE routing reference

The public ml-rust/oxidizr MoE guide describes routing from a request/token through a router to a top-k subset of specialized experts, with a shared expert as a baseline and load-balancing concerns to prevent expert collapse. It also cautions that MoE overhead may not be worthwhile for small or latency-critical tasks.

Source: [oxidizr MoE Guide](https://github.com/ml-rust/oxidizr/blob/main/docs/architecture/moe.md)

Initial product implication: Syncsenta should use a lightweight deterministic top-k expert planner with an always-available shared safety/grounding expert, cap fan-out, and fall back to one safe expert for simple or low-connectivity requests. This is an orchestration MoE, not a claim that the repository implements neural MoE training.

## Accessibility and inclusive interaction

W3C’s WCAG 2.2 is a Recommendation intended to make web content more accessible across disabilities and devices, and its success criteria are written as testable, technology-independent statements. The standard is organized around perceivable, operable, understandable, and robust concerns, including text alternatives, keyboard access, adaptable content, readable presentation, input assistance, and compatibility with assistive technologies.

Source: [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/)

Initial product implication: accessibility should be represented in the request contract (for example, preferred modality, language, reading support, captioning, and assistive-device needs) and preserved through routing and synthesis. The agent must not assume a visual-only or high-bandwidth interaction.

## UNESCO human-centred and age-appropriate GenAI guidance

UNESCO describes a humanistic, human-centred approach for generative AI in education, including data-privacy protection, age limits for independent conversations with GenAI platforms, and age-appropriate ethical validation and pedagogical design.

Source: [Guidance for generative AI in education and research](https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research)

Initial product implication: independent learner conversations need age/consent policy checks and a teacher/guardian escalation route; high-risk requests should not be silently answered by an autonomous expert.

## Repository-derived design evidence

Project Nzi’s README and `rust-core/src/supervise.rs` establish a two-rate architecture: a fast deterministic loop and a slower symbolic brain. Nzi’s supervisor pattern is proposal → verification gate → approved update, with the last known-safe decision held on rejection, empty output, or parsing failure. Its limitations register names execution latency, five structured hallucination types (reasoning, execution, perception, memorization, communication), latency mismatch, edge resource limits, data scarcity, and coordination as first-class failure modes.

Local references: `../Project-Nzi/README.md`, `../Project-Nzi/rust-core/src/supervise.rs`, `../Project-Nzi/limitations-edge-cases/README.md`.

The cloned `syncsenta-studio` repository has the most mature Rust/MeTTa seam: an optional Hyperon backend, a pure-Rust fallback interpreter, per-session atomspaces, and a larger service orchestrator. Its existing `metta_rules.metta` also shows CBC-specific vocabulary and translation-context rules, but its broader backend still contains simulated/placeholder execution paths. The minimal `Syncsenta_local` repository contains only a small Rust inference/storage prototype.

Local references: `../syncsenta-studio/backend/syncsenta-backend/src/metta_core/interpreter.rs`, `../syncsenta-studio/backend/syncsenta-backend/src/metta_core/orchestrator.rs`, `../syncsenta-studio/backend/syncsenta-backend/data/metta_rules.metta`.

The user’s `schemer` repository is an AI Studio TypeScript scaffold, not a Rust/MeTTa implementation. Its stable domain types are useful as a conceptual schema reference: user role, school/county, grade, learning area, term, strand, sub-strand, learning outcomes, inquiry questions, and generated content. Public GitHub/web searches did not identify a distinct v0-owned “schemer” repository; the local `schemer` repository is therefore treated as the intended design reference but not copied as code.

Local reference: `../schemer/src/types/index.ts` and `https://github.com/dgithinjibit/schemer`.
