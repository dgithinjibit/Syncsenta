"""MeTTa-governed Omega Queen orchestration."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from ..agents.assessment import AssessmentAgent
from ..agents.future_agents import TeacherSupportAgent
from ..agents.lesson_architect import LessonArchitectAgent
from ..agents.specialists import (
    CareerPathwaysAgent,
    CurriculumAgent,
    SchoolIntelligenceAgent,
)
from ..agents.tutoring import TutoringAgent
from ..core.logging import AgentLogger
from ..core.models import AgentRequest, AgentResponse
from ..reasoning.hyperon_evaluator import get_policy_evaluator


_UNTRUSTED_IDENTITY_FIELDS = {
    "user_id",
    "student_id",
    "teacher_id",
    "school_id",
    "institution_id",
    "role",
    "is_admin",
    "permissions",
}


class OmegaQueenOrchestrator:
    """Routes requests through the shared MeTTa policy to a single specialist."""

    def __init__(
        self,
        policy_evaluator: Optional[Any] = None,
        agent_registry: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.logger = AgentLogger("omega_queen")
        self.policy_evaluator = (
            policy_evaluator if policy_evaluator is not None else get_policy_evaluator()
        )
        self.agent_registry = (
            agent_registry if agent_registry is not None else self._build_agents()
        )

    @staticmethod
    def _build_agents() -> Dict[str, Any]:
        return {
            "assessment": AssessmentAgent(),
            "career_pathways": CareerPathwaysAgent(),
            "cbc_curriculum": CurriculumAgent(),
            "lesson_architect": LessonArchitectAgent(),
            "school_intelligence": SchoolIntelligenceAgent(),
            "socratic_tutor": TutoringAgent(),
            "teacher_support": TeacherSupportAgent(),
        }

    def register_agent(self, agent_name: str, agent: Any) -> None:
        self.agent_registry[agent_name] = agent

    async def process_request(
        self,
        request: AgentRequest,
        *,
        task_context: Optional[Dict[str, Any]] = None,
    ) -> AgentResponse:
        """Route and execute one request while preserving the API response shape."""
        start_time = datetime.now().timestamp()
        route = self.policy_evaluator.evaluate_agent_route(
            request.role, request.type
        )
        if route is None:
            return self._error_response(
                "Omega could not route this role and request type.",
                "Unsupported role or request type",
                start_time,
            )

        agent = self.agent_registry.get(route)
        if agent is None:
            return self._error_response(
                f"Omega agent '{route}' is not registered.",
                f"Agent not registered: {route}",
                start_time,
            )

        context = dict(request.context or {})
        for field in _UNTRUSTED_IDENTITY_FIELDS:
            context.pop(field, None)
        context.update(
            {
                "grade": request.grade,
                "subject": request.subject,
                "type": request.type,
            }
        )
        context.update(task_context or {})

        result = await agent.execute_task(request.message, context)
        if not isinstance(result, dict):
            return self._error_response(
                f"Omega agent '{route}' returned an invalid response.",
                f"Invalid response from agent: {route}",
                start_time,
                route,
            )

        response_text = result.get("response")
        if not isinstance(response_text, str) or not response_text.strip():
            return self._error_response(
                f"Omega agent '{route}' returned no response text.",
                f"Missing response text from agent: {route}",
                start_time,
                route,
            )

        success = result.get("success", True)
        if not isinstance(success, bool):
            return self._error_response(
                f"Omega agent '{route}' returned an invalid success status.",
                f"Invalid success status from agent: {route}",
                start_time,
                route,
            )

        return AgentResponse(
            success=success,
            response=response_text,
            primary_agent=route,
            agents_used=[route],
            response_time_ms=self._elapsed_ms(start_time),
            context_aware=bool(context),
            fallback_used=not success,
            error=result.get("error"),
            structured_result=result,
        )

    @staticmethod
    def _elapsed_ms(start_time: float) -> int:
        return max(0, int((datetime.now().timestamp() - start_time) * 1000))

    def _error_response(
        self,
        message: str,
        error: str,
        start_time: float,
        agent_name: str = "omega_queen",
    ) -> AgentResponse:
        self.logger.error("Omega request could not be completed", error=error)
        return AgentResponse(
            success=False,
            response=message,
            primary_agent=agent_name,
            agents_used=[agent_name],
            response_time_ms=self._elapsed_ms(start_time),
            fallback_used=False,
            error=error,
        )
