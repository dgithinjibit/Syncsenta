# SyncSenta Hyperon Rust Bridge (Experimental)

This crate is an isolated experiment on `experiment/hyperon-rust-embedding`. It embeds the official Hyperon Rust library from `trueagi-io/hyperon-experimental` at tag `v0.2.10` and exposes a bounded `run_metta` API and a safer `run_syncsenta_policy` API that loads only the repository policy source and rejects program-definition, variable, quote, comment, and mutable-space syntax.

The bridge is not used by `rust-core`, `rust-service`, or the Next.js application. It creates a fresh interpreter per call, limits program size to 64 KiB, does not expose network access or cross-request mutable state, and converts runtime failures into typed errors. The policy-only API now applies a query-size limit, result-count and result-size limits, and typed fail-closed rejection. It must not be promoted to production without execution timeout/resource controls, deterministic semantics review, and a maintainer-confirmed support path.

## Verification

Run the complete Rust and policy-query verification from the repository root:

```bash
scripts/verify-hyperon-bridge.sh
```

To run only the bridge tests:

```bash
cargo test --manifest-path rust-hyperon-bridge/Cargo.toml
```

The example at `examples/policy_queries.rs` executes representative safeguarding, offline-assessment, attendance-approval, and replay-protection queries through the policy-only API.

The prototype is pinned to the MIT-licensed Hyperon Experimental v0.2.10 release. Hyperon is an active pre-alpha reference implementation, so SyncSenta should keep its current Rust-enforced MeTTa verdict contract as the production fallback until the embedding boundary is independently reviewed.
