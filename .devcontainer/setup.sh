#!/bin/bash
set -e

echo "🚀 Setting up SyncSenta development environment..."

AVAILABLE_KB=$(df -Pk / | awk 'NR == 2 { print $4 }')
MIN_MODEL_SPACE_KB=$((10 * 1024 * 1024))

if [ "$AVAILABLE_KB" -ge "$MIN_MODEL_SPACE_KB" ]; then
    echo "📦 Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh

    echo "🔧 Starting Ollama service..."
    ollama serve > /tmp/ollama.log 2>&1 &
    OLLAMA_PID=$!
    echo $OLLAMA_PID > /tmp/ollama.pid

    echo "⏳ Waiting for Ollama to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
            echo "✅ Ollama is ready!"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "❌ Ollama failed to start"
            exit 1
        fi
        sleep 2
    done

    echo "📥 Pulling required AI models (this may take a while)..."
    echo "   - Pulling llama3.2:1b for tutoring..."
    ollama pull llama3.2:1b

    echo "   - Pulling qwen2.5:0.5b for assessment..."
    ollama pull qwen2.5:0.5b
else
    echo "⚠️  Skipping Ollama and model downloads: less than 10 GB is available."
    echo "   Rebuild after freeing disk space, then run:"
    echo "   ollama pull llama3.2:1b"
    echo "   ollama pull qwen2.5:0.5b"
fi

# Install Python dependencies for ai-agents
echo "🐍 Installing Python dependencies..."
cd ai-agents
pip install -e .
cd ..

# Install Node dependencies for studio
echo "📦 Installing Node dependencies..."
cd studio
npm install
cd ..

echo "✅ SyncSenta development environment ready!"
echo ""
echo "📝 Next steps:"
echo "   1. Copy .env.example files and configure them"
echo "   2. Start the AI agents: cd ai-agents && python -m syncsenta_agents.main"
echo "   3. Start the frontend: cd studio && npm run dev"
echo ""
echo "🔗 Ollama is running on http://localhost:11434"
echo "   View logs: tail -f /tmp/ollama.log"
echo "   Stop Ollama: kill \$(cat /tmp/ollama.pid)"
