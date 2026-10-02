"""Contract tests for the Omega Hyperon policy adapter."""

from syncsenta_agents.reasoning.hyperon_evaluator import (
    FallbackPolicyEvaluator,
    HyperonPolicyEvaluator,
    PolicyRequest,
)


def test_fallback_uses_stable_public_label() -> None:
    verdict = FallbackPolicyEvaluator().evaluate_session(
        PolicyRequest(age_band="primary", consent="unknown")
    )

    assert verdict.evaluator_type == "fallback"
    assert verdict.approved is False
    assert verdict.review_reason == "consent"


def test_hyperon_runtime_loads_policy_and_routes_safeguarding() -> None:
    evaluator = HyperonPolicyEvaluator()

    verdict = evaluator.evaluate_safeguarding("self-harm")

    assert verdict.evaluator_type == "hyperon"
    assert verdict.verdict == "(Review safeguarding)"


def test_hyperon_runtime_evaluates_boolean_policy_conditions() -> None:
    evaluator = HyperonPolicyEvaluator()

    online = evaluator.evaluate_session(
        PolicyRequest(age_band="primary", consent="granted", connectivity="online")
    )
    offline_assessment = evaluator.evaluate_session(
        PolicyRequest(
            age_band="primary",
            consent="granted",
            connectivity="offline",
            intent="assessment",
        )
    )
    replayed_attendance = evaluator.evaluate_attendance_action("replayed", "granted")

    assert online.verdict == "Approved"
    assert offline_assessment.verdict == "(Review offline-assessment)"
    assert replayed_attendance.verdict == "(Review attendance-replay)"


def test_hyperon_adapter_rejects_expression_injection_before_query() -> None:
    evaluator = object.__new__(HyperonPolicyEvaluator)
    verdict = evaluator.evaluate_safeguarding("clear) (safeguarding-route self-harm")

    assert verdict.approved is False
    assert verdict.verdict == "(Review invalid-policy-input)"
    assert verdict.evaluator_type == "hyperon"


def test_hyperon_adapter_rejects_free_form_learner_content() -> None:
    evaluator = object.__new__(HyperonPolicyEvaluator)
    verdict = evaluator.evaluate_session(
        PolicyRequest(role="student", safety_signal="clear", intent="Explain fractions")
    )

    assert verdict.approved is False
    assert verdict.review_reason == "invalid-policy-input"


def test_fallback_unknown_route_fails_closed() -> None:
    verdict = FallbackPolicyEvaluator().evaluate_safeguarding("new-unknown-signal")

    assert verdict.approved is False
    assert verdict.verdict == "(Review unknown-safeguarding:new-unknown-signal)"
    assert verdict.evaluator_type == "fallback"
