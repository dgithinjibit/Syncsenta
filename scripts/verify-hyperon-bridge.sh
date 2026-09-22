#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

cargo fmt --all -- --check
cargo test --manifest-path rust-core/Cargo.toml
cargo test --manifest-path rust-service/Cargo.toml
cargo test --manifest-path rust-hyperon-bridge/Cargo.toml
cargo run --manifest-path rust-hyperon-bridge/Cargo.toml --example policy_queries

echo "Hyperon bridge verification passed"
