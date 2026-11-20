"""Multi-provider LLM client with automatic fallback.

NVIDIA NIM is the prototype default. OpenAI can be enabled later through
environment variables without code changes; Groq remains an optional fallback.
"""

import os
import asyncio
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from enum import Enum

import httpx
from dotenv import load_dotenv

log = logging.getLogger(__name__)


# Local credentials are intentionally kept outside version control. Loading is
# non-destructive: exported deployment variables always take precedence.
_AGENTS_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(_AGENTS_ROOT / ".env.local", override=False)
load_dotenv(_AGENTS_ROOT / ".env", override=False)


class ProviderType(str, Enum):
    """Available LLM providers."""
    NVIDIA = "nvidia"
    OPENAI = "openai"
    GROQ = "groq"
    GEMINI = "gemini"


@dataclass
class ProviderConfig:
    """Configuration for an LLM provider."""
    name: ProviderType
    api_key: Optional[str]
    base_url: str
    models: List[str]
    enabled: bool = True
    rate_limit_retry_delay: int = 60  # seconds
    reasoning_budget: Optional[int] = None
    top_p: Optional[float] = None
    request_timeout_seconds: int = 120


class MultiProviderClient:
    """LLM client that automatically falls back between providers.
    
    Usage:
        client = MultiProviderClient()
        response = await client.generate(
            prompt="Hello",
            system="You are helpful",
            max_tokens=1024
        )
    """
    
    def __init__(self):
        self.logger = logging.getLogger("multi_provider_client")
        self.providers = self._initialize_providers()
        self.current_provider_index = 0
        self._rate_limited_until: Dict[str, float] = {}
        
    def _initialize_providers(self) -> List[ProviderConfig]:
        """Initialize provider configurations from environment."""
        providers = []

        # NVIDIA NIM is the primary provider for the Lesson Architect. Its
        # OpenAI-compatible chat-completions endpoint is called directly with
        # httpx to avoid coupling the backend to another SDK.
        nvidia_key = os.getenv("NVIDIA_API_KEY")
        if nvidia_key:
            providers.append(ProviderConfig(
                name=ProviderType.NVIDIA,
                api_key=nvidia_key,
                base_url=os.getenv(
                    "NVIDIA_API_BASE_URL",
                    "https://integrate.api.nvidia.com/v1",
                ).rstrip("/"),
                models=[os.getenv(
                    "NVIDIA_MODEL",
                    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
                )],
                rate_limit_retry_delay=60,
                reasoning_budget=self._optional_int("NVIDIA_REASONING_BUDGET"),
                top_p=self._optional_float("NVIDIA_TOP_P", 0.95),
                request_timeout_seconds=self._positive_int(
                    "NVIDIA_TIMEOUT_SECONDS", 120
                ),
            ))

        # OpenAI is intentionally configuration-only so production can move
        # from NVIDIA NIM to an OpenAI model without changing application code.
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            providers.append(ProviderConfig(
                name=ProviderType.OPENAI,
                api_key=openai_key,
                base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/"),
                models=[os.getenv("OPENAI_MODEL", "gpt-4o-mini")],
                rate_limit_retry_delay=60,
                top_p=self._optional_float("OPENAI_TOP_P", 0.95),
                request_timeout_seconds=self._positive_int("OPENAI_TIMEOUT_SECONDS", 120),
            ))

        # Gemini is an opt-in local/provider fallback. The key remains server-only.
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            providers.append(ProviderConfig(
                name=ProviderType.GEMINI,
                api_key=gemini_key,
                base_url=os.getenv(
                    "GEMINI_BASE_URL",
                    "https://generativelanguage.googleapis.com/v1beta",
                ).rstrip("/"),
                models=[os.getenv("GEMINI_MODEL", "gemini-3.6-flash")],
                rate_limit_retry_delay=60,
                request_timeout_seconds=self._positive_int("GEMINI_TIMEOUT_SECONDS", 120),
            ))

        # Groq remains a fallback for resilience and existing deployments.
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key:
            providers.append(ProviderConfig(
                name=ProviderType.GROQ,
                api_key=groq_key,
                base_url="https://api.groq.com/openai/v1",
                models=[
                    "llama-3.3-70b-versatile",
                    "llama-3.1-8b-instant",
                ],
                rate_limit_retry_delay=120  # Groq: wait 2 minutes
            ))

        # Honour an explicit primary-provider preference without removing the
        # other configured provider from the fallback chain.
        preferred_provider = os.getenv("LLM_PROVIDER", "").strip().casefold()
        if preferred_provider:
            providers.sort(
                key=lambda provider: provider.name.value != preferred_provider
            )

        # Do not fail application startup when a presentation/development
        # environment has no provider credentials. The Lesson Architect API
        # supplies deterministic CBC fallbacks for generation endpoints.
        
        self.logger.info(
            f"Initialized {len([p for p in providers if p.enabled])} provider(s): "
            f"{', '.join(p.name for p in providers if p.enabled)}"
        )
        
        return providers

    def _optional_int(self, name: str) -> Optional[int]:
        value = os.getenv(name)
        if not value:
            return None
        try:
            parsed = int(value)
        except ValueError:
            self.logger.warning("Ignoring invalid integer environment value", extra={"name": name})
            return None
        return parsed if parsed > 0 else None

    def _positive_int(self, name: str, default: int) -> int:
        return self._optional_int(name) or default

    def _optional_float(self, name: str, default: float) -> float:
        value = os.getenv(name)
        if not value:
            return default
        try:
            return float(value)
        except ValueError:
            self.logger.warning("Ignoring invalid decimal environment value", extra={"name": name})
            return default
    
    def _is_rate_limited(self, provider: ProviderConfig) -> bool:
        """Check if provider is currently rate-limited."""
        import time
        if provider.name in self._rate_limited_until:
            if time.time() < self._rate_limited_until[provider.name]:
                return True
            else:
                # Rate limit expired, remove it
                del self._rate_limited_until[provider.name]
        return False
    
    def _mark_rate_limited(self, provider: ProviderConfig):
        """Mark provider as rate-limited."""
        import time
        self._rate_limited_until[provider.name] = (
            time.time() + provider.rate_limit_retry_delay
        )
        self.logger.warning(
            f"Provider {provider.name} rate-limited, "
            f"will retry in {provider.rate_limit_retry_delay}s"
        )
    
    async def generate(
        self,
        prompt: str,
        *,
        system: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.3,
        max_retries: int = 3
    ) -> str:
        """Generate text using available providers with automatic fallback.
        
        Args:
            prompt: User prompt
            system: System prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            max_retries: Max retries per provider
            
        Returns:
            Generated text
            
        Raises:
            RuntimeError: If all providers fail
        """
        last_error = None
        
        # Try each enabled provider
        for provider in self.providers:
            if not provider.enabled:
                continue
                
            # Skip if rate-limited
            if self._is_rate_limited(provider):
                self.logger.info(f"Skipping rate-limited provider: {provider.name}")
                continue
            
            # Try this provider
            for attempt in range(max_retries):
                try:
                    self.logger.info(
                        f"Attempting generation with {provider.name} "
                        f"(attempt {attempt + 1}/{max_retries})"
                    )
                    
                    response = await self._generate_with_provider(
                        provider=provider,
                        prompt=prompt,
                        system=system,
                        max_tokens=max_tokens,
                        temperature=temperature
                    )
                    
                    self.logger.info(f"Success with {provider.name}")
                    return response
                    
                except Exception as e:
                    last_error = e
                    error_str = str(e).lower()
                    
                    # Check if rate limit error
                    if any(x in error_str for x in ["rate_limit", "rate limit", "429", "too many requests"]):
                        self.logger.warning(f"Rate limit hit on {provider.name}")
                        self._mark_rate_limited(provider)
                        break  # Don't retry this provider, move to next
                    
                    # Other error - retry with backoff
                    if attempt < max_retries - 1:
                        wait_time = 2 ** attempt
                        self.logger.warning(
                            f"Error with {provider.name}: {e}. "
                            f"Retrying in {wait_time}s..."
                        )
                        await asyncio.sleep(wait_time)
                    else:
                        self.logger.error(
                            f"Failed all retries with {provider.name}: {e}"
                        )
        
        # All providers failed
        raise RuntimeError(
            f"All LLM providers failed. Last error: {last_error}. "
            "Please check your API keys and try again later."
        )
    
    async def _generate_with_provider(
        self,
        provider: ProviderConfig,
        prompt: str,
        system: Optional[str],
        max_tokens: int,
        temperature: float
    ) -> str:
        """Generate text using a specific provider."""
        if provider.name == ProviderType.NVIDIA:
            return await self._generate_nvidia(
                provider, prompt, system, max_tokens, temperature
            )
        if provider.name == ProviderType.OPENAI:
            return await self._generate_openai(provider, prompt, system, max_tokens, temperature)
        if provider.name == ProviderType.GROQ:
            return await self._generate_groq(
                provider, prompt, system, max_tokens, temperature
            )
        if provider.name == ProviderType.GEMINI:
            return await self._generate_gemini(
                provider, prompt, system, max_tokens, temperature
            )
        else:
            raise ValueError(f"Unsupported provider: {provider.name}")

    async def _generate_openai(
        self,
        provider: ProviderConfig,
        prompt: str,
        system: Optional[str],
        max_tokens: int,
        temperature: float,
    ) -> str:
        """Generate through OpenAI's chat-completions compatible endpoint."""
        messages: List[Dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        payload: Dict[str, Any] = {
            "model": provider.models[0], "messages": messages,
            "max_tokens": max_tokens, "temperature": temperature, "stream": False,
        }
        if provider.top_p is not None:
            payload["top_p"] = provider.top_p
        try:
            async with httpx.AsyncClient(timeout=provider.request_timeout_seconds) as client:
                response = await client.post(
                    f"{provider.base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {provider.api_key}", "Content-Type": "application/json"},
                    json=payload,
                )
        except httpx.HTTPError as exc:
            raise RuntimeError(f"OpenAI request failed: {exc}") from exc
        if response.is_error:
            raise RuntimeError(f"OpenAI returned HTTP {response.status_code}: {response.text[:800].strip() or 'no error detail'}")
        try:
            content = response.json()["choices"][0]["message"].get("content")
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise RuntimeError("OpenAI returned an invalid chat-completions response") from exc
        if not isinstance(content, str) or not content.strip():
            raise RuntimeError("OpenAI returned an empty completion")
        return content.strip()
    
    async def _generate_groq(
        self,
        provider: ProviderConfig,
        prompt: str,
        system: Optional[str],
        max_tokens: int,
        temperature: float
    ) -> str:
        """Generate using Groq."""
        from langchain_groq import ChatGroq
        
        llm = ChatGroq(
            model=provider.models[0],
            api_key=provider.api_key,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        response = await asyncio.to_thread(llm.invoke, messages)
        return response.content if hasattr(response, 'content') else str(response)

    async def _generate_gemini(
        self,
        provider: ProviderConfig,
        prompt: str,
        system: Optional[str],
        max_tokens: int,
        temperature: float,
    ) -> str:
        """Generate through Gemini's REST generateContent endpoint."""
        contents = []
        if system:
            contents.append({"role": "user", "parts": [{"text": system}]})
            contents.append({"role": "model", "parts": [{"text": "Understood."}]})
        contents.append({"role": "user", "parts": [{"text": prompt}]})
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }
        try:
            async with httpx.AsyncClient(timeout=provider.request_timeout_seconds) as client:
                response = await client.post(
                    f"{provider.base_url}/models/{provider.models[0]}:generateContent",
                    params={"key": provider.api_key},
                    headers={"Content-Type": "application/json"},
                    json=payload,
                )
        except httpx.HTTPError as exc:
            raise RuntimeError(f"Gemini request failed: {exc}") from exc
        if response.is_error:
            raise RuntimeError(
                f"Gemini returned HTTP {response.status_code}: "
                f"{response.text[:800].strip() or 'no error detail'}"
            )
        try:
            candidates = response.json()["candidates"]
            content = candidates[0]["content"]["parts"][0].get("text")
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise RuntimeError("Gemini returned an invalid generateContent response") from exc
        if not isinstance(content, str) or not content.strip():
            raise RuntimeError("Gemini returned an empty completion")
        return content.strip()

    async def _generate_nvidia(
        self,
        provider: ProviderConfig,
        prompt: str,
        system: Optional[str],
        max_tokens: int,
        temperature: float,
    ) -> str:
        """Generate through NVIDIA NIM's OpenAI-compatible chat endpoint."""
        messages: List[Dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload: Dict[str, Any] = {
            "model": provider.models[0],
            "messages": messages,
            "max_tokens": max_tokens,
            "stream": False,
            "temperature": temperature,
        }
        if provider.top_p is not None:
            payload["top_p"] = provider.top_p
        if provider.reasoning_budget is not None:
            payload["reasoning_budget"] = provider.reasoning_budget

        headers = {
            "Authorization": f"Bearer {provider.api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(
                timeout=provider.request_timeout_seconds,
            ) as client:
                response = await client.post(
                    f"{provider.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )
        except httpx.HTTPError as exc:
            raise RuntimeError(f"NVIDIA request failed: {exc}") from exc

        if response.is_error:
            detail = response.text[:800].strip()
            raise RuntimeError(
                f"NVIDIA returned HTTP {response.status_code}: {detail or 'no error detail'}"
            )

        try:
            data = response.json()
            message = data["choices"][0]["message"]
            content = message.get("content")
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise RuntimeError("NVIDIA returned an invalid chat-completions response") from exc

        if not isinstance(content, str) or not content.strip():
            raise RuntimeError("NVIDIA returned an empty completion")
        return content.strip()
    
    def get_provider_status(self) -> Dict[str, Any]:
        """Get status of all providers."""
        import time
        status = {}
        
        for provider in self.providers:
            is_rate_limited = self._is_rate_limited(provider)
            time_until_retry = 0
            
            if is_rate_limited:
                time_until_retry = int(
                    self._rate_limited_until[provider.name] - time.time()
                )
            
            status[provider.name] = {
                "enabled": provider.enabled,
                "rate_limited": is_rate_limited,
                "retry_in_seconds": time_until_retry if is_rate_limited else 0,
                "models": provider.models,
            }
        
        return status


# Singleton instance
_client: Optional[MultiProviderClient] = None


def get_multi_provider_client() -> MultiProviderClient:
    """Get or create the singleton multi-provider client."""
    global _client
    if _client is None:
        _client = MultiProviderClient()
    return _client
