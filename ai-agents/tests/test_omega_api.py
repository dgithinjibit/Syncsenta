import pytest

from syncsenta_agents.api import lesson_architect_api
from syncsenta_agents.api import server
from syncsenta_agents.core.models import AgentResponse


class CapturingOrchestrator:
    def __init__(self, structured_result, primary_agent="assessment"):
        self.structured_result = structured_result
        self.primary_agent = primary_agent
        self.request = None
        self.task_context = None

    async def process_request(self, request, *, task_context=None):
        self.request = request
        self.task_context = task_context
        return AgentResponse(
            success=True,
            response="Task completed",
            primary_agent=self.primary_agent,
            agents_used=[self.primary_agent],
            response_time_ms=0,
            structured_result=self.structured_result,
        )


@pytest.mark.asyncio
async def test_quiz_endpoint_preserves_structured_result_from_omega(monkeypatch):
    quiz = {"quiz_id": "quiz-1", "questions": []}
    orchestrator = CapturingOrchestrator({"quiz": quiz})

    async def get_orchestrator():
        return orchestrator

    monkeypatch.setattr(server, "get_orchestrator", get_orchestrator)
    monkeypatch.setattr(
        server,
        "get_agent",
        lambda: pytest.fail("quiz endpoint bypassed Omega"),
    )

    response = await server.generate_quiz(
        server.QuizRequest(
            grade="Grade 4",
            subject="Mathematics",
            competency="fractions",
            num_questions=3,
        )
    )

    assert response == quiz
    assert orchestrator.request.role == "teacher"
    assert orchestrator.request.type == "assessment"
    assert orchestrator.task_context["action"] == "generate_quiz"
    assert orchestrator.task_context["competency"] == "fractions"


@pytest.mark.asyncio
async def test_grade_endpoint_preserves_structured_result_from_omega(monkeypatch):
    graded = {"submission_id": "submission-1", "score": 4}
    orchestrator = CapturingOrchestrator({"graded": graded})

    async def get_orchestrator():
        return orchestrator

    monkeypatch.setattr(server, "get_orchestrator", get_orchestrator)
    monkeypatch.setattr(
        server,
        "get_agent",
        lambda: pytest.fail("grading endpoint bypassed Omega"),
    )

    response = await server.grade_submission(
        server.GradeRequest(
            quiz={"quiz_id": "quiz-1", "questions": []},
            submission={
                "submission_id": "submission-1",
                "student_id": "student-1",
                "answers": [],
            },
        )
    )

    assert response == graded
    assert orchestrator.request.role == "student"
    assert orchestrator.request.type == "assessment"
    assert orchestrator.task_context["action"] == "grade_submission"


@pytest.mark.asyncio
async def test_startup_surfaces_omega_initialization_failure(monkeypatch):
    async def fail_to_initialize():
        raise RuntimeError("MeTTa policy unavailable")

    monkeypatch.setattr(server, "get_orchestrator", fail_to_initialize)

    with pytest.raises(RuntimeError, match="MeTTa policy unavailable"):
        await server._warm_orchestrator()


@pytest.mark.asyncio
async def test_scheme_without_credentials_uses_omega_prescribed_fallback(monkeypatch):
    rows = [{"week": 1, "lesson": 1, "subStrand": "Core concepts"}]
    orchestrator = CapturingOrchestrator({"rows": rows})

    async def get_orchestrator():
        return orchestrator

    monkeypatch.setattr(server, "get_orchestrator", get_orchestrator)
    monkeypatch.setattr(
        lesson_architect_api,
        "_has_llm_credentials",
        lambda: False,
    )

    response = await lesson_architect_api.generate_scheme(
        lesson_architect_api.GenerateSchemeRequest(
            teacher_id="teacher-1",
            grade="Grade 4",
            subject="Mathematics",
            term="Term 1",
        )
    )

    assert response["rows"] == rows
    assert response["source"] == "prescribed-cbc-fallback"
    assert orchestrator.request.type == "scheme"
    assert orchestrator.task_context["prescribed_cbc_fallback"] is True


@pytest.mark.asyncio
async def test_lesson_worksheet_endpoint_dispatches_through_omega(monkeypatch):
    worksheet = {"title": "Fractions"}
    orchestrator = CapturingOrchestrator(
        {
            "worksheet_id": "worksheet-1",
            "worksheet": worksheet,
        },
        primary_agent="lesson_architect",
    )

    async def get_orchestrator():
        return orchestrator

    monkeypatch.setattr(server, "get_orchestrator", get_orchestrator)

    response = await lesson_architect_api.generate_worksheet(
        lesson_architect_api.GenerateWorksheetRequest(
            teacher_id="teacher-1",
            row={"strand": "Number"},
            grade="Grade 4",
            subject="Mathematics",
        )
    )

    assert response == {
        "success": True,
        "worksheet_id": "worksheet-1",
        "worksheet": worksheet,
        "source": "ai-agents",
    }
    assert orchestrator.request.role == "teacher"
    assert orchestrator.request.type == "worksheet"
    assert orchestrator.primary_agent == "lesson_architect"
    assert orchestrator.task_context["action"] == "generate_worksheet"
