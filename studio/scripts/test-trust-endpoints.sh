#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:5173}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

pass=0
fail=0

request() {
  local label="$1" method="$2" path="$3" data="${4:-}" expected="$5" jq_expr="${6:-.}"
  local body_file="$(mktemp)" status body
  if [ -n "$data" ]; then
    status="$(curl -sS -o "$body_file" -w '%{http_code}' -X "$method" "$BASE_URL$path" -H 'Content-Type: application/json' -b "$COOKIE_JAR" --data "$data")"
  else
    status="$(curl -sS -o "$body_file" -w '%{http_code}' -X "$method" "$BASE_URL$path" -b "$COOKIE_JAR")"
  fi
  body="$(cat "$body_file")"
  if [ "$status" = "$expected" ] && printf '%s' "$body" | jq -e "$jq_expr" >/dev/null 2>&1; then
    printf 'PASS %-42s HTTP %s\n' "$label" "$status"
    pass=$((pass + 1))
  else
    printf 'FAIL %-42s expected HTTP %s, got HTTP %s\n' "$label" "$expected" "$status"
    printf '     response: %s\n' "$body"
    fail=$((fail + 1))
  fi
  rm -f "$body_file"
}

printf 'Senta Studio trust endpoint integration test\n'
printf 'Base URL: %s\n\n' "$BASE_URL"

request 'trust request: valid demo' POST '/api/trust/requests' \
  '{"category":"safety","summary":"A demo safety report with enough detail","urgent":false}' 202 \
  '.ok == true and .mode == "demo" and .persisted == false and (.requestId | type) == "string"'
request 'trust request: invalid category' POST '/api/trust/requests' \
  '{"category":"unknown","summary":"A valid-length summary for testing"}' 400 \
  '.error == "Invalid request" and (.issues.fieldErrors.category | length) > 0'
request 'trust request: short summary' POST '/api/trust/requests' \
  '{"category":"support","summary":"short"}' 400 \
  '.error == "Invalid request" and (.issues.fieldErrors.summary | length) > 0'
request 'trust request: malformed JSON' POST '/api/trust/requests' \
  '{"category":"support"' 400 \
  '.error == "Invalid JSON"'

request 'parental consent: no auth' POST '/api/parental-consent' \
  '{"childId":"demo-child","consentVersion":"experiment-2026-09-21","purposes":["learning"],"granted":true}' 401 \
  '.error == "Authentication required"'
request 'data request: no auth' POST '/api/data-requests' \
  '{"type":"access","subjectId":"demo-child"}' 401 \
  '.error == "Authentication required"'
request 'school controls: no auth' POST '/api/school-controls' \
  '{"action":"export_records","schoolId":"demo-school"}' 401 \
  '.error == "Authentication required"'

curl -sS -o /dev/null -X POST "$BASE_URL/api/set-auth-cookie" -H 'Content-Type: application/json' \
  -c "$COOKIE_JAR" --data '{"role":"parent","name":"Demo Parent"}'
request 'parental consent: valid demo parent' POST '/api/parental-consent' \
  '{"childId":"demo-child","schoolId":"demo-school","consentVersion":"experiment-2026-09-21","purposes":["learning","voice"],"granted":true}' 202 \
  '.ok == true and .mode == "demo" and .persisted == false and (.consentId | type) == "string"'
request 'data request: valid demo parent' POST '/api/data-requests' \
  '{"type":"export","subjectId":"demo-child","schoolId":"demo-school","details":"Demo export request"}' 202 \
  '.ok == true and .mode == "demo" and (.dataRequestId | type) == "string"'
request 'parental consent: invalid purposes' POST '/api/parental-consent' \
  '{"childId":"demo-child","consentVersion":"experiment-2026-09-21","purposes":[],"granted":true}' 400 \
  '.error == "Invalid consent record"'

curl -sS -o /dev/null -X POST "$BASE_URL/api/set-auth-cookie" -H 'Content-Type: application/json' \
  -c "$COOKIE_JAR" --data '{"role":"teacher","name":"Demo Teacher"}'
request 'school controls: teacher forbidden' POST '/api/school-controls' \
  '{"action":"export_records","schoolId":"demo-school"}' 403 \
  '.error == "School-admin role required"'

curl -sS -o /dev/null -X POST "$BASE_URL/api/set-auth-cookie" -H 'Content-Type: application/json' \
  -c "$COOKIE_JAR" --data '{"role":"school_head","name":"Demo Head"}'
request 'school controls: valid demo head' POST '/api/school-controls' \
  '{"action":"review_consent","schoolId":"demo-school","subjectId":"demo-child","details":{"reason":"routine review"}}' 202 \
  '.ok == true and .mode == "demo" and (.actionId | type) == "string"'
request 'school controls: invalid action' POST '/api/school-controls' \
  '{"action":"delete_everything","schoolId":"demo-school"}' 400 \
  '.error == "Invalid school action"'
request 'data request: malformed JSON' POST '/api/data-requests' \
  '{"type":"access"' 400 \
  '.error == "Invalid JSON"'

printf '\nSummary: %s passed, %s failed\n' "$pass" "$fail"
if [ "$fail" -ne 0 ]; then exit 1; fi
