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

## Local no-venv workflow

The Rust bridge does not require a Python runtime or virtualenv. On Debian/Ubuntu, install a GNU C toolchain and Git, install CMake into the user package directory, then run the focused interpreter checks from the repository root:

```bash
sudo apt-get update
sudo apt-get install build-essential git
uv pip install --python "$(uv python find 3.12)" \
	--target "$HOME/.local/lib/python3.12/site-packages" cmake
export PATH="$HOME/.local/lib/python3.12/site-packages/cmake/data/bin:$PATH"
cargo test --manifest-path rust-hyperon-bridge/Cargo.toml
cargo run --manifest-path rust-hyperon-bridge/Cargo.toml --example policy_queries
```

The Python agent adapter also has a no-project-venv path. It installs into a user-owned package directory, leaving the distro-managed Python installation untouched. `uv` can provide CPython 3.12 if needed:

```bash
uv python install 3.12
python_path="$(uv python find 3.12)"
site_dir="$HOME/.local/lib/python3.12/site-packages"
uv pip install --python "$python_path" --target "$site_dir" \
	pytest pytest-asyncio pydantic structlog 'hyperon>=0.1.0'
PYTHONPATH="$site_dir:ai-agents/src" "$python_path" -m pytest \
	ai-agents/tests/test_hyperon_evaluator_contract.py -q
```

The evaluator contract test constructs the real Hyperon interpreter, loads `metta-logic/syncsenta_policy.metta`, and checks a safeguarding decision. The Rust bridge and Python adapter are separate experimental paths; passing either does not mean the other is enabled in production.

## Run a MeTTa file from any directory

Install the user-level command once from the repository root:

```bash
ln -s "$(git rev-parse --show-toplevel)/developer_tools/scripts/metta" "$HOME/.local/bin/metta"
```

Then run a file in the current directory, or pass a path from anywhere. Files containing `!` queries print their results; an optional expression can be supplied after the file to query its loaded rules:

```bash
metta buy.metta
metta /path/to/policy.metta '(safeguarding-route self-harm)'
```
