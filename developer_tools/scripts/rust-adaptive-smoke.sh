#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

PORT="${RUST_ADAPTIVE_SMOKE_PORT:-8092}"
BASE_URL="http://127.0.0.1:${PORT}"
LOG_FILE="$(mktemp)"
PID=""
cleanup() {
  [[ -n "$PID" ]] && kill "$PID" 2>/dev/null || true
  rm -f "$LOG_FILE"
}
trap cleanup EXIT

fail() { echo "RUST_ADAPTIVE_SMOKE=failed:$1"; exit 1; }

SYNC_SENTA_ADAPTIVE_BIND="127.0.0.1:${PORT}" cargo run -p syncsenta-adaptive-service >"$LOG_FILE" 2>&1 &
PID=$!

for _ in {1..40}; do
  if curl --silent --fail --max-time 1 "$BASE_URL/health" >/tmp/syncsenta-adaptive-health.json 2>/dev/null; then break; fi
  sleep 0.1
done
curl --silent --fail --max-time 2 "$BASE_URL/health" >/tmp/syncsenta-adaptive-health.json || fail "health_unreachable"
grep -q '"status":"ok"' /tmp/syncsenta-adaptive-health.json || fail "health_invalid"

payload='{"lessonId":"fractions-1","grade":"Grade 2","subject":"Mathematics","competency":"MATH.G2.FRACTIONS","currentIndex":0,"totalQuestions":3,"attemptCount":1,"correctCount":0,"hintLevel":1,"lastCorrect":true,"interest":"octopus","masteryThreshold":2}'
response="$(curl --silent --show-error --fail --max-time 2 -X POST "$BASE_URL/v1/adaptive-question" -H 'Content-Type: application/json' -d "$payload")" || fail "decision_unreachable"
printf '%s' "$response" | grep -q '"action":"advance"' || fail "decision_not_advance"
printf '%s' "$response" | grep -q '"source":"rust"' || fail "decision_not_rust"
printf '%s' "$response" | grep -q 'octopus' && fail "raw_interest_leaked"
printf '%s' "$response" | grep -q 'interest-anchor=true' || fail "interest_anchor_missing"

invalid_status="$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 2 -X POST "$BASE_URL/v1/adaptive-question" -H 'Content-Type: application/json' -d '{"lessonId":"","totalQuestions":0}' || true)"
[[ "$invalid_status" == 400 ]] || fail "invalid_input_not_rejected"

rm -f /tmp/syncsenta-adaptive-health.json
echo "RUST_ADAPTIVE_SMOKE=passed"
echo "RUST_ADAPTIVE_SMOKE=health_and_decision_verified"
echo "RUST_ADAPTIVE_SMOKE=privacy_and_invalid_input_verified"
