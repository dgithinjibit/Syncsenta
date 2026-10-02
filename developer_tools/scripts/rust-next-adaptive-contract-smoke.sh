#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

RUST_PORT="${RUST_ADAPTIVE_CONTRACT_PORT:-8093}"
NEXT_PORT="${NEXT_ADAPTIVE_CONTRACT_PORT:-5174}"
RUST_URL="http://127.0.0.1:${RUST_PORT}"
NEXT_URL="http://127.0.0.1:${NEXT_PORT}"
RUST_PID=""
NEXT_PID=""
RUST_LOG="$(mktemp)"
NEXT_LOG="$(mktemp)"
cleanup() {
  [[ -n "$NEXT_PID" ]] && kill "$NEXT_PID" 2>/dev/null || true
  [[ -n "$RUST_PID" ]] && kill "$RUST_PID" 2>/dev/null || true
  rm -f "$RUST_LOG" "$NEXT_LOG"
}
trap cleanup EXIT

fail() { echo "RUST_NEXT_ADAPTIVE_SMOKE=failed:$1"; exit 1; }

SYNC_SENTA_ADAPTIVE_BIND="127.0.0.1:${RUST_PORT}" cargo run -p syncsenta-adaptive-service >"$RUST_LOG" 2>&1 &
RUST_PID=$!
for _ in {1..50}; do
  curl --silent --fail --max-time 1 "$RUST_URL/health" >/dev/null 2>&1 && break
  sleep 0.1
done
curl --silent --fail --max-time 2 "$RUST_URL/health" >/dev/null 2>&1 || fail "rust_health_unreachable"

cd studio
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=local-contract-placeholder \
GROQ_API_KEY=local-contract-placeholder \
SYNC_SENTA_RUST_ADAPTIVE_URL="$RUST_URL" \
NEXT_PUBLIC_SYNC_SENTA_ADAPTIVE_ROUTE=true \
pnpm exec next dev -p "$NEXT_PORT" >"$NEXT_LOG" 2>&1 &
NEXT_PID=$!
for _ in {1..100}; do
  curl --silent --fail --max-time 1 "$NEXT_URL/api/health" >/dev/null 2>&1 && break
  sleep 0.2
done
curl --silent --fail --max-time 3 "$NEXT_URL/api/health" >/dev/null 2>&1 || fail "next_health_unreachable"

payload='{"lessonId":"fractions-1","grade":"Grade 2","subject":"Mathematics","competency":"MATH.G2.FRACTIONS","currentIndex":0,"totalQuestions":3,"attemptCount":1,"correctCount":0,"hintLevel":1,"lastCorrect":true,"interest":"octopus","masteryThreshold":2}'
rust_body="$(curl --silent --show-error --fail --max-time 3 -X POST "$NEXT_URL/api/student/adaptive-question" -H 'Content-Type: application/json' -d "$payload")" || fail "next_to_rust_request_failed"
printf '%s' "$rust_body" | grep -q '"route":"rust"' || fail "rust_route_not_selected"
printf '%s' "$rust_body" | grep -q '"source":"rust"' || fail "rust_source_missing"
printf '%s' "$rust_body" | grep -q 'octopus' && fail "raw_interest_leaked_from_rust_route"

kill "$RUST_PID" 2>/dev/null || true
RUST_PID=""
sleep 0.2
fallback_body="$(curl --silent --show-error --fail --max-time 3 -X POST "$NEXT_URL/api/student/adaptive-question" -H 'Content-Type: application/json' -d "$payload")" || fail "fallback_request_failed"
printf '%s' "$fallback_body" | grep -q '"route":"server-fallback"' || fail "server_fallback_not_selected"
printf '%s' "$fallback_body" | grep -q '"source":"fallback"' || fail "fallback_source_missing"
printf '%s' "$fallback_body" | grep -q 'octopus' && fail "raw_interest_leaked_from_fallback"

echo "RUST_NEXT_ADAPTIVE_SMOKE=passed"
echo "RUST_NEXT_ADAPTIVE_SMOKE=rust_route_and_fallback_verified"
echo "RUST_NEXT_ADAPTIVE_SMOKE=privacy_boundary_verified"
