"""Ollama client for edge inference on Raspberry Pi nodes."""

import asyncio
import time
from typing import Dict, List, Optional, Any
import aiohttp
import json
from dataclasses import dataclass

from ..core.config import config
from ..core.logging import AgentLogger
from ..core.exceptions import ModelUnavailableError, NetworkError


@dataclass
class ModelInfo:
    """Information about an Ollama model."""
    name: str
    size: str
    modified_at: str
    digest: str
    details: Dict[str, Any]


@dataclass
class GenerationResponse:
    """Response from Ollama model generation."""
    response: str
    model: str
    created_at: str
    done: bool
    total_duration: Optional[int] = None
    load_duration: Optional[int] = None
    prompt_eval_count: Optional[int] = None
    prompt_eval_duration: Optional[int] = None
    eval_count: Optional[int] = None
    eval_duration: Optional[int] = None


class OllamaClient:
    """Client for interacting with Ollama server on Raspberry Pi nodes."""
    
    def __init__(self, base_url: str = None):
        self.base_url = base_url or config.ollama_base_url
        self.logger = AgentLogger("ollama_client")
        self.session: Optional[aiohttp.ClientSession] = None
        self.available_models: Dict[str, ModelInfo] = {}
        self.model_health: Dict[str, bool] = {}
        
    async def __aenter__(self):
        """Async context manager entry."""
        await self.initialize()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
    
    async def initialize(self) -> None:
        """Initialize the Ollama client."""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=config.request_timeout_seconds)
        )
        
        # Check server health
        await self.health_check()
        
        # Load available models
        await self.refresh_models()
        
        self.logger.info(
            "Ollama client initialized",
            base_url=self.base_url,
            available_models=list(self.available_models.keys())
        )
    
    async def close(self) -> None:
        """Close the client session."""
        if self.session:
            await self.session.close()
    
    async def health_check(self) -> bool:
        """Check if Ollama server is healthy."""
        try:
            async with self.session.get(f"{self.base_url}/api/tags") as response:
                if response.status == 200:
                    self.logger.debug("Ollama server health check passed")
                    return True
                else:
                    self.logger.error(
                        "Ollama server health check failed",
                        status_code=response.status
                    )
                    return False
        except Exception as e:
            self.logger.error("Ollama server unreachable", error=str(e))
            raise NetworkError(f"Cannot reach Ollama server at {self.base_url}: {e}")
    
    async def refresh_models(self) -> None:
        """Refresh the list of available models."""
        try:
            async with self.session.get(f"{self.base_url}/api/tags") as response:
                if response.status == 200:
                    data = await response.json()
                    self.available_models = {}
                    
                    for model_data in data.get("models", []):
                        model_info = ModelInfo(
                            name=model_data["name"],
                            size=model_data["size"],
                            modified_at=model_data["modified_at"],
                            digest=model_data["digest"],
                            details=model_data.get("details", {})
                        )
                        self.available_models[model_info.name] = model_info
                        self.model_health[model_info.name] = True
                    
                    self.logger.info(
                        "Models refreshed",
                        model_count=len(self.available_models)
                    )
                else:
                    self.logger.error(
                        "Failed to refresh models",
                        status_code=response.status
                    )
        except Exception as e:
            self.logger.error("Error refreshing models", error=str(e))
            raise NetworkError(f"Failed to refresh models: {e}")
    
    async def generate(
        self,
        model: str,
        prompt: str,
        system: Optional[str] = None,
        template: Optional[str] = None,
        context: Optional[List[int]] = None,
        stream: bool = False,
        raw: bool = False,
        format: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> GenerationResponse:
        """Generate text using an Ollama model."""
        
        # Check if model is available
        if model not in self.available_models:
            await self.refresh_models()
            if model not in self.available_models:
                raise ModelUnavailableError(f"Model '{model}' is not available")
        
        # Check model health
        if not self.model_health.get(model, False):
            self.logger.warning(f"Model '{model}' may be unhealthy")
        
        # Prepare request payload
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": stream,
            "raw": raw
        }
        
        if system:
            payload["system"] = system
        if template:
            payload["template"] = template
        if context:
            payload["context"] = context
        if format:
            payload["format"] = format
        if options:
            payload["options"] = options
        
        start_time = time.time()
        
        try:
            async with self.session.post(
                f"{self.base_url}/api/generate",
                json=payload
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    
                    generation_time_ms = int((time.time() - start_time) * 1000)
                    
                    self.logger.info(
                        "Model generation completed",
                        model=model,
                        generation_time_ms=generation_time_ms,
                        prompt_length=len(prompt),
                        response_length=len(data.get("response", ""))
                    )
                    
                    return GenerationResponse(
                        response=data.get("response", ""),
                        model=data.get("model", model),
                        created_at=data.get("created_at", ""),
                        done=data.get("done", True),
                        total_duration=data.get("total_duration"),
                        load_duration=data.get("load_duration"),
                        prompt_eval_count=data.get("prompt_eval_count"),
                        prompt_eval_duration=data.get("prompt_eval_duration"),
                        eval_count=data.get("eval_count"),
                        eval_duration=data.get("eval_duration")
                    )
                else:
                    error_text = await response.text()
                    self.logger.error(
                        "Model generation failed",
                        model=model,
                        status_code=response.status,
                        error=error_text
                    )
                    
                    # Mark model as unhealthy
                    self.model_health[model] = False
                    
                    raise ModelUnavailableError(
                        f"Model generation failed for '{model}': {error_text}"
                    )
                    
        except aiohttp.ClientError as e:
            self.logger.error(
                "Network error during generation",
                model=model,
                error=str(e)
            )
            raise NetworkError(f"Network error during generation: {e}")
    
    async def pull_model(self, model: str) -> bool:
        """Pull a model to the Ollama server."""
        self.logger.info(f"Pulling model: {model}")
        
        payload = {"name": model}
        
        try:
            async with self.session.post(
                f"{self.base_url}/api/pull",
                json=payload
            ) as response:
                
                if response.status == 200:
                    # Stream the pull progress
                    async for line in response.content:
                        if line:
                            try:
                                progress_data = json.loads(line.decode())
                                if progress_data.get("status"):
                                    self.logger.debug(
                                        "Model pull progress",
                                        model=model,
                                        status=progress_data["status"]
                                    )
                            except json.JSONDecodeError:
                                continue
                    
                    self.logger.info(f"Model pulled successfully: {model}")
                    await self.refresh_models()
                    return True
                else:
                    error_text = await response.text()
                    self.logger.error(
                        "Model pull failed",
                        model=model,
                        status_code=response.status,
                        error=error_text
                    )
                    return False
                    
        except Exception as e:
            self.logger.error(f"Error pulling model {model}", error=str(e))
            return False
    
    async def delete_model(self, model: str) -> bool:
        """Delete a model from the Ollama server."""
        self.logger.info(f"Deleting model: {model}")
        
        payload = {"name": model}
        
        try:
            async with self.session.delete(
                f"{self.base_url}/api/delete",
                json=payload
            ) as response:
                
                if response.status == 200:
                    self.logger.info(f"Model deleted successfully: {model}")
                    await self.refresh_models()
                    return True
                else:
                    error_text = await response.text()
                    self.logger.error(
                        "Model deletion failed",
                        model=model,
                        status_code=response.status,
                        error=error_text
                    )
                    return False
                    
        except Exception as e:
            self.logger.error(f"Error deleting model {model}", error=str(e))
            return False
    
    def get_model_for_agent(self, agent_type: str) -> str:
        """Get the appropriate model for an agent type."""
        model_name = config.agent_model_mapping.get(agent_type, "phi3_mini")
        model_path = config.ollama_models.get(model_name, model_name)
        
        # Check if model is available
        if model_path not in self.available_models:
            self.logger.warning(
                f"Preferred model '{model_path}' not available for agent '{agent_type}', "
                f"falling back to available models"
            )
            # Fall back to first available model
            if self.available_models:
                model_path = list(self.available_models.keys())[0]
            else:
                raise ModelUnavailableError("No models available")
        
        return model_path
    
    def is_model_healthy(self, model: str) -> bool:
        """Check if a model is healthy."""
        return self.model_health.get(model, False)
    
    def get_available_models(self) -> List[str]:
        """Get list of available model names."""
        return list(self.available_models.keys())


class SyncSentaOllamaServer:
    """High-level interface for SyncSenta Ollama operations."""
    
    def __init__(self):
        self.client = OllamaClient()
        self.logger = AgentLogger("ollama_server")
    
    async def initialize(self) -> None:
        """Initialize the Ollama server interface."""
        await self.client.initialize()
        
        # Ensure required models are available
        await self.ensure_required_models()
        
        self.logger.info("SyncSenta Ollama server initialized")
    
    async def ensure_required_models(self) -> None:
        """Ensure all required models for SyncSenta agents are available."""
        required_models = set(config.ollama_models.values())
        available_models = set(self.client.get_available_models())
        
        missing_models = required_models - available_models
        
        if missing_models:
            self.logger.info(
                "Missing required models, attempting to pull",
                missing_models=list(missing_models)
            )
            
            for model in missing_models:
                success = await self.client.pull_model(model)
                if not success:
                    self.logger.error(f"Failed to pull required model: {model}")
    
    async def generate_response(
        self,
        agent_type: str,
        prompt: str,
        system_prompt: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate a response for a specific agent type."""
        
        model = self.client.get_model_for_agent(agent_type)
        
        # Default options for different agent types
        default_options = {
            "temperature": 0.7,
            "top_p": 0.9,
            "max_tokens": 512
        }
        
        # Agent-specific optimizations
        if agent_type == "cbc_curriculum":
            default_options["temperature"] = 0.3  # Lower for factual accuracy
        elif agent_type == "assessment":
            default_options["max_tokens"] = 256  # Shorter for efficiency
        
        if options:
            default_options.update(options)
        
        try:
            response = await self.client.generate(
                model=model,
                prompt=prompt,
                system=system_prompt,
                options=default_options
            )
            
            return response.response
            
        except Exception as e:
            self.logger.error(
                "Failed to generate response",
                agent_type=agent_type,
                model=model,
                error=str(e)
            )
            raise
    
    async def close(self) -> None:
        """Close the Ollama server interface."""
        await self.client.close()