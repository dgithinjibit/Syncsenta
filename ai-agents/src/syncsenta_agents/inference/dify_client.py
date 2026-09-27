"""Dify AI client for cloud-based inference as an alternative to Ollama."""

import asyncio
import time
from typing import Dict, List, Optional, Any
import aiohttp
import os
from dataclasses import dataclass

from ..core.config import config
from ..core.logging import AgentLogger
from ..core.exceptions import ModelUnavailableError, NetworkError


@dataclass
class DifyResponse:
    """Response from Dify API."""
    response: str
    conversation_id: Optional[str] = None
    message_id: Optional[str] = None
    created_at: Optional[str] = None


class DifyClient:
    """Client for interacting with Dify AI cloud service."""
    
    def __init__(self, api_key: str = None, base_url: str = None):
        self.api_key = api_key or os.getenv("DIFY_API_KEY")
        self.base_url = base_url or os.getenv("DIFY_BASE_URL", "https://api.dify.ai/v1")
        self.logger = AgentLogger("dify_client")
        self.session: Optional[aiohttp.ClientSession] = None
        
        if not self.api_key:
            raise ValueError("DIFY_API_KEY environment variable is required")
        
    async def __aenter__(self):
        """Async context manager entry."""
        await self.initialize()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
    
    async def initialize(self) -> None:
        """Initialize the Dify client."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        self.session = aiohttp.ClientSession(
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=config.request_timeout_seconds)
        )
        
        # Check server health
        await self.health_check()
        
        self.logger.info(
            "Dify client initialized",
            base_url=self.base_url
        )
    
    async def close(self) -> None:
        """Close the client session."""
        if self.session:
            await self.session.close()
    
    async def health_check(self) -> bool:
        """Check if Dify API is accessible."""
        try:
            # Dify doesn't have a dedicated health endpoint, so we'll just verify the session is ready
            if self.session and not self.session.closed:
                self.logger.debug("Dify client health check passed")
                return True
            else:
                self.logger.error("Dify client session not ready")
                return False
        except Exception as e:
            self.logger.error("Dify client health check failed", error=str(e))
            raise NetworkError(f"Cannot initialize Dify client: {e}")
    
    async def chat_completion(
        self,
        query: str,
        user_id: str = "default_user",
        conversation_id: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 512
    ) -> DifyResponse:
        """Send a chat completion request to Dify."""
        
        # Prepare request payload
        payload = {
            "inputs": {},
            "query": query,
            "response_mode": "blocking",
            "user": user_id
        }
        
        if conversation_id:
            payload["conversation_id"] = conversation_id
        
        # Add system prompt as context if provided
        if system_prompt:
            payload["inputs"]["system_prompt"] = system_prompt
        
        start_time = time.time()
        
        try:
            async with self.session.post(
                f"{self.base_url}/chat-messages",
                json=payload
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    
                    generation_time_ms = int((time.time() - start_time) * 1000)
                    
                    self.logger.info(
                        "Dify generation completed",
                        generation_time_ms=generation_time_ms,
                        query_length=len(query),
                        response_length=len(data.get("answer", ""))
                    )
                    
                    return DifyResponse(
                        response=data.get("answer", ""),
                        conversation_id=data.get("conversation_id"),
                        message_id=data.get("message_id"),
                        created_at=data.get("created_at")
                    )
                else:
                    error_text = await response.text()
                    self.logger.error(
                        "Dify generation failed",
                        status_code=response.status,
                        error=error_text
                    )
                    
                    raise ModelUnavailableError(
                        f"Dify API request failed: {error_text}"
                    )
                    
        except aiohttp.ClientError as e:
            self.logger.error(
                "Network error during Dify generation",
                error=str(e)
            )
            raise NetworkError(f"Network error during Dify generation: {e}")
    
    async def generate(
        self,
        model: str,  # Kept for compatibility with Ollama interface
        prompt: str,
        system: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> DifyResponse:
        """Generate text using Dify (compatible with Ollama interface)."""
        
        # Extract options
        temperature = 0.7
        max_tokens = 512
        
        if options:
            temperature = options.get("temperature", 0.7)
            max_tokens = options.get("max_tokens", 512)
        
        return await self.chat_completion(
            query=prompt,
            system_prompt=system,
            temperature=temperature,
            max_tokens=max_tokens
        )


class UnifiedLLMClient:
    """Unified client that can use Ollama, Groq, or Dify based on configuration."""
    
    def __init__(self):
        self.logger = AgentLogger("unified_llm_client")
        # Was `os.getenv("LLM_PROVIDER", "ollama")`, which resolved to a local
        # Ollama daemon on any host that does not run one - i.e. every
        # deployment. See inference/provider_choice.py.
        self.provider = resolve_llm_provider(os.environ)
        self.client = None
        
    async def initialize(self) -> None:
        """Initialize the appropriate client based on configuration."""
        if self.provider == "groq":
            self.logger.info("Using Groq AI for inference (RECOMMENDED - FREE & FAST)")
            from .groq_client import GroqClient
            self.client = GroqClient()
        elif self.provider == "dify":
            self.logger.info("Using Dify AI for inference")
            from .dify_client import DifyClient
            self.client = DifyClient()
        else:
            self.logger.info("Using Ollama for inference")
            from .ollama_client import OllamaClient
            self.client = OllamaClient()
        
        await self.client.initialize()
    
    async def generate(
        self,
        model: str,
        prompt: str,
        system: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate text using the configured LLM provider."""
        
        if not self.client:
            await self.initialize()
        
        try:
            response = await self.client.generate(
                model=model,
                prompt=prompt,
                system=system,
                options=options
            )
            
            # Handle different response types
            if hasattr(response, 'response'):
                return response.response
            return str(response)
            
        except Exception as e:
            self.logger.error(
                "Failed to generate response",
                provider="dify" if self.use_dify else "ollama",
                error=str(e)
            )
            
            # If Groq/Dify fails and we have Ollama as fallback
            if self.provider in ["groq", "dify"] and os.getenv("OLLAMA_BASE_URL"):
                self.logger.info("Falling back to Ollama")
                from .ollama_client import OllamaClient
                fallback_client = OllamaClient()
                await fallback_client.initialize()
                response = await fallback_client.generate(
                    model=model,
                    prompt=prompt,
                    system=system,
                    options=options
                )
                await fallback_client.close()
                return response.response
            
            raise
    
    async def close(self) -> None:
        """Close the client."""
        if self.client:
            await self.client.close()
