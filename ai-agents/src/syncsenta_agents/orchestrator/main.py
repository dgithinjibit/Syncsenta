"""Main orchestrator implementation with LangGraph workflow and failure recovery."""

from typing import Dict, Any, Optional
from datetime import datetime

from ..core.models import AgentRequest, AgentResponse
from ..core.logging import AgentLogger
from ..agents.assessment import AssessmentAgent
from ..agents.tutoring import TutoringAgent
from .workflow import LangGraphOrchestrator
from .failure_recovery import FailureRecoveryManager


class SyncSentaOrchestrator:
    """Production-ready orchestrator for SyncSenta AI Agents.
    
    Integrates LangGraph workflow orchestration with comprehensive
    failure recovery, circuit breakers, and graceful degradation.
    """
    
    def __init__(self):
        """Initialize the orchestrator with workflow and failure recovery."""
        self.logger = AgentLogger("orchestrator")
        self.workflow_orchestrator: Optional[LangGraphOrchestrator] = None
        self.failure_recovery = FailureRecoveryManager()
        self._initialized = False
    
    async def initialize(self) -> None:
        """Initialize the orchestrator and workflow."""
        try:
            self.logger.info("Initializing SyncSenta Orchestrator")
            
            # Initialize LangGraph workflow
            self.workflow_orchestrator = LangGraphOrchestrator()

            # Register implemented worker agents. Other agents (Socratic, CBC,
            # Lesson, Intelligence, Career) fall through to placeholder
            # responses in the workflow until their migration completes.
            self.workflow_orchestrator.register_agent(
                "assessment", AssessmentAgent()
            )
            # Tutoring_Agent — registered under "socratic_tutor" so the
            # existing workflow routing slot picks it up for student questions.
            self.workflow_orchestrator.register_agent(
                "socratic_tutor", TutoringAgent()
            )

            self._initialized = True
            self.logger.info("Orchestrator initialized successfully")
            
        except Exception as e:
            self.logger.error("Orchestrator initialization failed", error=str(e))
            raise
    
    async def process_request(self, request: AgentRequest) -> AgentResponse:
        """Process an agent request with full failure protection.
        
        Args:
            request: The agent request to process
            
        Returns:
            AgentResponse with result or error information
        """
        if not self._initialized or not self.workflow_orchestrator:
            self.logger.error("Orchestrator not initialized")
            return AgentResponse(
                success=False,
                response="Orchestrator not initialized. Please initialize first.",
                primary_agent="orchestrator",
                agents_used=["orchestrator"],
                response_time_ms=0,
                error="Not initialized"
            )
        
        start_time = datetime.now().timestamp()
        
        try:
            self.logger.info(
                "Processing request",
                user_id=request.user_id,
                role=request.role,
                priority=request.priority
            )
            
            # Execute with failure protection
            result = await self.failure_recovery.execute_with_protection(
                "workflow_orchestrator",
                self.workflow_orchestrator.process_request,
                request,
                use_retry=True,
                use_fallback=True
            )
            
            if result["success"]:
                response = result["result"]
                
                # Add protection metadata
                if isinstance(response, AgentResponse):
                    response.fallback_used = result.get("protection_used", {}).get("fallback", False)
                    return response
                else:
                    # Unexpected result format
                    return self._create_error_response(
                        "Unexpected response format",
                        start_time
                    )
            else:
                # Failure with fallback
                return AgentResponse(
                    success=False,
                    response=result.get("result", "Request processing failed"),
                    primary_agent=result.get("agent_used", "error_handler"),
                    agents_used=[result.get("agent_used", "error_handler")],
                    response_time_ms=int((datetime.now().timestamp() - start_time) * 1000),
                    error=result.get("error"),
                    fallback_used=True
                )
                
        except Exception as e:
            self.logger.error("Request processing failed", error=str(e))
            return self._create_error_response(str(e), start_time)
    
    def _create_error_response(
        self,
        error_message: str,
        start_time: float
    ) -> AgentResponse:
        """Create an error response."""
        return AgentResponse(
            success=False,
            response=f"Failed to process request: {error_message}",
            primary_agent="orchestrator",
            agents_used=["orchestrator"],
            response_time_ms=int((datetime.now().timestamp() - start_time) * 1000),
            error=error_message,
            fallback_used=True
        )
    
    def register_agent(self, agent_name: str, agent: Any) -> None:
        """Register an agent with the workflow orchestrator.
        
        Args:
            agent_name: Name of the agent to register
            agent: The agent instance
        """
        if self.workflow_orchestrator:
            self.workflow_orchestrator.register_agent(agent_name, agent)
            self.logger.info(f"Registered agent: {agent_name}")
        else:
            self.logger.error("Cannot register agent: orchestrator not initialized")
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get comprehensive system health status.
        
        Returns:
            Dictionary with health metrics and circuit breaker states
        """
        return self.failure_recovery.get_system_health()
    
    def get_circuit_breaker_stats(self, service_name: str) -> Dict[str, Any]:
        """Get circuit breaker statistics for a specific service.
        
        Args:
            service_name: Name of the service
            
        Returns:
            Circuit breaker statistics
        """
        circuit_breaker = self.failure_recovery.get_circuit_breaker(service_name)
        return circuit_breaker.get_stats()