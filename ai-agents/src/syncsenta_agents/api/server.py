"""FastAPI service routing student and teacher agent tasks through Omega.

Run:
    PYTHONPATH=src venv/bin/uvicorn syncsenta_agents.api.server:app --port 8001 --reload

Endpoints:
    GET  /healthz
    POST /agents/assessment/quiz   -> Quiz JSON
    POST /agents/assessment/grade  -> GradedSubmission JSON
    /lesson-architect/*            -> teacher generation (see LESSON_ARCHITECT_MOUNT_ERROR)

This is the app Render runs (`render.yaml` -> startCommand). `api/scheme_server.py`
mounts the lesson-architect router alone and exists for local teacher demos; it is
deployed nowhere, so routes added there are invisible to the live site.
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from secrets import compare_digest

from ..agents.assessment import AssessmentAgent
from ..core.exceptions import AgentError
from ..core.models import Quiz, QuizSubmission


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

FRONTEND_URL = os.environ.get("FRONTEND_URL", "").strip()
cors_origins = [origin.strip() for origin in FRONTEND_URL.split(",") if origin.strip()]
cors_origins.extend(
    origin
    for origin in ("http://localhost:3000", "http://127.0.0.1:3000")
    if origin not in cors_origins
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-API-Key"],
)


def _configured_api_key() -> Optional[str]:
    value = os.environ.get("SYNCSENTA_AI_AGENTS_API_KEY", "").strip()
    return value or None


def _has_valid_api_key(request: Request) -> bool:
    configured = _configured_api_key()
    if configured is None:
        return False

    authorization = request.headers.get("Authorization", "")
    bearer_key = authorization.removeprefix("Bearer ").strip()
    api_key = request.headers.get("X-API-Key", "").strip()
    return compare_digest(bearer_key, configured) or compare_digest(api_key, configured)


@app.middleware("http")
async def require_service_api_key(request: Request, call_next):
    if request.url.path in {"/healthz", "/docs", "/openapi.json"}:
        return await call_next(request)
    if request.method == "OPTIONS":
        return await call_next(request)

    if _configured_api_key() is None:
        return JSONResponse(
            status_code=503,
            content={"detail": "AI service authentication is not configured"},
        )
    if not _has_valid_api_key(request):
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    return await call_next(request)


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


def get_agent() -> AssessmentAgent:
    global _agent
    if _agent is None:
        _agent = _build_agent()
    return _agent


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


@app.post("/agents/assessment/grade")
async def grade_submission(req: GradeRequest) -> Dict[str, Any]:
    try:
        quiz = Quiz.model_validate(req.quiz)
        submission = QuizSubmission.model_validate(req.submission)
        graded = await get_agent().grade_submission(quiz, submission)
        return graded.model_dump(mode="json")
    except AgentError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except (KeyError, ValueError, TypeError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid payload: {exc}") from exc
