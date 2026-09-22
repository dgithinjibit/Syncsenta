"""Failure recovery and circuit breaker mechanisms for agent orchestration."""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, Callable, Optional
from enum import Enum
from dataclasses import dataclass, field

from ..core.logging import AgentLogger
from ..core.exceptions import AgentError, CircuitBreakerError


class CircuitState(str, Enum):
    """Circuit breaker states."""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""
    failure_threshold: int = 5  # Failures before opening
    success_threshold: int = 2  # Successes to close from half-open
    timeout_seconds: int = 60  # Time before trying half-open
    reset_timeout_seconds: int = 300  # Time to reset failure count


@dataclass
class CircuitBreakerStats:
    """Statistics for circuit breaker."""
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    success_count: int = 0
    last_failure_time: Optional[datetime] = None
    last_success_time: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    total_requests: int = 0
    total_failures: int = 0
    total_successes: int = 0


class CircuitBreaker:
    """Circuit breaker for external service calls."""
    
    def __init__(
        self,
        name: str,
        config: Optional[CircuitBreakerConfig] = None
    ):
        """Initialize circuit breaker."""
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self.stats = CircuitBreakerStats()
        self.logger = AgentLogger(f"circuit_breaker.{name}")
        self._lock = asyncio.Lock()
    
    async def call(
        self,
        func: Callable,
        *args: Any,
        **kwargs: Any
    ) -> Any:
        """Execute function with circuit breaker protection."""
        async with self._lock:
            # Check if circuit should transition to half-open
            if self.stats.state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    self.logger.info(f"Circuit {self.name} transitioning to HALF_OPEN")
                    self.stats.state = CircuitState.HALF_OPEN
                    self.stats.success_count = 0
                else:
                    raise CircuitBreakerError(
                        f"Circuit breaker {self.name} is OPEN. "
                        f"Service unavailable until {self._get_reset_time()}"
                    )
        
        # Execute the function
        self.stats.total_requests += 1
        
        try:
            result = await func(*args, **kwargs)
            await self._on_success()
            return result
            
        except Exception as e:
            await self._on_failure(e)
            raise
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset."""
        if not self.stats.opened_at:
            return True
        
        elapsed = datetime.now() - self.stats.opened_at
        return elapsed.total_seconds() >= self.config.timeout_seconds
    
    def _get_reset_time(self) -> str:
        """Get the time when circuit will attempt reset."""
        if not self.stats.opened_at:
            return "unknown"
        
        reset_time = self.stats.opened_at + timedelta(
            seconds=self.config.timeout_seconds
        )
        return reset_time.isoformat()
    
    async def _on_success(self) -> None:
        """Handle successful execution."""
        async with self._lock:
            self.stats.total_successes += 1
            self.stats.last_success_time = datetime.now()
            
            if self.stats.state == CircuitState.HALF_OPEN:
                self.stats.success_count += 1
                
                if self.stats.success_count >= self.config.success_threshold:
                    self.logger.info(f"Circuit {self.name} closing after successful recovery")
                    self.stats.state = CircuitState.CLOSED
                    self.stats.failure_count = 0
                    self.stats.success_count = 0
            
            elif self.stats.state == CircuitState.CLOSED:
                # Reset failure count on success
                if self.stats.last_failure_time:
                    elapsed = datetime.now() - self.stats.last_failure_time
                    if elapsed.total_seconds() >= self.config.reset_timeout_seconds:
                        self.stats.failure_count = 0
    
    async def _on_failure(self, error: Exception) -> None:
        """Handle failed execution."""
        async with self._lock:
            self.stats.total_failures += 1
            self.stats.failure_count += 1
            self.stats.last_failure_time = datetime.now()
            
            self.logger.warning(
                f"Circuit {self.name} failure",
                error=str(error),
                failure_count=self.stats.failure_count
            )
            
            if self.stats.state == CircuitState.HALF_OPEN:
                # Failure in half-open state reopens circuit
                self.logger.error(f"Circuit {self.name} reopening after failed recovery attempt")
                self.stats.state = CircuitState.OPEN
                self.stats.opened_at = datetime.now()
                self.stats.success_count = 0
            
            elif self.stats.state == CircuitState.CLOSED:
                # Check if threshold exceeded
                if self.stats.failure_count >= self.config.failure_threshold:
                    self.logger.error(
                        f"Circuit {self.name} opening due to failure threshold",
                        threshold=self.config.failure_threshold
                    )
                    self.stats.state = CircuitState.OPEN
                    self.stats.opened_at = datetime.now()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get circuit breaker statistics."""
        return {
            "name": self.name,
            "state": self.stats.state,
            "failure_count": self.stats.failure_count,
            "success_count": self.stats.success_count,
            "total_requests": self.stats.total_requests,
            "total_failures": self.stats.total_failures,
            "total_successes": self.stats.total_successes,
            "last_failure": self.stats.last_failure_time.isoformat() if self.stats.last_failure_time else None,
            "last_success": self.stats.last_success_time.isoformat() if self.stats.last_success_time else None,
            "opened_at": self.stats.opened_at.isoformat() if self.stats.opened_at else None
        }


class RetryStrategy:
    """Retry strategy with exponential backoff."""
    
    def __init__(
        self,
        max_retries: int = 3,
        initial_delay: float = 1.0,
        max_delay: float = 30.0,
        exponential_base: float = 2.0
    ):
        """Initialize retry strategy."""
        self.max_retries = max_retries
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.logger = AgentLogger("retry_strategy")
    
    async def execute_with_retry(
        self,
        func: Callable,
        *args: Any,
        **kwargs: Any
    ) -> Any:
        """Execute function with retry logic."""
        last_exception = None
        
        for attempt in range(self.max_retries + 1):
            try:
                result = await func(*args, **kwargs)
                
                if attempt > 0:
                    self.logger.info(
                        "Retry succeeded",
                        attempt=attempt,
                        total_attempts=self.max_retries + 1
                    )
                
                return result
                
            except Exception as e:
                last_exception = e
                
                if attempt < self.max_retries:
                    delay = self._calculate_delay(attempt)
                    
                    self.logger.warning(
                        "Retry attempt failed",
                        attempt=attempt + 1,
                        max_retries=self.max_retries,
                        delay=delay,
                        error=str(e)
                    )
                    
                    await asyncio.sleep(delay)
                else:
                    self.logger.error(
                        "All retry attempts exhausted",
                        total_attempts=self.max_retries + 1,
                        error=str(e)
                    )
        
        # All retries failed
        raise last_exception
    
    def _calculate_delay(self, attempt: int) -> float:
        """Calculate delay for exponential backoff."""
        delay = self.initial_delay * (self.exponential_base ** attempt)
        return min(delay, self.max_delay)


class FallbackStrategy:
    """Fallback strategy for agent failures."""
    
    def __init__(self):
        """Initialize fallback strategy."""
        self.logger = AgentLogger("fallback_strategy")
        
        # Define fallback chains
        self.fallback_chains = {
            "socratic_tutor": ["cbc_curriculum", "generic_response"],
            "cbc_curriculum": ["generic_curriculum_response"],
            "lesson_architect": ["generic_lesson_response"],
            "assessment": ["generic_assessment_response"],
            "school_intelligence": ["generic_intelligence_response"],
            "career_pathways": ["generic_career_response"]
        }
    
    async def execute_with_fallback(
        self,
        primary_agent: str,
        func: Callable,
        *args: Any,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """Execute with fallback to alternative agents."""
        try:
            result = await func(*args, **kwargs)
            return {
                "success": True,
                "result": result,
                "agent_used": primary_agent,
                "fallback_used": False
            }
            
        except Exception as e:
            self.logger.warning(
                f"Primary agent {primary_agent} failed, attempting fallback",
                error=str(e)
            )
            
            # Try fallback chain
            fallback_chain = self.fallback_chains.get(primary_agent, [])
            
            for fallback_agent in fallback_chain:
                try:
                    result = await self._execute_fallback(
                        fallback_agent,
                        *args,
                        **kwargs
                    )
                    
                    self.logger.info(
                        f"Fallback to {fallback_agent} succeeded",
                        primary_agent=primary_agent
                    )
                    
                    return {
                        "success": True,
                        "result": result,
                        "agent_used": fallback_agent,
                        "fallback_used": True,
                        "primary_agent": primary_agent
                    }
                    
                except Exception as fallback_error:
                    self.logger.warning(
                        f"Fallback agent {fallback_agent} also failed",
                        error=str(fallback_error)
                    )
                    continue
            
            # All fallbacks failed
            self.logger.error(
                f"All fallbacks exhausted for {primary_agent}",
                error=str(e)
            )
            
            return {
                "success": False,
                "result": self._get_generic_error_response(primary_agent),
                "agent_used": "error_handler",
                "fallback_used": True,
                "primary_agent": primary_agent,
                "error": str(e)
            }
    
    async def _execute_fallback(
        self,
        fallback_agent: str,
        *args: Any,
        **kwargs: Any
    ) -> Any:
        """Execute fallback agent."""
        # This would call the actual fallback agent
        # For now, return generic responses
        return self._get_generic_response(fallback_agent, *args, **kwargs)
    
    def _get_generic_response(
        self,
        agent_type: str,
        *args: Any,
        **kwargs: Any
    ) -> str:
        """Get generic response for agent type."""
        generic_responses = {
            "generic_response": "I'm here to help with your learning. Could you please rephrase your question?",
            "generic_curriculum_response": "For curriculum information, please refer to the official KICD documents or contact your teacher.",
            "generic_lesson_response": "For lesson planning assistance, please consult the CBC curriculum guidelines.",
            "generic_assessment_response": "For assessment support, please contact your teacher or school administrator.",
            "generic_intelligence_response": "For school analytics, please contact your school administrator.",
            "generic_career_response": "For career guidance, please consult with your school's career counselor."
        }
        
        return generic_responses.get(
            agent_type,
            "I apologize, but I'm unable to process your request at this time. Please try again later."
        )
    
    def _get_generic_error_response(self, agent_type: str) -> str:
        """Get generic error response."""
        return f"""I apologize, but the {agent_type.replace('_', ' ').title()} service is temporarily unavailable.

Please try again in a few moments, or contact support if the issue persists.

In the meantime, you can:
- Try rephrasing your question
- Check the help documentation
- Contact your teacher or administrator
"""


class GracefulDegradation:
    """Graceful degradation strategy for system failures."""
    
    def __init__(self):
        """Initialize graceful degradation."""
        self.logger = AgentLogger("graceful_degradation")
        self.degradation_levels = {
            "full": ["all_agents", "multi_agent", "synthesis"],
            "partial": ["single_agent", "basic_synthesis"],
            "minimal": ["cached_responses", "generic_responses"],
            "emergency": ["error_messages"]
        }
        self.current_level = "full"
    
    def get_available_features(self) -> list[str]:
        """Get available features at current degradation level."""
        return self.degradation_levels.get(self.current_level, [])
    
    def degrade_to_level(self, level: str) -> None:
        """Degrade system to specified level."""
        if level in self.degradation_levels:
            self.logger.warning(
                f"Degrading system to {level} level",
                previous_level=self.current_level
            )
            self.current_level = level
        else:
            self.logger.error(f"Unknown degradation level: {level}")
    
    def can_use_feature(self, feature: str) -> bool:
        """Check if feature is available at current level."""
        available = self.get_available_features()
        return feature in available or "all_agents" in available
    
    async def execute_with_degradation(
        self,
        feature: str,
        func: Callable,
        *args: Any,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """Execute with graceful degradation."""
        if self.can_use_feature(feature):
            try:
                result = await func(*args, **kwargs)
                return {
                    "success": True,
                    "result": result,
                    "degradation_level": self.current_level
                }
            except Exception as e:
                self.logger.error(
                    f"Feature {feature} failed at {self.current_level} level",
                    error=str(e)
                )
                # Try degrading one level
                self._auto_degrade()
                return {
                    "success": False,
                    "error": str(e),
                    "degradation_level": self.current_level
                }
        else:
            self.logger.warning(
                f"Feature {feature} not available at {self.current_level} level"
            )
            return {
                "success": False,
                "error": f"Feature unavailable at {self.current_level} degradation level",
                "degradation_level": self.current_level
            }
    
    def _auto_degrade(self) -> None:
        """Automatically degrade to next level."""
        levels = ["full", "partial", "minimal", "emergency"]
        current_index = levels.index(self.current_level)
        
        if current_index < len(levels) - 1:
            new_level = levels[current_index + 1]
            self.degrade_to_level(new_level)


class FailureRecoveryManager:
    """Comprehensive failure recovery manager."""
    
    def __init__(self):
        """Initialize failure recovery manager."""
        self.logger = AgentLogger("failure_recovery")
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.retry_strategy = RetryStrategy()
        self.fallback_strategy = FallbackStrategy()
        self.degradation = GracefulDegradation()
    
    def get_circuit_breaker(self, name: str) -> CircuitBreaker:
        """Get or create circuit breaker for service."""
        if name not in self.circuit_breakers:
            self.circuit_breakers[name] = CircuitBreaker(name)
        return self.circuit_breakers[name]
    
    async def execute_with_protection(
        self,
        service_name: str,
        func: Callable,
        *args: Any,
        use_retry: bool = True,
        use_fallback: bool = True,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """Execute function with full failure protection."""
        circuit_breaker = self.get_circuit_breaker(service_name)
        
        try:
            # Wrap with circuit breaker
            async def protected_call():
                return await circuit_breaker.call(func, *args, **kwargs)
            
            # Add retry if enabled
            if use_retry:
                result = await self.retry_strategy.execute_with_retry(protected_call)
            else:
                result = await protected_call()
            
            return {
                "success": True,
                "result": result,
                "service": service_name,
                "protection_used": {
                    "circuit_breaker": True,
                    "retry": use_retry,
                    "fallback": False
                }
            }
            
        except Exception as e:
            self.logger.error(
                f"Service {service_name} failed with protection",
                error=str(e)
            )
            
            # Try fallback if enabled
            if use_fallback:
                return await self.fallback_strategy.execute_with_fallback(
                    service_name,
                    func,
                    *args,
                    **kwargs
                )
            else:
                return {
                    "success": False,
                    "error": str(e),
                    "service": service_name,
                    "protection_used": {
                        "circuit_breaker": True,
                        "retry": use_retry,
                        "fallback": False
                    }
                }
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get overall system health status."""
        circuit_stats = {
            name: breaker.get_stats()
            for name, breaker in self.circuit_breakers.items()
        }
        
        # Calculate health score
        total_circuits = len(circuit_stats)
        open_circuits = sum(
            1 for stats in circuit_stats.values()
            if stats["state"] == CircuitState.OPEN
        )
        
        health_score = (
            (total_circuits - open_circuits) / total_circuits * 100
            if total_circuits > 0 else 100
        )
        
        return {
            "health_score": health_score,
            "degradation_level": self.degradation.current_level,
            "circuit_breakers": circuit_stats,
            "timestamp": datetime.now().isoformat()
        }
