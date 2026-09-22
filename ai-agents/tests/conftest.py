"""Pytest configuration and fixtures for SyncSenta AI Agents tests."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from typing import Dict, Any

from syncsenta_agents.core.config import AgentConfig
from syncsenta_agents.core.models import AgentRequest, AgentResponse


@pytest.fixture
def test_config():
    """Test configuration with safe defaults."""
    return AgentConfig(
        environment="test",
        debug=True,
        ollama_base_url="http://localhost:11434",
        stellar_network="testnet",
        database_url="sqlite:///:memory:",
        elevenlabs_api_key="test_key"
    )


@pytest.fixture
def sample_agent_request():
    """Sample agent request for testing."""
    return AgentRequest(
        message="What are the Grade 4 Mathematics learning outcomes for fractions?",
        user_id="test_user_1",
        session_id="test_session_1",
        grade="g4",
        subject="Mathematics",
        role="student",
        context={
            "previous_topic": "whole_numbers",
            "difficulty_level": "beginner"
        }
    )


@pytest.fixture
def sample_agent_response():
    """Sample agent response for testing."""
    return AgentResponse(
        success=True,
        response="Grade 4 Mathematics fractions learning outcomes include identifying parts of a whole, comparing simple fractions, and adding fractions with same denominators.",
        primary_agent="cbc_curriculum",
        agents_used=["cbc_curriculum"],
        response_time_ms=150,
        cached=False,
        context_aware=True
    )


@pytest.fixture
def mock_ollama_client():
    """Mock Ollama client for testing."""
    mock_client = AsyncMock()
    mock_client.generate.return_value = {
        "response": "Test response from Ollama model",
        "model": "phi3_mini",
        "created_at": "2024-01-01T00:00:00Z"
    }
    return mock_client


@pytest.fixture
def mock_stellar_client():
    """Mock Stellar client for testing."""
    mock_client = AsyncMock()
    mock_client.submit_transaction.return_value = {
        "hash": "test_transaction_hash_123",
        "ledger": 12345,
        "successful": True
    }
    return mock_client


@pytest.fixture
def sample_grade_data():
    """Sample grade data for blockchain testing."""
    return {
        "student_id": "student_123",
        "subject": "Mathematics",
        "grade": "A",
        "score": 85,
        "date": "2024-01-15",
        "teacher_id": "teacher_456",
        "type": "quiz"
    }