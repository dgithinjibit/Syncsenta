#!/usr/bin/env bash
set -Eeuo pipefail

# Syncsenta staging gate. This runner is intentionally fail-closed: it never
# invents credentials, never prints token values, and never mutates production.
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="${BASE_URL:-http://127.0.0.1:5173}"
STUDENT_ROUTE="${STUDENT_ROUTE:-/student/sandbox/g2/mathematics}"
ROLE_HEALTH_PATH="${ROLE_HEALTH_PATH:-/api/health}"
REQUIRE_AUTH_PROBES="${REQUIRE_AUTH_PROBES:-false}"

fail() { printf 'STAGING_GATE_FAIL: %s\n' "$1" >&2; exit 1; }
pass() { printf 'STAGING_GATE_PASS: %s\n' "$1"; }

command -v curl >/dev/null || fail "curl is required"
command -v cargo >/dev/null || fail "cargo is required"

cd "$repo/rust-core"
cargo fmt -- --check
cargo test --quiet
pass "Rust policy/runtime regression suite"

if [[ -f "$repo/studio/package.json" ]]; then
  cd "$repo/studio"
  if grep -q '\"typecheck\"' package.json; then
    [[ -x node_modules/.bin/tsc ]] || fail "frontend dependencies are not installed; refusing to install during a readiness gate"
    ./node_modules/.bin/tsc --noEmit
    pass "frontend TypeScript check"
    [[ -x node_modules/.bin/vitest ]] || fail "frontend test runner is not installed; refusing to install during a readiness gate"
    ./node_modules/.bin/vitest run src/app/api/internal/schools/onboarding/route.test.ts
    pass "school-review audit integration tests"
  elif [[ "${REQUIRE_FRONTEND_CHECK:-true}" == "true" ]]; then
    fail "studio/package.json has no typecheck script"
  fi
fi

check_http() {
  local url="$1" expected="$2" body
  body="$(curl --fail --silent --show-error --max-time 10 --location --write-out $'\n%{http_code}' "$url")" || fail "request failed: $url"
  local code="${body##*$'\n'}"
  [[ "$code" == "$expected" ]] || fail "$url returned HTTP $code, expected $expected"
  printf '%s' "${body%$'\n'*}" 
}

route_body="$(check_http "$BASE_URL$STUDENT_ROUTE" 200)"
[[ "$route_body" == *"__NEXT_DATA__"* || "$route_body" == *"_next/"* ]] || fail "student route did not emit Next.js markers"
pass "student route HTTP and chunk markers"

health_body="$(check_http "$BASE_URL$ROLE_HEALTH_PATH" 200)"
[[ "$health_body" == *"healthy"* || "$health_body" == *"ok"* || "$health_body" == *"status"* ]] || fail "health response lacks a recognized health marker"
pass "service health endpoint"

# Authenticated role probes are opt-in because tokens must come from the
# staging secret manager or a user-authenticated session, never from source.
if [[ "$REQUIRE_AUTH_PROBES" == "true" ]]; then
  missing=()
  for role in STUDENT TEACHER HEAD PARENT; do
    url_var="${role}_HEALTH_URL"
    token_var="${role}_TOKEN"
    [[ -n "${!url_var:-}" ]] || missing+=("$url_var")
    [[ -n "${!token_var:-}" ]] || missing+=("$token_var")
  done
  if (( ${#missing[@]} > 0 )); then
    fail "authenticated probes require these non-secret environment variables: ${missing[*]}"
  fi

  for role in STUDENT TEACHER HEAD PARENT; do
    url_var="${role}_HEALTH_URL"
    token_var="${role}_TOKEN"
    url="${!url_var}"
    token="${!token_var}"
    status="$(curl --fail --silent --show-error --max-time 10 -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $token" "$url")" || fail "$role authenticated probe request failed (check URL/network; token value was not printed)"
    [[ "$status" == "200" ]] || fail "$role authenticated probe returned HTTP $status"
    pass "$role authenticated probe"
  done
fi

pass "staging end-to-end gate complete"
