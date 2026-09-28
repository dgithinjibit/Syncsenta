"""Which LLM provider a deployment gets, and whether it can answer at all.

`ai-agents` shipped assuming Ollama runs on the same machine. Render's
`Ascendra-1` has no Ollama, so the service booted healthy and could not answer
anything. Measured 2026-09-26:

    POST /agents/chat              -> 200 {"success": false, "error": "Synthesis
        failed: HTTPConnectionPool(host='localhost', port=11434) ... Connection
        refused"}
    POST /agents/assessment/quiz   -> 500

These tests are deliberately dependency-free: `provider_choice` is a leaf
module, so the rule can be exercised without aiohttp, langchain or CrewAI.
"""

import pytest

from syncsenta_agents.inference.provider_choice import (
    DEFAULT_GROQ_MODEL,
    PlainTextLLM,
    build_analysis_llm,
    resolve_llm_provider,
)


class TestResolveLlmProvider:
    def test_an_unset_preference_follows_the_key_that_exists(self):
        assert resolve_llm_provider({"GROQ_API_KEY": "gsk_x"}) == "groq"

    def test_nothing_configured_still_means_local_ollama(self):
        # A developer's laptop has no cloud key and does run Ollama; that is the
        # one place the old unconditional default was correct.
        assert resolve_llm_provider({}) == "ollama"

    def test_blank_credential_is_not_configured(self):
        assert resolve_llm_provider({"GROQ_API_KEY": "   "}) == "ollama"

    def test_groq_is_preferred_over_dify_when_both_are_present(self):
        env = {"GROQ_API_KEY": "gsk_x", "DIFY_API_KEY": "dify_x"}
        assert resolve_llm_provider(env) == "groq"

    def test_explicit_choice_wins_regardless_of_keys(self):
        env = {"LLM_PROVIDER": "ollama", "GROQ_API_KEY": "gsk_x"}
        assert resolve_llm_provider(env) == "ollama"

    def test_explicit_choice_is_case_and_space_tolerant(self):
        assert resolve_llm_provider({"LLM_PROVIDER": " GROQ "}) == "groq"

    def test_an_unknown_provider_falls_back_instead_of_crashing(self):
        # A typo in a dashboard env var must not take the service down; the
        # studio's resolveLlmTargets() applies the same rule.
        assert resolve_llm_provider({"LLM_PROVIDER": "mistral", "GROQ_API_KEY": "k"}) == "groq"


class TestBuildAnalysisLlm:
    def test_uses_the_local_llama_when_nothing_is_configured(self):
        built = build_analysis_llm(ollama_factory=lambda: "OLLAMA", env={})
        assert built == "OLLAMA"

    def test_dify_is_reported_instead_of_answering_with_the_wrong_model(self):
        with pytest.raises(ValueError, match="dify"):
            build_analysis_llm(
                ollama_factory=lambda: "OLLAMA",
                env={"LLM_PROVIDER": "dify", "DIFY_API_KEY": "k"},
            )

    def test_the_default_groq_model_is_one_the_account_can_serve(self):
        # The retired default was llama-3.3-70b-versatile, which 404s for this
        # organisation and is what took the student tutor down.
        assert DEFAULT_GROQ_MODEL != "llama-3.3-70b-versatile"


class TestPlainTextLlm:
    """The orchestrator does `.invoke(prompt).strip()`, so it needs a string."""

    class _Msg:
        def __init__(self, content):
            self.content = content

        def invoke(self, prompt):
            return self

    def test_unwraps_a_chat_message_to_its_text(self):
        assert PlainTextLLM(self._Msg("  hello  ")).invoke("x").strip() == "hello"

    def test_joins_a_multi_part_response(self):
        blocks = [{"text": "a"}, {"other": 1}, {"text": "b"}]
        assert PlainTextLLM(self._Msg(blocks)).invoke("x") == "ab"

    def test_passes_through_a_prompt_model_that_already_returns_text(self):
        class _Str:
            def invoke(self, prompt):
                return "plain " + prompt

        assert PlainTextLLM(_Str()).invoke("x") == "plain x"
