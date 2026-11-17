import pytest

from syncsenta_agents.agents.lesson_architect import LessonArchitectAgent
from syncsenta_agents.core.models import AgentRequest
from syncsenta_agents.omega_routing import resolve_agent_route
from syncsenta_agents.orchestrator.omega_queen import OmegaQueenOrchestrator
from syncsenta_agents.reasoning.hyperon_evaluator import (
    FallbackPolicyEvaluator,
    HyperonPolicyEvaluator,
)


class RoutingPolicy:
    def evaluate_agent_route(self, role, request_type):
        try:
            return resolve_agent_route(role, request_type)
        except ValueError:
            return None


class RecordingAgent:
    def __init__(self, response="Agent response", success=True, error=None):
        self.response = response
        self.success = success
        self.error = error
        self.context = None

    async def execute_task(self, request, context):
        self.context = context
        return {
            "response": self.response,
            "success": self.success,
            "error": self.error,
        }


def test_fallback_policy_resolves_teacher_lesson_plan():
    assert (
        FallbackPolicyEvaluator().evaluate_agent_route("teacher", "lesson_planning")
        == "lesson_architect"
    )


def test_hyperon_policy_queries_canonical_role_and_task(monkeypatch):
    evaluator = object.__new__(HyperonPolicyEvaluator)
    queries = []

    def query(expression):
        queries.append(expression)
        return "lesson-architect"

    monkeypatch.setattr(evaluator, "query", query)

    assert (
        evaluator.evaluate_agent_route("teacher", "lesson planning")
        == "lesson_architect"
    )
    assert queries == ["(omega-agent-route teacher lesson-plan)"]


def test_hyperon_policy_fails_closed_when_meTTa_route_disagrees(monkeypatch):
    evaluator = object.__new__(HyperonPolicyEvaluator)
    monkeypatch.setattr(evaluator, "query", lambda _expression: "school-intelligence")

    assert evaluator.evaluate_agent_route("teacher", "lesson_planning") is None


@pytest.mark.asyncio
async def test_student_request_uses_socratic_tutor_and_preserves_response_contract():
    tutor = RecordingAgent("A guiding question")
    queen = OmegaQueenOrchestrator(
        policy_evaluator=RoutingPolicy(),
        agent_registry={"socratic_tutor": tutor},
    )
    request = AgentRequest(
        message="Help me understand fractions",
        user_id="learner-1",
        role="student",
        grade="Grade 5",
        subject="Mathematics",
    )

    response = await queen.process_request(request)

    assert response.success is True
    assert response.response == "A guiding question"
    assert response.primary_agent == "socratic_tutor"
    assert response.agents_used == ["socratic_tutor"]
    assert response.response_time_ms >= 0


@pytest.mark.asyncio
async def test_teacher_lesson_plan_uses_lesson_architect():
    architect = RecordingAgent("Lesson plan")
    queen = OmegaQueenOrchestrator(
        policy_evaluator=RoutingPolicy(),
        agent_registry={"lesson_architect": architect},
    )
    request = AgentRequest(
        message="Plan a lesson",
        user_id="teacher-1",
        role="teacher",
        type="lesson_planning",
    )

    response = await queen.process_request(request)

    assert response.success is True
    assert response.primary_agent == "lesson_architect"


@pytest.mark.asyncio
async def test_institution_head_routes_to_school_intelligence():
    intelligence = RecordingAgent("Analysis needs authorized telemetry")
    queen = OmegaQueenOrchestrator(
        policy_evaluator=RoutingPolicy(),
        agent_registry={"school_intelligence": intelligence},
    )
    request = AgentRequest(
        message="Summarize school learning trends",
        user_id="head-1",
        role="head_of_institution",
    )

    response = await queen.process_request(request)

    assert response.success is True
    assert response.primary_agent == "school_intelligence"
    assert response.structured_result == {
        "response": "Analysis needs authorized telemetry",
        "success": True,
        "error": None,
    }


@pytest.mark.asyncio
async def test_queen_rejects_unsupported_role_and_task_without_fallback():
    tutor = RecordingAgent()
    queen = OmegaQueenOrchestrator(
        policy_evaluator=RoutingPolicy(),
        agent_registry={"socratic_tutor": tutor},
    )
    request = AgentRequest(
        message="Read school-wide learner records",
        user_id="learner-1",
        role="student",
        type="school_intelligence",
    )

    response = await queen.process_request(request)

    assert response.success is False
    assert response.primary_agent == "omega_queen"
    assert response.error == "Unsupported role or request type"
    assert tutor.context is None


@pytest.mark.asyncio
async def test_untrusted_identity_and_role_context_is_not_passed_to_agents():
    tutor = RecordingAgent()
    queen = OmegaQueenOrchestrator(
        policy_evaluator=RoutingPolicy(),
        agent_registry={"socratic_tutor": tutor},
    )
    request = AgentRequest(
        message="Explain fractions",
        user_id="learner-1",
        role="student",
        context={
            "student_id": "forged-student",
            "school_id": "forged-school",
            "role": "institution-head",
            "is_admin": True,
            "permissions": ["read_all_records"],
            "language": "kiswahili",
        },
    )

    response = await queen.process_request(request)

    assert response.success is True
    assert tutor.context == {
        "language": "kiswahili",
        "grade": None,
        "subject": None,
        "type": None,
    }


@pytest.mark.asyncio
async def test_worker_failure_is_preserved_in_queen_response():
    tutor = RecordingAgent(
        "Tutor unavailable", success=False, error="provider unavailable"
    )
    queen = OmegaQueenOrchestrator(
        policy_evaluator=RoutingPolicy(),
        agent_registry={"socratic_tutor": tutor},
    )

    response = await queen.process_request(
        AgentRequest(message="Help", user_id="learner-1", role="student")
    )

    assert response.success is False
    assert response.error == "provider unavailable"
    assert response.fallback_used is True


@pytest.mark.asyncio
async def test_every_supported_role_task_reaches_its_registered_specialist():
    routes = [
        ("student", "tutoring", "socratic_tutor"),
        ("student", "curriculum", "cbc_curriculum"),
        ("student", "assessment", "assessment"),
        ("student", "career-pathways", "career_pathways"),
        ("teacher", "teacher-support", "teacher_support"),
        ("teacher", "curriculum", "cbc_curriculum"),
        ("teacher", "scheme", "lesson_architect"),
        ("teacher", "lesson-plan", "lesson_architect"),
        ("teacher", "worksheet", "lesson_architect"),
        ("teacher", "text-leveler", "lesson_architect"),
        ("teacher", "unpack-outcome", "lesson_architect"),
        ("teacher", "differentiation", "lesson_architect"),
        ("teacher", "exam", "lesson_architect"),
        ("teacher", "assessment", "assessment"),
        ("institution-head", "school-intelligence", "school_intelligence"),
    ]
    queen = OmegaQueenOrchestrator(policy_evaluator=RoutingPolicy())
    required_agents = {agent_name for _, _, agent_name in routes}

    assert required_agents.issubset(queen.agent_registry)
    queen.agent_registry.update(
        {agent_name: RecordingAgent() for agent_name in required_agents}
    )

    for role, request_type, expected_agent in routes:
        response = await queen.process_request(
            AgentRequest(
                message="Do the assigned task",
                user_id="test-user",
                role=role,
                type=request_type,
            )
        )

        assert response.success is True, (role, request_type, response.error)
        assert response.primary_agent == expected_agent


@pytest.mark.asyncio
async def test_prescribed_scheme_fallback_is_executed_by_omega_specialist():
    queen = OmegaQueenOrchestrator(
        policy_evaluator=RoutingPolicy(),
        agent_registry={"lesson_architect": LessonArchitectAgent()},
    )

    response = await queen.process_request(
        AgentRequest(
            message="Prepare a scheme",
            user_id="teacher-1",
            role="teacher",
            type="scheme",
            grade="Grade 4",
            subject="Mathematics",
        ),
        task_context={
            "action": "generate_scheme",
            "prescribed_cbc_fallback": True,
            "selected_strands": [],
        },
    )

    assert response.success is True
    assert response.primary_agent == "lesson_architect"
    assert response.structured_result["rows"][0]["subStrand"] == "Core concepts"
