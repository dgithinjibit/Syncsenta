"""Tests for the Assessment & Feedback Agent (Agent 4).

These tests run fully offline by injecting a StubLLMProvider — no Ollama or
network calls. This mirrors the mobile/Pi offline-first deployment model.
"""

import json
import pytest

from syncsenta_agents.agents.assessment import AssessmentAgent
from syncsenta_agents.core.models import (
    GradedSubmission,
    Quiz,
    QuestionType,
    QuizQuestion,
    QuizSubmission,
    StudentAnswer,
)


# ---------------------------------------------------------------------------
# Stub LLM
# ---------------------------------------------------------------------------


class StubLLM:
    """Routes prompts to canned JSON responses based on prompt content."""

    def __init__(self, *, generator=None, grader=None, coach=None):
        self.generator = generator
        self.grader = grader
        self.coach = coach
        self.calls = []

    async def generate(self, prompt: str, *, system: str | None = None) -> str:
        self.calls.append({"system": system, "prompt": prompt})
        s = (system or "").lower()
        if "quiz generator" in s:
            return json.dumps(self.generator)
        if "marking examiner" in s:
            return json.dumps(self.grader)
        if "feedback coach" in s:
            return json.dumps(self.coach)
        raise AssertionError(f"Unrouted system prompt: {system!r}")


GENERATOR_PAYLOAD = {
    "title": "Mathematics Grade 4 — Fractions",
    "competencies": ["MATH.G4.NUMBERS.FRACTIONS"],
    "cbc_citations": ["KICD CBC Mathematics G4 Strand 2.1"],
    "questions": [
        {
            "question": "What is 1/2 + 1/2?",
            "question_type": "multiple_choice",
            "options": ["1", "2", "1/4", "3/4"],
            "correct_answer": "1",
            "competency": "MATH.G4.NUMBERS.FRACTIONS",
            "cbc_citation": "KICD CBC Mathematics G4 Strand 2.1",
            "difficulty": "easy",
            "points": 1,
        },
        {
            "question": "1/4 is greater than 1/2.",
            "question_type": "true_false",
            "options": ["True", "False"],
            "correct_answer": "False",
            "competency": "MATH.G4.NUMBERS.FRACTIONS",
            "cbc_citation": "KICD CBC Mathematics G4 Strand 2.1",
            "difficulty": "easy",
            "points": 1,
        },
        {
            "question": "Explain how you would share 3 mandazis between 4 children.",
            "question_type": "short_answer",
            "options": [],
            "correct_answer": "Cut each mandazi into quarters; each child gets 3/4.",
            "competency": "MATH.G4.NUMBERS.FRACTIONS",
            "cbc_citation": "KICD CBC Mathematics G4 Strand 2.2",
            "difficulty": "medium",
            "points": 2,
            "rubric": ["accuracy", "explanation", "uses fractions"],
        },
    ],
}


GRADER_PAYLOAD = {
    "rubric_scores": {"accuracy": 1.0, "explanation": 0.5, "uses fractions": 1.0},
    "points_earned": 1.5,
    "correct": False,
    "feedback": "Good fraction reasoning — explain the sharing step more clearly next time.",
}


COACH_PAYLOAD = {
    "overall_feedback": "Strong start on fractions — keep practising sharing problems.",
    "next_steps": [
        "Practise dividing whole items into equal parts",
        "Write the fraction for each share before answering",
    ],
}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.fixture
def stub_agent():
    stub = StubLLM(
        generator=GENERATOR_PAYLOAD,
        grader=GRADER_PAYLOAD,
        coach=COACH_PAYLOAD,
    )
    return AssessmentAgent(llm_provider=stub), stub


@pytest.mark.asyncio
async def test_generate_quiz_produces_cbc_aligned_questions(stub_agent):
    agent, _ = stub_agent

    quiz = await agent.generate_quiz(
        grade="g4",
        subject="Mathematics",
        competency="fractions",
        num_questions=3,
    )

    assert isinstance(quiz, Quiz)
    assert len(quiz.questions) == 3
    assert quiz.total_points == 4  # 1 + 1 + 2
    assert quiz.cbc_citations  # Property 37: every quiz carries citations
    for q in quiz.questions:
        assert q.cbc_citation, "every question must have a KICD citation"
        assert q.competency
        assert q.question_id


@pytest.mark.asyncio
async def test_grade_submission_grades_objective_deterministically(stub_agent):
    agent, _ = stub_agent
    quiz = await agent.generate_quiz(
        grade="g4", subject="Mathematics", competency="fractions", num_questions=3
    )

    answers = [
        StudentAnswer(question_id=quiz.questions[0].question_id, answer="1"),       # correct MC
        StudentAnswer(question_id=quiz.questions[1].question_id, answer="True"),    # wrong TF
        StudentAnswer(
            question_id=quiz.questions[2].question_id,
            answer="I would split each mandazi.",
        ),
    ]
    submission = QuizSubmission(
        submission_id="sub_1",
        quiz_id=quiz.quiz_id,
        student_id="student_42",
        answers=answers,
    )

    graded = await agent.grade_submission(quiz, submission)

    assert isinstance(graded, GradedSubmission)
    # MC correct = 1pt, TF wrong = 0, short = 1.5
    assert graded.score == pytest.approx(2.5)
    assert graded.total_points == 4
    assert graded.percentage == pytest.approx(62.5)
    assert graded.grade == "C"  # 50-64 -> approaching
    assert any(c.competency == "MATH.G4.NUMBERS.FRACTIONS" for c in graded.competency_scores)
    assert graded.overall_feedback
    assert graded.next_steps


@pytest.mark.asyncio
async def test_grading_handles_blank_short_answer_without_llm_call():
    stub = StubLLM(generator=GENERATOR_PAYLOAD, grader=GRADER_PAYLOAD, coach=COACH_PAYLOAD)
    agent = AssessmentAgent(llm_provider=stub)

    quiz = await agent.generate_quiz(
        grade="g4", subject="Mathematics", competency="fractions", num_questions=3
    )

    submission = QuizSubmission(
        submission_id="sub_blank",
        quiz_id=quiz.quiz_id,
        student_id="student_blank",
        answers=[
            StudentAnswer(question_id=quiz.questions[0].question_id, answer="1"),
            StudentAnswer(question_id=quiz.questions[1].question_id, answer="False"),
            StudentAnswer(question_id=quiz.questions[2].question_id, answer="   "),
        ],
    )

    graded = await agent.grade_submission(quiz, submission)
    short_answer_result = next(
        g for g in graded.graded_answers
        if g.question_id == quiz.questions[2].question_id
    )

    assert short_answer_result.points_earned == 0
    assert short_answer_result.correct is False
    # Coach is still called once; grader should NOT be called for the blank answer.
    grader_calls = [c for c in stub.calls if "marking examiner" in (c["system"] or "").lower()]
    assert grader_calls == []


@pytest.mark.asyncio
async def test_execute_ta<REDACTED_SECRET>(stub_agent):
    agent, _ = stub_agent

    gen = await agent.execute_task(
        request="quiz me on fractions",
        context={
            "action": "generate_quiz",
            "grade": "g4",
            "subject": "Mathematics",
            "competency": "fractions",
            "num_questions": 3,
        },
    )
    assert gen["agent"] == "assessment"
    assert gen["action"] == "generate_quiz"
    assert gen["quiz"]["total_points"] == 4
    assert gen["cbc_citations"]


@pytest.mark.asyncio
async def test_orchestrator_routes_to_assessment_agent_end_to_end(monkeypatch):
    """Verify SyncSentaOrchestrator wires AssessmentAgent into the LangGraph workflow."""
    from syncsenta_agents.orchestrator.main import SyncSentaOrchestrator
    from syncsenta_agents.orchestrator import workflow as workflow_mod
    from syncsenta_agents.core.models import AgentRequest

    # Stub Ollama analysis LLM in workflow.py so __init__ doesn't reach the network.
    class FakeAnalysisLLM:
        def invoke(self, prompt: str) -> str:
            return "ASSESSMENT"

    monkeypatch.setattr(workflow_mod, "Ollama", lambda **kw: FakeAnalysisLLM())

    orch = SyncSentaOrchestrator()
    await orch.initialize()

    # Replace registered agent's LLM with a stub so no network is touched.
    assessment_agent = orch.workflow_orchestrator.agent_registry["assessment"]
    assessment_agent._llm = StubLLM(
        generator=GENERATOR_PAYLOAD, grader=GRADER_PAYLOAD, coach=COACH_PAYLOAD
    )

    request = AgentRequest(
        message="generate a fractions quiz",
        user_id="teacher_1",
        grade="g4",
        subject="Mathematics",
        role="teacher",
        context={
            "action": "generate_quiz",
            "competency": "fractions",
            "num_questions": 3,
        },
    )

    response = await orch.process_request(request)

    assert response.success is True
    assert "assessment" in response.agents_used or response.primary_agent == "assessment"
    assert response.response  # synthesized text exists
