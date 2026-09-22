# Render Deployment Guide

## Overview

This project deploys 3 services on Render:
1. **Frontend** (Next.js) - Student chatbot + Teacher dashboard
2. **Backend** (Rust/Axum) - API server + WebSocket handler
3. **AI Agents** (Python/CrewAI) - Multi-agent AI system

## Quick Deploy

### Option 1: Using render.yaml (Recommended)

1. Push code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click "New" → "Blueprint"
4. Connect your GitHub repo: `dgithinjibit/syncsenta-studio`
5. Render will automatically detect `render.yaml` and create all 3 services

### Option 2: Manual Service Creation

#### Frontend Service
- **Name**: syncsenta-frontend
- **Runtime**: Node
- **Root Directory**: `studio`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `NODE_ENV=production`
  - `NEXT_PUBLIC_API_URL=<backend-url>`
  - `NEXT_PUBLIC_WS_URL=<backend-ws-url>`

#### Backend Service
- **Name**: syncsenta-backend
- **Runtime**: Rust
- **Root Directory**: `backend`
- **Build Command**: `cargo build --release --package syncsenta-backend`
- **Start Command**: `./target/release/syncsenta-backend`
- **Environment Variables**:
  - `DATABASE_URL=<postgres-connection-string>`
  - `REDIS_URL=<redis-connection-string>`
  - `RUST_LOG=info`
  - `PORT=8080`

#### AI Agents Service
- **Name**: syncsenta-ai-agents
- **Runtime**: Python 3.11
- **Root Directory**: `ai-agents`
- **Build Command**: `pip install poetry && poetry install --no-dev`
- **Start Command**: `poetry run uvicorn src.syncsenta_agents.api:app --host 0.0.0.0 --port 8000`
- **Environment Variables**:
  - `OPENAI_API_KEY=<your-openai-key>`
  - `GEMINI_API_KEY=<your-gemini-key>`
  - `GROQ_API_KEY=<your-groq-key>`
  - `GIKUYU_MODEL_ENDPOINT=<gikuyu-model-url>`

## Database Setup

### PostgreSQL
1. Create a PostgreSQL database on Render (Free tier available)
2. Copy the **Internal Database URL**
3. Add to Backend service as `DATABASE_URL`

### Redis
1. Create a Redis instance on Render (Free tier available)
2. Copy the **Internal Redis URL**
3. Add to Backend service as `REDIS_URL`

## Environment Variables

### Required for Frontend
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://syncsenta-backend.onrender.com
NEXT_PUBLIC_WS_URL=wss://syncsenta-backend.onrender.com
```

### Required for Backend
```env
DATABASE_URL=postgresql://user:password@host:5432/syncsenta
REDIS_URL=redis://host:6379
RUST_LOG=info
PORT=8080
```

### Required for AI Agents
```env
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
GROQ_API_KEY=gsk_...
GIKUYU_MODEL_ENDPOINT=https://...
```

## Troubleshooting

### Backend Build Fails: "could not find Cargo.toml"
**Solution**: Ensure `rootDir: backend` is set in render.yaml

### Frontend Build Fails: "Cannot find module"
**Solution**: Ensure `rootDir: studio` is set and `package.json` exists

### AI Agents Fails: "ModuleNotFoundError"
**Solution**: Ensure Poetry is installed in build command: `pip install poetry && poetry install --no-dev`

### Database Connection Fails
**Solution**: Use the **Internal Database URL** from Render, not the external one

### Services Can't Communicate
**Solution**: Use internal Render URLs (e.g., `http://syncsenta-backend:8080`) for service-to-service communication

## Health Checks

After deployment, verify each service:

- **Frontend**: `https://syncsenta-frontend.onrender.com`
- **Backend**: `https://syncsenta-backend.onrender.com/health`
- **AI Agents**: `https://syncsenta-ai-agents.onrender.com/health`

## Free Tier Limitations

Render Free tier includes:
- ✅ 750 hours/month per service
- ✅ Automatic HTTPS
- ✅ Continuous deployment from Git
- ⚠️ Services spin down after 15 minutes of inactivity (cold starts)
- ⚠️ 512 MB RAM per service
- ⚠️ Shared CPU

For production, upgrade to paid plans for:
- No cold starts
- More RAM and CPU
- Better performance

## Deployment Checklist

- [ ] Push code to GitHub
- [ ] Create PostgreSQL database on Render
- [ ] Create Redis instance on Render
- [ ] Set all environment variables
- [ ] Deploy using render.yaml blueprint
- [ ] Verify health checks for all 3 services
- [ ] Test student chatbot interface
- [ ] Test teacher dashboard
- [ ] Test AI agent responses

## Support

If deployment fails, check:
1. Render build logs for specific errors
2. Ensure all environment variables are set
3. Verify database and Redis are running
4. Check that `render.yaml` paths are correct

For more help: https://render.com/docs/troubleshooting-deploys
