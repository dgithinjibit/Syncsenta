# Hyperon Rust Embedding Proposal

## Recommendation

Keep the first implementation in the existing SyncSenta repository on the isolated branch `experiment/hyperon-rust-embedding`. This keeps the adapter close to the Rust/MeTTa policy contract and makes review, testing, and rollback straightforward. A new repository should be created only if the bridge becomes a reusable standalone library for multiple projects, requires an independent release cadence, or is accepted upstream as a general integration pattern.

The experimental crate is `rust-hyperon-bridge`. It pins Hyperon Experimental v0.2.10, uses the local interpreter feature set, excludes the DAS feature because the current dependency graph produced duplicate `hyperon_atom` versions, and exposes a bounded `run_metta` function. It is not included in the production Rust workspace and does not alter the current Rust-enforced MeTTa verdict path.

## Current verification

The bridge compiled with Rust 1.98 and passed four tests, including execution of the actual `metta-logic/syncsenta_policy.metta` source. It rejects empty programs and programs larger than 64 KiB. The default Hyperon feature set did not compile in this sandbox because the DAS path required `protoc` and then encountered duplicate `hyperon_atom` types; the adapter therefore deliberately uses `default-features = false, features = ["pkg_mgmt"]` for local policy execution.

## Promotion criteria

Before production use, the bridge should receive a maintainer/API review, explicit policy-program allowlisting, execution timeout and resource limits, deterministic-semantics review, dependency/license review, and a benchmark against the current Rust contract. Until then, the existing Rust fail-closed contract remains the production authority.

## Maintainer email draft

**Subject:** SyncSenta Rust embedding boundary for Hyperon v0.2.10 — API guidance requested

Hello Hyperon maintainers,

I am building SyncSenta, a privacy-first Kenyan CBC learning platform whose production decision boundary is Rust-first and whose policy source is MeTTa. I created an isolated experimental crate that pins `trueagi-io/hyperon-experimental` at v0.2.10 and exposes a bounded Rust `run_metta` function. The prototype loads our policy file and successfully evaluates safeguarding and attendance decisions.

During integration we observed two questions we would appreciate your guidance on. First, the `SExprParser` type is public under `hyperon::metta::text`, while it is not re-exported from `hyperon::metta::runner`; is that module path considered stable for embedding? Second, enabling Hyperon’s default DAS feature produced duplicate `hyperon_atom` types in the dependency graph, while the local interpreter with `pkg_mgmt` enabled compiled successfully. Is there a recommended feature set or dependency pin for embedding the local interpreter without DAS?

We also want to confirm the preferred production integration pattern for a safety-sensitive application: fresh interpreter per request versus a managed interpreter/space, resource and timeout controls, deterministic evaluation expectations, and any licensing or redistribution requirements beyond the repository’s MIT license. We are keeping the adapter out of production until these questions and the relevant API guarantees are reviewed.

Thank you for any guidance, issue links, or recommended examples. We would be happy to share the small adapter and its tests if useful.

Regards,
Daniel
SyncSenta
