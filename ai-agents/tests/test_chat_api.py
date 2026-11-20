import pytest
from fastapi import HTTPException

from syncsenta_agents.api import server
from syncsenta_agents.inference.multi_provider_client import MultiProviderClient


class CapturingGenerator:
    def __init__(self) -> None:
        self.prompt: str | None = None
        self.system: str | None = None

    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.3,
        max_retries: int = 1,
    ) -> str:
        self.prompt = prompt
        self.system = system
        return "Generated CBC assessment"


class UnavailableGenerator:
    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.3,
        max_retries: int = 1,
    ) -> str:
        raise RuntimeError("provider unavailable")


@pytest.mark.asyncio
async def test_chat_endpoint_returns_content_only_response(monkeypatch):
    generator = CapturingGenerator()
    monkeypatch.setattr(server, "_get_chat_generator", lambda: generator)

    response = await server.generate_chat(
        server.ChatRequest(
            message="Create a Grade 6 Mathematics assessment.",
            user_id="untrusted-client-id",
            role="student",
        )
    )

    assert response == {
        "success": True,
        "response": "Generated CBC assessment",
        "source": "ai-agents",
    }
    assert generator.prompt == "Create a Grade 6 Mathematics assessment."
    assert "policy decision" in (generator.system or "").lower()


@pytest.mark.asyncio
async def test_chat_endpoint_rejects_blank_messages(monkeypatch):
    generator = CapturingGenerator()
    monkeypatch.setattr(server, "_get_chat_generator", lambda: generator)

    with pytest.raises(HTTPException) as error:
        await server.generate_chat(server.ChatRequest(message="   "))

    assert error.value.status_code == 400
    assert generator.prompt is None


@pytest.mark.asyncio
async def test_chat_endpoint_surfaces_provider_failure_without_success_fallback(monkeypatch):
    generator = UnavailableGenerator()
    monkeypatch.setattr(server, "_get_chat_generator", lambda: generator)

    with pytest.raises(HTTPException) as error:
        await server.generate_chat(
            server.ChatRequest(message="Create a Grade 6 assessment.")
        )

    assert error.value.status_code == 502
    assert error.value.detail == "Assessment content generation failed."


@pytest.mark.asyncio
async def test_multi_provider_client_raises_runtime_error_when_no_provider_is_configured():
    client = MultiProviderClient()
    client.providers = []

    with pytest.raises(RuntimeError, match="All LLM providers failed"):
        await client.generate("Create a Grade 6 assessment.")
