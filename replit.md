# SyncSenta Education OS

A Web4-first education platform for Kenya's CBC curriculum — AI-powered, offline-first, built for 100,000+ concurrent users.

## Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| AI Agents API | Python FastAPI (port 8000, localhost) |
| Agent Orchestration | LangGraph + LangChain (offline demo stub available) |
| Fine-tuning Notebook | JupyterLab 4 (port 5000, serves Fine_tune_Gikuyu_Mwalimu.ipynb) |
| Rust Backend | Axum + PostgreSQL + Redis (backend/ — requires external DB) |
| Blockchain | Polygon smart contracts (Hardhat — backend/syncsenta-blockchain/) |

## Project Structure

```
/
├── start.sh                         # Web app: starts FastAPI backend + Vite frontend
├── start_notebook.sh                # Jupyter: starts JupyterLab on port 5000
├── jupyter_config.py                # JupyterLab Replit config (no-auth, allow_origin=*, port 5000)
├── app.py                           # FastAPI AI agents server (port 8000)
├── Fine_tune_Gikuyu_Mwalimu.ipynb   # Gikuyu Mwalimu fine-tuning notebook (Gemma 2B)
│
├── frontend/                        # React + TypeScript + Vite + Tailwind
│   ├── vite.config.ts               # Port 5000, host 0.0.0.0, proxy /agents/* → :8000
│   ├── src/
│   │   ├── App.tsx                  # Route definitions
│   │   ├── main.tsx                 # App entry point
│   │   ├── index.css                # Tailwind base styles
│   │   ├── components/
│   │   │   └── Layout.tsx           # Nav + API health indicator
│   │   └── pages/
│   │       ├── HomePage.tsx         # Landing page with feature overview
│   │       ├── TutorPage.tsx        # AI Tutor chat interface
│   │       └── QuizPage.tsx         # Quiz generator + grading
│   └── package.json
│
└── ai-agents/                       # Python AI agents service
    └── src/syncsenta_agents/
        ├── api/
        │   ├── server.py            # FastAPI: /agents/chat, /agents/assessment/*
        │   └── demo_stub.py         # Offline deterministic stubs (no Ollama needed)
        ├── agents/
        │   ├── assessment.py        # CBC quiz generation + grading
        │   └── tutoring.py          # Socratic tutoring agent
        ├── orchestrator/
        │   ├── main.py              # SyncSentaOrchestrator
        │   └── workflow.py          # LangGraph workflow graph
        └── core/
            ├── config.py            # AgentConfig
            ├── models.py            # Pydantic models
            └── exceptions.py        # Custom exceptions
```

## Running the App (Two Modes)

### Mode 1 — JupyterLab (current workflow)
```bash
bash start_notebook.sh
```
Opens JupyterLab on port 5000 serving the workspace root.
Open `Fine_tune_Gikuyu_Mwalimu.ipynb` from the file browser.

**What runs locally vs. on Colab:**
- Cells 5–8 (dataset building — dictionary, CBC dialogues, UltraChat slice): run locally
- Cells 1–4 and Cell 9+ (model load, LoRA, training): require a GPU — run on Google Colab T4

### Mode 2 — React Web App
```bash
bash start.sh
```
This starts:
- **FastAPI backend** on `localhost:8000` (AI agents API)
- **Vite dev server** on `0.0.0.0:5000` (frontend with HMR + proxy)

## Fine-tuning Notebook: `Fine_tune_Gikuyu_Mwalimu.ipynb`

Fine-tunes `unsloth/gemma-2b-bnb-4bit` to fix three failure modes:
1. Name hallucination (invented names like "Loibor")
2. Identity statements ("I'm Kikuyu" not recognized)
3. Context loss across multi-turn conversation

**Training corpus (~60,500 examples):**
- Gikuyu dictionary + names — 150+ entries
- CBC educational dialogues — ~10,000 synthesized
- UltraChat 200k slice — 50,000 general chat examples

**GPU-required packages** (need Colab T4 — cannot install in Replit):
- `unsloth` (CUDA-only)
- `bitsandbytes` (CUDA-only)

**CPU-available packages** (installed in Replit):
- `torch 2.11.0+cpu`, `transformers`, `datasets`, `trl`, `peft`, `accelerate`, `huggingface_hub`

To run the full training pipeline, open the notebook in Google Colab:
https://colab.research.google.com/github/dgithinjibit/syncsenta-studio/blob/main/Fine_tune_Gikuyu_Mwalimu.ipynb

## API Endpoints (all via Vite proxy → port 8000)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/healthz` | Health check |
| POST | `/agents/chat` | AI Tutor (Teacher Agent) |
| POST | `/agents/assessment/quiz` | Generate CBC quiz |
| POST | `/agents/assessment/grade` | Grade a quiz submission |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SYNCSENTA_OFFLINE_DEMO` | `1` | Use deterministic stubs — no Ollama needed |

Set `SYNCSENTA_OFFLINE_DEMO=0` to use a real Ollama server at `http://localhost:11434`.

## Developer Workflow

- **Frontend** lives entirely in `frontend/src/` — React + TypeScript + Tailwind
  - Add new pages in `frontend/src/pages/`
  - Add shared components in `frontend/src/components/`
  - Vite hot-module-reload means changes appear instantly
- **AI Agents** live in `ai-agents/src/syncsenta_agents/`
  - Add new agents in `agents/`
  - Register them in `orchestrator/main.py`
  - Test with `SYNCSENTA_OFFLINE_DEMO=1` (no Ollama needed)
- **Notebook** — edit in JupyterLab (mode 1 above), train on Google Colab T4

## Workflow

- **Start application** (current): `bash start_notebook.sh` → JupyterLab port 5000
- Switch to web app: update workflow command to `bash start.sh`

## Deployment

- Target: autoscale
- Run: `python3 app.py` (API only — build frontend separately with `cd frontend && npm run build`)
