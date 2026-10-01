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

## 🧠 Omega scripts

### reconcile.mts
Print the scheme check for a Grade 8 draft, in a terminal, from the MeTTa packs on disk. It imports
`studio/src/lib/scheme/reconcile.ts` — the module the browser page uses — so the two outputs are the same
bytes, and a vitest suite compares them to keep that true.

**Usage:**
```bash
node scripts/reconcile.mts                       # the sample week-14 draft
node scripts/reconcile.mts --draft <path.json>   # another draft, same shape
```
Exit code 0 means the check ran, whatever it concluded; 1 means a file could not be read. Requires Node 22
for the type stripping, and no install step.

### omega-alias.mjs
Twenty lines that answer `@/` for Node, which is how `studio/src` writes its imports and what makes the
runner above able to use the real module instead of a copy. Imported for its side effect; nothing to run.

### generate-ai-design-pack.mts
Regenerate `studio/public/omega/ai_g8_design.metta` from the curriculum module that is the authority for it.
Run from `studio/`: `npm run generate:design-pack`. The design pack is generated and byte-lock tested against
`studio/src/data/curriculum/senior-school/ai.ts`; `scheme_check.metta` is hand-written policy and has no
generator.

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
