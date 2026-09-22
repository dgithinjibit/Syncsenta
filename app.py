"""SyncSenta Education OS — AI Agents API server.

Runs the FastAPI AI agents service on port 8000 (localhost only).
The Vite dev server (port 5000) proxies /agents/* and /healthz here.

Set SYNCSENTA_OFFLINE_DEMO=1 (default) to run without Ollama.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "ai-agents", "src"))
os.environ.setdefault("SYNCSENTA_OFFLINE_DEMO", "1")

# Use the agents app directly — its routes are already at /agents/*, /healthz
from syncsenta_agents.api.server import app  # noqa: F401 — imported for uvicorn

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="localhost",
        port=8000,
        reload=False,
        log_level="info",
    )
