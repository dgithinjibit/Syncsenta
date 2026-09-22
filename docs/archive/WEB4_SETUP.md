# SyncSenta Web4 Infrastructure Setup Guide

This guide covers the setup of SyncSenta's Web4 architecture with blockchain, IPFS, and DID authentication.

## Prerequisites

- **Node.js** 18+ and npm/yarn/pnpm
- **Rust** 1.75+ with cargo
- **PostgreSQL** 15+ with pgvector extension
- **Redis** 7+
- **IPFS** node (local or remote)
- **Polygon** RPC endpoint (Alchemy/Infura)
- **Ethereum wallet** with testnet funds

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Client Layer (Browser / PWA)                  │
│   React + TypeScript + Vite + Tailwind CSS + Shadcn/UI         │
│   ethers.js (Web3) + ipfs-http-client + DID resolver            │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS / WebSocket
┌────────────────────────▼────────────────────────────────────────┐
│                    Axum Web Server (Rust)                        │
│   Tower Middleware: DID Auth · Rate Limiter · RBAC              │
└──┬──────────┬──────────┬──────────┬──────────────────────────────┘
   │          │          │          │
┌──▼──┐  ┌───▼───┐  ┌───▼───┐  ┌───▼──────────────┐
│DID  │  │Block- │  │IPFS   │  │PostgreSQL + Redis│
│Auth │  │chain  │  │Storage│  │                  │
└─────┘  └───────┘  └───────┘  └──────────────────┘
```

## 1. Database Setup

### Install PostgreSQL with pgvector

```bash
# Ubuntu/Debian
sudo apt install postgresql-15 postgresql-15-pgvector

# macOS
brew install postgresql@15
brew install pgvector
```

### Create Database

```bash
createdb syncsenta
psql syncsenta -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Run Migrations

```bash
cd backend/syncsenta-backend
cargo install sqlx-cli --no-default-features --features postgres
sqlx migrate run
```

## 2. Redis Setup

```bash
# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis

# macOS
brew install redis
brew services start redis
```

## 3. IPFS Setup

### Option A: Local IPFS Node

```bash
# Install IPFS
wget https://dist.ipfs.tech/kubo/v0.26.0/kubo_v0.26.0_linux-amd64.tar.gz
tar -xvzf kubo_v0.26.0_linux-amd64.tar.gz
cd kubo
sudo bash install.sh

# Initialize and start
ipfs init
ipfs daemon
```

### Option B: Infura/Pinata (Recommended for Development)

Sign up for:
- **Infura**: https://infura.io/ (IPFS API)
- **Pinata**: https://pinata.cloud/ (Pinning service)

## 4. Blockchain Setup

### Get Polygon Mumbai Testnet RPC

Sign up for:
- **Alchemy**: https://www.alchemy.com/
- **Infura**: https://infura.io/

Create a new app for Polygon Mumbai testnet.

### Get Testnet Funds

1. Create a wallet (MetaMask recommended)
2. Get Mumbai MATIC from faucet: https://faucet.polygon.technology/

### Deploy Smart Contracts

```bash
cd backend/syncsenta-blockchain
# TODO: Add Hardhat/Foundry deployment instructions
```

## 5. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/syncsenta
REDIS_URL=redis://127.0.0.1:6379

# Server
PORT=8080

# Blockchain (Polygon Mumbai Testnet)
POLYGON_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_API_KEY
POLYGON_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
POLYGON_CHAIN_ID=80001
CREDENTIALS_CONTRACT_ADDRESS=0x...
TOKEN_CONTRACT_ADDRESS=0x...
APPROVAL_REGISTRY_ADDRESS=0x...
CONTENT_REGISTRY_ADDRESS=0x...

# IPFS
IPFS_API_URL=http://127.0.0.1:5001  # or https://ipfs.infura.io:5001
IPFS_GATEWAY_URL=https://ipfs.io/ipfs/
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# DID
DID_METHOD=key
DID_RESOLVER_URL=https://dev.uniresolver.io/1.0/identifiers/

# AI Services
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
ELEVENLABS_API_KEY=...

# M-Pesa (Daraja API)
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=174379
MPESA_PASSKEY=...
MPESA_CALLBACK_URL=https://yourdomain.com/api/v1/payments/mpesa/callback

# Africa's Talking (SMS)
AT_API_KEY=...
AT_USERNAME=sandbox

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## 6. Backend Setup

```bash
cd backend

# Build all crates
cargo build

# Run tests
cargo test

# Run backend server
cd syncsenta-backend
cargo run
```

## 7. Frontend Setup (Vite)

```bash
cd frontend

# Install dependencies (using Web4 package.json)
cp package.web4.json package.json
npm install

# Copy Web4 configs
cp vite.config.web4.ts vite.config.ts
cp tsconfig.web4.json tsconfig.json
cp tsconfig.node.web4.json tsconfig.node.json
cp .eslintrc.web4.json .eslintrc.json

# Run development server
npm run dev

# Build for production
npm run build
```

## 8. Verify Setup

### Check Backend

```bash
curl http://localhost:8080/health
```

### Check IPFS

```bash
curl http://127.0.0.1:5001/api/v0/version
```

### Check Blockchain Connection

```bash
# In backend directory
cargo test --package syncsenta-blockchain
```

## 9. Development Workflow

### Backend Development

```bash
cd backend/syncsenta-backend
cargo watch -x run
```

### Frontend Development

```bash
cd frontend
npm run dev
```

### Run Tests

```bash
# Backend tests
cd backend
cargo test

# Frontend tests
cd frontend
npm test

# E2E tests
cd frontend
npm run test:e2e
```

## 10. Troubleshooting

### IPFS Connection Issues

```bash
# Check IPFS daemon is running
ipfs swarm peers

# Test upload
echo "Hello Web4" | ipfs add
```

### Blockchain Connection Issues

```bash
# Test RPC connection
curl -X POST \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  $POLYGON_RPC_URL
```

### Database Migration Issues

```bash
# Reset database (WARNING: deletes all data)
sqlx database drop
sqlx database create
sqlx migrate run
```

## 11. Production Deployment

### Backend (Fly.io/Railway)

```bash
# Build release binary
cargo build --release

# Deploy to Fly.io
fly deploy
```

### Frontend (Vercel/Netlify)

```bash
# Build production bundle
npm run build

# Deploy to Vercel
vercel deploy --prod
```

### Smart Contracts (Polygon Mainnet)

1. Get mainnet MATIC
2. Update `.env` with mainnet RPC and contract addresses
3. Deploy contracts to Polygon mainnet
4. Verify contracts on Polygonscan

## 12. Security Considerations

- **Never commit private keys** to version control
- Use **hardware wallets** for production deployments
- Enable **rate limiting** on all API endpoints
- Implement **DDoS protection** (Cloudflare)
- Regular **security audits** of smart contracts
- **Encrypt sensitive data** at rest and in transit
- Use **environment-specific** configurations

## 13. Monitoring

- **Backend**: Prometheus + Grafana
- **Blockchain**: Alchemy/Infura dashboards
- **IPFS**: IPFS Cluster monitoring
- **Database**: PostgreSQL logs + pg_stat_statements
- **Frontend**: Sentry for error tracking

## Resources

- **Polygon Docs**: https://docs.polygon.technology/
- **IPFS Docs**: https://docs.ipfs.tech/
- **W3C DID**: https://www.w3.org/TR/did-core/
- **Ethers.js**: https://docs.ethers.org/
- **Axum**: https://docs.rs/axum/

---

**Last Updated**: 2026-04-29  
**Version**: 1.0.0
