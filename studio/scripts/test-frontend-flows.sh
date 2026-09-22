#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:5173}"
pass=0
fail=0

check_page() {
  local label="$1" path="$2" expected="$3"
  local file="$(mktemp)" status
  status="$(curl -sS -o "$file" -w '%{http_code}' "$BASE_URL$path")"
  if [ "$status" = "200" ] && grep -Fq "$expected" "$file"; then
    printf 'PASS %-44s HTTP %s\n' "$label" "$status"
    pass=$((pass + 1))
  else
    printf 'FAIL %-44s expected HTTP 200 and text %q, got HTTP %s\n' "$label" "$expected" "$status"
    fail=$((fail + 1))
  fi
  rm -f "$file"
}

check_route() {
  local label="$1" path="$2"
  local status
  status="$(curl -sS -o /dev/null -w '%{http_code}' "$BASE_URL$path")"
  if [ "$status" = "200" ]; then
    printf 'PASS %-44s HTTP %s\n' "$label" "$status"
    pass=$((pass + 1))
  else
    printf 'FAIL %-44s expected HTTP 200, got HTTP %s\n' "$label" "$status"
    fail=$((fail + 1))
  fi
}

printf 'Senta Studio frontend integration smoke test\nBase URL: %s\n\n' "$BASE_URL"

check_page 'homepage audience/problem' '/' 'Plan, revise, and share better lessons'
check_page 'homepage positioning' '/' 'Not another AI tutor. A CBC teaching workspace.'
check_page 'homepage parent value' '/' 'Built for parents who want daily visibility'
check_page 'homepage curriculum scope' '/' 'PP1 through Grade 12'
check_page 'homepage teacher CTA' '/' 'Start the teacher workspace'
check_page 'terms page' '/terms' 'Terms and Conditions for SyncSenta'
check_page 'privacy page' '/privacy' 'Privacy Policy'
check_page 'child safety page' '/child-safety' 'Child Safety Policy'
check_page 'retention page' '/data-retention' 'Data Retention and Deletion'
check_page 'data ownership page' '/data-ownership' 'Student Progress Data Ownership'
check_page 'AI limitations page' '/ai-limitations' 'AI Limitations and Human Review'
check_page 'support page' '/support' 'Support, Privacy, and Safety'
check_page 'parental consent page' '/parental-consent' 'Parental Consent — Experiment'
check_page 'safety report page' '/report' 'Report Content or Safety Concern'
check_page 'school controls page' '/school-controls' 'School Administration Controls'
check_route 'signup entry route' '/signup'
check_page 'teacher dashboard' '/teacher' 'Teacher'
check_page 'teacher scheme wizard' '/teacher/scheme-wizard' 'Scheme'
check_page 'teacher wizard Senior School option' '/teacher/scheme-wizard' 'Grade 11'
check_page 'teacher tools' '/dashboard/tools' 'AI Teaching Co-Pilot'

printf '\nSummary: %s passed, %s failed\n' "$pass" "$fail"
if [ "$fail" -ne 0 ]; then exit 1; fi
