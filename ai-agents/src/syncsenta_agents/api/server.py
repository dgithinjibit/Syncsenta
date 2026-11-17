"""FastAPI service routing student and teacher agent tasks through Omega.

Run:
    PYTHONPATH=src venv/bin/uvicorn syncsenta_agents.api.server:app --port 8001 --reload

Endpoints:
    GET  /healthz
    POST /agents/assessment/quiz   -> Quiz JSON
    POST /agents/assessment/grade  -> GradedSubmission JSON
    POST /agents/chat              -> Omega Queen response
    /lesson-architect/*            -> teacher generation (see LESSON_ARCHITECT_MOUNT_ERROR)

This is the app Render runs (`render.yaml` -> startCommand). `api/scheme_server.py`
mounts the lesson-architect router alone and exists for local teacher demos; it is
deployed nowhere, so routes added there are invisible to the live site.
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ..agents.assessment import AssessmentAgent
from ..core.exceptions import AgentError
from ..core.models import AgentRequest
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
    """Message routed by Omega; role is a routing hint, not authorization."""
    message: str
    user_id: str = "anonymous"
    session_id: Optional[str] = None
    grade: Optional[str] = None
    subject: Optional[str] = None
    language: str = "english"
    role: str = "student"
    type: Optional[str] = None


# ---------------------------------------------------------------------------
# App + agent (singleton)
# ---------------------------------------------------------------------------

app = FastAPI(title="SyncSenta Omega Agent API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev only; tighten for prod
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Lesson Architect (teacher scheme / lesson-plan / worksheet / exam generation)
# ---------------------------------------------------------------------------

# The teacher surfaces in `studio/` reach this service through
# `src/app/api/generate/*`, which calls `/lesson-architect/*`. Until now those
# routes only existed on `api/scheme_server.py` — a second ASGI app that
# `render.yaml` never starts — so every one of them answered 404 and the
# proxies silently returned their prescribed fallback rows. The learner saw a
# scheme that looked generated but was a template, with no error anywhere.
#
# Measured 2026-09-27 against the live service:
#   GET /healthz                      -> 200
#   POST /agents/assessment/quiz      -> route exists (405 for GET)
#   GET /lesson-architect/healthz     -> 404
#
# The import is guarded, not because a failure here is acceptable, but because
# an unguarded one would take `/agents/chat` (the student tutor) down with it.
# `lesson_architect_api` imports the optional Supabase package at module scope.
# Keep its failure isolated so learner chat remains available, and report it
# through /healthz rather than hiding it.
LESSON_ARCHITECT_MOUNT_ERROR: Optional[str] = None

try:
    from . import lesson_architect_api
except Exception as exc:  # noqa: BLE001 — see the comment above
    lesson_architect_api = None
    LESSON_ARCHITECT_MOUNT_ERROR = f"{type(exc).__name__}: {exc}"

lesson_architect_router = (
    lesson_architect_api.router if lesson_architect_api is not None else None
)
if lesson_architect_router is not None:
    app.include_router(lesson_architect_router)


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
    """Return the Omega Queen orchestrator and its registered specialists.

    Normally initialized on FastAPI startup; falls back to lazy init for tests
    or direct ASGI mounting that skips the lifespan event.
    """
    global _orchestrator
    if _orchestrator is None:
        orch = SyncSentaOrchestrator()
        await orch.initialize()
        orch.register_agent("assessment", get_agent())
        if lesson_architect_api is not None:
            orch.register_agent(
                "lesson_architect",
                lesson_architect_api.LessonArchitectAgent(
                    supabase_client=lesson_architect_api.get_supabase_client()
                ),
            )
        _orchestrator = orch
    return _orchestrator


async def run_omega_task(
    request: AgentRequest,
    *,
    task_context: Dict[str, Any],
) -> Dict[str, Any]:
    """Run a structured API task through Omega and return the worker data."""
    orchestrator = await get_orchestrator()
    response = await orchestrator.process_request(
        request,
        task_context=task_context,
    )
    if not response.success:
        raise AgentError(response.error or response.response)
    if not isinstance(response.structured_result, dict):
        raise AgentError("Omega specialist returned no structured result")
    return response.structured_result


@app.on_event("startup")
async def _warm_orchestrator() -> None:
    """Initialize Omega at startup; service availability depends on its policy."""
    await get_orchestrator()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/healthz")
async def healthz() -> Dict[str, Any]:
    return {
        "status": "ok",
        "offline_demo": os.environ.get("SYNCSENTA_OFFLINE_DEMO") == "1",
        # `mounted: false` means the teacher generation routes are 404ing even
        # though this endpoint answers 200. Report it rather than let the
        # studio proxies look healthy from the outside.
        "lesson_architect": {
            "mounted": lesson_architect_router is not None,
            "error": LESSON_ARCHITECT_MOUNT_ERROR,
        },
    }


@app.post("/agents/assessment/quiz")
async def generate_quiz(req: QuizRequest) -> Dict[str, Any]:
    try:
        result = await run_omega_task(
            AgentRequest(
                message=f"Generate a quiz on {req.competency}",
                user_id="anonymous",
                grade=req.grade,
                subject=req.subject,
                role="teacher",
                type="assessment",
            ),
            task_context={
                "action": "generate_quiz",
                "competency": req.competency,
                "num_questions": req.num_questions,
                "language": req.language,
                "question_types": req.question_types,
            },
        )
        quiz = result.get("quiz")
        if not isinstance(quiz, dict):
            raise AgentError("Omega assessment specialist returned no quiz")
        return quiz
    except AgentError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/agents/chat")
async def agent_chat(req: ChatRequest) -> Dict[str, Any]:
    """Route a message through Omega Queen → specialist agent.

    Returns the selected specialist response and its agent identity so the
    Rust backend can broadcast the message and agent activity over WebSocket.
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
            type=req.type,
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
        result = await run_omega_task(
            AgentRequest(
                message="Grade the submitted quiz",
                user_id=req.submission.get("student_id") or "anonymous",
                role="student",
                type="assessment",
            ),
            task_context={
                "action": "grade_submission",
                "quiz": req.quiz,
                "submission": req.submission,
            },
        )
        graded = result.get("graded")
        if not isinstance(graded, dict):
            raise AgentError("Omega assessment specialist returned no grade")
        return graded
    except AgentError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except (KeyError, ValueError, TypeError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid payload: {exc}") from exc
