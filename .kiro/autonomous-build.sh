#!/bin/bash
# Autonomous Build Agent for SyncSenta
# Orchestrates Bonsai with smart permission handling

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
TASKS_FILE=".kiro/specs/syncsenta-education-os/tasks.md"
LEARNINGS_DIR=".kiro/chatdev-learnings"
BUILD_LOG=".kiro/BUILD_SESSION.md"

# Safe commands (auto-approve)
SAFE_COMMANDS=(
    "cat"
    "ls"
    "grep"
    "find"
    "git status"
    "git diff"
    "cargo check"
    "npm run lint"
    "pytest"
    "vitest"
)

# Permission-required commands
PERMISSION_COMMANDS=(
    "git commit"
    "git push"
    "cargo build"
    "npm install"
    "sqlx migrate"
    "cp"
    "mv"
    "rm"
)

# Parse arguments
TASK_ID="${1:-}"
TASK_NAME="${2:-}"

# Check if Bonsai is running
check_bonsai() {
    if curl -s http://localhost:3000/v1/models > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Bonsai is running${NC}"
        return 0
    else
        echo -e "${RED}✗ Bonsai is not running${NC}"
        echo "Run: bonsai start"
        exit 1
    fi
}

# Check if command is safe
is_safe_command() {
    local cmd="$1"
    for safe in "${SAFE_COMMANDS[@]}"; do
        if [[ "$cmd" == *"$safe"* ]]; then
            return 0
        fi
    done
    return 1
}

# Request permission for risky commands
request_permission() {
    local cmd="$1"
    echo -e "${YELLOW}⚠️  Permission required for: $cmd${NC}"
    read -p "Allow? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        return 0
    else
        echo -e "${RED}Permission denied. Stopping.${NC}"
        exit 1
    fi
}

# Execute command with permission check
execute_command() {
    local cmd="$1"
    
    if is_safe_command "$cmd"; then
        echo -e "${GREEN}✓ Auto-approved: $cmd${NC}"
        eval "$cmd"
    else
        request_permission "$cmd"
        eval "$cmd"
    fi
}

# Main orchestration
main() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║   Autonomous Build Agent - SyncSenta                   ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    check_bonsai
    
    # Start with Task 2.1
    if [ -z "$TASK_ID" ]; then
        TASK_ID="2.1"
        TASK_NAME="implement-metta-core"
    fi
    
    echo -e "${BLUE}Starting Task $TASK_ID: $TASK_NAME${NC}"
    echo ""
    
    # Read task requirements
    echo -e "${BLUE}Reading task requirements...${NC}"
    execute_command "grep -A 20 \"^- \[ \] $TASK_ID\" $TASKS_FILE"
    
    # Ask Bonsai to implement
    echo -e "${BLUE}Asking Bonsai to implement...${NC}"
    echo -e "${YELLOW}In Bonsai terminal, paste:${NC}"
    echo ""
    echo "Read .kiro/specs/syncsenta-education-os/tasks.md"
    echo "Implement Task $TASK_ID: $TASK_NAME"
    echo "Use hyperon crate for MeTTa interpreter"
    echo "Create complete Rust implementation in backend/syncsenta-backend/src/metta_core/"
    echo ""
    
    # Wait for Bonsai to complete
    echo -e "${BLUE}Waiting for Bonsai to complete...${NC}"
    echo -e "${YELLOW}When done, paste the output here for review.${NC}"
    echo ""
    
    # Read output and integrate
    echo -e "${BLUE}Integration phase...${NC}"
    echo -e "${YELLOW}Paste Bonsai's output below (Ctrl+D when done):${NC}"
    
    # Read multi-line input
    local output=""
    while IFS= read -r line; do
        output+="$line"$'\n'
    done
    
    # Save to learning file
    echo -e "${BLUE}Saving learnings...${NC}"
    mkdir -p "$LEARNINGS_DIR"
    cat > "$LEARNINGS_DIR/task-${TASK_ID}-learnings.md" << EOF
# Task $TASK_ID: $TASK_NAME

**Date**: $(date '+%Y-%m-%d %H:%M:%S')
**Status**: In Progress

## Task Description
[From tasks.md]

## Bonsai Implementation
$output

## Integration Status
Pending review

---

**Orchestrated by**: Autonomous Build Agent
EOF
    
    echo -e "${GREEN}✓ Learnings saved${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Review Bonsai's output"
    echo "2. Run tests: cd backend && cargo test"
    echo "3. Commit changes when ready"
}

# Run main
main "$@"
