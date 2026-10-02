#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

RUST_PORT="${RUST_MOBILE_SMOKE_RUST_PORT:-8094}"
NEXT_PORT="${RUST_MOBILE_SMOKE_NEXT_PORT:-5176}"
RUST_URL="http://127.0.0.1:${RUST_PORT}"
NEXT_URL="http://127.0.0.1:${NEXT_PORT}"
PAGE_PATH="/student/sandbox/g2/mathematics/g2-math-number-garden-1"
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

fail() { echo "STUDENT_SANDBOX_MOBILE_SMOKE=failed:$1"; exit 1; }

SYNC_SENTA_ADAPTIVE_BIND="127.0.0.1:${RUST_PORT}" cargo run -p syncsenta-adaptive-service >"$RUST_LOG" 2>&1 &
RUST_PID=$!
for _ in {1..50}; do
  curl --silent --fail --max-time 1 "$RUST_URL/health" >/dev/null 2>&1 && break
  sleep 0.1
done
curl --silent --fail --max-time 2 "$RUST_URL/health" >/dev/null 2>&1 || fail "rust_health_unreachable"

cd studio
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=local-mobile-placeholder \
GROQ_API_KEY=local-mobile-placeholder \
SYNC_SENTA_RUST_ADAPTIVE_URL="$RUST_URL" \
NEXT_PUBLIC_SYNC_SENTA_ADAPTIVE_ROUTE=true \
pnpm exec next start -p "$NEXT_PORT" >"$NEXT_LOG" 2>&1 &
NEXT_PID=$!
for _ in {1..100}; do
  curl --silent --fail --max-time 1 "$NEXT_URL/api/health" >/dev/null 2>&1 && break
  sleep 0.2
done
curl --silent --fail --max-time 3 "$NEXT_URL/api/health" >/dev/null 2>&1 || fail "next_health_unreachable"

first_ms="$(curl --silent --show-error --fail --max-time 5 -o /dev/null -w '%{time_total}' "$NEXT_URL$PAGE_PATH" | awk '{printf "%.0f", $1 * 1000}')"
[[ "$first_ms" -le 2000 ]] || fail "first_load_over_2000ms"

max_reload=0
for _ in {1..3}; do
  reload_ms="$(curl --silent --show-error --fail --max-time 5 -o /dev/null -w '%{time_total}' "$NEXT_URL$PAGE_PATH" | awk '{printf "%.0f", $1 * 1000}')"
  (( reload_ms > max_reload )) && max_reload="$reload_ms"
done
[[ "$max_reload" -le 2000 ]] || fail "reload_over_2000ms"

payload='{"lessonId":"fractions-1","grade":"Grade 2","subject":"Mathematics","competency":"MATH.G2.FRACTIONS","currentIndex":0,"totalQuestions":3,"attemptCount":1,"correctCount":0,"hintLevel":1,"lastCorrect":true,"interest":"octopus","masteryThreshold":2}'
rust_body="$(curl --silent --show-error --fail --max-time 3 -X POST "$NEXT_URL/api/student/adaptive-question" -H 'Content-Type: application/json' -d "$payload")" || fail "adaptive_rust_request_failed"
printf '%s' "$rust_body" | grep -q '"route":"rust"' || fail "rust_route_not_selected"

kill "$RUST_PID" 2>/dev/null || true
RUST_PID=""
sleep 0.2
fallback_body="$(curl --silent --show-error --fail --max-time 3 -X POST "$NEXT_URL/api/student/adaptive-question" -H 'Content-Type: application/json' -d "$payload")" || fail "adaptive_fallback_request_failed"
printf '%s' "$fallback_body" | grep -q '"route":"server-fallback"' || fail "fallback_not_selected"

./node_modules/.bin/vitest run src/lib/__tests__/student-learning-loop.test.ts src/lib/__tests__/adaptive-question-bridge.test.ts >/dev/null

echo "STUDENT_SANDBOX_MOBILE_SMOKE=passed"
echo "STUDENT_SANDBOX_MOBILE_SMOKE=first_load_ms:${first_ms}"
echo "STUDENT_SANDBOX_MOBILE_SMOKE=max_reload_ms:${max_reload}"
echo "STUDENT_SANDBOX_MOBILE_SMOKE=rust_and_fallback_verified"
echo "STUDENT_SANDBOX_MOBILE_SMOKE=persistence_tests_verified"
