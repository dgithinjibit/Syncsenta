# SyncSenta

SyncSenta is an open-source education platform for Kenyan schools, built to support learner guidance, teacher planning, and auditable classroom decisions in a CBC-aligned workflow.

It brings together:

- an adaptive learner-facing tutor
- teacher operations for scheme planning and review
- evidence-backed decision making for curriculum checks
- a modular repository structure that keeps the live product separate from archived experiments

## Why SyncSenta

The product goal is simple: give schools a reliable teaching and learning workspace that is grounded in actual curriculum structure, teacher oversight, and auditable reasoning rather than opaque model output.

The system is designed around a few core principles:

- learner support should be adaptive and explainable
- teacher workflows should remain visible and reviewable
- design decisions should be traceable and inspectable
- the live app should be kept clean and maintainable as the product grows

## Product scope

The active code and service boundaries are:

- `studio/` — the Next.js application for the learner and teacher experience
- `ai-agents/` — the Python service for agentic and orchestration flows
- `backend/` — the Rust/Axum service and Hyperon-backed MeTTa Omega Claw engine
- `rust-core/` and `rust-service/` — the root Rust workspace
- `supabase/` — the database and auth layer
- `docs/` — the operating documentation and roadmap

The Rust backend is active source code but is not currently deployed. Studio
uses the local TypeScript Omega Claw rule mirror unless
`SYNCSENTA_BACKEND_URL` is explicitly configured. The remaining legacy or
dormant experiments are kept under `archive/`.

## Live access

- Web app: https://sentastudio.vercel.app
- Main docs: [docs/README.md](docs/README.md)
- Roadmap: [docs/ROADMAP.md](docs/ROADMAP.md)

## Main capabilities

### Learner experience

- adaptive tutoring flow
- grade-aware subject paths
- CBC-aligned lesson and activity experience
- teacher-visible learning state and progression

### Teacher experience

- curriculum review and scheme checks
- lesson planning support
- assessment generation workflows
- reviewable and explainable decision records

### Auditability

SyncSenta includes a rule-driven reconciliation flow that can inspect a scheme or draft and produce human-readable findings tied to curriculum rules. This pattern is designed to keep decisions explainable and reviewable instead of black-box output.

## Architecture

The active product is intentionally modular and keeps the runtime boundaries clear:

- `studio/` handles the user-facing web app and the client-side logic
- `ai-agents/` handles agent orchestration and service-level integration
- `backend/` contains the Rust/Axum API and Hyperon MeTTa runtime for Omega Claw
- `rust-core/` and `rust-service/` are a separate root Cargo workspace
- `supabase/` stores app data, auth, and access policies
- `docs/` holds operational and engineering guidance

The Rust service source is active, but its deployment and Studio forwarding
remain opt-in. The remaining experimental code is separated under `archive/`.

## Repository layout

```text
.
├── README.md
├── AGENTS.md
├── docs/
├── studio/
├── ai-agents/
├── backend/
├── rust-core/
├── rust-service/
├── supabase/
├── developer_tools/
├── archive/
├── vercel.json
├── render.yaml
├── pyproject.toml
├── Cargo.toml
├── LICENSE
├── SECURITY.md
└── CONTRIBUTING.md
```

## Getting started

### Requirements

- Node.js `>=22.18` for Studio
- Python 3.11+ for the agent service
- Poetry for the Python service
- access to the project environment variables for Supabase and service integrations

### Install

```bash
git clone https://github.com/kodafeliy-oss/Syncsenta.git
cd Syncsenta
```

### Run the frontend

```bash
cd studio
npm install
npm run dev
```

### Run the Python agent service

```bash
cd ai-agents
poetry install --with dev
PYTHONPATH=src poetry run uvicorn syncsenta_agents.api.server:app \
  --host 127.0.0.1 --port 8001 --reload
```

If the project uses a different service entrypoint in your local checkout, follow the commands in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Documentation map

The project docs are intentionally organized around active, operational guidance rather than historical snapshots.

- [docs/README.md](docs/README.md) — active documentation index
- [docs/BASIX-NORTH-STAR.md](docs/BASIX-NORTH-STAR.md) — evidence and scope guardrails
- [docs/ROADMAP.md](docs/ROADMAP.md) — Phase 2 teacher analytics scope and acceptance criteria
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — active runtime and data boundaries
- [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md) — Studio and teacher analytics conventions
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — local setup and verification commands
- [docs/DEBUGGING_PLAYBOOK.md](docs/DEBUGGING_PLAYBOOK.md) — Jira-ready bug reports, triage, and diagnostics
- [docs/DEPLOYMENT_RUNBOOK.md](docs/DEPLOYMENT_RUNBOOK.md) — deployment and post-deploy checks
- [docs/CONTENT_READINESS.md](docs/CONTENT_READINESS.md) — learner routes and activity readiness

## Contribution guide

We welcome contributions that improve the product, reduce operational debt, and keep the platform aligned with its mission.

Before proposing changes:

- read [AGENTS.md](AGENTS.md)
- check the active roadmap in [docs/ROADMAP.md](docs/ROADMAP.md)
- keep changes focused and production-oriented
- avoid reintroducing dead code paths or archived experiments into the active runtime

Pull requests should be small, well-tested, and clearly documented.

## Security and responsible use

This project includes educational AI workflows and authenticated user data. Please treat security seriously.

- do not commit secrets or API keys
- use environment variables for service credentials
- follow the repository security guidance in [SECURITY.md](SECURITY.md)

## License

This project is licensed under the terms of the [LICENSE](LICENSE) file.

## Project status

SyncSenta is under active product-oriented development. The repository is structured to keep the live app clean, documented, and maintainable while archiving dormant work that is no longer part of the shipping product.
