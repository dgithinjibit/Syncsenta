"""Which LLM provider the edge/cloud clients should talk to.

Leaf module on purpose: it imports nothing but `typing`, so the rule can be
exercised without aiohttp, LangGraph or CrewAI installed.

Why this exists
---------------
`UnifiedLLMClient` used to read `os.getenv("LLM_PROVIDER", "ollama")`. Ollama is
a *local* daemon, so any deployment that did not set the variable - which is
every cloud deployment, including Render's `Ascendra-1` - silently resolved to
`http://localhost:11434` and could only ever answer with a connection-refused
error. Measured 2026-09-26:

    POST https://ascendra-1.onrender.com/agents/chat  ->  200
    {"success": false, "error": "Synthesis failed: HTTPConnectionPool(host=
     'localhost', port=11434): ... Connection refused"}
    POST https://ascendra-1.onrender.com/agents/assessment/quiz -> 500

An unset preference must follow the key that is actually present, not a
hard-coded default for a machine that is not there.
"""

from typing import Any, Callable, Mapping, Optional

import os

#: Providers `UnifiedLLMClient` knows how to build.
KNOWN_PROVIDERS = ("groq", "dify", "ollama")

#: What to ask Groq for when the deployment does not say. `llama-3.3-70b-versatile`
#: was the previous default in three places and is the model the studio's tutor
#: route 404'd on: the account serving it no longer has it.
DEFAULT_GROQ_MODEL = "qwen/qwen3.8-27b"


def resolve_llm_provider(env: Mapping[str, str]) -> str:
    """Return the provider name to use, given an environment mapping.

    An explicit, recognised `LLM_PROVIDER` always wins. A nonsense value does
    not: it is ignored so a typo cannot take the service down, which is the
    same rule `resolveLlmTargets()` applies in the studio.

    With no usable preference, pick a provider whose credential exists. Groq is
    first because it is the only one the deployed service can reach; Ollama
    remains the fallback for a developer's laptop, where neither key is set and
    a local daemon is the only thing that will answer.
    """
    preferred = (env.get("LLM_PROVIDER") or "").strip().lower()
    if preferred in KNOWN_PROVIDERS:
        return preferred

    if (env.get("GROQ_API_KEY") or "").strip():
        return "groq"
    if (env.get("DIFY_API_KEY") or "").strip():
        return "dify"
    return "ollama"


class PlainTextLLM:
    """Adapt a chat model to the prompt-string interface the orchestrator uses.

    `LangGraphOrchestrator` calls `self.analysis_llm.invoke(prompt)` and then
    `.strip()` on the result, which is what `langchain_community.llms.Ollama`
    returns. `ChatGroq` is a *chat* model and answers with an `AIMessage`, so
    handing it over directly would raise `AttributeError` on the first request
    and look like a model failure rather than a wiring one.
    """

    def __init__(self, model: Any) -> None:
        self._model = model

    def invoke(self, prompt: str) -> str:
        result = self._model.invoke(prompt)
        content = getattr(result, "content", result)
        if isinstance(content, str):
            return content
        # Multi-part responses arrive as a list of blocks.
        if isinstance(content, list):
            return "".join(
                block.get("text", "") for block in content if isinstance(block, dict)
            )
        return str(content)


def build_analysis_llm(
    *,
    ollama_factory: Callable[[], Any],
    temperature: float = 0.3,
    env: Optional[Mapping[str, str]] = None,
) -> Any:
    """Build the LLM the orchestrator analyses and synthesizes with.

    The Ollama construction stays in the caller's hands because it needs
    `core.config`; this function only decides *which* provider to ask, so the
    decision is testable without langchain installed.
    """
    environment = os.environ if env is None else env
    provider = resolve_llm_provider(environment)

    if provider == "groq":
        from langchain_groq import ChatGroq  # lazy: keeps the leaf importable

        return PlainTextLLM(
            ChatGroq(
                model=environment.get("GROQ_MODEL") or DEFAULT_GROQ_MODEL,
                temperature=temperature,
                api_key=environment.get("GROQ_API_KEY"),
            )
        )

    if provider == "dify":
        raise ValueError(
            "LLM_PROVIDER=dify is not wired into the orchestrator. Use groq, or "
            "unset LLM_PROVIDER and provide GROQ_API_KEY."
        )

    return ollama_factory()
