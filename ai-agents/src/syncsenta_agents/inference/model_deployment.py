"""Model deployment and configuration for SyncSenta edge inference."""

import asyncio
import os
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

from .ollama_client import OllamaClient, SyncSentaOllamaServer, ModelInfo
from ..core.logging import AgentLogger
from ..core.config import config
from ..core.exceptions import ModelUnavailableError


class ModelType(Enum):
    """Types of models deployed in the system."""
    PHI3_MINI = "phi3_mini"
    GEMMA_2B = "gemma_2b"
    QWEN_2_5 = "qwen_2_5"
    CBC_CUSTOM = "cbc_custom"


@dataclass
class ModelDeploymentConfig:
    """Configuration for model deployment."""
    model_type: ModelType
    model_name: str
    description: str
    use_cases: List[str]
    parameters: str
    quantization: str = "Q4_K_M"  # Default GGUF quantization
    priority: int = 1  # 1=high, 5=low
    required: bool = True


class ModelDeploymentManager:
    """Manages deployment and configuration of language models on Pi nodes."""
    
    def __init__(self, ollama_client: Optional[OllamaClient] = None):
        self.logger = AgentLogger("model_deployment")
        self.client = ollama_client or OllamaClient()
        self.deployment_configs = self._initialize_deployment_configs()
        self.deployed_models: Dict[str, ModelInfo] = {}
        
    def _initialize_deployment_configs(self) -> Dict[ModelType, ModelDeploymentConfig]:
        """Initialize model deployment configurations."""
        return {
            ModelType.PHI3_MINI: ModelDeploymentConfig(
                model_type=ModelType.PHI3_MINI,
                model_name="microsoft/phi-3-mini-4k-instruct",
                description="Primary reasoning model for general agent tasks",
                use_cases=[
                    "Socratic Tutor Agent",
                    "Lesson Architect Agent",
                    "Career Pathways Agent"
                ],
                parameters="3.8B",
                quantization="Q4_K_M",
                priority=1,
                required=True
            ),
            ModelType.GEMMA_2B: ModelDeploymentConfig(
                model_type=ModelType.GEMMA_2B,
                model_name="google/gemma-2b-it",
                description="Efficient processing for assessment tasks",
                use_cases=[
                    "Assessment & Feedback Agent"
                ],
                parameters="2B",
                quantization="Q4_K_M",
                priority=2,
                required=True
            ),
            ModelType.QWEN_2_5: ModelDeploymentConfig(
                model_type=ModelType.QWEN_2_5,
                model_name="qwen/qwen2.5-3b-instruct",
                description="Efficient model for intelligence and analytics",
                use_cases=[
                    "School Intelligence Agent"
                ],
                parameters="3B",
                quantization="Q4_K_M",
                priority=2,
                required=True
            ),
            ModelType.CBC_CUSTOM: ModelDeploymentConfig(
                model_type=ModelType.CBC_CUSTOM,
                model_name="syncsenta/cbc-curriculum-slm",
                description="Custom SLM fine-tuned on KICD curriculum documents",
                use_cases=[
                    "CBC Curriculum Agent"
                ],
                parameters="2B",
                quantization="Q4_K_M",
                priority=1,
                required=True
            )
        }
    
    async def initialize(self) -> None:
        """Initialize the model deployment manager."""
        await self.client.initialize()
        self.logger.info("Model deployment manager initialized")
    
    async def deploy_all_models(self, force_redeploy: bool = False) -> Dict[str, bool]:
        """Deploy all required models to the Ollama server."""
        self.logger.info("Starting deployment of all models")
        
        deployment_results = {}
        
        # Sort by priority (lower number = higher priority)
        sorted_configs = sorted(
            self.deployment_configs.values(),
            key=lambda x: x.priority
        )
        
        for config in sorted_configs:
            if config.required or force_redeploy:
                success = await self.deploy_model(config, force_redeploy)
                deployment_results[config.model_type.value] = success
        
        # Verify all required models are deployed
        missing_models = [
            config.model_type.value
            for config in self.deployment_configs.values()
            if config.required and not deployment_results.get(config.model_type.value, False)
        ]
        
        if missing_models:
            self.logger.error(
                "Failed to deploy required models",
                missing_models=missing_models
            )
            raise ModelUnavailableError(
                f"Required models not deployed: {', '.join(missing_models)}"
            )
        
        self.logger.info(
            "Model deployment completed",
            successful=sum(1 for v in deployment_results.values() if v),
            total=len(deployment_results)
        )
        
        return deployment_results
    
    async def deploy_model(
        self,
        deployment_config: ModelDeploymentConfig,
        force_redeploy: bool = False
    ) -> bool:
        """Deploy a specific model to the Ollama server."""
        model_name = deployment_config.model_name
        
        self.logger.info(
            f"Deploying model: {model_name}",
            model_type=deployment_config.model_type.value,
            parameters=deployment_config.parameters,
            quantization=deployment_config.quantization
        )
        
        # Check if model is already deployed
        if not force_redeploy:
            available_models = self.client.get_available_models()
            if model_name in available_models:
                self.logger.info(
                    f"Model already deployed: {model_name}",
                    skipping=True
                )
                self.deployed_models[model_name] = self.client.available_models[model_name]
                return True
        
        # Pull the model
        try:
            success = await self.client.pull_model(model_name)
            
            if success:
                # Refresh models to get updated info
                await self.client.refresh_models()
                
                if model_name in self.client.available_models:
                    self.deployed_models[model_name] = self.client.available_models[model_name]
                    
                    self.logger.info(
                        f"Model deployed successfully: {model_name}",
                        model_type=deployment_config.model_type.value,
                        size=self.client.available_models[model_name].size
                    )
                    return True
                else:
                    self.logger.error(
                        f"Model pull succeeded but model not found: {model_name}"
                    )
                    return False
            else:
                self.logger.error(
                    f"Failed to deploy model: {model_name}",
                    model_type=deployment_config.model_type.value
                )
                return False
                
        except Exception as e:
            self.logger.error(
                f"Error deploying model: {model_name}",
                error=str(e)
            )
            return False
    
    async def verify_model_health(self, model_name: str) -> bool:
        """Verify that a deployed model is healthy and responsive."""
        self.logger.debug(f"Verifying health of model: {model_name}")
        
        try:
            # Simple test generation to verify model works
            test_prompt = "Hello, this is a test."
            
            response = await self.client.generate(
                model=model_name,
                prompt=test_prompt,
                options={"max_tokens": 10}
            )
            
            if response and response.response:
                self.logger.info(
                    f"Model health check passed: {model_name}",
                    response_length=len(response.response)
                )
                return True
            else:
                self.logger.warning(
                    f"Model health check failed: {model_name}",
                    reason="Empty response"
                )
                return False
                
        except Exception as e:
            self.logger.error(
                f"Model health check error: {model_name}",
                error=str(e)
            )
            return False
    
    async def verify_all_models(self) -> Dict[str, bool]:
        """Verify health of all deployed models."""
        self.logger.info("Verifying health of all deployed models")
        
        health_results = {}
        
        for model_name in self.deployed_models.keys():
            health_results[model_name] = await self.verify_model_health(model_name)
        
        healthy_count = sum(1 for v in health_results.values() if v)
        
        self.logger.info(
            "Model health verification completed",
            healthy=healthy_count,
            total=len(health_results)
        )
        
        return health_results
    
    def get_model_for_agent(self, agent_type: str) -> str:
        """Get the appropriate model for a specific agent type."""
        # Map agent type to model type
        model_key = config.agent_model_mapping.get(agent_type)
        
        if not model_key:
            self.logger.warning(
                f"No model mapping found for agent type: {agent_type}",
                falling_back_to="phi3_mini"
            )
            model_key = "phi3_mini"
        
        # Get model name from config
        model_name = config.ollama_models.get(model_key)
        
        if not model_name:
            self.logger.error(
                f"Model not found in config: {model_key}",
                agent_type=agent_type
            )
            raise ModelUnavailableError(
                f"Model '{model_key}' not configured for agent '{agent_type}'"
            )
        
        # Verify model is deployed
        if model_name not in self.deployed_models:
            self.logger.warning(
                f"Model not deployed: {model_name}",
                agent_type=agent_type
            )
            # Try to use any available model as fallback
            if self.deployed_models:
                fallback_model = list(self.deployed_models.keys())[0]
                self.logger.info(
                    f"Using fallback model: {fallback_model}",
                    original_model=model_name
                )
                return fallback_model
            else:
                raise ModelUnavailableError("No models deployed")
        
        return model_name
    
    def get_deployment_status(self) -> Dict[str, Any]:
        """Get comprehensive deployment status."""
        status = {
            "total_models": len(self.deployment_configs),
            "deployed_models": len(self.deployed_models),
            "required_models": sum(
                1 for c in self.deployment_configs.values() if c.required
            ),
            "models": {}
        }
        
        for model_type, config in self.deployment_configs.items():
            model_name = config.model_name
            is_deployed = model_name in self.deployed_models
            
            model_status = {
                "model_name": model_name,
                "model_type": model_type.value,
                "description": config.description,
                "use_cases": config.use_cases,
                "parameters": config.parameters,
                "quantization": config.quantization,
                "priority": config.priority,
                "required": config.required,
                "deployed": is_deployed,
                "healthy": self.client.is_model_healthy(model_name) if is_deployed else False
            }
            
            if is_deployed:
                model_info = self.deployed_models[model_name]
                model_status["size"] = model_info.size
                model_status["modified_at"] = model_info.modified_at
            
            status["models"][model_type.value] = model_status
        
        return status
    
    async def close(self) -> None:
        """Close the model deployment manager."""
        await self.client.close()
        self.logger.info("Model deployment manager closed")


class ModelRouter:
    """Routes agent requests to appropriate models based on agent type and context."""
    
    def __init__(self, deployment_manager: ModelDeploymentManager):
        self.logger = AgentLogger("model_router")
        self.deployment_manager = deployment_manager
        self.routing_cache: Dict[str, str] = {}
    
    def route_request(
        self,
        agent_type: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Route a request to the appropriate model."""
        
        # Check cache first
        cache_key = f"{agent_type}:{context.get('task_type', 'default') if context else 'default'}"
        
        if cache_key in self.routing_cache:
            return self.routing_cache[cache_key]
        
        # Get model for agent type
        model_name = self.deployment_manager.get_model_for_agent(agent_type)
        
        # Apply context-based routing rules if needed
        if context:
            model_name = self._apply_routing_rules(agent_type, model_name, context)
        
        # Cache the routing decision
        self.routing_cache[cache_key] = model_name
        
        self.logger.debug(
            "Request routed to model",
            agent_type=agent_type,
            model=model_name,
            context_task=context.get('task_type') if context else None
        )
        
        return model_name
    
    def _apply_routing_rules(
        self,
        agent_type: str,
        default_model: str,
        context: Dict[str, Any]
    ) -> str:
        """Apply context-based routing rules."""
        
        # Example: Route complex reasoning tasks to Phi3_Mini
        if context.get('complexity') == 'high':
            phi3_model = config.ollama_models.get('phi3_mini')
            if phi3_model in self.deployment_manager.deployed_models:
                return phi3_model
        
        # Example: Route curriculum-specific queries to CBC custom model
        if context.get('curriculum_specific') is True:
            cbc_model = config.ollama_models.get('cbc_custom')
            if cbc_model in self.deployment_manager.deployed_models:
                return cbc_model
        
        return default_model
    
    def clear_cache(self) -> None:
        """Clear the routing cache."""
        self.routing_cache.clear()
        self.logger.debug("Routing cache cleared")
    
    def get_routing_statistics(self) -> Dict[str, Any]:
        """Get routing statistics."""
        return {
            "cache_size": len(self.routing_cache),
            "cached_routes": list(self.routing_cache.keys())
        }
