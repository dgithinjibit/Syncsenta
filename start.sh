#!/usr/bin/env bash
# Start both the FastAPI AI agents backend and the Next.js dev server.
# Next.js (port 5173) proxies /api/v1/* to backend services.

set -e

echo "🚀 Starting SyncSenta MVP..."

# Start FastAPI AI agents backend in the background (port 8001)
echo "📡 Starting AI Agents service on port 8001..."
cd ai-agents
source venv/bin/activate 2>/dev/null || python3 -m venv venv && source venv/bin/activate
SYNCSENTA_OFFLINE_DEMO=1 python -m syncsenta_agents.api.server &
AGENTS_PID=$!
cd ..

# Wait briefly for AI agents to be ready
sleep 2

# Start Rust backend in the background (port 8080)
echo "🦀 Starting Rust backend on port 8080..."
cd backend/syncsenta-backend
cargo run &
BACKEND_PID=$!
cd ../..

# Wait for backend to be ready
sleep 3

# Start Next.js dev server in foreground (port 5173)
echo "⚛️  Starting Next.js frontend on port 5173..."
cd studio && npm run dev

# If Next.js exits, kill the backends too
echo "🛑 Shutting down services..."
kill $AGENTS_PID 2>/dev/null || true
kill $BACKEND_PID 2>/dev/null || true

