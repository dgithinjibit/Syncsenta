#!/bin/bash
# ChatDev Environment Setup Helper
# This script helps you configure ChatDev for first use

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   ChatDev Environment Setup for SyncSenta Education OS  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if .env already exists
if [ -f "ChatDev/.env" ]; then
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Keeping existing .env file${NC}"
        exit 0
    fi
fi

# Copy example file
cp ChatDev/.env.example ChatDev/.env
echo -e "${GREEN}✓ Created .env file from template${NC}"
echo ""

# Prompt for API keys
echo -e "${BLUE}API Key Configuration${NC}"
echo -e "${YELLOW}You need at least one LLM provider API key${NC}"
echo ""

# OpenAI
echo -e "${BLUE}1. OpenAI API Key${NC}"
echo "   Get from: https://platform.openai.com/api-keys"
read -p "   Enter your OpenAI API key (or press Enter to skip): " OPENAI_KEY
echo ""

# Gemini
echo -e "${BLUE}2. Google Gemini API Key (Optional)${NC}"
echo "   Get from: https://makersuite.google.com/app/apikey"
read -p "   Enter your Gemini API key (or press Enter to skip): " GEMINI_KEY
echo ""

# Local LLM option
echo -e "${BLUE}3. Local LLM (Optional)${NC}"
echo "   Options: LM Studio, Ollama, etc."
read -p "   Are you using a local LLM? (y/N): " -n 1 -r
echo ""
USE_LOCAL=false
if [[ $REPLY =~ ^[Yy]$ ]]; then
    USE_LOCAL=true
    echo "   Common local LLM URLs:"
    echo "   - LM Studio: http://localhost:1234/v1"
    echo "   - Ollama:    http://localhost:11434/v1"
    read -p "   Enter your local LLM URL: " LOCAL_URL
    echo ""
fi

# Update .env file
if [ ! -z "$OPENAI_KEY" ]; then
    sed -i "s|API_KEY=<REDACTED_SECRET>|API_KEY=$OPENAI_KEY|g" ChatDev/.env
    sed -i "s|BASE_URL=https://api.openai.com/v1|BASE_URL=https://api.openai.com/v1|g" ChatDev/.env
    echo -e "${GREEN}✓ Configured OpenAI${NC}"
elif [ ! -z "$GEMINI_KEY" ]; then
    sed -i "s|API_KEY=<REDACTED_SECRET>|API_KEY=$GEMINI_KEY|g" ChatDev/.env
    sed -i "s|BASE_URL=https://api.openai.com/v1|BASE_URL=https://generativelanguage.googleapis.com|g" ChatDev/.env
    echo -e "${GREEN}✓ Configured Google Gemini${NC}"
elif [ "$USE_LOCAL" = true ] && [ ! -z "$LOCAL_URL" ]; then
    sed -i "s|BASE_URL=https://api.openai.com/v1|BASE_URL=$LOCAL_URL|g" ChatDev/.env
    sed -i "s|API_KEY=<REDACTED_SECRET>|API_KEY=not-needed-for-local|g" ChatDev/.env
    echo -e "${GREEN}✓ Configured Local LLM${NC}"
else
    echo -e "${RED}⚠️  No API key configured!${NC}"
    echo -e "${YELLOW}You'll need to manually edit ChatDev/.env before using ChatDev${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Review your configuration: ${YELLOW}cat ChatDev/.env${NC}"
echo "2. Test ChatDev: ${YELLOW}./run-chatdev.sh feature --name test${NC}"
echo "3. Read the guide: ${YELLOW}cat CHATDEV_QUICKSTART.md${NC}"
echo ""
echo -e "${BLUE}To install the Kiro Power:${NC}"
echo "1. Open Kiro"
echo "2. Command Palette → 'Powers'"
echo "3. Add Custom Power → Local Directory"
echo "4. Select: ${YELLOW}$(pwd)/powers/chatdev-syncsenta${NC}"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
