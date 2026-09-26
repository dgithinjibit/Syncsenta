# SyncSenta Scripts

Utility scripts for development, deployment, and maintenance.

## 🚀 Development Scripts

### start-dev.sh
Automated startup script for local development.

**Usage:**
```bash
./scripts/start-dev.sh
```

**What it does:**
- Creates .env files if missing
- Starts AI Agents service (port 8001)
- Starts Frontend (port 5173)
- Shows access URLs
- Handles cleanup on Ctrl+C

**Requirements:**
- Python 3.11+
- Node.js 18+
- Ollama (or Dify API key)

### start.sh
Start both the FastAPI AI agents service and the Next.js dev server.

## 📦 Setup Scripts

### setup/install-dependencies.sh
Install all project dependencies (Python, Node, Rust).

**Usage:**
```bash
./scripts/setup/install-dependencies.sh
```

## 🔧 Making Scripts Executable

If you get permission errors:

```bash
chmod +x scripts/*.sh
chmod +x scripts/setup/*.sh
```

## 📝 Script Conventions

All scripts follow these conventions:
- ✅ Use `#!/bin/bash` shebang
- ✅ Include error handling (`set -e`)
- ✅ Provide clear output messages
- ✅ Support both local and CI environments
- ✅ Document usage in comments

## 🤝 Contributing

When adding new scripts:
1. Place in appropriate subdirectory
2. Make executable (`chmod +x`)
3. Add usage documentation
4. Update this README
5. Test on clean environment

See [docs/CODING_STANDARDS.md](../docs/CODING_STANDARDS.md) for more details.
