"""
SyncSenta AI Agents - Production-ready educational AI system for Kenya's CBC curriculum.

This package provides a complete AI agent ecosystem using:
- LangGraph orchestration for Agent 7 (The Maestro)
- CrewAI framework for Agents 1-6 (Specialized Workers)
- Ollama edge inference on Raspberry Pi nodes
- Stellar blockchain for immutable grade verification
- Offline-first architecture with PouchDB + CouchDB sync
"""

__version__ = "0.1.0"
__author__ = "SyncSenta Team"
__email__ = "team@syncsenta.ke"

# The eager re-exports that used to live here pulled in LangGraph, CrewAI,
# structlog and the Stellar SDK as a side effect of *any* import from this
# package — including leaf modules such as ``syncsenta_agents.decisions`` and
# every unit test. That made the lightweight parts of the service unusable
# without the full ML dependency set installed.
#
# The three public names below are now resolved lazily (PEP 562), so
# ``from syncsenta_agents import AgentConfig`` keeps working exactly as before
# while ``import syncsenta_agents.decisions`` no longer drags the whole graph in.
# The cost: a missing heavy dependency now surfaces when the name is first used
# instead of at package import. Entry points (``api.py``, ``main.py``) build the
# orchestrator at startup, so they still fail fast in production.
_LAZY_EXPORTS = {
    "AgentConfig": ".core.config",
    "SyncSentaOrchestrator": ".orchestrator.main",
    "AgentRegistry": ".agents.registry",
}

__all__ = [
    "AgentConfig",
    "SyncSentaOrchestrator",
    "AgentRegistry",
]


def __getattr__(name: str):
    module_path = _LAZY_EXPORTS.get(name)
    if module_path is None:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

    from importlib import import_module

    value = getattr(import_module(module_path, __name__), name)
    globals()[name] = value  # resolve once, then behave like a normal module attribute
    return value


def __dir__():
    return sorted(set(globals()) | set(_LAZY_EXPORTS))
