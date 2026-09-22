# Getting Started with SyncSenta 2.0

Welcome to SyncSenta 2.0 - Kenya's AI-powered education operating system!

## 🎯 What We've Built So Far

### ✅ Phase 0 Complete: Project Foundation

We've successfully completed **Task 1** from the implementation plan:

1. **Repository Integration** - All 11 source repositories cloned and organized
2. **Project Structure** - Hybrid architecture with Next.js frontend + Rust backend
3. **Backend Skeleton** - Complete Axum server structure with all modules stubbed
4. **Database Schema** - Full PostgreSQL schema with pgvector support
5. **Documentation** - Comprehensive guides and specifications

## 🚀 Quick Start (5 minutes)

### Option 1: Automated Setup

```bash
# Run the setup script
./setup.sh

# Edit your environment variables
nano .env

# Start PostgreSQL and Redis (in separate terminals)
# Then run migrations
cd backend
sqlx database create
sqlx migrate run

# Start backend
cargo run --bin syncsenta-backend

# In another terminal, start frontend
cd frontend
npm run dev
```

### Option 2: Manual Setup

#### 1. Prerequisites

Install these first:
- **Rust** (1.75+): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Node.js** (20+): Download from [nodejs.org](https://nodejs.org/)
- **PostgreSQL** (15+): Download from [postgresql.org](https://www.postgresql.org/)
- **Redis** (7+): Download from [redis.io](https://redis.io/)
- **sqlx-cli**: `cargo install sqlx-cli --no-default-features --features postgres`

#### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit with your credentials
nano .env
```

**Required variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `REDIS_URL` - Redis connection string

**Optional (for full features):**
- `OPENAI_API_KEY` - For Mwalimu AI
- `GEMINI_API_KEY` - For multimodal AI
- `MPESA_*` - For payment integration
- `AT_API_KEY` - For SMS notifications

#### 3. Backend Setup

```bash
cd backend

# Install dependencies
cargo build

# Create database
sqlx database create

# Run migrations
sqlx migrate run

# Start server (runs on http://localhost:8080)
cargo run --bin syncsenta-backend
```

#### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy frontend environment
cp ../.env.example .env.local

# Start dev server (runs on http://localhost:3000)
npm run dev
```

## 📁 Project Structure

```
syncsenta-2.0/
├── frontend/              # Next.js + React + TypeScript
│   ├── src/
│   │   ├── app/          # Next.js app router
│   │   ├── components/   # React components
│   │   ├── lib/          # Utilities
│   │   └── hooks/        # Custom hooks
│   └── package.json
│
├── backend/              # Rust Axum backend
│   ├── syncsenta-backend/    # Main API server
│   │   ├── src/
│   │   │   ├── handlers/     # API endpoints
│   │   │   ├── services/     # Business logic
│   │   │   ├── middleware/   # Auth, RBAC
│   │   │   └── main.rs
│   │   └── migrations/       # Database migrations
│   │
│   ├── syncsenta-wasm/       # WASM module (offline)
│   │   └── src/lib.rs
│   │
│   ├── syncsenta-common/     # Shared types
│   │   └── src/
│   │       ├── models.rs
│   │       └── errors.rs
│   │
│   └── Cargo.toml            # Workspace config
│
├── Source Repositories/   # Cloned repos for integration
│   ├── studio/           # Original frontend
│   ├── scheme-scribe-ai/ # CBC scheme generation
│   ├── LughaBridge/      # Translation
│   ├── hexstrike-ai/     # AI orchestration
│   ├── candle/           # ML inference
│   └── ... (7 more)
│
├── .kiro/specs/          # Specifications
│   └── syncsenta-education-os/
│       ├── requirements.md
│       ├── design.md
│       ├── tasks.md
│       └── product-manager.md
│
├── .env.example          # Environment template
├── README.md             # Project overview
├── PROJECT_STATUS.md     # Current progress
├── GETTING_STARTED.md    # This file
└── setup.sh              # Quick setup script
```

## 🎓 Understanding the Architecture

### Frontend (Next.js)
- **Framework:** Next.js 14 with App Router
- **UI:** Tailwind CSS + Shadcn/UI components
- **State:** React Query for server state, Zustand for client state
- **Offline:** Service Worker + IndexedDB

### Backend (Rust Axum)
- **Web Framework:** Axum (built on Tokio + Tower)
- **Database:** PostgreSQL with sqlx (compile-time checked queries)
- **Caching:** Redis for sessions and rate limiting
- **Auth:** JWT tokens with argon2 password hashing

### AI Layer
- **Cloud:** GPT-4o, Gemini Pro, ElevenLabs
- **Edge:** Rust + candle for offline inference
- **WASM:** Browser-based ML via candle compiled to WebAssembly

## 🔑 Key Features to Implement

### ✅ Already Set Up
- Project structure
- Database schema
- API routing skeleton
- Environment configuration

### 🚧 Next Up (Task 2)
- JWT authentication
- 7-tier RBAC (Student → National Admin)
- Approval workflow engine
- MFA for privileged roles

### 📋 Coming Soon
- Mwalimu AI 2.0 (adaptive tutor)
- Virtual classrooms (Jitsi)
- M-Pesa payments
- Offline sync engine
- Content marketplace
- Analytics dashboard

## 📚 Documentation

- **[README.md](README.md)** - Project overview and quick start
- **[PROJECT_STATUS.md](PROJECT_STATUS.md)** - Current progress and next steps
- **[requirements.md](.kiro/specs/syncsenta-education-os/requirements.md)** - Full requirements (413 lines)
- **[design.md](.kiro/specs/syncsenta-education-os/design.md)** - System design (1039 lines)
- **[tasks.md](.kiro/specs/syncsenta-education-os/tasks.md)** - Implementation tasks (619 lines)
- **[product-manager.md](.kiro/specs/syncsenta-education-os/product-manager.md)** - Waterfall guide

## 🧪 Testing

```bash
# Backend tests
cd backend
cargo test

# Frontend tests
cd frontend
npm test

# E2E tests (coming soon)
npm run test:e2e
```

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready

# Check connection string in .env
echo $DATABASE_URL

# Recreate database
sqlx database drop
sqlx database create
sqlx migrate run
```

### Redis Connection Issues
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Check connection string in .env
echo $REDIS_URL
```

### Port Already in Use
```bash
# Backend (port 8080)
lsof -ti:8080 | xargs kill -9

# Frontend (port 3000)
lsof -ti:3000 | xargs kill -9
```

## 🤝 Contributing

1. Check [tasks.md](.kiro/specs/syncsenta-education-os/tasks.md) for open tasks
2. Create a feature branch: `git checkout -b feature/task-2-auth`
3. Implement with tests
4. Submit PR

## 📞 Getting Help

- Check [PROJECT_STATUS.md](PROJECT_STATUS.md) for current progress
- Review [design.md](.kiro/specs/syncsenta-education-os/design.md) for architecture details
- See [tasks.md](.kiro/specs/syncsenta-education-os/tasks.md) for implementation order

## 🎯 Success Metrics

We're building for:
- **100,000+ concurrent users**
- **<300ms API latency** (p95)
- **99.5% uptime**
- **Offline-first** architecture
- **10,000+ active students** in first 3 months

---

**Ready to start?** Run `./setup.sh` and let's build the future of Kenyan education! 🚀
