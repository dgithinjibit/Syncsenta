# SyncSenta Codespaces Setup

This directory contains the configuration for running SyncSenta in GitHub Codespaces with Ollama support.

## What Gets Installed

When you create a Codespace, the following will be automatically set up:

1. **Ollama** - Local AI model server
2. **AI Models**:
   - `llama3.2:1b` - For tutoring agent (~1.3GB)
   - `qwen2.5:0.5b` - For assessment agent (~400MB)
3. **Python dependencies** - For ai-agents service
4. **Node dependencies** - For studio frontend

## First Time Setup

1. **Create a Codespace** from your GitHub repository
2. **Wait for setup** - The initial setup takes 10-15 minutes to download models
3. **Check Ollama status**:
   ```bash
   curl http://localhost:11434/api/tags
   ```

## Running the Services

### Start AI Agents Service
```bash
cd ai-agents
python -m syncsenta_agents.main
```

### Start Frontend
```bash
cd studio
npm run dev
```

### Restart Ollama (if needed)
```bash
./.devcontainer/start-ollama.sh
```

## Port Forwarding

The following ports are automatically forwarded:
- **5173** - Frontend (Next.js)
- **8080** - Backend (Rust/Axum)
- **8001** - AI Agents (Python)
- **11434** - Ollama API

## Troubleshooting

### Ollama not responding
```bash
# Check if Ollama is running
ps aux | grep ollama

# View Ollama logs
tail -f /tmp/ollama.log

# Restart Ollama
./.devcontainer/start-ollama.sh
```

### Models not downloaded
```bash
# List installed models
ollama list

# Pull missing models
ollama pull llama3.2:1b
ollama pull qwen2.5:0.5b
```

### Out of memory
Codespaces free tier has limited resources. Consider:
- Using smaller models (already using the smallest variants)
- Upgrading to a larger Codespace machine type
- Running one model at a time

## Environment Variables

Copy the example env files and configure:
```bash
cp studio/.env.cbc-agent.example studio/.env
```

Update `VITE_AI_AGENTS_URL` to use the Codespaces URL for port 8001.

## Notes

- **CPU-only inference**: Codespaces don't have GPUs, so inference will be slower than local GPU
- **Model persistence**: Models are stored in the Codespace and persist between sessions
- **Automatic shutdown**: Codespaces auto-shutdown after 30 minutes of inactivity (free tier)
