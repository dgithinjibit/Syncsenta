#!/usr/bin/env bash
# Health-gated, reversible activation controller for the Rust adaptive route.
# The operator supplies the actual deployment control-plane commands.
set -Eeuo pipefail
IFS=$'\n\t'

MODE="${1:-preflight}"
RUST_URL="${RUST_URL:?RUST_URL is required}"
ROUTE_READ_CMD="${ROUTE_READ_CMD:?ROUTE_READ_CMD is required}"
ROUTE_ENABLE_CMD="${ROUTE_ENABLE_CMD:?ROUTE_ENABLE_CMD is required}"
ROUTE_DISABLE_CMD="${ROUTE_DISABLE_CMD:?ROUTE_DISABLE_CMD is required}"
STATE_FILE="${STATE_FILE:-/tmp/syncsenta-adaptive-cutover.state}"
CHECKS="${CHECKS:-3}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-3}"
MAX_LATENCY_MS="${MAX_LATENCY_MS:-500}"

log() { printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >&2; }
die() { log "ERROR: $*"; exit 1; }

current_state() {
  local state
  state="$(bash -c "$ROUTE_READ_CMD" | tr -d '[:space:]')"
  case "$state" in
    enabled|disabled) printf '%s\n' "$state" ;;
    *) die "route read returned invalid state '$state' (expected enabled or disabled)" ;;
  esac
}

check_rust_health() {
  local i metrics status total latency
  for ((i=1; i<=CHECKS; i++)); do
    metrics="$(curl --fail --silent --show-error --connect-timeout "$TIMEOUT_SECONDS" --max-time "$TIMEOUT_SECONDS" \
      --output /dev/null --write-out '%{http_code} %{time_total}' "${RUST_URL%/}/health" 2>/dev/null || true)"
    status="${metrics%% *}"
    total="${metrics#* }"
    [[ "$status" =~ ^2[0-9][0-9]$ ]] || die "Rust health check $i/$CHECKS failed"
    latency="$(awk -v seconds="$total" 'BEGIN { printf "%.0f", seconds * 1000 }')"
    (( latency <= MAX_LATENCY_MS )) || die "Rust health check exceeded ${MAX_LATENCY_MS}ms: ${latency}ms"
    log "Rust health check $i/$CHECKS passed (${latency}ms)"
  done
}

write_state() {
  umask 077
  mkdir -p "$(dirname "$STATE_FILE")"
  printf 'previous=%s\nstarted_at=%s\n' "$1" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$STATE_FILE"
}

previous_state() {
  [[ -r "$STATE_FILE" ]] || die "state file not found: $STATE_FILE"
  sed -n 's/^previous=\(enabled\|disabled\)$/\1/p' "$STATE_FILE" | head -1 | grep -E '^(enabled|disabled)$' || die "invalid state file"
}

preflight() {
  check_rust_health
  log "Current adaptive route state: $(current_state)"
  log "Preflight passed; no activation performed"
}

activate() {
  local current
  current="$(current_state)"
  [[ "$current" == disabled ]] || die "refusing activation: route is already '$current'"
  check_rust_health
  write_state "$current"
  if ! bash -c "$ROUTE_ENABLE_CMD"; then
    die "activation command failed; route remains under operator control"
  fi
  if [[ "$(current_state)" != enabled ]]; then
    bash -c "$ROUTE_DISABLE_CMD" || true
    die "activation was not reported as enabled"
  fi
  if ! check_rust_health; then
    bash -c "$ROUTE_DISABLE_CMD" || true
    die "post-activation health failed; route was disabled"
  fi
  log "Rust adaptive route activation completed and verified"
}

rollback() {
  local previous
  previous="$(previous_state)"
  if [[ "$previous" == disabled ]]; then
    bash -c "$ROUTE_DISABLE_CMD"
  else
    bash -c "$ROUTE_ENABLE_CMD"
  fi
  [[ "$(current_state)" == "$previous" ]] || die "rollback state verification failed"
  log "Rust adaptive route rolled back to $previous"
}

case "$MODE" in
  preflight) preflight ;;
  activate) activate ;;
  rollback) rollback ;;
  *) die "usage: $0 {preflight|activate|rollback}" ;;
esac
