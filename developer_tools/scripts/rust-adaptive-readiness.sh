#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SYNC_SENTA_RUST_ADAPTIVE_URL:-http://127.0.0.1:8091}"
BASE_URL="${BASE_URL%/}"
HEALTH_URL="${BASE_URL}/health"

if ! response="$(curl --silent --show-error --max-time "${SYNC_SENTA_RUST_HEALTH_TIMEOUT_SECONDS:-2}" "$HEALTH_URL")"; then
  echo "RUST_ADAPTIVE_STATUS=unreachable"
  exit 1
fi

if [[ "$response" != *'"status":"ok"'* || "$response" != *'"service":"syncsenta-adaptive"'* ]]; then
  echo "RUST_ADAPTIVE_STATUS=invalid_health_response"
  exit 1
fi

echo "RUST_ADAPTIVE_STATUS=ready"
echo "RUST_ADAPTIVE_ENDPOINT_CONFIGURED=$([[ -n "${SYNC_SENTA_RUST_ADAPTIVE_URL:-}" ]] && echo true || echo false)"
