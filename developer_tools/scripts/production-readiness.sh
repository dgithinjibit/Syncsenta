#!/usr/bin/env bash
# SyncSenta production-readiness report. Read-only and fail-closed.
set -Eeuo pipefail
IFS=$'\n\t'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PASS=0
FAIL=0
WARN=0

pass() { printf 'READINESS_PASS: %s\n' "$*"; PASS=$((PASS + 1)); }
fail() { printf 'READINESS_FAIL: %s\n' "$*"; FAIL=$((FAIL + 1)); }
warn() { printf 'READINESS_WARN: %s\n' "$*"; WARN=$((WARN + 1)); }

check_command() {
  local command_name="$1"
  if command -v "$command_name" >/dev/null 2>&1; then pass "required command available: $command_name"; else fail "required command missing: $command_name"; fi
}

check_file() {
  local path="$1"
  if [[ -f "$ROOT_DIR/$path" ]]; then pass "required repository artifact present: $path"; else fail "required repository artifact missing: $path"; fi
}

check_command cargo
check_command curl
check_command node
check_command pnpm
check_file scripts/staging-e2e-gate.sh
check_file studio/src/lib/sandbox-provider-runtime.ts
check_file studio/src/lib/__tests__/sandbox-provider-runtime.test.ts
check_file studio/src/app/api/internal/schools/onboarding/route.test.ts
check_file studio/src/app/api/auth/complete-profile/route.ts
check_file studio/src/app/auth/callback/route.ts
check_file studio/src/app/auth/onboarding/page.tsx
check_file studio/src/app/auth/error/page.tsx
check_file studio/src/lib/school-review-audit.ts
check_file scripts/rust-agent-cutover.sh
check_file supabase/migrations/20260827000014_attendance_integrity_tokens_and_ledger.sql
check_file supabase/migrations/20260827000014_school_review_audit.sql
check_file supabase/migrations/20260827000020_sandbox_artifact_queue.sql
check_file supabase/migrations/20260827000021_sandbox_artifact_claims.sql

if [[ "${REQUIRE_AUTH_PROBES:-false}" == "true" ]]; then
  for variable in STUDENT_HEALTH_URL STUDENT_TOKEN TEACHER_HEALTH_URL TEACHER_TOKEN HEAD_HEALTH_URL HEAD_TOKEN PARENT_HEALTH_URL PARENT_TOKEN; do
    if [[ -n "${!variable:-}" ]]; then pass "authenticated prerequisite present: $variable"; else fail "authenticated prerequisite missing: $variable"; fi
  done
else
  warn 'REQUIRE_AUTH_PROBES is not true; role probes are not being treated as complete'
fi

if [[ -n "${GEMINI_API_KEY:-}" && "${SYNC_SENTA_ENABLE_MEDIA_GENERATION:-false}" == 'true' ]]; then
  pass 'Gemini media provider explicitly configured for non-default activation'
else
  warn 'Gemini media generation remains disabled or unconfigured; no provider call is allowed'
fi

if [[ "${SYNC_SENTA_ENABLE_ARTIFACT_WORKER:-false}" == 'true' ]]; then
  pass 'artifact worker explicitly enabled for controlled staging processing'
else
  warn 'artifact worker is disabled; queued media jobs cannot be claimed'
fi

if [[ "${SYNC_SENTA_ENABLE_CHILD_VIDEO:-false}" == 'true' ]]; then
  if [[ "${REQUIRE_AUTH_PROBES:-false}" == 'true' ]]; then
    warn 'child-facing video flag is enabled; authenticated evidence is present but moderation approval remains required'
  else
    fail 'child-facing video cannot be enabled without authenticated role probes'
  fi
else
  pass 'child-facing video remains disabled by default'
fi

if git -C "$ROOT_DIR" diff --quiet && git -C "$ROOT_DIR" diff --cached --quiet; then
  pass 'working tree has no unstaged or staged changes'
else
  fail 'working tree contains uncommitted changes'
fi

printf 'READINESS_SUMMARY: pass=%s warn=%s fail=%s\n' "$PASS" "$WARN" "$FAIL"
if (( FAIL > 0 )); then exit 1; fi
