# Bonsai AI Integration for SyncSenta

## 🌳 What is Bonsai?

Bonsai provides **free access to frontier coding models** for engineers. Perfect for this project!

## 🚀 Quick Setup

### 1. Install Bonsai CLI

```bash
npm install -g @bonsai-ai/cli
```

### 2. Start Bonsai

```bash
bonsai start
```

This will:
- Give you access to frontier models (Claude, GPT-4, etc.)
- Provide a local API endpoint
- Track usage for benchmarking

### 3. Configure ChatDev for Bonsai

Update `ChatDev/.env`:

```bash
# Bonsai provides OpenAI-compatible endpoint
BASE_URL=http://localhost:3000/v1  # Bonsai local endpoint
API_KEY=bonsai-local-key           # Bonsai handles auth
```

**OR** use Groq (also free):

```bash
BASE_URL=https://api.groq.com/openai/v1
API_KEY=your-groq-api-key-here
```

## 🤖 Integration with Kiro Orchestration

### How It Works

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  You (User) ──► Kiro (AI Orchestrator)             │
│                    │                                │
│                    ├──► ChatDev (Multi-Agent)       │
│                    │      │                         │
│                    │      ├──► Bonsai/Groq (LLM)    │
│                    │      │                         │
│                    │      └──► Code Generation      │
│                    │                                │
│                    └──► Learning Capture            │
│                           (.kiro/chatdev-learnings/)│
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Workflow

1. **You** tell Kiro which task to implement
2. **Kiro** orchestrates ChatDev with proper context
3. **ChatDev** uses Bonsai/Groq for multi-agent collaboration
4. **Kiro** captures learnings and integrates code
5. **You** review and iterate

## 📋 Using the Orchestrator

### Basic Usage

```bash
# Kiro will call this internally
export KIRO_ORCHESTRATED=1
./chatdev-orchestrator.sh 2.1 implement-metta-core requirements.md design.md
```

### What Gets Captured

Each task execution creates a learning file in `.kiro/chatdev-learnings/`:

```markdown
# Task 2.1: implement-metta-core

**Date**: 2026-04-28 00:30:00
**Status**: Success

## Task Description
[Extracted from tasks.md]

## ChatDev Execution
[Full execution log]

## Learnings
- What worked
- What didn't work
- Key insights
- Code quality assessment
- Next steps
- Integration notes
```

## 🎯 Recommended Models

### For Bonsai
- **Claude Sonnet 4.5** - Best for complex reasoning
- **GPT-4o** - Great for code generation
- **Gemini Pro** - Good for document analysis

### For Groq (Free Alternative)
- **llama-3.3-70b-versatile** - Best for coding
- **mixtral-8x7b-32768** - Good balance
- **llama-3.1-8b-instant** - Fastest

## 💡 Best Practices

### 1. Start Small
Test with a simple task first:
```bash
./chatdev-harness.sh hello-world
```

### 2. Use Spec Files
Always attach relevant spec files:
```bash
./chatdev-orchestrator.sh 2.1 implement-metta-core \
  requirements.md design.md tasks.md
```

### 3. Review Learnings
After each task, review the learning file:
```bash
cat .kiro/chatdev-learnings/task-2.1-learnings.md
```

### 4. Iterate
Use learnings to improve next tasks

## 🔧 Troubleshooting

### Bonsai Not Starting
```bash
# Check if port 3000 is available
lsof -i :3000

# Try different port
bonsai start --port 3001
```

### ChatDev Can't Connect
```bash
# Test Bonsai endpoint
curl http://localhost:3000/v1/models

# Check ChatDev .env
cat ChatDev/.env
```

### Out of Bonsai Credits
Switch to Groq:
```bash
# Update ChatDev/.env
BASE_URL=https://api.groq.com/openai/v1
API_KEY=your-groq-key
```

## 📊 Monitoring Usage

### Bonsai Dashboard
```bash
# View usage stats
bonsai stats
```

### Learning Files
```bash
# List all learnings
ls -la .kiro/chatdev-learnings/

# View summary
grep "Status:" .kiro/chatdev-learnings/*.md
```

## 🎓 Example Workflow

### Task 2.1: Implement MeTTa Core

```bash
# 1. Kiro reads tasks.md and identifies Task 2.1
# 2. Kiro prepares context from requirements.md and design.md
# 3. Kiro calls orchestrator
export KIRO_ORCHESTRATED=1
./chatdev-orchestrator.sh 2.1 implement-metta-core \
  requirements.md design.md

# 4. ChatDev generates code using Bonsai/Groq
# 5. Output saved to: ChatDev/WareHouse/task-2.1-implement-metta-core/
# 6. Learnings saved to: .kiro/chatdev-learnings/task-2.1-learnings.md

# 7. Kiro reviews output
cat ChatDev/WareHouse/task-2.1-implement-metta-core/main.py

# 8. Kiro integrates code into project
cp ChatDev/WareHouse/task-2.1-implement-metta-core/*.rs backend/syncsenta-backend/src/

# 9. Kiro updates learning file with assessment
nano .kiro/chatdev-learnings/task-2.1-learnings.md

# 10. Kiro runs tests
cd backend && cargo test
```

## 🌟 Benefits

### With Bonsai
- ✅ Free frontier models
- ✅ No API key management
- ✅ Usage tracking for benchmarking
- ✅ Support for multiple models

### With Groq
- ✅ Free and fast
- ✅ Simple API key
- ✅ OpenAI-compatible
- ✅ Great for development

### With Kiro Orchestration
- ✅ Systematic task execution
- ✅ Learning capture
- ✅ Context management
- ✅ Quality assessment
- ✅ Integration tracking

## 📚 Resources

- **Bonsai**: https://trybons.ai
- **Bonsai Docs**: https://docs.trybons.ai
- **Bonsai Discord**: https://discord.gg/96ZtenC5eF
- **Groq**: https://console.groq.com
- **ChatDev**: https://github.com/OpenBMB/ChatDev

---

**Ready to build?** Let Kiro orchestrate your development! 🚀
