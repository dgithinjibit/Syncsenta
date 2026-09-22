# 🌳 Start Bonsai for ChatDev

## ✅ You're Already Authenticated!

Your Bonsai authentication is complete. Now just start the service:

## 🚀 Start Bonsai

```bash
bonsai start
```

This will:
- Start Bonsai service on `http://localhost:3000`
- Provide access to frontier models (Claude, GPT-4, Gemini)
- Enable ChatDev to use these models for free

## 🧪 Test It

Once Bonsai is running, test the harness:

```bash
./chatdev-harness.sh hello-world
```

You should see:
```
✓ Bonsai detected and running!
✓ Configured ChatDev for Bonsai
🚀 Starting ChatDev for: hello-world
```

## 📊 Check Bonsai Status

```bash
# Check if Bonsai is running
curl http://localhost:3000/v1/models

# View Bonsai stats
bonsai stats
```

## 🔧 Troubleshooting

### Port Already in Use

```bash
# Check what's using port 3000
lsof -i :3000

# Start on different port
bonsai start --port 3001

# Update ChatDev/.env
nano ChatDev/.env
# Change: BASE_URL=http://localhost:3001/v1
```

### Bonsai Not Found

```bash
# Reinstall
npm install -g @bonsai-ai/cli

# Verify installation
which bonsai
bonsai --version
```

### Authentication Expired

```bash
# Re-authenticate
bonsai login
```

## 🎯 Ready to Build!

Once Bonsai is running:

```bash
# Test with simple task
./chatdev-harness.sh hello-world

# Or let Kiro orchestrate
export KIRO_ORCHESTRATED=1
./chatdev-orchestrator.sh 2.1 implement-metta-core requirements.md design.md
```

---

**Next**: Run `bonsai start` and you're ready to go! 🚀
