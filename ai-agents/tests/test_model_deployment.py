"""Tests for model deployment and configuration."""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any

from syncsenta_agents.inference.model_deployment import (
    ModelDeploymentManager,
    ModelRouter,
    ModelType,
    ModelDeploymentConfig
)
from syncsenta_agents.inference.ollama_client import OllamaClient, ModelInfo
from syncsenta_agents.core.exceptions import ModelUnavailableError


class TestModelDeploymentManager:
    """Tests for ModelDeploymentManager."""
    
    @pytest.fixture
    def mock_ollama_client(self):
        """Create a mock Ollama client."""
        client = MagicMock(spec=OllamaClient)
        client.initialize = AsyncMock()
        client.close = AsyncMock()
        client.pull_model = AsyncMock(return_value=True)
        client.refresh_models = AsyncMock()
        client.generate = AsyncMock()
        client.is_model_healthy = MagicMock(return_value=True)
        client.get_available_models = MagicMock(return_value=[])
        client.available_models = {}
        client.model_health = {}
        return client
    
    @pytest.fixture
    def deployment_manager(self, mock_ollama_client):
        """Create a deployment manager with mock client."""
        manager = ModelDeploymentManager(ollama_client=mock_ollama_client)
        return manager
    
    @pytest.mark.asyncio
    async def test_initialization(self, deployment_manager, mock_ollama_client):
        """Test deployment manager initialization."""
        await deployment_manager.initialize()
        
        mock_ollama_client.initialize.assert_called_once()
        assert len(deployment_manager.deployment_configs) == 4
        assert ModelType.PHI3_MINI in deployment_manager.deployment_configs
        assert ModelType.CBC_CUSTOM in deployment_manager.deployment_configs
    
    @pytest.mark.asyncio
    async def test_deploy_single_model_success(self, deployment_manager, mock_ollama_client):
        """Test successful deployment of a single model."""
        await deployment_manager.initialize()
        
        # Setup mock to simulate successful deployment
        model_name = "microsoft/phi-3-mini-4k-instruct"
        mock_ollama_client.available_models = {
            model_name: ModelInfo(
                name=model_name,
                size="2.3GB",
                modified_at="2024-01-01T00:00:00Z",
                digest="test_digest",
                details={"family": "phi3"}
            )
        }
        
        config = deployment_manager.deployment_configs[ModelType.PHI3_MINI]
        success = await deployment_manager.deploy_model(config)
        
        assert success is True
        assert model_name in deployment_manager.deployed_models
        mock_ollama_client.pull_model.assert_called_once_with(model_name)
    
    @pytest.mark.asyncio
    async def test_deploy_model_already_deployed(self, deployment_manager, mock_ollama_client):
        """Test deployment when model is already deployed."""
        await deployment_manager.initialize()
        
        model_name = "microsoft/phi-3-mini-4k-instruct"
        
        # Setup mock to show model already exists
        mock_ollama_client.get_available_models = MagicMock(return_value=[model_name])
        mock_ollama_client.available_models = {
            model_name: ModelInfo(
                name=model_name,
                size="2.3GB",
                modified_at="2024-01-01T00:00:00Z",
                digest="test_digest",
                details={"family": "phi3"}
            )
        }
        
        config = deployment_manager.deployment_configs[ModelType.PHI3_MINI]
        success = await deployment_manager.deploy_model(config, force_redeploy=False)
        
        assert success is True
        # Should not call pull_model since already deployed
        mock_ollama_client.pull_model.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_deploy_model_failure(self, deployment_manager, mock_ollama_client):
        """Test handling of model deployment failure."""
        await deployment_manager.initialize()
        
        # Setup mock to simulate deployment failure
        mock_ollama_client.pull_model = AsyncMock(return_value=False)
        
        config = deployment_manager.deployment_configs[ModelType.PHI3_MINI]
        success = await deployment_manager.deploy_model(config)
        
        assert success is False
        assert len(deployment_manager.deployed_models) == 0
    
    @pytest.mark.asyncio
    async def test_deploy_all_models_success(self, deployment_manager, mock_ollama_client):
        """Test successful deployment of all models."""
        await deployment_manager.initialize()
        
        # Setup mock to simulate successful deployments
        mock_ollama_client.pull_model = AsyncMock(return_value=True)
        
        # Create mock models for all required models
        for model_type, config in deployment_manager.deployment_configs.items():
            mock_ollama_client.available_models[config.model_name] = ModelInfo(
                name=config.model_name,
                size="2.0GB",
                modified_at="2024-01-01T00:00:00Z",
                digest=f"{model_type.value}_digest",
                details={"family": model_type.value}
            )
        
        results = await deployment_manager.deploy_all_models()
        
        assert len(results) == 4
        assert all(results.values())
        assert len(deployment_manager.deployed_models) == 4
    
    @pytest.mark.asyncio
    async def test_deploy_all_models_missing_required(self, deployment_manager, mock_ollama_client):
        """Test deployment failure when required models fail."""
        await deployment_manager.initialize()
        
        # Setup mock to simulate one model failing
        async def mock_pull(model_name):
            return "phi-3" not in model_name  # Fail Phi3 deployment
        
        mock_ollama_client.pull_model = AsyncMock(side_effect=mock_pull)
        
        # Only add non-Phi3 models to available
        for model_type, config in deployment_manager.deployment_configs.items():
            if model_type != ModelType.PHI3_MINI:
                mock_ollama_client.available_models[config.model_name] = ModelInfo(
                    name=config.model_name,
                    size="2.0GB",
                    modified_at="2024-01-01T00:00:00Z",
                    digest=f"{model_type.value}_digest",
                    details={"family": model_type.value}
                )
        
        with pytest.raises(ModelUnavailableError):
            await deployment_manager.deploy_all_models()
    
    @pytest.mark.asyncio
    async def test_verify_model_health_success(self, deployment_manager, mock_ollama_client):
        """Test successful model health verification."""
        await deployment_manager.initialize()
        
        model_name = "microsoft/phi-3-mini-4k-instruct"
        deployment_manager.deployed_models[model_name] = ModelInfo(
            name=model_name,
            size="2.3GB",
            modified_at="2024-01-01T00:00:00Z",
            digest="test_digest",
            details={"family": "phi3"}
        )
        
        # Mock successful generation
        from syncsenta_agents.inference.ollama_client import GenerationResponse
        mock_ollama_client.generate = AsyncMock(return_value=GenerationResponse(
            response="Test response",
            model=model_name,
            created_at="2024-01-01T00:00:00Z",
            done=True
        ))
        
        healthy = await deployment_manager.verify_model_health(model_name)
        
        assert healthy is True
        mock_ollama_client.generate.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_verify_model_health_failure(self, deployment_manager, mock_ollama_client):
        """Test model health verification failure."""
        await deployment_manager.initialize()
        
        model_name = "microsoft/phi-3-mini-4k-instruct"
        deployment_manager.deployed_models[model_name] = ModelInfo(
            name=model_name,
            size="2.3GB",
            modified_at="2024-01-01T00:00:00Z",
            digest="test_digest",
            details={"family": "phi3"}
        )
        
        # Mock generation failure
        mock_ollama_client.generate = AsyncMock(side_effect=Exception("Model error"))
        
        healthy = await deployment_manager.verify_model_health(model_name)
        
        assert healthy is False
    
    @pytest.mark.asyncio
    async def test_verify_all_models(self, deployment_manager, mock_ollama_client):
        """Test verification of all deployed models."""
        await deployment_manager.initialize()
        
        # Add multiple deployed models
        models = [
            "microsoft/phi-3-mini-4k-instruct",
            "google/gemma-2b-it",
            "syncsenta/cbc-curriculum-slm"
        ]
        
        for model_name in models:
            deployment_manager.deployed_models[model_name] = ModelInfo(
                name=model_name,
                size="2.0GB",
                modified_at="2024-01-01T00:00:00Z",
                digest=f"{model_name}_digest",
                details={"family": "test"}
            )
        
        # Mock successful generation for all
        from syncsenta_agents.inference.ollama_client import GenerationResponse
        mock_ollama_client.generate = AsyncMock(return_value=GenerationResponse(
            response="Test response",
            model="test",
            created_at="2024-01-01T00:00:00Z",
            done=True
        ))
        
        health_results = await deployment_manager.verify_all_models()
        
        assert len(health_results) == 3
        assert all(health_results.values())
    
    def test_get_model_for_agent_success(self, deployment_manager):
        """Test getting model for a specific agent type."""
        # Add deployed model
        model_name = "microsoft/phi-3-mini-4k-instruct"
        deployment_manager.deployed_models[model_name] = ModelInfo(
            name=model_name,
            size="2.3GB",
            modified_at="2024-01-01T00:00:00Z",
            digest="test_digest",
            details={"family": "phi3"}
        )
        
        model = deployment_manager.get_model_for_agent("socratic_tutor")
        
        assert model == model_name
    
    def test_get_model_for_agent_not_deployed(self, deployment_manager):
        """Test getting model when not deployed."""
        # No models deployed
        
        with pytest.raises(ModelUnavailableError):
            deployment_manager.get_model_for_agent("socratic_tutor")
    
    def test_get_model_for_agent_fallback(self, deployment_manager):
        """Test fallback when preferred model not deployed."""
        # Add a different model
        fallback_model = "google/gemma-2b-it"
        deployment_manager.deployed_models[fallback_model] = ModelInfo(
            name=fallback_model,
            size="2.0GB",
            modified_at="2024-01-01T00:00:00Z",
            digest="test_digest",
            details={"family": "gemma"}
        )
        
        # Request model for agent that prefers Phi3 (not deployed)
        model = deployment_manager.get_model_for_agent("socratic_tutor")
        
        # Should fallback to available model
        assert model == fallback_model
    
    def test_get_deployment_status(self, deployment_manager):
        """Test getting comprehensive deployment status."""
        # Add some deployed models
        deployment_manager.deployed_models["microsoft/phi-3-mini-4k-instruct"] = ModelInfo(
            name="microsoft/phi-3-mini-4k-instruct",
            size="2.3GB",
            modified_at="2024-01-01T00:00:00Z",
            digest="test_digest",
            details={"family": "phi3"}
        )
        
        status = deployment_manager.get_deployment_status()
        
        assert "total_models" in status
        assert "deployed_models" in status
        assert "required_models" in status
        assert "models" in status
        assert status["total_models"] == 4
        assert status["deployed_models"] == 1
        assert len(status["models"]) == 4


class TestModelRouter:
    """Tests for ModelRouter."""
    
    @pytest.fixture
    def mock_deployment_manager(self):
        """Create a mock deployment manager."""
        manager = MagicMock(spec=ModelDeploymentManager)
        
        # Setup deployed models
        manager.deployed_models = {
            "microsoft/phi-3-mini-4k-instruct": ModelInfo(
                name="microsoft/phi-3-mini-4k-instruct",
                size="2.3GB",
                modified_at="2024-01-01T00:00:00Z",
                digest="phi3_digest",
                details={"family": "phi3"}
            ),
            "syncsenta/cbc-curriculum-slm": ModelInfo(
                name="syncsenta/cbc-curriculum-slm",
                size="1.8GB",
                modified_at="2024-01-01T00:00:00Z",
                digest="cbc_digest",
                details={"family": "custom"}
            )
        }
        
        manager.get_model_for_agent = MagicMock(
            return_value="microsoft/phi-3-mini-4k-instruct"
        )
        
        return manager
    
    @pytest.fixture
    def router(self, mock_deployment_manager):
        """Create a model router with mock deployment manager."""
        return ModelRouter(mock_deployment_manager)
    
    def test_route_request_basic(self, router, mock_deployment_manager):
        """Test basic request routing."""
        model = router.route_request("socratic_tutor")
        
        assert model == "microsoft/phi-3-mini-4k-instruct"
        mock_deployment_manager.get_model_for_agent.assert_called_once_with("socratic_tutor")
    
    def test_route_request_with_context(self, router, mock_deployment_manager):
        """Test request routing with context."""
        context = {"task_type": "generate_lesson"}
        
        model = router.route_request("lesson_architect", context)
        
        assert model is not None
        mock_deployment_manager.get_model_for_agent.assert_called_once()
    
    def test_route_request_caching(self, router, mock_deployment_manager):
        """Test that routing decisions are cached."""
        # First request
        model1 = router.route_request("socratic_tutor")
        
        # Second request (should use cache)
        model2 = router.route_request("socratic_tutor")
        
        assert model1 == model2
        # Should only call get_model_for_agent once due to caching
        assert mock_deployment_manager.get_model_for_agent.call_count == 1
    
    def test_route_request_context_based_routing(self, router, mock_deployment_manager):
        """Test context-based routing rules."""
        # Setup CBC model in deployed models
        mock_deployment_manager.deployed_models["syncsenta/cbc-curriculum-slm"] = ModelInfo(
            name="syncsenta/cbc-curriculum-slm",
            size="1.8GB",
            modified_at="2024-01-01T00:00:00Z",
            digest="cbc_digest",
            details={"family": "custom"}
        )
        
        # Request with curriculum-specific context
        context = {"curriculum_specific": True}
        
        model = router.route_request("lesson_architect", context)
        
        # Should route to CBC model due to context
        assert model is not None
    
    def test_clear_cache(self, router):
        """Test clearing the routing cache."""
        # Make some requests to populate cache
        router.route_request("socratic_tutor")
        router.route_request("lesson_architect")
        
        assert len(router.routing_cache) > 0
        
        # Clear cache
        router.clear_cache()
        
        assert len(router.routing_cache) == 0
    
    def test_get_routing_statistics(self, router):
        """Test getting routing statistics."""
        # Make some requests
        router.route_request("socratic_tutor")
        router.route_request("lesson_architect")
        
        stats = router.get_routing_statistics()
        
        assert "cache_size" in stats
        assert "cached_routes" in stats
        assert stats["cache_size"] == 2
        assert len(stats["cached_routes"]) == 2


class TestModelDeploymentConfig:
    """Tests for ModelDeploymentConfig."""
    
    def test_config_creation(self):
        """Test creating a model deployment config."""
        config = ModelDeploymentConfig(
            model_type=ModelType.PHI3_MINI,
            model_name="microsoft/phi-3-mini-4k-instruct",
            description="Test model",
            use_cases=["test"],
            parameters="3.8B"
        )
        
        assert config.model_type == ModelType.PHI3_MINI
        assert config.model_name == "microsoft/phi-3-mini-4k-instruct"
        assert config.quantization == "Q4_K_M"  # Default
        assert config.priority == 1  # Default
        assert config.required is True  # Default


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
