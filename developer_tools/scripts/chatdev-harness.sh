#!/bin/bash
# Simple ChatDev Harness for SyncSenta
# Quick and easy way to run ChatDev workflows

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

CHATDEV_DIR="./ChatDev"
VENV_PYTHON="$CHATDEV_DIR/venv/bin/python3"

# Check if API key is set
check_api_key() {
    # Check if Bonsai is running
    if curl -s http://localhost:3000/v1/models > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Bonsai detected and running!${NC}"
        # Update .env for Bonsai
        if ! grep -q "localhost:3000" "$CHATDEV_DIR/.env" 2>/dev/null; then
            cat > "$CHATDEV_DIR/.env" << EOF
BASE_URL=http://localhost:3000/v1
API_KEY=bonsai-local-key
EOF
            echo -e "${GREEN}✓ Configured ChatDev for Bonsai${NC}"
        fi
        return 0
    fi
    
    # Check if Groq is configured
    if grep -q "groq.com" "$CHATDEV_DIR/.env" 2>/dev/null && ! grep -q "your-groq-api-key-here" "$CHATDEV_DIR/.env" 2>/dev/null; then
        echo -e "${GREEN}✓ Groq API configured${NC}"
        return 0
    fi
    
    # Neither Bonsai nor Groq configured
    echo -e "${RED}⚠️  No LLM provider configured!${NC}"
    echo ""
    echo -e "${BLUE}Option 1: Bonsai (Recommended - Free Frontier Models)${NC}"
    echo "  1. Install: npm install -g @bonsai-ai/cli"
    echo "  2. Start: bonsai start"
    echo "  3. Re-run this script"
    echo ""
    echo -e "${BLUE}Option 2: Groq (Free & Fast)${NC}"
    echo "  Get your free API key from: ${BLUE}https://console.groq.com/keys${NC}"
    echo ""
    read -p "Enter your Groq API key (or press Enter to skip): " GROQ_KEY
    
    if [ ! -z "$GROQ_KEY" ]; then
        cat > "$CHATDEV_DIR/.env" << EOF
BASE_URL=https://api.groq.com/openai/v1
API_KEY=$GROQ_KEY
EOF
        echo -e "${GREEN}✓ Configured ChatDev for Groq${NC}"
        echo ""
    else
        echo -e "${YELLOW}Skipping configuration. Please set up Bonsai or Groq before running.${NC}"
        exit 1
    fi
}

# Simple usage
if [ "$1" == "--help" ] || [ "$1" == "-h" ] || [ -z "$1" ]; then
    echo -e "${BLUE}ChatDev Harness - Simple Interface${NC}"
    echo ""
    echo "Usage: $0 <task-name> [spec-file]"
    echo ""
    echo "Examples:"
    echo "  $0 implement-auth"
    echo "  $0 implement-task-1 .kiro/specs/syncsenta-education-os/requirements.md"
    echo ""
    exit 0
fi

# Check API key
check_api_key

TASK_NAME="$1"
SPEC_FILE="${2:-}"

echo -e "${GREEN}🚀 Starting ChatDev for: $TASK_NAME${NC}"
echo ""

# Build command
CMD="$VENV_PYTHON run.py --path yaml_instance/ChatDev_v1.yaml --name $TASK_NAME"

# Add attachment if provided
if [ ! -z "$SPEC_FILE" ]; then
    if [ -f "$SPEC_FILE" ]; then
        CMD="$CMD --attachment $SPEC_FILE"
        echo -e "${BLUE}📎 Attached: $SPEC_FILE${NC}"
    else
        echo -e "${YELLOW}⚠️  File not found: $SPEC_FILE${NC}"
    fi
fi

echo ""
echo -e "${BLUE}Running ChatDev...${NC}"
echo ""

# Run ChatDev
cd "$CHATDEV_DIR"
eval $CMD

echo ""
echo -e "${GREEN}✓ Done! Check output in: ChatDev/WareHouse/$TASK_NAME/${NC}"
