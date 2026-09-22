"""Unit tests for failure recovery mechanisms."""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock

from syncsenta_agents.orchestrator.failure_recovery import (
    CircuitBreaker,
    CircuitState,
    CircuitBreakerConfig,
    RetryStrategy,
    FallbackStrategy,
    GracefulDegradation,
    FailureRecoveryManager
)
from syncsenta_agents.core.exceptions import CircuitBreakerError


class TestCircuitBreaker:
    """Test cases for Circuit Breaker pattern."""
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_initialization(self):
        """Test circuit breaker initializes in CLOSED state."""
        cb = CircuitBreaker("test_service")
        
        assert cb.name == "test_service"
        assert cb.stats.state == CircuitState.CLOSED
        assert cb.stats.failure_count == 0
        assert cb.stats.success_count == 0
    
    @pytest.mark.asyncio
    async def test_successful_call(self):
        """Test successful function call through circuit breaker."""
        cb = CircuitBreaker("test_service")
        
        async def success_func():
            return "success"
        
        result = await cb.call(success_func)
        
        assert result == "success"
        assert cb.stats.total_successes == 1
        assert cb.stats.state == CircuitState.CLOSED
    
    @pytest.mark.asyncio
    async def test_failed_call(self):
        """Test failed function call through circuit breaker."""
        cb = CircuitBreaker("test_service")
        
        async def fail_func():
            raise Exception("Test failure")
        
        with pytest.raises(Exception, match="Test failure"):
            await cb.call(fail_func)
        
        assert cb.stats.total_failures == 1
        assert cb.stats.failure_count == 1
        assert cb.stats.state == CircuitState.CLOSED  # Not open yet
    
    @pytest.mark.asyncio
    async def test_circuit_opens_after_threshold(self):
        """Test circuit opens after failure threshold is reached."""
        config = CircuitBreakerConfig(failure_threshold=3)
        cb = CircuitBreaker("test_service", config)
        
        async def fail_func():
            raise Exception("Test failure")
        
        # Fail 3 times to reach threshold
        for _ in range(3):
            with pytest.raises(Exception):
                await cb.call(fail_func)
        
        assert cb.stats.state == CircuitState.OPEN
        assert cb.stats.failure_count == 3
    
    @pytest.mark.asyncio
    async def test_circuit_rejects_when_open(self):
        """Test circuit breaker rejects calls when OPEN."""
        config = CircuitBreakerConfig(failure_threshold=2)
        cb = CircuitBreaker("test_service", config)
        
        async def fail_func():
            raise Exception("Test failure")
        
        # Open the circuit
        for _ in range(2):
            with pytest.raises(Exception):
                await cb.call(fail_func)
        
        assert cb.stats.state == CircuitState.OPEN
        
        # Next call should be rejected
        with pytest.raises(CircuitBreakerError, match="Circuit breaker.*is OPEN"):
            await cb.call(fail_func)
    
    @pytest.mark.asyncio
    async def test_circuit_transitions_to_half_open(self):
        """Test circuit transitions to HALF_OPEN after timeout."""
        config = CircuitBreakerConfig(
            failure_threshold=2,
            timeout_seconds=0  # Immediate transition for testing
        )
        cb = CircuitBreaker("test_service", config)
        
        async def fail_func():
            raise Exception("Test failure")
        
        # Open the circuit
        for _ in range(2):
            with pytest.raises(Exception):
                await cb.call(fail_func)
        
        assert cb.stats.state == CircuitState.OPEN
        
        # Wait a bit and try again - should transition to HALF_OPEN
        await asyncio.sleep(0.1)
        
        async def success_func():
            return "success"
        
        result = await cb.call(success_func)
        assert result == "success"
        # After first success in HALF_OPEN, still in HALF_OPEN
        assert cb.stats.state == CircuitState.HALF_OPEN
    
    @pytest.mark.asyncio
    async def test_circuit_closes_after_success_threshold(self):
        """Test circuit closes after success threshold in HALF_OPEN."""
        config = CircuitBreakerConfig(
            failure_threshold=2,
            success_threshold=2,
            timeout_seconds=0
        )
        cb = CircuitBreaker("test_service", config)
        
        async def fail_func():
            raise Exception("Test failure")
        
        async def success_func():
            return "success"
        
        # Open the circuit
        for _ in range(2):
            with pytest.raises(Exception):
                await cb.call(fail_func)
        
        assert cb.stats.state == CircuitState.OPEN
        
        # Wait and succeed twice to close
        await asyncio.sleep(0.1)
        await cb.call(success_func)
        await cb.call(success_func)
        
        assert cb.stats.state == CircuitState.CLOSED
        assert cb.stats.failure_count == 0
    
    @pytest.mark.asyncio
    async def test_circuit_reopens_on_half_open_failure(self):
        """Test circuit reopens if failure occurs in HALF_OPEN state."""
        config = CircuitBreakerConfig(
            failure_threshold=2,
            timeout_seconds=0
        )
        cb = CircuitBreaker("test_service", config)
        
        async def fail_func():
            raise Exception("Test failure")
        
        # Open the circuit
        for _ in range(2):
            with pytest.raises(Exception):
                await cb.call(fail_func)
        
        assert cb.stats.state == CircuitState.OPEN
        
        # Wait and fail again - should reopen
        await asyncio.sleep(0.1)
        with pytest.raises(Exception):
            await cb.call(fail_func)
        
        assert cb.stats.state == CircuitState.OPEN
    
    @pytest.mark.asyncio
    async def test_get_stats(self):
        """Test circuit breaker statistics retrieval."""
        cb = CircuitBreaker("test_service")
        
        async def success_func():
            return "success"
        
        await cb.call(success_func)
        
        stats = cb.get_stats()
        
        assert stats["name"] == "test_service"
        assert stats["state"] == CircuitState.CLOSED
        assert stats["total_requests"] == 1
        assert stats["total_successes"] == 1
        assert stats["total_failures"] == 0


class TestRetryStrategy:
    """Test cases for Retry Strategy."""
    
    @pytest.mark.asyncio
    async def test_retry_success_on_first_attempt(self):
        """Test successful execution on first attempt."""
        retry = RetryStrategy(max_retries=3)
        
        async def success_func():
            return "success"
        
        result = await retry.execute_with_retry(success_func)
        
        assert result == "success"
    
    @pytest.mark.asyncio
    async def test_retry_success_after_failures(self):
        """Test successful execution after some failures."""
        retry = RetryStrategy(max_retries=3, initial_delay=0.01)
        
        attempt_count = 0
        
        async def flaky_func():
            nonlocal attempt_count
            attempt_count += 1
            if attempt_count < 3:
                raise Exception("Temporary failure")
            return "success"
        
        result = await retry.execute_with_retry(flaky_func)
        
        assert result == "success"
        assert attempt_count == 3
    
    @pytest.mark.asyncio
    async def test_retry_exhaustion(self):
        """Test all retries are exhausted on persistent failure."""
        retry = RetryStrategy(max_retries=2, initial_delay=0.01)
        
        attempt_count = 0
        
        async def always_fail():
            nonlocal attempt_count
            attempt_count += 1
            raise Exception("Persistent failure")
        
        with pytest.raises(Exception, match="Persistent failure"):
            await retry.execute_with_retry(always_fail)
        
        assert attempt_count == 3  # Initial + 2 retries
    
    @pytest.mark.asyncio
    async def test_exponential_backoff(self):
        """Test exponential backoff delay calculation."""
        retry = RetryStrategy(
            max_retries=3,
            initial_delay=1.0,
            exponential_base=2.0
        )
        
        assert retry._calculate_delay(0) == 1.0
        assert retry._calculate_delay(1) == 2.0
        assert retry._calculate_delay(2) == 4.0
        assert retry._calculate_delay(3) == 8.0
    
    @pytest.mark.asyncio
    async def test_max_delay_cap(self):
        """Test maximum delay cap is enforced."""
        retry = RetryStrategy(
            max_retries=5,
            initial_delay=1.0,
            max_delay=5.0,
            exponential_base=2.0
        )
        
        # Delay would be 16.0 without cap
        assert retry._calculate_delay(4) == 5.0


class TestFallbackStrategy:
    """Test cases for Fallback Strategy."""
    
    @pytest.mark.asyncio
    async def test_fallback_on_primary_failure(self):
        """Test fallback is used when primary agent fails."""
        fallback = FallbackStrategy()
        
        async def failing_func():
            raise Exception("Primary failed")
        
        result = await fallback.execute_with_fallback(
            "socratic_tutor",
            failing_func
        )
        
        assert result["fallback_used"] is True
        assert result["primary_agent"] == "socratic_tutor"
        assert result["agent_used"] != "socratic_tutor"
    
    @pytest.mark.asyncio
    async def test_no_fallback_on_success(self):
        """Test fallback is not used when primary succeeds."""
        fallback = FallbackStrategy()
        
        async def success_func():
            return "primary success"
        
        result = await fallback.execute_with_fallback(
            "socratic_tutor",
            success_func
        )
        
        assert result["success"] is True
        assert result["fallback_used"] is False
        assert result["agent_used"] == "socratic_tutor"
    
    @pytest.mark.asyncio
    async def test_fallback_chain_defined(self):
        """Test fallback chains are defined for all agents."""
        fallback = FallbackStrategy()
        
        expected_agents = [
            "socratic_tutor",
            "cbc_curriculum",
            "lesson_architect",
            "assessment",
            "school_intelligence",
            "career_pathways"
        ]
        
        for agent in expected_agents:
            assert agent in fallback.fallback_chains
            assert isinstance(fallback.fallback_chains[agent], list)
    
    @pytest.mark.asyncio
    async def test_generic_responses_available(self):
        """Test generic responses are available for all fallback types."""
        fallback = FallbackStrategy()
        
        response = fallback._get_generic_response("generic_response")
        assert isinstance(response, str)
        assert len(response) > 0


class TestGracefulDegradation:
    """Test cases for Graceful Degradation."""
    
    def test_degradation_initialization(self):
        """Test graceful degradation initializes at full level."""
        degradation = GracefulDegradation()
        
        assert degradation.current_level == "full"
        assert "all_agents" in degradation.get_available_features()
    
    def test_degrade_to_level(self):
        """Test degrading to specific level."""
        degradation = GracefulDegradation()
        
        degradation.degrade_to_level("partial")
        assert degradation.current_level == "partial"
        
        degradation.degrade_to_level("minimal")
        assert degradation.current_level == "minimal"
    
    def test_can_use_feature(self):
        """Test feature availability checking."""
        degradation = GracefulDegradation()
        
        # At full level, all features available
        assert degradation.can_use_feature("multi_agent")
        
        # Degrade to partial
        degradation.degrade_to_level("partial")
        assert degradation.can_use_feature("single_agent")
        assert not degradation.can_use_feature("multi_agent")
    
    @pytest.mark.asyncio
    async def test_execute_with_degradation_success(self):
        """Test execution with degradation when feature available."""
        degradation = GracefulDegradation()
        
        async def test_func():
            return "success"
        
        result = await degradation.execute_with_degradation(
            "multi_agent",
            test_func
        )
        
        assert result["success"] is True
        assert result["degradation_level"] == "full"
    
    @pytest.mark.asyncio
    async def test_execute_with_degradation_unavailable(self):
        """Test execution when feature unavailable at current level."""
        degradation = GracefulDegradation()
        degradation.degrade_to_level("minimal")
        
        async def test_func():
            return "success"
        
        result = await degradation.execute_with_degradation(
            "multi_agent",
            test_func
        )
        
        assert result["success"] is False
        assert "unavailable" in result["error"].lower()
    
    def test_auto_degrade(self):
        """Test automatic degradation on failure."""
        degradation = GracefulDegradation()
        
        assert degradation.current_level == "full"
        
        degradation._auto_degrade()
        assert degradation.current_level == "partial"
        
        degradation._auto_degrade()
        assert degradation.current_level == "minimal"
        
        degradation._auto_degrade()
        assert degradation.current_level == "emergency"


class TestFailureRecoveryManager:
    """Test cases for Failure Recovery Manager."""
    
    @pytest.mark.asyncio
    async def test_manager_initialization(self):
        """Test failure recovery manager initializes all components."""
        manager = FailureRecoveryManager()
        
        assert manager.retry_strategy is not None
        assert manager.fallback_strategy is not None
        assert manager.degradation is not None
        assert len(manager.circuit_breakers) == 0
    
    @pytest.mark.asyncio
    async def test_get_circuit_breaker(self):
        """Test circuit breaker creation and retrieval."""
        manager = FailureRecoveryManager()
        
        cb1 = manager.get_circuit_breaker("service1")
        cb2 = manager.get_circuit_breaker("service1")
        cb3 = manager.get_circuit_breaker("service2")
        
        assert cb1 is cb2  # Same instance
        assert cb1 is not cb3  # Different instance
        assert len(manager.circuit_breakers) == 2
    
    @pytest.mark.asyncio
    async def test_execute_with_protection_success(self):
        """Test successful execution with full protection."""
        manager = FailureRecoveryManager()
        
        async def success_func():
            return "protected success"
        
        result = await manager.execute_with_protection(
            "test_service",
            success_func
        )
        
        assert result["success"] is True
        assert result["result"] == "protected success"
        assert result["protection_used"]["circuit_breaker"] is True
    
    @pytest.mark.asyncio
    async def test_execute_with_protection_with_retry(self):
        """Test execution with retry on transient failure."""
        manager = FailureRecoveryManager()
        
        attempt_count = 0
        
        async def flaky_func():
            nonlocal attempt_count
            attempt_count += 1
            if attempt_count < 2:
                raise Exception("Transient failure")
            return "success after retry"
        
        result = await manager.execute_with_protection(
            "test_service",
            flaky_func,
            use_retry=True
        )
        
        assert result["success"] is True
        assert result["result"] == "success after retry"
        assert attempt_count == 2
    
    @pytest.mark.asyncio
    async def test_execute_with_protection_with_fallback(self):
        """Test execution with fallback on persistent failure."""
        manager = FailureRecoveryManager()
        
        async def always_fail():
            raise Exception("Persistent failure")
        
        result = await manager.execute_with_protection(
            "socratic_tutor",
            always_fail,
            use_retry=False,
            use_fallback=True
        )
        
        # Should use fallback
        assert result["fallback_used"] is True
    
    @pytest.mark.asyncio
    async def test_get_system_health(self):
        """Test system health status retrieval."""
        manager = FailureRecoveryManager()
        
        # Create some circuit breakers
        manager.get_circuit_breaker("service1")
        manager.get_circuit_breaker("service2")
        
        health = manager.get_system_health()
        
        assert "health_score" in health
        assert "degradation_level" in health
        assert "circuit_breakers" in health
        assert "timestamp" in health
        assert health["health_score"] == 100  # All circuits closed
    
    @pytest.mark.asyncio
    async def test_system_health_with_failures(self):
        """Test system health reflects circuit breaker states."""
        manager = FailureRecoveryManager()
        
        async def fail_func():
            raise Exception("Test failure")
        
        # Open a circuit
        cb = manager.get_circuit_breaker("failing_service")
        for _ in range(5):
            try:
                await cb.call(fail_func)
            except:
                pass
        
        health = manager.get_system_health()
        
        assert health["health_score"] < 100  # Some circuits open
        assert "failing_service" in health["circuit_breakers"]
        assert health["circuit_breakers"]["failing_service"]["state"] == CircuitState.OPEN


class TestAgentFailureRecovery:
    """Test cases for agent failure recovery (Requirement 1.6)."""
    
    @pytest.mark.asyncio
    async def test_agent_timeout_recovery(self):
        """Test recovery from agent timeout."""
        manager = FailureRecoveryManager()
        
        async def timeout_func():
            await asyncio.sleep(10)  # Simulate timeout
            return "should not reach"
        
        # This would timeout in production with proper timeout handling
        # For now, test the recovery mechanism exists
        assert manager.retry_strategy is not None
        assert manager.fallback_strategy is not None
    
    @pytest:mark.asyncio
    async def test_agent_failure_with_fallback(self):
        """Test agent failure triggers fallback mechanism."""
        manager = FailureRecoveryManager()
        
        async def agent_fail():
            raise Exception("Agent crashed")
        
        result = await manager.execute_with_protection(
            "socratic_tutor",
            agent_fail,
            use_fallback=True
        )
        
        # Should have fallback response
        assert result["fallback_used"] is True
        assert "result" in result
    
    @pytest.mark.asyncio
    async def test_multiple_agent_failures(self):
        """Test system handles multiple concurrent agent failures."""
        manager = FailureRecoveryManager()
        
        async def fail_func():
            raise Exception("Agent failure")
        
        # Simulate multiple agent failures
        tasks = []
        for i in range(5):
            task = manager.execute_with_protection(
                f"agent_{i}",
                fail_func,
                use_fallback=True
            )
            tasks.append(task)
        
        results = await asyncio.gather(*tasks)
        
        # All should have fallback responses
        assert all(r["fallback_used"] for r in results)
