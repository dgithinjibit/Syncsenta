#!/usr/bin/env bash
# Syncsenta Rust agent cutover controller.
#
# This script never guesses how production routing works. The operator must
# provide ROUTE_READ_CMD and ROUTE_SWITCH_CMD for the actual control plane.
# Both commands receive BACKEND=python|rust in their environment.
#
# Required:
#   RUST_URL, LEGACY_URL, ROUTE_READ_CMD, ROUTE_SWITCH_CMD
# Optional:
#   HEALTH_PATH=/healthz, CHAT_PATH=/agents/chat, CHECKS=5,
#   TIMEOUT_SECONDS=8, MAX_LATENCY_MS=1500, CHAT_PROBE_JSON,
#   CHAT_PROBE_TOKEN, STATE_FILE=/var/lib/syncsenta/agent-cutover.state
#
# Examples:
#   ROUTE_READ_CMD='vercel env ls ...' ... ./rust-agent-cutover.sh status
#   ROUTE_SWITCH_CMD='my-router set-backend "$BACKEND"' ... ./rust-agent-cutover.sh cutover
#   ... ./rust-agent-cutover.sh rollback

set -Eeuo pipefail
IFS=$'\n\t'

MODE="${1:-preflight}"
RUST_URL="${RUST_URL:?RUST_URL is required}"
LEGACY_URL="${LEGACY_URL:?LEGACY_URL is required}"
ROUTE_READ_CMD="${ROUTE_READ_CMD:?ROUTE_READ_CMD is required}"
ROUTE_SWITCH_CMD="${ROUTE_SWITCH_CMD:?ROUTE_SWITCH_CMD is required}"
HEALTH_PATH="${HEALTH_PATH:-/healthz}"
CHAT_PATH="${CHAT_PATH:-/agents/chat}"
CHECKS="${CHECKS:-5}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-8}"
MAX_LATENCY_MS="${MAX_LATENCY_MS:-1500}"
STATE_FILE="${STATE_FILE:-/var/lib/syncsenta/agent-cutover.state}"
CHAT_PROBE_JSON="${CHAT_PROBE_JSON:-}"
CHAT_PROBE_TOKEN="${CHAT_PROBE_TOKEN:-}"

log() { printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >&2; }
die() { log "ERROR: $*"; exit 1; }
cleanup_tmp() { [[ -n "${TMP_DIR:-}" && -d "$TMP_DIR" ]] && rm -rf "$TMP_DIR"; }
ROLLBACK_ACTIVE=0
ROLLBACK_TARGET=""
on_exit() {
  local code=$?
  if [[ "$ROLLBACK_ACTIVE" == 1 && -n "$ROLLBACK_TARGET" ]]; then
    log "Process exited during cutover; automatically restoring $ROLLBACK_TARGET"
    ROLLBACK_ACTIVE=0
    if run_route_switch "$ROLLBACK_TARGET" && [[ "$(current_target)" == "$ROLLBACK_TARGET" ]]; then
      log "Automatic rollback verified"
    else
      log "ERROR: automatic rollback could not be verified"
      code=1
    fi
  fi
  cleanup_tmp
  exit "$code"
}
trap on_exit EXIT
TMP_DIR="$(mktemp -d)"

require_bin() { command -v "$1" >/dev/null 2>&1 || die "required executable not found: $1"; }
require_bin curl
require_bin date
require_bin awk
require_bin sed

run_route_read() {
  # The command must print exactly one target token: python or rust.
  BACKEND="" bash -c "$ROUTE_READ_CMD"
}

run_route_switch() {
  local target="$1"
  BACKEND="$target" bash -c "$ROUTE_SWITCH_CMD"
}

current_target() {
  local target
  target="$(run_route_read | tr -d '[:space:]')"
  case "$target" in
    python|rust) printf '%s\n' "$target" ;;
    *) die "route read command returned invalid target: '$target' (expected python or rust)" ;;
  esac
}

url_for() {
  case "$1" in
    python) printf '%s' "$LEGACY_URL" ;;
    rust) printf '%s' "$RUST_URL" ;;
    *) die "unknown backend: $1" ;;
  esac
}

check_endpoint() {
  local backend="$1" endpoint="$2" i status latency body
  local url="$(url_for "$backend")$endpoint"
  for ((i=1; i<=CHECKS; i++)); do
    body="$TMP_DIR/${backend//[^a-zA-Z0-9]/_}_${i}.body"
    local metrics
    metrics="$(curl --fail-with-body --silent --show-error --location \
      --connect-timeout "$TIMEOUT_SECONDS" --max-time "$TIMEOUT_SECONDS" \
      --output "$body" --write-out '%{http_code} %{time_total}' "$url" 2>"$TMP_DIR/curl.err" || true)"
    status="${metrics%% *}"
    local total="${metrics#* }"
    [[ "$status" =~ ^2[0-9][0-9]$ ]] || { cat "$TMP_DIR/curl.err" >&2 || true; die "$backend health check $i/$CHECKS failed: HTTP ${status:-none}"; }
    latency="$(awk -v seconds="$total" 'BEGIN { printf "%.0f", seconds * 1000 }')"
    (( latency <= MAX_LATENCY_MS )) || die "$backend health check $i/$CHECKS exceeded ${MAX_LATENCY_MS}ms: ${latency}ms"
    log "$backend health check $i/$CHECKS passed (${latency}ms)"
  done
}

check_chat_probe() {
  local backend="$1"
  [[ -n "$CHAT_PROBE_JSON" ]] || { log "CHAT_PROBE_JSON not set; skipping chat probe (health-only mode)"; return 0; }
  local url="$(url_for "$backend")$CHAT_PATH" i status total latency
  for ((i=1; i<=CHECKS; i++)); do
    local headers=( -H 'Content-Type: application/json' )
    [[ -n "$CHAT_PROBE_TOKEN" ]] && headers+=( -H "Authorization: Bearer $CHAT_PROBE_TOKEN" )
    local metrics
    metrics="$(curl --fail-with-body --silent --show-error --location \
      --connect-timeout "$TIMEOUT_SECONDS" --max-time "$TIMEOUT_SECONDS" \
      -X POST "${headers[@]}" --data "$CHAT_PROBE_JSON" \
      --output "$TMP_DIR/${backend}_chat_${i}.body" --write-out '%{http_code} %{time_total}' "$url" 2>"$TMP_DIR/chat.err" || true)"
    status="${metrics%% *}"; total="${metrics#* }"
    [[ "$status" =~ ^2[0-9][0-9]$ ]] || { cat "$TMP_DIR/chat.err" >&2 || true; die "$backend chat probe $i/$CHECKS failed: HTTP ${status:-none}"; }
    latency="$(awk -v seconds="$total" 'BEGIN { printf "%.0f", seconds * 1000 }')"
    (( latency <= MAX_LATENCY_MS )) || die "$backend chat probe $i/$CHECKS exceeded ${MAX_LATENCY_MS}ms: ${latency}ms"
    log "$backend chat probe $i/$CHECKS passed (${latency}ms)"
  done
}

verify_backend() {
  local backend="$1"
  log "Verifying $backend backend at $(url_for "$backend")"
  check_endpoint "$backend" "$HEALTH_PATH"
  check_chat_probe "$backend"
}

write_state() {
  local previous="$1"
  mkdir -p "$(dirname "$STATE_FILE")"
  umask 077
  printf 'previous=%s\nstarted_at=%s\n' "$previous" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$STATE_FILE"
}

read_previous() {
  [[ -r "$STATE_FILE" ]] || die "state file not found: $STATE_FILE"
  sed -n 's/^previous=\(python\|rust\)$/\1/p' "$STATE_FILE" | head -1 | grep -E '^(python|rust)$' || die "invalid state file: $STATE_FILE"
}

preflight() {
  local current="$(current_target)"
  log "Current production target: $current"
  verify_backend python
  verify_backend rust
  log "Preflight passed; no traffic changed"
}

cutover() {
  local current="$(current_target)"
  [[ "$current" == python ]] || die "refusing cutover: current target is '$current', not python"
  verify_backend python
  verify_backend rust
  write_state "$current"
  ROLLBACK_TARGET="$current"
  ROLLBACK_ACTIVE=1
  log "Switching production target to rust"
  run_route_switch rust
  [[ "$(current_target)" == rust ]] || die 'cutover did not report rust as active'
  if ! verify_backend rust; then
    die 'rust post-switch health failed; automatic rollback will run'
  fi
  ROLLBACK_ACTIVE=0
  log 'Rust cutover completed and verified'
}

rollback() {
  local previous="$(read_previous)"
  log "Rolling back to recorded target: $previous"
  verify_backend "$previous"
  run_route_switch "$previous"
  [[ "$(current_target)" == "$previous" ]] || die 'rollback route verification failed'
  verify_backend "$previous"
  log 'Rollback completed and verified'
}

status() { log "Current production target: $(current_target)"; }

case "$MODE" in
  preflight) preflight ;;
  cutover) cutover ;;
  rollback) rollback ;;
  status) status ;;
  *) die "usage: $0 {preflight|cutover|rollback|status}" ;;
esac
