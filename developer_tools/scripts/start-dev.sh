#!/bin/bash
# Quick start script for SyncSenta development

set -e

echo "🚀 Starting SyncSenta Development Environment"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env files exist
if [ ! -f "ai-agents/.env" ]; then
    echo -e "${YELLOW}⚠️  Creating ai-agents/.env from example...${NC}"
    cp ai-agents/.env.example ai-agents/.env
    echo -e "${YELLOW}   Please edit ai-agents/.env and add your API keys if needed${NC}"
fi

if [ ! -f "studio/.env" ]; then
    echo -e "${YELLOW}⚠️  Creating studio/.env from example...${NC}"
    cp studio/.env.cbc-agent.example studio/.env
fi

echo ""
echo -e "${BLUE}📋 Starting services...${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping services...${NC}"
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Check if Ollama is needed
USE_DIFY=$(grep "^USE_DIFY=" ai-agents/.env 2>/dev/null | cut -d'=' -f2 || echo "false")

if [ "$USE_DIFY" != "true" ]; then
    # Check if Ollama is running
    if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Ollama is not running!${NC}"
        echo "   Please start Ollama in another terminal:"
        echo "   $ ollama serve"
        echo ""
        echo "   Or set USE_DIFY=true in ai-agents/.env to use Dify instead"
        echo ""
        read -p "Press Enter to continue anyway, or Ctrl+C to exit..."
    else
        echo -e "${GREEN}✅ Ollama is running${NC}"
    fi
fi

# Start AI Agents service
echo ""
echo -e "${BLUE}🤖 Starting AI Agents service on port 8001...${NC}"
cd ai-agents
python -m syncsenta_agents.main > ../logs/ai-agents.log 2>&1 &
AI_AGENTS_PID=$!
cd ..

# Wait for AI Agents to be ready
echo -e "${YELLOW}   Waiting for AI Agents to start...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:8001/healthz > /dev/null 2>&1; then
        echo -e "${GREEN}   ✅ AI Agents ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}   ⚠️  AI Agents may not have started. Check logs/ai-agents.log${NC}"
    fi
    sleep 1
done

# Start Frontend
echo ""
echo -e "${BLUE}🎨 Starting Frontend on port 5173...${NC}"
cd studio
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for Frontend to be ready
echo -e "${YELLOW}   Waiting for Frontend to start...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}   ✅ Frontend ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}   ⚠️  Frontend may not have started. Check logs/frontend.log${NC}"
    fi
    sleep 1
done

echo ""
echo -e "${GREEN}✅ All services started!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📱 Access the application:${NC}"
echo ""
echo "   Student Interface:  http://localhost:5173/student"
echo "   Teacher Dashboard:  http://localhost:5173/teacher"
echo ""
echo "   AI Agents API:      http://localhost:8001"
echo "   Health Check:       http://localhost:8001/healthz"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}📋 Logs:${NC}"
echo "   AI Agents: tail -f logs/ai-agents.log"
echo "   Frontend:  tail -f logs/frontend.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for user to stop
wait
