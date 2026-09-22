"""FastAPI HTTP wrapper exposing the Assessment Agent to the student frontend.

Run:
    PYTHONPATH=src venv/bin/uvicorn syncsenta_agents.api.server:app --port 8001 --reload

Endpoints:
    GET  /healthz
    POST /agents/assessment/quiz   -> Quiz JSON
    POST /agents/assessment/grade  -> GradedSubmission JSON
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ..agents.assessment import AssessmentAgent
from ..core.exceptions import AgentError
from ..core.models import AgentRequest, Quiz, QuizSubmission
from ..orchestrator.main import SyncSentaOrchestrator


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class QuizRequest(BaseModel):
    grade: str = "g4"
    subject: str = "Mathematics"
    competency: str = "fractions"
    num_questions: int = Field(default=5, ge=1, le=20)
    language: str = "english"
    question_types: Optional[List[str]] = None


class GradeRequest(BaseModel):
    quiz: Dict[str, Any]
    submission: Dict[str, Any]


class ChatRequest(BaseModel):
    """Student message routed through the Teacher_Agent orchestrator."""
    message: str
    user_id: str = "anonymous"
    session_id: Optional[str] = None
    grade: Optional[str] = None
    subject: Optional[str] = None
    language: str = "english"
    role: str = "student"


# ---------------------------------------------------------------------------
# App + agent (singleton)
# ---------------------------------------------------------------------------

app = FastAPI(title="SyncSenta Assessment Agent API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev only; tighten for prod
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _build_agent() -> AssessmentAgent:
    """Build the agent. If SYNCSENTA_OFFLINE_DEMO=1, use a deterministic stub
    so the student site can be tested without a running Ollama server."""
    if os.environ.get("SYNCSENTA_OFFLINE_DEMO") == "1":
        from .demo_stub import DemoStubLLM

        return AssessmentAgent(llm_provider=DemoStubLLM())
    return AssessmentAgent()


_agent: Optional[AssessmentAgent] = None
_orchestrator: Optional[SyncSentaOrchestrator] = None


def get_agent() -> AssessmentAgent:
    global _agent
    if _agent is None:
        _agent = _build_agent()
    return _agent


async def get_orchestrator() -> SyncSentaOrchestrator:
    """Return the multi-agent orchestrator (Teacher_Agent + 7 specialists).

    Normally initialized on FastAPI startup; falls back to lazy init for tests
    or direct ASGI mounting that skips the lifespan event.
    """
    global _orchestrator
    if _orchestrator is None:
        orch = SyncSentaOrchestrator()
        await orch.initialize()
        _orchestrator = orch
    return _orchestrator


@app.on_event("startup")
async def _warm_orchestrator() -> None:
    # Pay the LangGraph + agent-registry boot cost once at server start so
    # the first /agents/chat request doesn't take the hit.
    try:
        await get_orchestrator()
    except Exception:
        # Don't block server startup on orchestrator init — get_orchestrator
        # will retry lazily on first request and surface the error there.
        pass


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/healthz")
async def healthz() -> Dict[str, Any]:
    return {
        "status": "ok",
        "offline_demo": os.environ.get("SYNCSENTA_OFFLINE_DEMO") == "1",
    }


@app.post("/agents/assessment/quiz")
async def generate_quiz(req: QuizRequest) -> Dict[str, Any]:
    try:
        quiz = await get_agent().generate_quiz(
            grade=req.grade,
            subject=req.subject,
            competency=req.competency,
            num_questions=req.num_questions,
            language=req.language,
            question_types=req.question_types,
        )
        return quiz.model_dump(mode="json")
    except AgentError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/agents/chat")
async def agent_chat(req: ChatRequest) -> Dict[str, Any]:
    """Route a student message through Teacher_Agent → specialist agent.

    Returns the synthesized response plus which agents participated, so the
    Rust backend can broadcast both the message and the agent activity over
    WebSocket to the teacher dashboard.
    """
    try:
        orch = await get_orchestrator()
        agent_req = AgentRequest(
            message=req.message,
            user_id=req.user_id,
            session_id=req.session_id,
            grade=req.grade,
            subject=req.subject,
            role=req.role,
            context={"language": req.language},
        )
        resp = await orch.process_request(agent_req)
        return {
            "success": resp.success,
            "response": resp.response,
            "primary_agent": resp.primary_agent,
            "agents_used": resp.agents_used,
            "response_time_ms": resp.response_time_ms,
            "fallback_used": resp.fallback_used,
            "error": resp.error,
        }
    except AgentError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/agents/assessment/grade")
async def grade_submission(req: GradeRequest) -> Dict[str, Any]:
    try:
        quiz = Quiz(**req.quiz)
        submission = QuizSubmission(**req.submission)
        graded = await get_agent().grade_submission(quiz, submission)
        return graded.model_dump(mode="json")
    except AgentError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except (KeyError, ValueError, TypeError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid payload: {exc}") from exc
