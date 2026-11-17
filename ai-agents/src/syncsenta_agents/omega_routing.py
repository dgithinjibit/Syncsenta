"""Role-scoped routing policy shared by Omega and the MeTTa fallback."""

from __future__ import annotations

from typing import Optional

_ROLE_ALIASES = {
    "student": "student",
    "teacher": "teacher",
    "head": "institution-head",
    "head_of_institution": "institution-head",
    "institution_head": "institution-head",
    "school_head": "institution-head",
}

_TASK_ALIASES = {
    "tutoring": "tutoring",
    "socratic_tutor": "tutoring",
    "curriculum": "curriculum",
    "cbc_curriculum": "curriculum",
    "lesson_plan": "lesson-plan",
    "lesson_planning": "lesson-plan",
    "lesson_architect": "lesson-plan",
    "generate_scheme": "scheme",
    "scheme": "scheme",
    "generate_worksheet": "worksheet",
    "worksheet": "worksheet",
    "generate_text_leveler": "text-leveler",
    "text_leveler": "text-leveler",
    "unpack_outcome": "unpack-outcome",
    "generate_differentiation": "differentiation",
    "differentiation": "differentiation",
    "generate_exam": "exam",
    "exam": "exam",
    "assessment": "assessment",
    "quiz": "assessment",
    "career": "career-pathways",
    "career_pathways": "career-pathways",
    "teacher_support": "teacher-support",
    "school_intelligence": "school-intelligence",
}

_DEFAULT_TASKS = {
    "student": "tutoring",
    "teacher": "teacher-support",
    "institution-head": "school-intelligence",
}

AGENT_ROUTES = {
    ("student", "tutoring"): "socratic-tutor",
    ("student", "curriculum"): "cbc-curriculum",
    ("student", "assessment"): "assessment",
    ("student", "career-pathways"): "career-pathways",
    ("teacher", "teacher-support"): "teacher-support",
    ("teacher", "curriculum"): "cbc-curriculum",
    ("teacher", "lesson-plan"): "lesson-architect",
    ("teacher", "scheme"): "lesson-architect",
    ("teacher", "worksheet"): "lesson-architect",
    ("teacher", "text-leveler"): "lesson-architect",
    ("teacher", "unpack-outcome"): "lesson-architect",
    ("teacher", "differentiation"): "lesson-architect",
    ("teacher", "exam"): "lesson-architect",
    ("teacher", "assessment"): "assessment",
    ("institution-head", "school-intelligence"): "school-intelligence",
}


def normalize_agent_route(
    role: Optional[str],
    request_type: Optional[str],
) -> tuple[str, str, str]:
    """Return canonical MeTTa role, task, and expected agent symbols."""
    role_key = "_".join(role.strip().lower().replace("-", " ").split()) if role else ""
    canonical_role = _ROLE_ALIASES.get(role_key)
    if canonical_role is None:
        raise ValueError("Unsupported role")

    task_key = (
        "_".join(request_type.strip().lower().replace("-", " ").split())
        if request_type
        else ""
    )
    canonical_task = _TASK_ALIASES.get(task_key) if task_key else None
    canonical_task = canonical_task or _DEFAULT_TASKS[canonical_role]

    route = AGENT_ROUTES.get((canonical_role, canonical_task))
    if route is None:
        raise ValueError("Unsupported role and request type")
    return canonical_role, canonical_task, route


def resolve_agent_route(role: Optional[str], request_type: Optional[str]) -> str:
    """Resolve a supported role/task pair to its registered agent name."""
    _, _, route = normalize_agent_route(role, request_type)
    return route.replace("-", "_")
