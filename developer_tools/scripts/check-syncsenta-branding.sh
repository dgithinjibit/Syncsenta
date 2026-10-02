#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if grep -RIn --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=target --exclude='*.map' \
  -E 'mwalimu_ai|Mwalimu AI|MwalimuAI|mwalimuai' \
  studio/src ai-agents/src rust-core rust-service 2>/dev/null; then
  echo "Forbidden legacy branding found in active product source" >&2
  exit 1
fi

echo "SyncSenta branding check passed"
