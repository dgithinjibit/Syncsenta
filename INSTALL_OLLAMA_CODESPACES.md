# Installing Ollama and Gemma 2B in GitHub Codespaces

## Why Use Codespaces?
Your local machine (Intel Core i5-4300U from 2013) would take 15-45 seconds per AI response with Gemma 2B. GitHub Codespaces provides a modern 4-core CPU that will give you 2-5 second responses - much better for testing!

## Installation Steps

### 1. Install Ollama
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

This will download and install Ollama in your Codespace.

### 2. Start Ollama Service
```bash
ollama serve &
```

This starts Ollama in the background. You should see:
```
Ollama is running
```

### 3. Pull Gemma 2B Model
```bash
ollama pull gemma2:2b
```

This downloads the Gemma 2B model (~1.8GB). It will take a few minutes depending on your connection speed.

You should see progress like:
```
pulling manifest
pulling 8ccb4f5e8e8c... 100% ▕████████████████▏ 1.6 GB
pulling 966de95ca8a6... 100% ▕████████████████▏ 1.4 KB
pulling fcc5a6bec9da... 100% ▕████████████████▏ 7.7 KB
pulling a70ff7e570d9... 100% ▕████████████████▏ 6.0 KB
pulling 56bb8bd477a5... 100% ▕████████████████▏  96 B
pulling 44baaf173777... 100% ▕████████████████▏  35 B
verifying sha256 digest
writing manifest
success
```

### 4. Test Ollama
```bash
ollama run gemma2:2b "What is 2+2?"
```

You should get a response like:
```
2 + 2 = 4
```

### 5. Restart AI Agents Service
Stop the current AI agents service (Ctrl+C in Terminal 15) and restart it:

```bash
cd ai-agents
source venv/bin/activate
uvicorn syncsenta_agents.api.server:app --host 0.0.0.0 --port 8001
```

Now the AI agents service will connect to Ollama and use real AI responses!

## Verification

### Check Ollama is Running
```bash
curl http://localhost:11434/api/tags
```

Should return a list of installed models including `gemma2:2b`.

### Check AI Agents Can Connect
```bash
curl http://localhost:8001/health
```

Should return:
```json
{"status": "healthy", "ollama_connected": true}
```

### Test in Browser
1. Open the student chat
2. Send a message like "What is photosynthesis?"
3. You should get a real AI response (not "AI tutors temporarily unavailable")
4. Response should take 2-5 seconds

## Resource Usage

### Disk Space
- Ollama binary: ~200MB
- Gemma 2B model: ~1.8GB
- Total: ~2GB

Your Codespace has plenty of space for this.

### Memory
- Gemma 2B needs: 2-3GB RAM
- Codespaces provides: 8GB RAM
- Plenty of headroom for all services

### CPU
- Gemma 2B inference: Uses all available cores
- Codespaces 4-core CPU: Perfect for this workload
- Expected response time: 2-5 seconds per message

## Troubleshooting

### "Ollama not found"
Make sure you ran the install script:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### "Connection refused to localhost:11434"
Ollama service isn't running. Start it:
```bash
ollama serve &
```

### "Model not found"
You need to pull the model first:
```bash
ollama pull gemma2:2b
```

### AI agents still showing "temporarily unavailable"
1. Check Ollama is running: `curl http://localhost:11434/api/tags`
2. Check AI agents can connect: `curl http://localhost:8001/health`
3. Restart AI agents service
4. Check AI agents logs for connection errors

## Alternative: Use Larger Models (Optional)

If you want better AI responses and have the time/bandwidth:

### Gemma 2 9B (Better quality, slower)
```bash
ollama pull gemma2:9b
```
- Size: ~5.4GB
- Response time: 5-10 seconds
- Quality: Much better than 2B

### Llama 3.2 3B (Good balance)
```bash
ollama pull llama3.2:3b
```
- Size: ~2GB
- Response time: 3-6 seconds
- Quality: Better than Gemma 2B

## Cost
- GitHub Codespaces: 60 hours/month free for personal accounts
- Ollama: Free and open source
- Gemma 2B model: Free and open source
- Total cost: $0

## Performance Comparison

| Environment | CPU | Response Time | Recommended? |
|-------------|-----|---------------|--------------|
| Your Local Machine | i5-4300U (2013) | 15-45 seconds | ❌ Too slow |
| GitHub Codespaces | 4-core modern | 2-5 seconds | ✅ Perfect! |
| Production Server | 8+ cores | 1-3 seconds | ✅ Best |

## Next Steps After Installation

1. Test student chat with real AI responses
2. Test teacher dashboard to see AI agent activity
3. Try different types of questions (math, science, language)
4. Monitor response times and quality
5. Adjust model if needed (upgrade to 9B for better quality)

## Keeping Ollama Running

Ollama will stop when you close the Codespace. To auto-start it:

1. Add to `.devcontainer/devcontainer.json`:
```json
{
  "postStartCommand": "ollama serve &"
}
```

2. Or create a startup script:
```bash
#!/bin/bash
# start-services.sh
ollama serve &
cd backend/syncsenta-backend && DATABASE_URL="postgresql://web4ke:syncsenta2024@localhost/syncsenta" cargo run &
cd studio && npm run dev &
cd ai-agents && source venv/bin/activate && uvicorn syncsenta_agents.api.server:app --host 0.0.0.0 --port 8001 &
```

Make it executable:
```bash
chmod +x start-services.sh
```

Run it:
```bash
./start-services.sh
```

Now all services start with one command!
