import pytest

from syncsenta_agents.api import lesson_architect_api
from syncsenta_agents.api import server


@pytest.mark.asyncio
async def test_quiz_endpoint_uses_assessment_agent(monkeypatch):
    quiz = {"quiz_id": "quiz-1", "questions": []}

    class CapturingAssessmentAgent:
        def __init__(self):
            self.arguments = None

        async def generate_quiz(self, **arguments):
            self.arguments = arguments

            class QuizResult:
                def model_dump(self, *, mode):
                    return quiz

            return QuizResult()

    agent = CapturingAssessmentAgent()
    monkeypatch.setattr(server, "get_agent", lambda: agent)

    response = await server.generate_quiz(
        server.QuizRequest(
            grade="Grade 4",
            subject="Mathematics",
            competency="fractions",
            num_questions=3,
        )
    )

    assert response == quiz
    assert agent.arguments == {
        "grade": "Grade 4",
        "subject": "Mathematics",
        "competency": "fractions",
        "num_questions": 3,
        "language": "english",
        "question_types": None,
    }


@pytest.mark.asyncio
async def test_grade_endpoint_uses_assessment_agent(monkeypatch):
    graded = {"submission_id": "submission-1", "score": 4}

    class CapturingAssessmentAgent:
        def __init__(self):
            self.quiz = None
            self.submission = None

        async def grade_submission(self, quiz, submission):
            self.quiz = quiz
            self.submission = submission

            class GradeResult:
                def model_dump(self, *, mode):
                    return graded

            return GradeResult()

    agent = CapturingAssessmentAgent()
    monkeypatch.setattr(server, "get_agent", lambda: agent)

    response = await server.grade_submission(
        server.GradeRequest(
            quiz={
                "quiz_id": "quiz-1",
                "title": "Fractions",
                "grade": "Grade 6",
                "subject": "Mathematics",
                "competencies": ["fractions"],
                "questions": [],
                "total_points": 4,
                "cbc_citations": [],
            },
            submission={
                "submission_id": "submission-1",
                "quiz_id": "quiz-1",
                "student_id": "student-1",
                "answers": [],
            },
        )
    )

    assert response == graded
    assert agent.quiz.quiz_id == "quiz-1"
    assert agent.submission.quiz_id == "quiz-1"
    assert agent.submission.student_id == "student-1"


@pytest.mark.asyncio
async def test_scheme_without_credentials_uses_prescribed_fallback(monkeypatch):
    rows = [{"week": 1, "lesson": 1, "subStrand": "Core concepts"}]
    class CapturingLessonArchitect:
        def __init__(self):
            self.context = None

        async def execute_task(self, request, context):
            self.context = context
            return {"rows": rows}

    agent = CapturingLessonArchitect()
    monkeypatch.setattr(
        lesson_architect_api,
        "LessonArchitectAgent",
        lambda **_: agent,
        raising=False,
    )
    monkeypatch.setattr(lesson_architect_api, "get_supabase_client", lambda: None)
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
    assert agent.context["action"] == "generate_scheme"
    assert agent.context["prescribed_cbc_fallback"] is True
    assert agent.context["teacher_id"] == "teacher-1"


@pytest.mark.asyncio
async def test_lesson_worksheet_endpoint_dispatches_to_lesson_architect_agent(monkeypatch):
    worksheet = {"title": "Fractions"}
    class CapturingLessonArchitect:
        def __init__(self):
            self.request = None
            self.context = None

        async def execute_task(self, request, context):
            self.request = request
            self.context = context
            return {"worksheet_id": "worksheet-1", "worksheet": worksheet}

    agent = CapturingLessonArchitect()
    monkeypatch.setattr(
        lesson_architect_api,
        "LessonArchitectAgent",
        lambda **_: agent,
        raising=False,
    )
    monkeypatch.setattr(lesson_architect_api, "get_supabase_client", lambda: None)

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
    assert agent.request == "Generate a worksheet for this lesson"
    assert agent.context["action"] == "generate_worksheet"
    assert agent.context["teacher_id"] == "teacher-1"
    assert agent.context["grade"] == "Grade 4"
    assert agent.context["subject"] == "Mathematics"


@pytest.mark.asyncio
async def test_run_omega_task_dispatches_lesson_architect_action(monkeypatch):
    class CapturingLessonArchitect:
        def __init__(self, **kwargs):
            self.request = None
            self.context = None

        async def execute_task(self, request, context):
            self.request = request
            self.context = context
            return {"lesson_plan_id": "lesson-1", "lesson_plan": {"title": "Fractions"}}

    agent = CapturingLessonArchitect
    monkeypatch.setattr(
        "syncsenta_agents.agents.lesson_architect.LessonArchitectAgent",
        agent,
    )
    monkeypatch.setattr(
        "syncsenta_agents.db.supabase_client.get_supabase_client",
        lambda: None,
    )

    from syncsenta_agents.core.models import AgentRequest

    result = await server.run_omega_task(
        AgentRequest(
            message="Generate lesson 1 for week 2",
            user_id="teacher-1",
            grade="Grade 6",
            subject="Mathematics",
            role="teacher",
            type="lesson-plan",
        ),
        task_context={
            "action": "generate_lesson_plan",
            "week": 2,
            "lesson": 1,
            "row": {"strand": "Number", "subStrand": "Fractions"},
        },
    )

    assert result["lesson_plan_id"] == "lesson-1"


@pytest.mark.asyncio
async def test_lesson_plan_endpoint_dispatches_to_lesson_architect_agent(monkeypatch):
    lesson_plan = {"title": "Fractions"}

    class CapturingLessonArchitect:
        def __init__(self):
            self.request = None
            self.context = None

        async def execute_task(self, request, context):
            self.request = request
            self.context = context
            return {"lesson_plan_id": "lesson-1", "lesson_plan": lesson_plan}

    agent = CapturingLessonArchitect()
    monkeypatch.setattr(
        lesson_architect_api,
        "LessonArchitectAgent",
        lambda **_: agent,
        raising=False,
    )
    monkeypatch.setattr(lesson_architect_api, "get_supabase_client", lambda: None)

    response = await lesson_architect_api.generate_lesson_plan(
        lesson_architect_api.GenerateLessonPlanRequest(
            teacher_id="teacher-1",
            week=2,
            lesson=1,
            row={"strand": "Number", "subStrand": "Fractions"},
            grade="Grade 6",
            subject="Mathematics",
        )
    )

    assert response == {
        "success": True,
        "lesson_plan_id": "lesson-1",
        "lesson_plan": lesson_plan,
        "source": "ai-agents",
    }
    assert agent.request == "Generate lesson 1 for week 2"
    assert agent.context["action"] == "generate_lesson_plan"
    assert agent.context["teacher_id"] == "teacher-1"
