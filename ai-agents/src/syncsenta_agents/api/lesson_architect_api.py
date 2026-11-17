"""Lesson Architect API endpoints for scheme and lesson plan management."""

import os
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import AliasChoices, BaseModel, Field

from ..db.supabase_client import get_supabase_client
from ..core.logging import get_logger
from ..core.models import AgentRequest

router = APIRouter(prefix="/lesson-architect", tags=["lesson-architect"])
logger = get_logger("lesson_architect_api")


def _has_llm_credentials() -> bool:
    """Return whether any supported cloud provider is configured."""
    return bool(
        os.getenv("NVIDIA_API_KEY")
        or os.getenv("OPENAI_API_KEY")
        or os.getenv("GROQ_API_KEY")
    )


async def _run_omega_teacher_task(
    *,
    message: str,
    teacher_id: str,
    grade: Optional[str],
    subject: Optional[str],
    request_type: str,
    task_context: Dict[str, Any],
) -> Dict[str, Any]:
    from .server import run_omega_task

    return await run_omega_task(
        AgentRequest(
            message=message,
            user_id=teacher_id,
            grade=grade,
            subject=subject,
            role="teacher",
            type=request_type,
        ),
        task_context=task_context,
    )


class GenerateSchemeRequest(BaseModel):
    """Request to generate a scheme of work end-to-end (LLM + KSA guardrails)."""
    teacher_id: str
    grade: str
    subject: str
    term: str
    mode: str = "standard"
    language: str = "english"
    selected_strands: List[Dict[str, Any]] = Field(
        default_factory=list,
        validation_alias=AliasChoices("selected_strands", "strands"),
    )
    teacher_inputs: Dict[str, str] = Field(
        default_factory=dict,
        validation_alias=AliasChoices("teacher_inputs", "teacherInputs"),
    )
    indigenous_language: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("indigenous_language", "indigenousLanguage"),
    )


class SchemeRequest(BaseModel):
    """Request to save a pre-generated scheme.

    Accepts the structured ``SchemeRow[]`` JSON that the scheme-wizard renderer
    consumes. ``content`` is accepted as a legacy fallback for clients that
    still POST a markdown blob — those rows get wrapped in a single placeholder
    entry so the studio can at least display them, but new clients should
    always send ``rows``.
    """

    teacher_id: str
    grade: str
    subject: str
    term: str
    title: str
    rows: Optional[List[Dict[str, Any]]] = None
    content: Optional[str] = None  # legacy markdown fallback
    mode: str = "standard"
    language: str = "english"


class ListSchemesRequest(BaseModel):
    """Request to list schemes."""
    teacher_id: str
    grade: Optional[str] = None
    subject: Optional[str] = None


class GenerateWorksheetRequest(BaseModel):
    """Request to generate a KSA-balanced worksheet for one SchemeRow.

    The teacher passes the SchemeRow they just generated (camelCase or
    legacy snake_case keys both work). Output ``worksheet`` matches
    :class:`agents.scheme.worksheet.Worksheet` — discriminated-union items
    (fill_blank | short_answer | problem_solving | matching | reflect), each
    KSA-tagged, plus instructions, extension challenge, and answer key.
    """

    teacher_id: str
    row: Dict[str, Any]
    grade: str
    subject: str
    term: Optional[str] = None
    language: str = "english"
    duration_minutes: int = 30


class GenerateTextLevelerRequest(BaseModel):
    """Request to generate a grade-leveled passage and comprehension questions.

    Input_text is preferred. If source_url is provided, it is included as
    metadata for the prompt. At least one of ``input_text`` or ``source_url``
    is required.
    """

    teacher_id: str
    grade: str
    subject: str
    language: str = "english"
    input_text: Optional[str] = None
    source_url: Optional[str] = None


class UnpackOutcomeRequest(BaseModel):
    """Request to unpack a KICD learning outcome.

    Smallest Tier 1 teacher tool — turns a raw KICD outcome into
    student-friendly "I can…" statements + measurable success criteria.
    Output shape matches :class:`agents.unpacker.UnpackedOutcome` (camelCase
    field names; studio renders directly).
    """

    teacher_id: str
    outcome: str
    grade: str
    subject: str
    language: str = "english"


class GenerateExamRequest(BaseModel):
    """Request to generate an end-of-term exam scope-validated against the allocation.

    ``allocation`` is the strand/sub-strand list that defines what's IN scope
    for the term — typically derived from the saved scheme. ``counts`` is
    optional and defaults to ``{mcq: 15, short: 8, long: 2}`` to match the TS
    source (``_inventory/scheme-scribe-ai/supabase/functions/generate-exam/index.ts:343``).
    """

    teacher_id: str
    grade: str
    subject: str
    term: str
    allocation: List[Dict[str, Any]]
    counts: Optional[Dict[str, int]] = None


class GenerateDifferentiationRequest(BaseModel):
    """Request to generate three-tier differentiation for one lesson plan.

    Tier 2 tool — composes the Tier 1 lesson-plan artefact. ``lesson_plan``
    is the JSON dict returned by ``/generate-lesson-plan`` (or a manually
    composed equivalent that carries ``grade, subject, strand, subStrand,
    objectives`` at minimum). ``lesson_plan_id`` is optional and is
    recorded alongside the saved differentiation so the studio can join
    back to the source plan.
    """

    teacher_id: str
    lesson_plan: Dict[str, Any]
    language: str = "english"
    lesson_plan_id: Optional[str] = None


class GenerateLessonPlanRequest(BaseModel):
    """Request to generate one CBC lesson plan from a SchemeRow.

    The studio passes the selected ``SchemeRow`` directly as ``row`` along with
    grade/subject context. ``scheme_id`` is the legacy fallback (load the row
    from Supabase) and only kicks in when ``row`` is absent.
    """

    teacher_id: str
    week: int
    lesson: int = 1
    scheme_id: Optional[str] = None
    row: Optional[Dict[str, Any]] = None
    grade: Optional[str] = None
    subject: Optional[str] = None
    term: Optional[str] = None
    additional_notes: Optional[str] = None
    language: str = "english"


@router.post("/generate-scheme")
async def generate_scheme(request: GenerateSchemeRequest) -> Dict[str, Any]:
    """Generate a scheme of work and return structured SchemeRow[] JSON.

    Omega selects the lesson-architect specialist, which returns the validated
    SchemeRow JSON consumed by the studio.
    """

    try:
        prescribed_fallback = not _has_llm_credentials()
        result = await _run_omega_teacher_task(
            message=f"Generate a {request.grade} {request.subject} scheme",
            teacher_id=request.teacher_id,
            grade=request.grade,
            subject=request.subject,
            request_type="scheme",
            task_context={
                "action": "generate_scheme",
                "teacher_id": request.teacher_id,
                "term": request.term,
                "mode": request.mode,
                "language": request.language,
                "selected_strands": request.selected_strands,
                "teacher_inputs": request.teacher_inputs,
                "indigenous_language": request.indigenous_language,
                "prescribed_cbc_fallback": prescribed_fallback,
            },
        )

        if prescribed_fallback:
            rows = result.get("rows", [])
            return {
                "success": True,
                "scheme_id": "default_cbc_scheme",
                "title": f"{request.grade} {request.subject} - {request.term} (Prescribed CBC)",
                "grade": request.grade, "subject": request.subject, "term": request.term,
                "mode": request.mode, "language": request.language,
                "total_weeks": 1, "lessons_per_week": len(rows), "rows": rows,
                "personalization_applied": bool(request.teacher_inputs),
                "source": "prescribed-cbc-fallback",
            }

        scheme = result.get("scheme", {}) or {}
        rows = scheme.get("rows", []) or []

        return {
            "success": True,
            "scheme_id": scheme.get("scheme_id"),
            "title": scheme.get("title"),
            "grade": request.grade,
            "subject": request.subject,
            "term": request.term,
            "mode": request.mode,
            "language": request.language,
            "total_weeks": scheme.get("total_weeks", len(rows)),
            "lessons_per_week": scheme.get("lessons_per_week", 5),
            "rows": rows,
            "personalization_applied": bool(request.teacher_inputs),
            "source": "ai-agents",
        }

    except Exception as exc:
        import traceback
        error_details = {
            "error": str(exc),
            "error_type": type(exc).__name__,
            "traceback": traceback.format_exc(),
            "grade": request.grade,
            "subject": request.subject,
            "term": request.term,
        }
        logger.error("Failed to generate scheme", **error_details)
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Failed to generate scheme: {str(exc)}",
                "type": type(exc).__name__,
                "grade": request.grade,
                "subject": request.subject,
                "term": request.term,
            }
        )


@router.post("/generate-lesson-plan")
async def generate_lesson_plan(request: GenerateLessonPlanRequest) -> Dict[str, Any]:
    """Generate one CBC lesson plan and return the validated JSON shape.

    Output ``lesson_plan`` matches the contract in
    ``_inventory/scheme-scribe-ai/supabase/functions/generate-lesson-plan/index.ts``:
    ``{title, grade, subject, strand, subStrand, duration, objectives[],
    keyInquiryQuestion, introduction{duration,activities[]}, development{...},
    conclusion{...}, assessment[], differentiation{advanced,struggling},
    resources[], teacherReflection}``.
    """

    try:
        # Normalize scheme_id: convert string "None" or empty string to None
        scheme_id = request.scheme_id
        if scheme_id in ("None", "", "null", "undefined"):
            scheme_id = None
        
        result = await _run_omega_teacher_task(
            message=f"Generate lesson {request.lesson} for week {request.week}",
            teacher_id=request.teacher_id,
            grade=request.grade,
            subject=request.subject,
            request_type="lesson-plan",
            task_context={
                "action": "generate_lesson_plan",
                "teacher_id": request.teacher_id,
                "week": request.week,
                "lesson": request.lesson,
                "scheme_id": scheme_id,
                "row": request.row,
                "term": request.term,
                "additional_notes": request.additional_notes,
                "language": request.language,
            },
        )

        return {
            "success": True,
            "lesson_plan_id": result.get("lesson_plan_id"),
            "lesson_plan": result.get("lesson_plan", {}),
            "source": "ai-agents",
        }

    except Exception as exc:
        logger.error(
            "Failed to generate lesson plan",
            error=str(exc),
            error_type=type(exc).__name__,
            week=request.week,
            lesson=request.lesson,
            grade=request.grade,
            subject=request.subject,
        )
        raise HTTPException(
            status_code=500, detail=f"Failed to generate lesson plan: {exc}"
        )


@router.post("/generate-worksheet")
async def generate_worksheet(request: GenerateWorksheetRequest) -> Dict[str, Any]:
    """Generate one KSA-balanced printable worksheet for a single SchemeRow.

    Output ``worksheet`` matches :class:`agents.scheme.worksheet.Worksheet`:
    ``{title, grade, subject, strand, subStrand, duration, instructions,
    items[discriminated-union], extensionChallenge?, answerKey}``. The
    studio's worksheet renderer should branch by ``item.type``.
    """
    try:
        result = await _run_omega_teacher_task(
            message="Generate a worksheet for this lesson",
            teacher_id=request.teacher_id,
            grade=request.grade,
            subject=request.subject,
            request_type="worksheet",
            task_context={
                "action": "generate_worksheet",
                "teacher_id": request.teacher_id,
                "row": request.row,
                "term": request.term,
                "language": request.language,
                "duration_minutes": request.duration_minutes,
            },
        )

        return {
            "success": True,
            "worksheet_id": result.get("worksheet_id"),
            "worksheet": result.get("worksheet", {}),
            "source": "ai-agents",
        }

    except Exception as exc:
        logger.error(
            "Failed to generate worksheet",
            error=str(exc),
            error_type=type(exc).__name__,
            grade=request.grade,
            subject=request.subject,
        )
        raise HTTPException(
            status_code=500, detail=f"Failed to generate worksheet: {exc}"
        )


@router.post("/generate-text-leveler")
async def generate_text_leveler(request: GenerateTextLevelerRequest) -> Dict[str, Any]:
    """Generate a grade-appropriate reading passage and KSA-aligned questions.

    Output ``leveler`` matches the TextLeveler result contract from the
    scheme leveler module. Studio clients can render ``passage`` plus the
    question list and answer guidance.
    """
    try:
        result = await _run_omega_teacher_task(
            message="Create a grade-appropriate reading passage",
            teacher_id=request.teacher_id,
            grade=request.grade,
            subject=request.subject,
            request_type="text-leveler",
            task_context={
                "action": "generate_text_leveler",
                "teacher_id": request.teacher_id,
                "language": request.language,
                "input_text": request.input_text,
                "source_url": request.source_url,
            },
        )

        return {
            "success": True,
            "leveler_id": result.get("leveler_id"),
            "leveler": result.get("leveler", {}),
            "source": "ai-agents",
        }

    except Exception as exc:
        logger.error(
            "Failed to generate text leveler",
            error=str(exc),
            error_type=type(exc).__name__,
            grade=request.grade,
            subject=request.subject,
        )
        raise HTTPException(
            status_code=500, detail=f"Failed to generate text leveler: {exc}"
        )


@router.post("/unpack-outcome")
async def unpack_outcome(request: UnpackOutcomeRequest) -> Dict[str, Any]:
    """Unpack a KICD learning outcome into "I can…" + measurable success criteria.

    Output ``unpacked`` matches :class:`agents.unpacker.UnpackedOutcome`:
    ``{outcome, grade, subject, iCanStatements[{statement, ksa}],
    successCriteria[{criterion, observable}], coreCompetencies[], values[]}``.
    """
    try:
        result = await _run_omega_teacher_task(
            message=request.outcome,
            teacher_id=request.teacher_id,
            grade=request.grade,
            subject=request.subject,
            request_type="unpack-outcome",
            task_context={
                "action": "unpack_outcome",
                "teacher_id": request.teacher_id,
                "outcome": request.outcome,
                "language": request.language,
            },
        )

        return {
            "success": True,
            "unpacked_id": result.get("unpacked_id"),
            "unpacked": result.get("unpacked", {}),
            "source": "ai-agents",
        }

    except Exception as exc:
        logger.error(
            "Failed to unpack outcome",
            error=str(exc),
            error_type=type(exc).__name__,
            grade=request.grade,
            subject=request.subject,
        )
        raise HTTPException(
            status_code=500, detail=f"Failed to unpack outcome: {exc}"
        )


@router.post("/generate-differentiation")
async def generate_differentiation(
    request: GenerateDifferentiationRequest,
) -> Dict[str, Any]:
    """Generate three-tier differentiation for a lesson plan.

    Output ``differentiation`` matches
    :class:`agents.scheme.differentiation.Differentiation`:
    ``{title, grade, subject, strand, subStrand, objectives[],
    support{learnerProfile, adaptations[{activity, note, ksa}],
    resourceSwaps[], assessmentCues[]}, onGrade{...}, extension{...},
    inclusionStrategies[], coreCompetencies[]}``. All three tiers target
    the same objectives — the studio's differentiation panel should render
    them as parallel columns, not as separate plans.
    """
    try:
        result = await _run_omega_teacher_task(
            message="Differentiate this lesson plan",
            teacher_id=request.teacher_id,
            grade=request.lesson_plan.get("grade"),
            subject=request.lesson_plan.get("subject"),
            request_type="differentiation",
            task_context={
                "action": "generate_differentiation",
                "teacher_id": request.teacher_id,
                "lesson_plan": request.lesson_plan,
                "language": request.language,
                "lesson_plan_id": request.lesson_plan_id,
            },
        )

        return {
            "success": True,
            "differentiation_id": result.get("differentiation_id"),
            "differentiation": result.get("differentiation", {}),
            "source": "ai-agents",
        }

    except Exception as exc:
        logger.error(
            "Failed to generate differentiation",
            error=str(exc),
            error_type=type(exc).__name__,
            grade=request.lesson_plan.get("grade") if request.lesson_plan else None,
            subject=request.lesson_plan.get("subject") if request.lesson_plan else None,
        )
        raise HTTPException(
            status_code=500, detail=f"Failed to generate differentiation: {exc}"
        )


@router.post("/generate-exam")
async def generate_exam(request: GenerateExamRequest) -> Dict[str, Any]:
    """Generate one end-of-term exam, scope-validated against ``allocation``.

    Output shape matches ``_inventory/scheme-scribe-ai/supabase/functions/generate-exam/index.ts``:
    ``{questions: ExamQuestion[], total_marks, meta: {grade, subject, term, total}}``
    where each ``ExamQuestion`` is a discriminated union over
    ``{type: "mcq"|"short"|"long", ...}``. The studio renders by ``type``.
    """
    try:
        result = await _run_omega_teacher_task(
            message=f"Generate a {request.term} exam for {request.grade} {request.subject}",
            teacher_id=request.teacher_id,
            grade=request.grade,
            subject=request.subject,
            request_type="exam",
            task_context={
                "action": "generate_exam",
                "teacher_id": request.teacher_id,
                "term": request.term,
                "allocation": request.allocation,
                "counts": request.counts,
            },
        )

        return {
            "success": True,
            "exam_id": result.get("exam_id"),
            "questions": result.get("questions", []),
            "total_marks": result.get("total_marks", 0),
            "meta": result.get("meta", {}),
            "source": "ai-agents",
        }

    except Exception as exc:
        logger.error(
            "Failed to generate exam",
            error=str(exc),
            error_type=type(exc).__name__,
            grade=request.grade,
            subject=request.subject,
            term=request.term,
        )
        raise HTTPException(
            status_code=500, detail=f"Failed to generate exam: {exc}"
        )


@router.post("/schemes")
async def save_scheme(request: SchemeRequest) -> Dict[str, Any]:
    """Save a generated scheme of work to the database."""
    supabase = get_supabase_client()
    
    if not supabase:
        raise HTTPException(
            status_code=503,
            detail="Database not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables."
        )
    
    try:
        from datetime import datetime
        import uuid
        
        scheme_id = f"scheme_{uuid.uuid4().hex[:12]}"
        created_at = datetime.utcnow().isoformat()
        
        logger.info("Saving scheme", scheme_id=scheme_id, teacher_id=request.teacher_id)

        # Prefer structured rows; fall back to the legacy markdown blob only
        # when the caller hasn't migrated yet.
        if request.rows:
            rows_payload = request.rows
        elif request.content:
            rows_payload = [{"content": request.content}]
        else:
            raise HTTPException(
                status_code=400,
                detail="Either 'rows' (SchemeRow[]) or 'content' must be provided",
            )

        total_weeks = max((r.get("week", 0) for r in rows_payload), default=13) or 13

        response = supabase.table("schemes").insert({
            "scheme_id": scheme_id,
            "title": request.title,
            "grade": request.grade,
            "subject": request.subject,
            "term": request.term,
            "mode": request.mode,
            "teacher_id": request.teacher_id,
            "language": request.language,
            "total_weeks": total_weeks,
            "lessons_per_week": 5,  # Standard school week
            "rows": rows_payload,  # JSONB SchemeRow[]
            "created_at": created_at,
        }).execute()
        
        logger.info("Scheme saved successfully", scheme_id=scheme_id)
        
        return {
            "success": True,
            "message": "Scheme saved successfully",
            "scheme_id": scheme_id
        }
        
    except Exception as exc:
        logger.error("Failed to save scheme", error=str(exc), error_type=type(exc).__name__)
        raise HTTPException(status_code=500, detail=f"Failed to save scheme: {str(exc)}")


@router.get("/schemes")
async def list_schemes(
    teacher_id: str,
    grade: Optional[str] = None,
    subject: Optional[str] = None
) -> Dict[str, Any]:
    """List schemes for a teacher."""
    supabase = get_supabase_client()
    
    if not supabase:
        raise HTTPException(
            status_code=503,
            detail="Database not configured"
        )
    
    try:
        query = supabase.table("schemes").select("*").eq("teacher_id", teacher_id)
        
        if grade:
            query = query.eq("grade", grade)
        if subject:
            query = query.eq("subject", subject)
        
        response = query.execute()
        schemes = response.data if response and hasattr(response, 'data') else []
        
        logger.info("Listed schemes", count=len(schemes), teacher_id=teacher_id)
        
        return {
            "success": True,
            "schemes": schemes,
            "count": len(schemes)
        }
        
    except Exception as exc:
        logger.error("Failed to list schemes", error=str(exc))
        raise HTTPException(status_code=500, detail=f"Failed to list schemes: {str(exc)}")


@router.get("/schemes/{scheme_id}")
async def get_scheme(scheme_id: str) -> Dict[str, Any]:
    """Get a specific scheme by ID."""
    supabase = get_supabase_client()
    
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        response = supabase.table("schemes").select("*").eq("scheme_id", scheme_id).execute()
        
        if not response or not hasattr(response, 'data') or not response.data:
            raise HTTPException(status_code=404, detail="Scheme not found")
        
        return {
            "success": True,
            "scheme": response.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to get scheme", error=str(exc))
        raise HTTPException(status_code=500, detail=f"Failed to get scheme: {str(exc)}")
