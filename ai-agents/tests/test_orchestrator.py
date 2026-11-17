"""Tests for SyncSenta's Omega-based orchestrator."""

import pytest

from syncsenta_agents.core.models import AgentRequest, AgentResponse, RequestPriority
from syncsenta_agents.orchestrator import SyncSentaOrchestrator


class StubAgent:
    async def execute_task(self, request, context):
        return {"response": f"Handled: {request}"}


class FailedAgent:
    async def execute_task(self, request, context):
        return {
            "response": "Tutor unavailable",
            "success": False,
            "error": "provider unavailable",
        }


class ExplodingAgent:
    def __init__(self):
        self.calls = 0

    async def execute_task(self, request, context):
        self.calls += 1
        raise RuntimeError("worker unavailable")


@pytest.fixture
async def orchestrator():
    instance = SyncSentaOrchestrator()
    await instance.initialize()
    instance.register_agent("socratic_tutor", StubAgent())
    return instance


@pytest.fixture
def sample_request():
    return AgentRequest(
        message="What is photosynthesis?",
        user_id="test_user_123",
        session_id="test_session_456",
        grade="Grade 7",
        subject="Science",
        role="student",
        priority=RequestPriority.MEDIUM,
    )


@pytest.mark.asyncio
async def test_orchestrator_initializes_omega_queen():
    instance = SyncSentaOrchestrator()

    assert instance._initialized is False
    await instance.initialize()

    assert instance._initialized is True
    assert instance.omega_queen is not None
    assert instance.failure_recovery is not None


@pytest.mark.asyncio
async def test_request_before_initialization_returns_explicit_error(sample_request):
    instance = SyncSentaOrchestrator()

    response = await instance.process_request(sample_request)

    assert response.success is False
    assert "not initialized" in response.response.lower()
    assert response.error == "Not initialized"


@pytest.mark.asyncio
async def test_process_request_uses_omega_agent(orchestrator, sample_request):
    response = await orchestrator.process_request(sample_request)

    assert isinstance(response, AgentResponse)
    assert response.success is True
    assert response.response == "Handled: What is photosynthesis?"
    assert response.primary_agent == "socratic_tutor"
    assert response.agents_used == ["socratic_tutor"]
    assert response.response_time_ms >= 0


@pytest.mark.asyncio
async def test_wrapper_preserves_worker_failure_fallback_status(
    orchestrator, sample_request
):
    orchestrator.register_agent("socratic_tutor", FailedAgent())

    response = await orchestrator.process_request(sample_request)

    assert response.success is False
    assert response.fallback_used is True
    assert response.error == "provider unavailable"


@pytest.mark.asyncio
async def test_worker_exception_fails_closed_through_omega(orchestrator, sample_request):
    worker = ExplodingAgent()
    orchestrator.register_agent("socratic_tutor", worker)
    orchestrator.failure_recovery.retry_strategy.max_retries = 0

    response = await orchestrator.process_request(sample_request)

    assert worker.calls == 1
    assert response.success is False
    assert response.primary_agent == "omega_queen"
    assert response.agents_used == ["omega_queen"]
    assert response.fallback_used is False
    assert response.error == "worker unavailable"


@pytest.mark.asyncio
async def test_register_agent_replaces_queen_registry_entry(orchestrator):
    agent = StubAgent()
    orchestrator.register_agent("custom_agent", agent)

    assert orchestrator.omega_queen.agent_registry["custom_agent"] is agent


@pytest.mark.asyncio
async def test_unsupported_role_does_not_fall_back_to_student_agent(orchestrator):
    response = await orchestrator.process_request(
        AgentRequest(
            message="Can I access student records?",
            user_id="unknown-role",
            role="parent",
        )
    )

    assert response.success is False
    assert response.primary_agent == "omega_queen"
    assert response.error == "Unsupported role or request type"


@pytest.mark.asyncio
async def test_system_health_is_available(orchestrator):
    health = orchestrator.get_system_health()

    assert "health_score" in health
    assert "degradation_level" in health
    assert "circuit_breakers" in health
    assert "timestamp" in health
    assert 0 <= health["health_score"] <= 100


@pytest.mark.asyncio
async def test_omega_circuit_breaker_statistics(orchestrator):
    stats = orchestrator.get_circuit_breaker_stats("omega_queen")

    assert stats["name"] == "omega_queen"
    assert "state" in stats
    assert "total_requests" in stats
