"""Assessment & Feedback Agent (Agent 4).

A CrewAI-style multi-step agent built on a swappable LLM provider so it can run
offline (mobile / Pi) with stubbed inference and online with Ollama (gemma_2b).

Pipeline:
    Generator  -> produces quiz aligned to CBC competency
    Grader     -> auto-grades submission (deterministic + LLM short-answer)
    Coach      -> rubric-aligned feedback + next steps + competency tracking
"""

from __future__ import annotations

import json
import re
import uuid
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Protocol

from ..core.config import config
from ..core.exceptions import AgentError
from ..core.logging import AgentLogger
from ..core.models import (
    CompetencyScore,
    GradedAnswer,
    GradedSubmission,
    Quiz,
    QuizQuestion,
    QuizSubmission,
    QuestionType,
    StudentAnswer,
)


# ---------------------------------------------------------------------------
# LLM provider abstraction
# ---------------------------------------------------------------------------


class LLMProvider(Protocol):
    """Minimal interface so tests can inject a stub and the runtime can use Ollama."""

    async def generate(self, prompt: str, *, system: str | None = None) -> str: ...


class OllamaLLMProvider:
    """LangChain Ollama wrapper bound to the assessment model (gemma_2b by default)."""

    def __init__(self, model_key: str = "assessment", base_url: str | None = None) -> None:
        from langchain_community.llms import Ollama  # local import to keep tests light

        model_name = config.ollama_models[
            config.agent_model_mapping.get(model_key, "gemma_2b")
        ]
        self._llm = Ollama(
            model=model_name,
            base_url=base_url or config.ollama_base_url,
            temperature=0.2,
        )

    async def generate(self, prompt: str, *, system: str | None = None) -> str:
        import asyncio

        full = f"[SYSTEM]\n{system}\n\n[USER]\n{prompt}" if system else prompt
        return await asyncio.to_thread(self._llm.invoke, full)


# ---------------------------------------------------------------------------
# Crew specialists
# ---------------------------------------------------------------------------


@dataclass
class CrewMember:
    """A single specialist with its role + system prompt."""

    name: str
    role: str
    goal: str

    def system_prompt(self) -> str:
        return (
            f"You are the {self.role} on SyncSenta's Assessment Crew, "
            f"working under Kenya's CBC curriculum (KICD). "
            f"Goal: {self.goal}. "
            "Be culturally authentic to Kenya. Cite KICD strands when relevant. "
            "Respond with strict JSON when the task asks for JSON — no prose, no markdown fences."
        )


GENERATOR = CrewMember(
    name="generator",
    role="CBC Quiz Generator",
    goal="Produce competency-aligned quiz questions with explicit KICD citations.",
)
GRADER = CrewMember(
    name="grader",
    role="Real-Time Marking Examiner",
    goal="Grade short-answer responses against a rubric, returning per-criterion scores.",
)
COACH = CrewMember(
    name="coach",
    role="Feedback Coach",
    goal="Give kind, specific, CBC-rubric-aligned feedback and next learning steps.",
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _safe_json_loads(text: str) -> Any:
    """Tolerant JSON parse — strips fences and grabs first JSON object/array."""
    if not text:
        raise AgentError("LLM returned empty response")

    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError as exc:
            raise AgentError(f"Failed to parse LLM JSON: {exc}") from exc

    raise AgentError("LLM response did not contain JSON")


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _grade_letter(pct: float) -> str:
    if pct >= 80:
        return "A"  # exceeding expectations
    if pct >= 65:
        return "B"  # meeting expectations
    if pct >= 50:
        return "C"  # approaching expectations
    if pct >= 30:
        return "D"
    return "E"


def _mastery_level(pct: float) -> str:
    if pct >= 80:
        return "exceeding"
    if pct >= 65:
        return "meeting"
    if pct >= 50:
        return "approaching"
    return "below"


# ---------------------------------------------------------------------------
# Assessment Agent
# ---------------------------------------------------------------------------


class AssessmentAgent:
    """Agent 4 — Assessment & Feedback.

    Public surface matches the orchestrator's contract:
        await agent.execute_task(request: str, context: dict) -> dict

    Supported actions (resolved from request text + context["action"]):
        generate_quiz, grade_submission, feedback
    """

    def __init__(self, llm_provider: Optional[LLMProvider] = None) -> None:
        self.logger = AgentLogger("assessment_agent")
        self._llm = llm_provider  # lazy: only built when actually needed

    # --- LLM lazy init ----------------------------------------------------

    def _llm_provider(self) -> LLMProvider:
        if self._llm is None:
            self._llm = OllamaLLMProvider()
        return self._llm

    # --- Orchestrator entrypoint -----------------------------------------

    async def execute_task(self, request: str, context: Dict[str, Any]) -> Dict[str, Any]:
        action = (context or {}).get("action") or self._infer_action(request)

        try:
            if action == "generate_quiz":
                quiz = await self.generate_quiz(
                    grade=context.get("grade", "g4"),
                    subject=context.get("subject", "Mathematics"),
                    competency=context.get("competency", request),
                    num_questions=int(context.get("num_questions", 5)),
                    language=context.get("language", "english"),
                    question_types=context.get("question_types"),
                )
                return {
                    "agent": "assessment",
                    "action": "generate_quiz",
                    "response": f"Generated {len(quiz.questions)}-question quiz on {quiz.title}.",
                    "quiz": quiz.model_dump(mode="json"),
                    "cbc_citations": quiz.cbc_citations,
                }

            if action == "grade_submission":
                submission = QuizSubmission(**context["submission"])
                quiz = Quiz(**context["quiz"])
                graded = await self.grade_submission(quiz, submission)
                return {
                    "agent": "assessment",
                    "action": "grade_submission",
                    "response": graded.overall_feedback,
                    "graded": graded.model_dump(mode="json"),
                    "cbc_citations": graded.cbc_citations,
                }

            if action == "feedback":
                graded = GradedSubmission(**context["graded"])
                feedback = await self.generate_feedback(graded)
                return {
                    "agent": "assessment",
                    "action": "feedback",
                    "response": feedback["overall_feedback"],
                    "feedback": feedback,
                }

            raise AgentError(f"Unsupported assessment action: {action}")

        except AgentError:
            raise
        except Exception as exc:  # noqa: BLE001
            self.logger.error("Assessment task failed", error=str(exc), action=action)
            raise AgentError(f"Assessment failure: {exc}") from exc

    @staticmethod
    def _infer_action(request: str) -> str:
        text = (request or "").lower()
        if any(k in text for k in ("grade ", "mark ", "score ")):
            return "grade_submission"
        if "feedback" in text:
            return "feedback"
        return "generate_quiz"

    # --- 1. Generator -----------------------------------------------------

    async def generate_quiz(
        self,
        *,
        grade: str,
        subject: str,
        competency: str,
        num_questions: int = 5,
        language: str = "english",
        question_types: Optional[List[str]] = None,
    ) -> Quiz:
        types = question_types or ["multiple_choice", "true_false", "short_answer"]

        prompt = f"""Generate {num_questions} quiz questions for Kenyan CBC.

Grade: {grade}
Subject: {subject}
Competency / Topic: {competency}
Language: {language}
Allowed question types: {types}

Return STRICT JSON shaped like:
{{
  "title": "...",
  "competencies": ["MATH.G4.NUMBERS.FRACTIONS", ...],
  "cbc_citations": ["KICD CBC {subject} {grade} Strand X.Y", ...],
  "questions": [
    {{
      "question": "...",
      "question_type": "multiple_choice|true_false|short_answer",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "...",
      "competency": "...",
      "cbc_citation": "...",
      "difficulty": "easy|medium|hard",
      "points": 1,
      "rubric": ["criterion1", "criterion2"]
    }}
  ]
}}

Rules:
- Every question MUST have a cbc_citation and a competency.
- For multiple_choice provide 4 options; for true_false provide ["True","False"].
- For short_answer provide a 2-4 item rubric and leave options empty.
- Use Kenyan cultural context (shillings, local names, ugali, matatu, etc.).
"""

        raw = await self._llm_provider().generate(prompt, system=GENERATOR.system_prompt())
        data = _safe_json_loads(raw)
        return self._build_quiz(data, grade=grade, subject=subject, language=language)

    def _build_quiz(
        self,
        data: Dict[str, Any],
        *,
        grade: str,
        subject: str,
        language: str,
    ) -> Quiz:
        if not isinstance(data, dict) or "questions" not in data:
            raise AgentError("Generator returned invalid quiz schema")

        questions: List[QuizQuestion] = []
        citations: List[str] = list(data.get("cbc_citations") or [])

        for raw_q in data["questions"]:
            qtype_raw = (raw_q.get("question_type") or "multiple_choice").lower()
            try:
                qtype = QuestionType(qtype_raw)
            except ValueError:
                qtype = QuestionType.SHORT_ANSWER

            citation = raw_q.get("cbc_citation") or (
                citations[0] if citations else f"KICD CBC {subject} {grade}"
            )
            if citation not in citations:
                citations.append(citation)

            questions.append(
                QuizQuestion(
                    question_id=f"q_{uuid.uuid4().hex[:8]}",
                    question=raw_q["question"],
                    question_type=qtype,
                    options=list(raw_q.get("options") or []),
                    correct_answer=str(raw_q.get("correct_answer", "")),
                    competency=raw_q.get("competency", "UNSPECIFIED"),
                    cbc_citation=citation,
                    difficulty=raw_q.get("difficulty", "medium"),
                    points=int(raw_q.get("points", 1)),
                    rubric=raw_q.get("rubric"),
                )
            )

        if not questions:
            raise AgentError("Generator produced zero questions")

        title = data.get("title") or f"{subject} {grade} — {data.get('competencies', ['quiz'])[0]}"

        return Quiz(
            quiz_id=f"quiz_{uuid.uuid4().hex[:10]}",
            title=str(title),
            grade=grade,
            subject=subject,
            competencies=list(data.get("competencies") or [q.competency for q in questions]),
            questions=questions,
            total_points=sum(q.points for q in questions),
            cbc_citations=citations,
            language=language,
        )

    # --- 2. Grader --------------------------------------------------------

    async def grade_submission(
        self,
        quiz: Quiz,
        submission: QuizSubmission,
    ) -> GradedSubmission:
        """Grade a submission. Deterministic for MC/TF; LLM-rubric for short-answer."""
        answer_map: Dict[str, str] = {a.question_id: a.answer for a in submission.answers}
        graded_answers: List[GradedAnswer] = []

        for q in quiz.questions:
            student_answer = answer_map.get(q.question_id, "")
            if q.question_type in (QuestionType.MULTIPLE_CHOICE, QuestionType.TRUE_FALSE):
                graded_answers.append(self._grade_objective(q, student_answer))
            else:
                graded_answers.append(await self._grade_short_answer(q, student_answer))

        score = sum(g.points_earned for g in graded_answers)
        total = quiz.total_points or sum(g.points_possible for g in graded_answers) or 1
        pct = round((score / total) * 100, 1)

        competency_scores = self._aggregate_competencies(graded_answers, quiz)
        feedback = await self._coach_feedback(quiz, graded_answers, pct, competency_scores)

        return GradedSubmission(
            submission_id=submission.submission_id,
            quiz_id=quiz.quiz_id,
            student_id=submission.student_id,
            graded_answers=graded_answers,
            score=score,
            total_points=total,
            percentage=pct,
            grade=_grade_letter(pct),
            competency_scores=competency_scores,
            overall_feedback=feedback["overall_feedback"],
            next_steps=feedback["next_steps"],
            cbc_citations=quiz.cbc_citations,
        )

    def _grade_objective(self, q: QuizQuestion, answer: str) -> GradedAnswer:
        correct = _norm(answer) == _norm(q.correct_answer)
        return GradedAnswer(
            question_id=q.question_id,
            correct=correct,
            points_earned=float(q.points if correct else 0),
            points_possible=q.points,
            feedback=(
                "Correct! Well reasoned."
                if correct
                else f"Not quite. The correct answer is: {q.correct_answer}."
            ),
            competency=q.competency,
        )

    async def _grade_short_answer(self, q: QuizQuestion, answer: str) -> GradedAnswer:
        rubric = q.rubric or ["accuracy", "explanation", "use of correct terms"]

        if not answer.strip():
            return GradedAnswer(
                question_id=q.question_id,
                correct=False,
                points_earned=0.0,
                points_possible=q.points,
                rubric_scores={c: 0.0 for c in rubric},
                feedback="No answer provided. Try writing at least one sentence next time.",
                competency=q.competency,
            )

        prompt = f"""Grade this CBC short-answer response.

Question: {q.question}
Reference answer: {q.correct_answer}
Student answer: {answer}
Rubric criteria: {rubric}
Points possible: {q.points}

Return STRICT JSON:
{{
  "rubric_scores": {{"<criterion>": 0.0_to_1.0, ...}},
  "points_earned": <0..{q.points}>,
  "correct": true|false,
  "feedback": "1-2 sentence kind, specific feedback citing what to improve."
}}
"""
        raw = await self._llm_provider().generate(prompt, system=GRADER.system_prompt())
        data = _safe_json_loads(raw)

        rubric_scores = {
            c: float(max(0.0, min(1.0, (data.get("rubric_scores") or {}).get(c, 0.0))))
            for c in rubric
        }
        points_earned = float(max(0.0, min(q.points, data.get("points_earned", 0))))

        return GradedAnswer(
            question_id=q.question_id,
            correct=bool(data.get("correct", points_earned >= q.points * 0.7)),
            points_earned=points_earned,
            points_possible=q.points,
            rubric_scores=rubric_scores,
            feedback=str(data.get("feedback", "")),
            competency=q.competency,
        )

    def _aggregate_competencies(
        self,
        graded_answers: List[GradedAnswer],
        quiz: Quiz,
    ) -> List[CompetencyScore]:
        buckets: Dict[str, Dict[str, float]] = {}
        for g in graded_answers:
            b = buckets.setdefault(g.competency, {"earned": 0.0, "possible": 0.0})
            b["earned"] += g.points_earned
            b["possible"] += g.points_possible

        scores: List[CompetencyScore] = []
        for competency, b in buckets.items():
            possible = b["possible"] or 1
            pct = round((b["earned"] / possible) * 100, 1)
            scores.append(
                CompetencyScore(
                    competency=competency,
                    points_earned=b["earned"],
                    points_possible=int(possible),
                    mastery_pct=pct,
                    mastery_level=_mastery_level(pct),
                )
            )
        return scores

    # --- 3. Coach (feedback + next steps) ---------------------------------

    async def _coach_feedback(
        self,
        quiz: Quiz,
        graded_answers: List[GradedAnswer],
        overall_pct: float,
        competency_scores: List[CompetencyScore],
    ) -> Dict[str, Any]:
        weak = [c for c in competency_scores if c.mastery_pct < 65]
        strong = [c for c in competency_scores if c.mastery_pct >= 80]

        prompt = f"""You are giving feedback to a Kenyan CBC student on quiz "{quiz.title}".

Overall: {overall_pct}%  Grade band: {_grade_letter(overall_pct)} ({_mastery_level(overall_pct)} expectations)
Strong competencies: {[c.competency for c in strong]}
Weak competencies: {[c.competency for c in weak]}
Per-question feedback:
{json.dumps([{'q': g.question_id, 'correct': g.correct, 'fb': g.feedback} for g in graded_answers], indent=2)}

Return STRICT JSON:
{{
  "overall_feedback": "2-3 warm, specific sentences in plain language.",
  "next_steps": ["actionable step 1", "actionable step 2", "actionable step 3"]
}}
"""
        try:
            raw = await self._llm_provider().generate(prompt, system=COACH.system_prompt())
            data = _safe_json_loads(raw)
            return {
                "overall_feedback": str(
                    data.get("overall_feedback") or self._fallback_feedback(overall_pct, weak)
                ),
                "next_steps": list(data.get("next_steps") or self._fallback_next_steps(weak)),
            }
        except AgentError:
            # Offline-safe fallback so a missing/broken LLM doesn't fail grading.
            self.logger.warning("Coach LLM unavailable; using fallback feedback")
            return {
                "overall_feedback": self._fallback_feedback(overall_pct, weak),
                "next_steps": self._fallback_next_steps(weak),
            }

    @staticmethod
    def _fallback_feedback(pct: float, weak: List[CompetencyScore]) -> str:
        band = _mastery_level(pct)
        if not weak:
            return f"Excellent work — you scored {pct}% and are {band} expectations across all competencies."
        weak_names = ", ".join(c.competency for c in weak[:3])
        return (
            f"You scored {pct}% ({band} expectations). "
            f"Focus your next practice on: {weak_names}."
        )

    @staticmethod
    def _fallback_next_steps(weak: List[CompetencyScore]) -> List[str]:
        if not weak:
            return ["Try a harder quiz to keep stretching your skills."]
        return [f"Review and practice: {c.competency}" for c in weak[:3]]

    # --- 4. Standalone feedback API --------------------------------------

    async def generate_feedback(self, graded: GradedSubmission) -> Dict[str, Any]:
        """Re-generate feedback for an already-graded submission (e.g. after parent review)."""
        weak = [c for c in graded.competency_scores if c.mastery_pct < 65]
        strong = [c for c in graded.competency_scores if c.mastery_pct >= 80]

        prompt = f"""Provide rubric-aligned feedback for student {graded.student_id}.

Score: {graded.percentage}% ({graded.grade})
Strong: {[c.competency for c in strong]}
Weak: {[c.competency for c in weak]}

Return STRICT JSON: {{"overall_feedback": "...", "next_steps": ["...","..."]}}
"""
        try:
            raw = await self._llm_provider().generate(prompt, system=COACH.system_prompt())
            data = _safe_json_loads(raw)
            return {
                "overall_feedback": str(
                    data.get("overall_feedback") or self._fallback_feedback(graded.percentage, weak)
                ),
                "next_steps": list(data.get("next_steps") or self._fallback_next_steps(weak)),
                "competency_scores": [c.model_dump() for c in graded.competency_scores],
            }
        except AgentError:
            return {
                "overall_feedback": self._fallback_feedback(graded.percentage, weak),
                "next_steps": self._fallback_next_steps(weak),
                "competency_scores": [c.model_dump() for c in graded.competency_scores],
            }
