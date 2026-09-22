## Rust embedding guidance for Hyperon v0.2.10

Hello Hyperon maintainers,

We are developing **SyncSenta**, a privacy-first Kenyan CBC learning platform. Its production decision boundary is Rust-first, while MeTTa supplies auditable policy rules for safeguarding, consent, attendance, and curriculum evidence. We built a small experimental Rust adapter against `trueagi-io/hyperon-experimental` v0.2.10 and would appreciate guidance before considering any production adoption.

### Reproduction

The adapter is isolated on this branch:

<https://github.com/dgithinjibit/Ascendra/tree/experiment/hyperon-rust-embedding>

It pins the Hyperon dependency to the `v0.2.10` tag and currently enables the local `pkg_mgmt` feature while excluding DAS. The adapter creates a fresh interpreter per call, limits input programs to 64 KiB, exposes a policy-only query function with a 1 KiB query limit, caps results at 16 entries and 8 KiB, and converts runtime failures into typed errors. It does not include learner data, credentials, secrets, network calls, or persistent cross-request state.

We verified four Rust bridge tests, including execution of the actual SyncSenta policy source. The safe policy API produced the expected `Approved` and `(Review safeguarding)` outcomes for representative policy queries.

### Questions

1. **Public API stability:** `SExprParser` is available at `hyperon::metta::text::SExprParser` but is not re-exported from `hyperon::metta::runner`. Is this module path considered a supported and stable embedding API for v0.2.x?

2. **Feature selection:** Enabling the default DAS feature caused duplicate `hyperon_atom` types in the dependency graph of our adapter. The local interpreter compiled with `default-features = false` and `pkg_mgmt` enabled. Is there a recommended feature set or dependency pin for embedding the local interpreter without DAS?

3. **Execution lifecycle:** For a safety-sensitive service, should an application create a fresh `Metta` interpreter per request, or is a managed interpreter and space recommended? Please point us to the supported guidance for isolation, concurrency, timeouts, memory limits, and cancellation.

4. **Evaluation guarantees:** What should embedders assume about nondeterministic results, result ordering, recursion/depth limits, and API compatibility across patch and minor releases?

5. **Distribution:** Are there any licensing, attribution, or redistribution requirements beyond the repository’s MIT license when the Rust library is embedded in a commercial or public-interest application?

We are deliberately keeping this adapter out of production. SyncSenta will retain its existing Rust-enforced MeTTa verdict contract until the embedding boundary, dependency configuration, resource controls, and API guarantees have been reviewed.

Thank you for any recommended examples, documentation, issue links, or guidance on whether this work would be better contributed upstream.

Regards,

The SyncSenta team
