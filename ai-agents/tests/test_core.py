"""Tests for core functionality."""

import pytest
from datetime import datetime
from syncsenta_agents.core.models import (
    AgentRequest, 
    AgentResponse, 
    GradeVerification,
    MessageType,
    AgentType,
    RequestPriority
)
from syncsenta_agents.core.config import AgentConfig


class TestAgentModels:
    """Test core data models."""
    
    def test_agent_request_creation(self):
        """Test AgentRequest model creation."""
        request = AgentRequest(
            message="Test message",
            user_id="user123",
            grade="g4",
            subject="Mathematics"
        )
        
        assert request.message == "Test message"
        assert request.user_id == "user123"
        assert request.grade == "g4"
        assert request.subject == "Mathematics"
        assert request.role == "student"  # default
        assert request.priority == RequestPriority.MEDIUM  # default
    
    def test_agent_response_creation(self):
        """Test AgentResponse model creation."""
        response = AgentResponse(
            success=True,
            response="Test response",
            primary_agent="cbc_curriculum",
            agents_used=["cbc_curriculum"],
            response_time_ms=100
        )
        
        assert response.success is True
        assert response.response == "Test response"
        assert response.primary_agent == "cbc_curriculum"
        assert response.agents_used == ["cbc_curriculum"]
        assert response.response_time_ms == 100
        assert response.cached is False  # default
    
    def test_grade_verification_hash_dict(self):
        """Test GradeVerification hash dictionary generation."""
        grade = GradeVerification(
            student_id="student123",
            subject="Mathematics",
            grade="A",
            score=85,
            date="2024-01-15",
            teacher_id="teacher456",
            assessment_type="quiz"
        )
        
        hash_dict = grade.to_hash_dict()
        
        expected_keys = {
            'student_id', 'subject', 'grade', 'score', 
            'date', 'teacher_id', 'assessment_type'
        }
        assert set(hash_dict.keys()) == expected_keys
        assert hash_dict['student_id'] == "student123"
        assert hash_dict['score'] == 85


class TestAgentConfig:
    """Test configuration management."""
    
    def test_default_config_values(self):
        """Test default configuration values."""
        config = AgentConfig()
        
        assert config.environment == "development"
        assert config.debug is True
        assert config.ollama_base_url == "http://localhost:11434"
        assert "phi3_mini" in config.ollama_models
        assert "cbc_curriculum" in config.agent_model_mapping
    
    def test_model_mapping_completeness(self):
        """Test that all agent types have model mappings."""
        config = AgentConfig()
        
        expected_agents = {
            "cbc_curriculum", "socratic_tutor", "lesson_architect",
            "assessment", "intelligence", "career_pathways"
        }
        
        assert set(config.agent_model_mapping.keys()) == expected_agents
    
    def test_kenyan_voice_profiles(self):
        """Test Kenyan voice profile configuration."""
        config = AgentConfig()
        
        expected_voices = {"teacher_male", "teacher_female", "student_friendly"}
        assert set(config.kenyan_voice_profiles.keys()) == expected_voices


class TestEnums:
    """Test enumeration types."""
    
    def test_message_type_enum(self):
        """Test MessageType enumeration."""
        assert MessageType.QUERY == "query"
        assert MessageType.RESPONSE == "response"
        assert MessageType.COORDINATION == "coordination"
        assert MessageType.ERROR == "error"
    
    def test_agent_type_enum(self):
        """Test AgentType enumeration."""
        assert AgentType.ORCHESTRATOR == "orchestrator"
        assert AgentType.CBC_CURRICULUM == "cbc_curriculum"
        assert AgentType.SOCRATIC_TUTOR == "socratic_tutor"
    
    def test_request_priority_enum(self):
        """Test RequestPriority enumeration."""
        assert RequestPriority.LOW == 1
        assert RequestPriority.MEDIUM == 3
        assert RequestPriority.HIGH == 5