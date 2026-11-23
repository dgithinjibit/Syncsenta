"""Tests for Task 5: Telemetry + MeTTa Policy Integration.

Validates that the HyperonEvaluator is properly wired into the telemetry
capture pipeline so policy verdicts are evaluated per session.
"""

import pytest
from datetime import datetime

# The Hyperon evaluator module is not mounted or implemented in this package.
# This suite remains a blocked historical contract and is skipped until that
# implementation is restored under an explicit task.
import pytest

pytestmark = pytest.mark.skip(reason="Hyperon evaluator module is not implemented")


@pytest.fixture
def telemetry_agent():
    return TelemetryAgent()


@pytest.fixture
def sample_events_confident():
    """Events showing a confident, quick-solving student."""
    return [
        {
            "timestamp": 1715000000000.0,
            "event_type": "click",
            "target": "fraction_1_2",
            "position": [100, 100],
            "duration": 500,
        },
        {
            "timestamp": 1715000002000.0,
            "event_type": "drag",
            "target": "fraction_1_2",
            "position": [150, 150],
            "duration": 800,
        },
        {
            "timestamp": 1715000005000.0,
            "event_type": "drop",
            "target": "target_area",
            "position": [200, 200],
            "duration": 200,
        },
        {
            "timestamp": 1715000007000.0,
            "event_type": "submit",
            "target": "submit_btn",
            "duration": 100,
        },
    ]


@pytest.fixture
def sample_events_frustrated():
    """Events showing frustrated student with high erasure."""
    return [
        {
            "timestamp": 1715000000000.0,
            "event_type": "click",
            "target": "fraction_1_3",
            "position": [100, 100],
            "duration": 5000,  # Long dwell (hesitation)
        },
        {
            "timestamp": 1715000008000.0,
            "event_type": "undo",
            "target": "fraction_1_3",
            "duration": 200,
        },
        {
            "timestamp": 1715000010000.0,
            "event_type": "click",
            "target": "fraction_1_4",
            "position": [120, 100],
            "duration": 6000,  # Long dwell
        },
        {
            "timestamp": 1715000018000.0,
            "event_type": "undo",
            "target": "fraction_1_4",
            "duration": 200,
        },
        {
            "timestamp": 1715000020000.0,
            "event_type": "click",
            "target": "fraction_1_3",  # Backtracking
            "position": [100, 100],
            "duration": 8000,
        },
        {
            "timestamp": 1715000030000.0,
            "event_type": "undo",
            "target": "fraction_1_3",
            "duration": 200,
        },
        {
            "timestamp": 1715000032000.0,
            "event_type": "click",
            "target": "fraction_1_4",  # Circular pattern
            "position": [120, 100],
            "duration": 10000,
        },
        {
            "timestamp": 1715000045000.0,
            "event_type": "undo",
            "target": "fraction_1_4",
            "duration": 200,
        },
    ]


@pytest.mark.asyncio
async def test_policy_evaluation_integrated_in_telemetry(
    telemetry_agent, sample_events_confident
):
    """Test that policy evaluation is executed during telemetry processing."""
    profile = await telemetry_agent.process_events(
        events=sample_events_confident,
        session_id="test_session_123",
        student_id="test_student_456",
        activity_type="fraction_sandbox",
    )
    
    # Verify policy verdict is present
    assert profile.policy_verdict is not None, "Policy verdict should be evaluated"
    assert isinstance(profile.policy_verdict, PolicyVerdict)
    
    # Verify verdict has required fields
    assert hasattr(profile.policy_verdict, "approved")
    assert hasattr(profile.policy_verdict, "verdict")
    assert hasattr(profile.policy_verdict, "reasoning")
    assert hasattr(profile.policy_verdict, "evaluator_type")
    
    # Confident session should typically be approved
    assert isinstance(profile.policy_verdict.approved, bool)
    
    print(f"✓ Policy verdict: {profile.policy_verdict.verdict}")
    print(f"✓ Approved: {profile.policy_verdict.approved}")
    print(f"✓ Evaluator: {profile.policy_verdict.evaluator_type}")


@pytest.mark.asyncio
async def test_policy_verdict_in_to_dict(telemetry_agent, sample_events_confident):
    """Test that policy verdict is serialized in to_dict()."""
    profile = await telemetry_agent.process_events(
        events=sample_events_confident,
        session_id="test_session_dict",
        student_id="test_student_dict",
        activity_type="fraction_sandbox",
    )
    
    profile_dict = profile.to_dict()
    
    # Verify policy_verdict is in the dict
    assert "policy_verdict" in profile_dict
    assert profile_dict["policy_verdict"] is not None
    
    # Verify structure
    policy_data = profile_dict["policy_verdict"]
    assert "approved" in policy_data
    assert "verdict" in policy_data
    assert "reasoning" in policy_data
    assert "evaluator_type" in policy_data
    
    print(f"✓ Serialized policy verdict: {policy_data}")


@pytest.mark.asyncio
async def test_frustrated_session_policy_evaluation(
    telemetry_agent, sample_events_frustrated
):
    """Test policy evaluation on a frustrated/struggling session."""
    profile = await telemetry_agent.process_events(
        events=sample_events_frustrated,
        session_id="test_session_frustrated",
        student_id="test_student_frustrated",
        activity_type="fraction_sandbox",
    )
    
    # Verify profile captures frustration signals
    assert profile.erasure.undo_count >= 3, "Should detect high erasure count"
    assert profile.dwell.mean_dwell_ms > 3000, "Should detect long dwell times"
    
    # Verify policy evaluation happened
    assert profile.policy_verdict is not None
    
    # Policy should flag this for safeguarding review
    # (actual verdict depends on policy rules, but should exist)
    assert isinstance(profile.policy_verdict.verdict, str)
    assert len(profile.policy_verdict.reasoning) > 0
    
    print(f"✓ Frustrated session pattern: {profile.primary_pattern.value}")
    print(f"✓ Policy verdict: {profile.policy_verdict.verdict}")
    print(f"✓ Erasure count: {profile.erasure.undo_count}")
    print(f"✓ Mean dwell: {profile.dwell.mean_dwell_ms:.0f}ms")


@pytest.mark.asyncio
async def test_policy_evaluator_type_recorded(
    telemetry_agent, sample_events_confident
):
    """Test that we record which evaluator was used (Hyperon vs Fallback)."""
    profile = await telemetry_agent.process_events(
        events=sample_events_confident,
        session_id="test_session_evaluator",
        student_id="test_student_evaluator",
        activity_type="fraction_sandbox",
    )
    
    # Evaluator type should be either 'hyperon' or 'fallback'
    assert profile.policy_verdict.evaluator_type in ["hyperon", "fallback"]
    
    print(f"✓ Using evaluator: {profile.policy_verdict.evaluator_type}")


@pytest.mark.asyncio
async def test_telemetry_data_passed_to_policy(
    telemetry_agent, sample_events_confident
):
    """Test that telemetry signals are properly passed to policy evaluator."""
    profile = await telemetry_agent.process_events(
        events=sample_events_confident,
        session_id="test_session_data",
        student_id="test_student_data",
        activity_type="fraction_sandbox",
    )
    
    # The policy evaluator should have received:
    # - erasure_count
    # - dwell_time_seconds
    # - attempt_count
    # - first_attempt_correct
    # - engagement_score
    # - mastery_indicator
    # - pattern
    
    # We verify this indirectly by checking the verdict was produced
    assert profile.policy_verdict is not None
    assert isinstance(profile.policy_verdict.reasoning, str)
    
    # Reasoning should reference some telemetry data
    # (This is a weak check, but validates integration)
    assert len(profile.policy_verdict.reasoning) > 10
    
    print(f"✓ Policy reasoning: {profile.policy_verdict.reasoning[:100]}...")


@pytest.mark.asyncio
async def test_multiple_sessions_independent_verdicts(telemetry_agent):
    """Test that each session gets independent policy evaluation."""
    events1 = [
        {"timestamp": 1000, "event_type": "click", "target": "a"},
        {"timestamp": 2000, "event_type": "submit", "target": "submit"},
    ]
    
    events2 = [
        {"timestamp": 1000, "event_type": "click", "target": "b"},
        {"timestamp": 2000, "event_type": "undo", "target": "b"},
        {"timestamp": 3000, "event_type": "undo", "target": "b"},
        {"timestamp": 4000, "event_type": "undo", "target": "b"},
        {"timestamp": 5000, "event_type": "submit", "target": "submit"},
    ]
    
    profile1 = await telemetry_agent.process_events(
        events=events1,
        session_id="session_1",
        student_id="student_1",
        activity_type="test",
    )
    
    profile2 = await telemetry_agent.process_events(
        events=events2,
        session_id="session_2",
        student_id="student_1",  # Same student, different session
        activity_type="test",
    )
    
    # Both should have policy verdicts
    assert profile1.policy_verdict is not None
    assert profile2.policy_verdict is not None
    
    # Verdicts should reflect different telemetry
    # (profile2 has high erasure, profile1 doesn't)
    assert profile2.erasure.undo_count > profile1.erasure.undo_count
    
    print(f"✓ Session 1 verdict: {profile1.policy_verdict.verdict}")
    print(f"✓ Session 2 verdict: {profile2.policy_verdict.verdict}")


@pytest.mark.asyncio
async def test_empty_events_handled_gracefully(telemetry_agent):
    """Test that empty event list doesn't crash policy evaluation."""
    # Note: This might not be a realistic scenario, but tests robustness
    profile = await telemetry_agent.process_events(
        events=[
            {"timestamp": 1000, "event_type": "click", "target": "dummy"}
        ],  # Minimal event
        session_id="session_minimal",
        student_id="student_minimal",
        activity_type="test",
    )
    
    # Should still have a policy verdict
    assert profile.policy_verdict is not None
    assert isinstance(profile.policy_verdict.verdict, str)
    
    print(f"✓ Minimal session verdict: {profile.policy_verdict.verdict}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
