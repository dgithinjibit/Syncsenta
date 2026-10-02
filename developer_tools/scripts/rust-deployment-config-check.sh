#!/usr/bin/env bash
set -euo pipefail

status=0
flag="${NEXT_PUBLIC_SYNC_SENTA_ADAPTIVE_ROUTE:-false}"
rust_url="${SYNC_SENTA_RUST_ADAPTIVE_URL:-}"

case "$flag" in
  true|false) ;;
  *) echo "RUST_ADAPTIVE_CONFIG=invalid_public_flag"; status=1 ;;
esac

if [[ -n "$rust_url" ]]; then
  if [[ "$rust_url" =~ [[:space:]] || "$rust_url" =~ [^a-zA-Z0-9:/._-] ]]; then
    echo "RUST_ADAPTIVE_CONFIG=invalid_url_shape"
    status=1
  elif [[ "$rust_url" != http://127.0.0.1:* && "$rust_url" != http://localhost:* && "$rust_url" != https://* ]]; then
    echo "RUST_ADAPTIVE_CONFIG=unsafe_non_tls_url"
    status=1
  fi
fi

if [[ "$flag" == true && -z "$rust_url" ]]; then
  echo "RUST_ADAPTIVE_CONFIG=public_flag_without_server_url"
  status=1
fi

if [[ -n "${NEXT_PUBLIC_SYNC_SENTA_RUST_ADAPTIVE_URL:-}" ]]; then
  echo "RUST_ADAPTIVE_CONFIG=server_url_must_not_be_public"
  status=1
fi

if (( status == 0 )); then
  echo "RUST_ADAPTIVE_CONFIG=valid"
fi
exit "$status"
