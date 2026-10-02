#!/bin/bash
# ChatDev Orchestrator - Kiro-driven development with learning capture
# This orchestrator uses Kiro (you!) to manage ChatDev workflows and capture learnings

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

CHATDEV_DIR="./ChatDev"
VENV_PYTHON="$CHATDEV_DIR/venv/bin/python3"
LEARNINGS_DIR=".kiro/chatdev-learnings"
SPEC_DIR=".kiro/specs/syncsenta-education-os"

# Create learnings directory
mkdir -p "$LEARNINGS_DIR"

# Display banner
echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   ChatDev Orchestrator - Kiro-Driven Development       ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Kiro is available (this script is meant to be called BY Kiro)
if [ -z "$KIRO_ORCHESTRATED" ]; then
    echo -e "${YELLOW}⚠️  This script is designed to be orchestrated by Kiro${NC}"
    echo -e "${YELLOW}   For manual use, try: ./chatdev-harness.sh${NC}"
    echo ""
fi

# Parse arguments
TASK_ID="$1"
TASK_NAME="$2"
SPEC_FILES="${@:3}"

if [ -z "$TASK_ID" ] || [ -z "$TASK_NAME" ]; then
    echo -e "${RED}Usage: $0 <task-id> <task-name> [spec-files...]${NC}"
    echo ""
    echo "Example:"
    echo "  $0 2.1 implement-metta-core requirements.md design.md"
    exit 1
fi

# Create task-specific learning file
LEARNING_FILE="$LEARNINGS_DIR/task-${TASK_ID}-learnings.md"

echo -e "${BLUE}📋 Task: $TASK_ID - $TASK_NAME${NC}"
echo -e "${BLUE}📚 Spec files: ${SPEC_FILES:-none}${NC}"
echo -e "${BLUE}📝 Learning file: $LEARNING_FILE${NC}"
echo ""

# Initialize learning file
cat > "$LEARNING_FILE" << EOF
# Task $TASK_ID: $TASK_NAME

**Date**: $(date '+%Y-%m-%d %H:%M:%S')
**Status**: In Progress

## Task Description

From tasks.md:
\`\`\`
$(grep -A 5 "^- \[ \] $TASK_ID" "$SPEC_DIR/tasks.md" || echo "Task not found in tasks.md")
\`\`\`

## ChatDev Execution

### Input Spec Files
EOF

# Add spec file references
if [ ! -z "$SPEC_FILES" ]; then
    for spec in $SPEC_FILES; do
        echo "- $spec" >> "$LEARNING_FILE"
    done
else
    echo "- None (standalone task)" >> "$LEARNING_FILE"
fi

cat >> "$LEARNING_FILE" << EOF

### Execution Log

\`\`\`
Starting ChatDev workflow...
EOF

# Build ChatDev command
CMD="$VENV_PYTHON run.py --path yaml_instance/ChatDev_v1.yaml --name task-${TASK_ID}-${TASK_NAME}"

# Add spec file attachments
for spec in $SPEC_FILES; do
    SPEC_PATH="$SPEC_DIR/$spec"
    if [ -f "$SPEC_PATH" ]; then
        CMD="$CMD --attachment $SPEC_PATH"
    fi
done

echo -e "${GREEN}🚀 Starting ChatDev...${NC}"
echo ""

# Run ChatDev and capture output
cd "$CHATDEV_DIR"
OUTPUT_DIR="WareHouse/task-${TASK_ID}-${TASK_NAME}"

# Execute ChatDev
if eval $CMD 2>&1 | tee -a "../$LEARNING_FILE"; then
    echo -e "\n${GREEN}✓ ChatDev completed successfully${NC}"
    STATUS="Success"
else
    echo -e "\n${RED}✗ ChatDev failed${NC}"
    STATUS="Failed"
fi

cd ..

# Close execution log
echo '```' >> "$LEARNING_FILE"

# Add output summary
cat >> "$LEARNING_FILE" << EOF

### Output Location

\`ChatDev/$OUTPUT_DIR/\`

### Status

**$STATUS**

## Learnings

### What Worked

- 

### What Didn't Work

- 

### Key Insights

- 

### Code Quality Assessment

- **Correctness**: 
- **Completeness**: 
- **Test Coverage**: 
- **Documentation**: 

### Next Steps

- 

### Integration Notes

- 

---

**Orchestrated by**: Kiro
**Completion Time**: $(date '+%Y-%m-%d %H:%M:%S')
EOF

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Task execution complete${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "   Task: $TASK_ID - $TASK_NAME"
echo -e "   Status: $STATUS"
echo -e "   Output: ChatDev/$OUTPUT_DIR/"
echo -e "   Learnings: $LEARNING_FILE"
echo ""
echo -e "${YELLOW}📝 Next: Review output and update learnings file${NC}"
echo ""
