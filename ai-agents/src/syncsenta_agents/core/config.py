"""Configuration management for SyncSenta AI Agents."""

import os
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class AgentConfig(BaseModel):
    """Configuration for SyncSenta AI Agents system."""
    
    # Environment
    environment: str = Field(default="development")
    debug: bool = Field(default=True)
    
    # Ollama Configuration
    ollama_base_url: str = Field(default="http://localhost:11434")
    ollama_models: Dict[str, str] = Field(default={
        "phi3_mini": "microsoft/phi-3-mini-4k-instruct",
        "gemma_2b": "google/gemma-2b-it", 
        "qwen_2_5": "qwen/qwen2.5-3b-instruct",
        "cbc_custom": "syncsenta/cbc-curriculum-slm"
    })
    
    # Agent Model Mapping
    agent_model_mapping: Dict[str, str] = Field(default={
        "cbc_curriculum": "cbc_custom",
        "socratic_tutor": "phi3_mini",
        "lesson_architect": "phi3_mini", 
        "assessment": "gemma_2b",
        "intelligence": "qwen_2_5",
        "career_pathways": "phi3_mini"
    })
    
    # Stellar Configuration
    stellar_network: str = Field(default="testnet")
    stellar_horizon_url: str = Field(default="https://horizon-testnet.stellar.org")
    school_secret_key: Optional[str] = Field(default=None)
    
    # Database Configuration
    database_url: str = Field(default="sqlite:///./syncsenta_agents.db")
    couchdb_url: str = Field(default="http://localhost:5984")
    
    # Voice and Multimodal
    elevenlabs_api_key: Optional[str] = Field(default=None)
    whisper_model: str = Field(default="base")
    kenyan_voice_profiles: Dict[str, str] = Field(default={
        "teacher_male": "kenyan_male_teacher_voice_id",
        "teacher_female": "kenyan_female_teacher_voice_id", 
        "student_friendly": "young_kenyan_voice_id"
    })
    
    # Performance Settings
    max_concurrent_requests: int = Field(default=1000)
    request_timeout_seconds: int = Field(default=30)
    cache_ttl_seconds: int = Field(default=300)
    
    # Cultural Settings
    default_language: str = Field(default="english")
    supported_languages: List[str] = Field(default=["english", "swahili"])
    cultural_context: str = Field(default="kenyan")
    
    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )


# Global configuration instance
config = AgentConfig()