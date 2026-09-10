# Hyperon Dependent-Project Review

*Prepared: September 8, 2026*

## Purpose

The [Hyperon experimental dependent-project list](https://github.com/trueagi-io/hyperon-experimental/network/dependents?dependents_before=NDU4NjQxODYyNzk) contains more than one hundred repositories, including **dgithinjibit/Syncsenta**. This review samples representative projects to identify implementation patterns that can improve the Omega agent without mistaking experimental MeTTa integrations for production guarantees.

## Executive conclusion

Across the reviewed projects, Hyperon is consistently used as an embedded or invoked symbolic reasoning component. Python, FastAPI, uAgents, or a CLI owns orchestration and infrastructure, while MeTTa owns facts, rules, matching, or symbolic evaluation. The strongest reusable pattern is therefore a **narrow, versioned runtime adapter** with typed inputs and outputs.

The reviewed projects do **not** establish that Hyperon itself supplies durable state, authorization, audit trails, isolation, reliable fallback, or operational resilience. Syncsenta must implement those controls around the runtime. Omega should keep its deterministic safety and tutoring decisions authoritative, use MeTTa for constrained symbolic evaluation, and treat model output as an untrusted proposal.

## Representative projects

| Project | Useful pattern | Limitation to avoid | Implication for Omega |
|---|---|---|---|
| [innovation-lab-examples](https://github.com/yantanyako/innovation-lab-examples) | In-process `MeTTa`, Python-seeded atoms, retrieval through a small RAG boundary, and a separate OpenClaw example with allowlists, quotas, plan-size limits, path sandboxing, and deterministic fallback. | MeTTa state is process-local and the example lacks durable policy state and adjacent automated tests. | Keep MeTTa behind an adapter; copy the explicit policy and fallback controls, not the in-memory state model. |
| [conceptBlending](https://github.com/iCog-Labs-Dev/conceptBlending) | MeTTa-centered orchestration with Python grounded operations; LLM proposals are followed by deterministic colimit/pushout computation and metrics. | Module-specific Hyperon pins differ and persistence is append-only local files. | Separate probabilistic proposal from deterministic validation and pin one tested runtime per deployable service. |
| [das-toolbox](https://github.com/singnet/das-toolbox) | Explicit container/service boundary, syntax validation before MeTTa loading, readiness checks, database-backed operations, and integration-test targets. | It is a tooling boundary rather than a policy evaluator and has no general alternate interpreter. | Add health/readiness checks and separate validation from evaluation; do not equate loading MeTTa with authorization. |
| [hyperon-openpsi](https://github.com/iCog-Labs-Dev/hyperon-openpsi) | Structured AtomSpaces, goals, truth values, Python/MeTTa separation, and validation of LLM-selected rule identifiers. | Process-local or file-backed state, weak test-result contracts, and no demonstrated timeout, rollback, or safe policy fallback. | Validate every candidate against immutable IDs and enforce bounded execution and recovery semantics. |
| [MeTTaProject](https://github.com/hermelawesene/MeTTaProject) | Minimal embedded Hyperon knowledge base with explicit fact-membership filtering. | Duplicated CLI/UI orchestration, no CI or durable state, and process-terminating failure paths. | Expose one Omega orchestration layer and fail safely instead of terminating or silently accepting invalid state. |

## Current Syncsenta boundary

Syncsenta already has two distinct AI paths. The TypeScript `evaluateTutoringDecision()` function is the active production tutoring policy used by `/api/chat`. The Python `HyperonPolicyEvaluator` is the policy adapter used by the AI-agent telemetry path, with a pure-Python fallback when Hyperon cannot initialize. The Rust runtime is the enforcement-oriented source of truth for structured verdicts and tutoring parity, but the Rust adaptive service is not yet deployed in production.

This means the current system should be described as **Omega tutoring active, Hyperon policy integration active for selected Python-agent flows, and full MeTTa-native tutoring orchestration not yet production-wired**. The documentation must not claim that the unused TypeScript knowledge graph or demo UI components are production MeTTa infrastructure.

## Prioritized hardening plan

### P0 — Runtime and policy contract

Omega needs a single typed Hyperon adapter contract covering supported Hyperon version, query/result shapes, policy version, state lifetime, allowed grounded operations, and failure classes. Raw MeTTa query construction should remain inside the adapter. Policy errors must fail closed before tool or state-changing actions.

### P0 — Durable state and operational boundaries

Evaluator working memory must be separated from durable knowledge, session metadata, and audit records. The durable layer needs versioning, migrations, idempotent writes, tenant/session isolation, concurrency control, snapshots or replay, and restart recovery. Hyperon calls need health/readiness checks, timeouts, cancellation, bounded concurrency, and resource limits.

### P1 — Safe fallback ladder

The documented fallback order should be: primary provider or planner; constrained deterministic rule/template path; then safe refusal, clarification, or read-only behavior. Provider failure, malformed output, policy timeout, evaluator outage, and missing knowledge should remain distinguishable. A fallback must never bypass policy or execute stale, unvalidated model output.

### P1 — Verification and observability

Required assurance includes adapter contract tests, allow/deny golden cases, malformed query/result tests, policy invariant tests, timeout and cancellation tests, persistence/restart/replay tests, and local plus deployed end-to-end tests. Decision logs should include a correlation ID, policy version, evaluator type, decision, reason, latency, and fallback usage while redacting learner content.

### P2 — Compatibility governance

Pin one tested Hyperon runtime per deployable service, benchmark representative workloads, define latency and resource SLOs, and test upgrades in isolated runtime images. Any change to policies, grounded operations, model providers, or Hyperon versions should be replayable against deterministic fixtures.

## Immediate coding increment

This iteration hardens the existing policy boundary by centralizing policy atoms, validating dynamic policy arguments before they reach Hyperon, preserving a stable evaluator label for telemetry, and adding contract tests for malformed inputs and fail-closed behavior. It deliberately does not wire the experimental MeTTa knowledge graph or demo UI into student chat until persistence, isolation, and end-to-end policy guarantees are implemented.

## Sources

- [Hyperon experimental dependent projects](https://github.com/trueagi-io/hyperon-experimental/network/dependents?dependents_before=NDU4NjQxODYyNzk)
- [innovation-lab-examples](https://github.com/yantanyako/innovation-lab-examples)
- [conceptBlending](https://github.com/iCog-Labs-Dev/conceptBlending)
- [DAS Toolbox](https://github.com/singnet/das-toolbox)
- [hyperon-openpsi](https://github.com/iCog-Labs-Dev/hyperon-openpsi)
- [MeTTaProject](https://github.com/hermelawesene/MeTTaProject)
- [Syncsenta](https://github.com/dgithinjibit/Syncsenta)
