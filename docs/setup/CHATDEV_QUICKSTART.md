# ChatDev Quick Start for SyncSenta

## ✅ Installation Complete!

You've successfully installed ChatDev and set up the integration with your SyncSenta Education OS project.

## 📁 What You Have

### 1. ChatDev Framework
- **Location**: `./ChatDev/`
- **Virtual Environment**: `./ChatDev/venv/`
- **Status**: ✅ Installed and ready

### 2. ChatDev Power for Kiro
- **Location**: `./powers/chatdev-syncsenta/`
- **Documentation**: `./powers/chatdev-syncsenta/POWER.md`
- **Steering Files**:
  - `advanced-ai-safety.md` - AI safety workflows
  - `web4-blockchain-workflows.md` - Web4 & blockchain development

### 3. Runner Script
- **Location**: `./run-chatdev.sh`
- **Purpose**: Easy command-line interface for ChatDev workflows

## 🚀 Quick Start

### Basic Usage

```bash
# Run a feature development workflow
./run-chatdev.sh feature --name my-feature

# Run with spec attachments
./run-chatdev.sh feature --name user-auth \
  --attachment .kiro/specs/syncsenta-education-os/requirements.md \
  --attachment .kiro/specs/syncsenta-education-os/design.md

# See all options
./run-chatdev.sh --help
```

### Available Workflows

1. **Feature Development** (`feature`)
   - Standard software development workflow
   - CEO → CTO → Programmers → Testers → Reviewers

2. **AI Safety** (`ai-safety`)
   - Value alignment implementation
   - Consciousness-aware AI design
   - Ethical guardrails

3. **Web4/Blockchain** (`web4`)
   - Smart contract development
   - IPFS integration
   - W3C DID authentication

## 📚 Next Steps

### 1. Install the Power in Kiro

To use ChatDev directly from Kiro:

1. Open Kiro
2. Open the Powers panel (Command Palette → "Powers")
3. Click "Add Custom Power"
4. Select "Local Directory"
5. Navigate to: `/home/web4ke/codes/sync/powers/chatdev-syncsenta`
6. Click "Install"

### 2. Configure Environment Variables

Create a `.env` file in the ChatDev directory:

```bash
cd ChatDev
cp .env.example .env
# Edit .env and add your API keys
```

Required variables:
- `OPENAI_API_KEY` - For OpenAI models
- `GOOGLE_API_KEY` - For Google Gemini models (optional)

### 3. Run Your First Workflow

Let's create a simple feature:

```bash
./run-chatdev.sh feature --name hello-world
```

This will:
1. Start the ChatDev multi-agent system
2. Create a project in `ChatDev/WareHouse/hello-world/`
3. Generate code, tests, and documentation

### 4. Integrate with Your Spec

To work on a specific task from your SyncSenta spec:

```bash
# Attach your spec files
./run-chatdev.sh feature --name task-1-implementation \
  --attachment .kiro/specs/syncsenta-education-os/requirements.md \
  --attachment .kiro/specs/syncsenta-education-os/design.md \
  --attachment .kiro/specs/syncsenta-education-os/tasks.md
```

## 🔧 Troubleshooting

### Python Environment Issues

If you see Python errors:

```bash
cd ChatDev
source venv/bin/activate
pip install -r requirements.txt
```

### Missing API Keys

ChatDev requires API keys for LLM providers. Add them to `ChatDev/.env`:

```bash
OPENAI_API_KEY=your-key-here
```

### Permission Denied

If the runner script doesn't execute:

```bash
chmod +x run-chatdev.sh
```

## 📖 Documentation

- **ChatDev Power**: `./powers/chatdev-syncsenta/POWER.md`
- **AI Safety Workflows**: `./powers/chatdev-syncsenta/steering/advanced-ai-safety.md`
- **Web4 Workflows**: `./powers/chatdev-syncsenta/steering/web4-blockchain-workflows.md`
- **ChatDev Official Docs**: `./ChatDev/README.md`

## 🎯 Example Workflows

### 1. Implement a Feature from Spec

```bash
# Read task from your spec
cat .kiro/specs/syncsenta-education-os/tasks.md

# Run ChatDev with the task details
./run-chatdev.sh feature --name implement-task-1 \
  --attachment .kiro/specs/syncsenta-education-os/requirements.md
```

### 2. AI Safety Implementation

```bash
# Implement value alignment
./run-chatdev.sh ai-safety --name value-alignment \
  --attachment powers/chatdev-syncsenta/steering/advanced-ai-safety.md
```

### 3. Smart Contract Development

```bash
# Create a Web4 smart contract
./run-chatdev.sh web4 --name token-contract \
  --attachment powers/chatdev-syncsenta/steering/web4-blockchain-workflows.md
```

## 🌟 Key Features

✅ **Multi-Agent Collaboration** - CEO, CTO, Programmers, Testers, Reviewers work together
✅ **AI Safety First** - Built-in ethical guardrails and value alignment
✅ **Web4 Native** - Blockchain, IPFS, DID support out of the box
✅ **Spec Integration** - Works directly with your Kiro specs
✅ **Complete SDLC** - Requirements → Design → Implementation → Testing → Review

## 💡 Tips

1. **Start Small**: Begin with simple features to understand the workflow
2. **Use Attachments**: Attach relevant spec files for context
3. **Review Output**: ChatDev generates code in `ChatDev/WareHouse/[project-name]/`
4. **Iterate**: You can run multiple workflows on the same project
5. **Customize**: Create custom workflow YAML files for specific needs

## 🤝 Support

- **ChatDev Issues**: https://github.com/OpenBMB/ChatDev/issues
- **SyncSenta Spec**: `.kiro/specs/syncsenta-education-os/`
- **Power Documentation**: `./powers/chatdev-syncsenta/POWER.md`

---

**Ready to build?** Start with:

```bash
./run-chatdev.sh feature --name my-first-feature
```

Happy coding! 🚀
