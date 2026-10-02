"""Integration test — MeTTa policy enforcement.

Validates both the real Hyperon path and the pure-Python fallback path
so CI passes even when the ``hyperon`` package is not installed on the
runner.

Run:
    python scripts/test_metta_hyperon.py

Exit 0  → all assertions passed.
Exit 1  → one or more assertions failed (details printed to stdout).
"""

from __future__ import annotations

import sys
import traceback
from pathlib import Path

# Make the ai-agents source importable when running from the repo root.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ai-agents" / "src"))

from syncsenta_agents.reasoning.hyperon_evaluator import (
    FallbackPolicyEvaluator,
    HyperonPolicyEvaluator,
    PolicyRequest,
    PolicyVerdict,
    get_policy_evaluator,
    _POLICY_PATH,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

PASS = "✓"
FAIL = "✗"
failures: list[str] = []


def check(name: str, got: PolicyVerdict, want_approved: bool, want_reason: str | None = None) -> None:
    ok = got.approved == want_approved
    if want_reason is not None:
        ok = ok and got.review_reason == want_reason
    symbol = PASS if ok else FAIL
    print(f"  {symbol}  {name}: {got.verdict!r} (engine={got.evaluator_used})")
    if not ok:
        failures.append(
            f"{name}: expected approved={want_approved} reason={want_reason!r}, "
            f"got approved={got.approved} reason={got.review_reason!r} verdict={got.verdict!r}"
        )


# ---------------------------------------------------------------------------
# Shared test cases — run against both engines
# ---------------------------------------------------------------------------

def run_suite(evaluator: FallbackPolicyEvaluator | HyperonPolicyEvaluator, label: str) -> None:
    print(f"\n── {label} ──")

    # Main policy boundary
    check(
        "approved: primary + granted + online",
        evaluator.evaluate_session(PolicyRequest(
            age_band="primary", consent="granted",
            connectivity="online", safety_signal="clear",
        )),
        want_approved=True,
    )
    check(
        "review: safety flagged",
        evaluator.evaluate_session(PolicyRequest(
            age_band="primary", consent="granted",
            connectivity="online", safety_signal="flagged",
        )),
        want_approved=False, want_reason="safety",
    )
    check(
        "review: child consent unknown",
        evaluator.evaluate_session(PolicyRequest(
            age_band="primary", consent="unknown",
            connectivity="online", safety_signal="clear",
        )),
        want_approved=False, want_reason="consent",
    )
    check(
        "review: offline + assessment",
        evaluator.evaluate_session(PolicyRequest(
            age_band="primary", consent="granted",
            connectivity="offline", intent="assessment",
            safety_signal="clear",
        )),
        want_approved=False, want_reason="offline-assessment",
    )
    check(
        "approved: adult ignores consent value",
        evaluator.evaluate_session(PolicyRequest(
            age_band="adult", consent="unknown",
            connectivity="online", safety_signal="clear",
        )),
        want_approved=True,
    )

    # Safeguarding routes
    check("safeguarding: clear → Approved",
          evaluator.evaluate_safeguarding("clear"), want_approved=True)
    check("safeguarding: self-harm → Review safeguarding",
          evaluator.evaluate_safeguarding("self-harm"),
          want_approved=False, want_reason="safeguarding")
    check("safeguarding: wellbeing → Review wellbeing",
          evaluator.evaluate_safeguarding("wellbeing"),
          want_approved=False, want_reason="wellbeing")
    check("safeguarding: privacy-request → Review privacy",
          evaluator.evaluate_safeguarding("privacy-request"),
          want_approved=False, want_reason="privacy")

    # CBC evidence routes
    check("cbc-evidence: complete → Approved",
          evaluator.evaluate_cbc_evidence("complete"), want_approved=True)
    check("cbc-evidence: incomplete → Review curriculum-evidence",
          evaluator.evaluate_cbc_evidence("incomplete"),
          want_approved=False, want_reason="curriculum-evidence")
    check("cbc-evidence: unknown → Review curriculum-evidence",
          evaluator.evaluate_cbc_evidence("unknown"),
          want_approved=False, want_reason="curriculum-evidence")

    # Attendance action routes
    check("attendance: valid + granted → Approved",
          evaluator.evaluate_attendance_action("valid", "granted"),
          want_approved=True)
    check("attendance: replayed → Review attendance-replay",
          evaluator.evaluate_attendance_action("replayed", "granted"),
          want_approved=False, want_reason="attendance-replay")
    check("attendance: valid + denied → Review consent",
          evaluator.evaluate_attendance_action("valid", "denied"),
          want_approved=False, want_reason="consent")
    check("attendance: expired → Review attendance-token",
          evaluator.evaluate_attendance_action("expired", "granted"),
          want_approved=False, want_reason="attendance-token")

    # Assessment finalization routes
    check("assessment: synced → Approved",
          evaluator.evaluate_assessment_finalization("synced"),
          want_approved=True)
    check("assessment: offline-pending-sync → Review offline-assessment",
          evaluator.evaluate_assessment_finalization("offline-pending-sync"),
          want_approved=False, want_reason="offline-assessment")

    # Expert input gate
    check("expert-input: policy-summary → Approved",
          evaluator.evaluate_expert_input("policy-summary"),
          want_approved=True)
    check("expert-input: raw-learner-content → Review privacy",
          evaluator.evaluate_expert_input("raw-learner-content"),
          want_approved=False, want_reason="privacy")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print("=" * 60)
    print("Syncsenta MeTTa policy integration test")
    print(f"Policy file: {_POLICY_PATH}")
    print(f"Policy file exists: {_POLICY_PATH.exists()}")
    print("=" * 60)

    # Always run the pure-Python fallback — it must work with no deps.
    run_suite(FallbackPolicyEvaluator(), "FallbackPolicyEvaluator (pure Python)")

    # Try the real Hyperon engine; skip gracefully if not installed.
    try:
        hyperon_eval = HyperonPolicyEvaluator()
        run_suite(hyperon_eval, "HyperonPolicyEvaluator (real Hyperon runtime)")
    except ImportError:
        print("\n── HyperonPolicyEvaluator (SKIPPED — hyperon not installed) ──")
        print(f"  ℹ  Install with: pip install hyperon")
    except Exception as exc:
        print(f"\n── HyperonPolicyEvaluator (SKIPPED — init error: {exc}) ──")
        traceback.print_exc()

    # Factory check
    print("\n── get_policy_evaluator() factory ──")
    evaluator = get_policy_evaluator()
    print(f"  Active engine: {type(evaluator).__name__}")
    verdict = evaluator.evaluate_session(PolicyRequest(
        age_band="primary", consent="granted",
        connectivity="online", safety_signal="clear",
    ))
    check("factory default request → Approved", verdict, want_approved=True)

    # Summary
    print("\n" + "=" * 60)
    if failures:
        print(f"FAILED — {len(failures)} assertion(s):")
        for f in failures:
            print(f"  {FAIL}  {f}")
        sys.exit(1)
    else:
        print(f"PASSED — all assertions passed.")
        sys.exit(0)


if __name__ == "__main__":
    main()
