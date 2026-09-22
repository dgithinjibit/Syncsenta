# SyncSenta Education OS

A Web4-first education platform for Kenya's CBC curriculum — decentralized, AI-powered, and built for 100,000+ concurrent users.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Rust + Axum + PostgreSQL + Redis |
| Frontend | React + TypeScript + Vite + Tailwind + Shadcn/UI |
| Blockchain | Polygon (Solidity smart contracts) |
| Storage | IPFS (decentralized content) |
| Auth | W3C DID + Verifiable Credentials |
| AI | Mwalimu AI (LLM orchestration + offline WASM inference) |

## Project Structure

```
sync/
├── backend/                    # Rust workspace
│   ├── syncsenta-backend/      # Axum API server
│   ├── syncsenta-common/       # Shared types and models
│   ├── syncsenta-blockchain/   # Smart contract integration
│   └── syncsenta-wasm/         # Offline ML inference (candle)
├── frontend/                   # React + TypeScript app
├── studio/                     # UI component library (source of truth)
├── docs/
│   ├── infrastructure/         # Azure + AMD deployment guides
│   ├── setup/                  # Bonsai + orchestration guides
│   └── archive/                # Historical planning docs
├── scripts/                    # Build and setup scripts
└── repos/                      # External repositories (Web4 ecosystem)
    ├── candle/                 # Rust ML framework (AI inference)
    ├── thrml/                  # Probabilistic models (adaptive learning)
    ├── ChatDev/                # Multi-agent platform (content generation)
    ├── LughaBridge/            # Voice translation (Kikuyu ↔ English)
    ├── WisdomEdu/              # Live LMS foundation (founding member)
    ├── scheme-genie/           # CBC curriculum generator
    ├── scheme-scribe-ai/       # AI educational content writer
    ├── aditicha/               # Critical thinking activities
    ├── igbo-bilingual-chat/    # Multilingual AI model template
    ├── hexstrike-ai/           # Cybersecurity testing platform
    ├── best-of-ml-rust/        # Curated Rust ML libraries
    ├── africaAIPolicyResources/# African AI policy research
    ├── Syncsenta_local/        # Local development utilities
    └── powers/                 # Kiro power extensions
```

## Getting Started

### Backend
```bash
cd backend
cargo check -p syncsenta-backend   # verify it compiles
cargo test --all                    # run tests
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### With Bonsai (autonomous build)
```bash
bonsai start --dangerously-skip-permissions
# Paste prompt from docs/setup/BONSAI_MASTER_PROMPT.md
```

## Build Status

- ✅ Task 1: Project foundation
- ✅ Tasks 3-9: Auth, blockchain, IPFS, DB, Mwalimu AI, schemes, translation (partial)
- 🔧 Build: Clean (0 errors, warnings only)
- 🚧 Tasks 11+: In progress (Bonsai building)

## Infrastructure

- **Azure:** $5,000 credits (Red Bull Basement) — see `docs/infrastructure/`
- **AMD Developer Cloud:** $100 credits (MI300X GPU) — for Mwalimu AI training

## Spec

Full implementation plan: `.kiro/specs/syncsenta-education-os/`
