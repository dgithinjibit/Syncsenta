# SyncSenta AI Agents - LangChain + CrewAI + Stellar

Production-ready AI agent system for Kenya's CBC curriculum using LangChain orchestration, CrewAI workers, and Stellar blockchain verification.

## Architecture

- **Agent 7 (Orchestrator)**: LangGraph workflow orchestration
- **Agents 1-6 (Workers)**: CrewAI specialized educational agents
- **Edge Inference**: Ollama on Raspberry Pi nodes
- **Blockchain**: Stellar for immutable grade verification
- **Offline-First**: PouchDB + CouchDB sync

## Quick Start

```bash
# Install dependencies
poetry install

# Run tests
poetry run pytest

# Start development server
poetry run python -m syncsenta_agents.main
```

## Project Structure

```
src/syncsenta_agents/
├── orchestrator/          # LangGraph orchestration (Agent 7)
├── agents/               # CrewAI worker agents (Agents 1-6)
├── inference/            # Ollama edge inference
├── blockchain/           # Stellar integration
├── sync/                # Offline-first data sync
├── multimodal/          # Voice and OCR processing
├── core/                # Shared utilities and models
└── tests/               # Comprehensive test suite
```

## Development

- **Python 3.11+** required
- **Poetry** for dependency management
- **pytest + hypothesis** for testing
- **Black + isort** for code formatting

## Production Deployment

- **Raspberry Pi 4** (8GB RAM minimum)
- **Ollama server** for local LLM inference
- **Stellar network** for blockchain verification
- **CouchDB** for data synchronization

## Cultural Authenticity

All agents incorporate Kenyan cultural context, CBC curriculum alignment, and support for English-Swahili code-switching to ensure authentic educational experiences for Kenyan students.