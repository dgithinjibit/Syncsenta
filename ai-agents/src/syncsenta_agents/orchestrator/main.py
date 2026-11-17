"""Main Omega orchestrator implementation with failure recovery."""

from typing import Dict, Any, Optional
from datetime import datetime

from ..core.models import AgentRequest, AgentResponse
from ..core.logging import AgentLogger
from .failure_recovery import FailureRecoveryManager
from .omega_queen import OmegaQueenOrchestrator


class SyncSentaOrchestrator:
    """Production-ready Omega orchestrator with failure recovery."""
    
    def __init__(self):
        """Initialize the Omega Queen and failure recovery."""
        self.logger = AgentLogger("orchestrator")
        self.omega_queen: Optional[OmegaQueenOrchestrator] = None
        self.failure_recovery = FailureRecoveryManager()
        self._initialized = False
    
    async def initialize(self) -> None:
        """Initialize the orchestrator and Omega Queen."""
        try:
            self.logger.info("Initializing SyncSenta Orchestrator")
            self.omega_queen = OmegaQueenOrchestrator()

            self._initialized = True
            self.logger.info("Orchestrator initialized successfully")
            
        except Exception as e:
            self.logger.error("Orchestrator initialization failed", error=str(e))
            raise
    
    async def process_request(
        self,
        request: AgentRequest,
        *,
        task_context: Optional[Dict[str, Any]] = None,
    ) -> AgentResponse:
        """Process an agent request with full failure protection.
        
        Args:
            request: The agent request to process
            
        Returns:
            AgentResponse with result or error information
        """
        if not self._initialized or not self.omega_queen:
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
                "omega_queen",
                self.omega_queen.process_request,
                request,
                task_context=task_context,
                use_retry=True,
                use_fallback=False
            )
            
            if result["success"]:
                response = result["result"]
                
                # Add protection metadata
                if isinstance(response, AgentResponse):
                    response.fallback_used = response.fallback_used or bool(
                        result.get("protection_used", {}).get("fallback", False)
                    )
                    return response
                else:
                    # Unexpected result format
                    return self._create_error_response(
                        "Unexpected response format",
                        start_time
                    )
            else:
                error = result.get("error", "Request processing failed")
                return AgentResponse(
                    success=False,
                    response=f"Omega could not process request: {error}",
                    primary_agent="omega_queen",
                    agents_used=["omega_queen"],
                    response_time_ms=int((datetime.now().timestamp() - start_time) * 1000),
                    error=error,
                    fallback_used=False
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
            response=f"Omega could not process request: {error_message}",
            primary_agent="omega_queen",
            agents_used=["omega_queen"],
            response_time_ms=int((datetime.now().timestamp() - start_time) * 1000),
            error=error_message,
            fallback_used=False
        )
    
    def register_agent(self, agent_name: str, agent: Any) -> None:
        """Register an agent with the Omega Queen.
        
        Args:
            agent_name: Name of the agent to register
            agent: The agent instance
        """
        if self.omega_queen:
            self.omega_queen.register_agent(agent_name, agent)
            self.logger.info(f"Registered agent: {agent_name}")
        else:
            self.logger.error("Cannot register agent: Omega Queen not initialized")
    
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