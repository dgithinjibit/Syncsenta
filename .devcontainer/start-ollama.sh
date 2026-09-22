#!/bin/bash
# Helper script to start/restart Ollama in Codespaces

echo "🔧 Starting Ollama service..."

# Kill existing Ollama process if running
if [ -f /tmp/ollama.pid ]; then
    OLD_PID=$(cat /tmp/ollama.pid)
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo "   Stopping existing Ollama process (PID: $OLD_PID)..."
        kill $OLD_PID
        sleep 2
    fi
fi

# Start Ollama
ollama serve > /tmp/ollama.log 2>&1 &
OLLAMA_PID=$!
echo $OLLAMA_PID > /tmp/ollama.pid

# Wait for Ollama to be ready
echo "⏳ Waiting for Ollama to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "✅ Ollama is ready on http://localhost:11434"
        echo "   View logs: tail -f /tmp/ollama.log"
        echo "   Stop: kill \$(cat /tmp/ollama.pid)"
        exit 0
    fi
    sleep 2
done

echo "❌ Ollama failed to start. Check logs: cat /tmp/ollama.log"
exit 1
