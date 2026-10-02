#!/bin/bash
# ChatDev Runner for SyncSenta Education OS
# This script makes it easy to run ChatDev workflows

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ChatDev directory
CHATDEV_DIR="./ChatDev"
VENV_PYTHON="$CHATDEV_DIR/venv/bin/python3"

# Check if virtual environment exists
if [ ! -f "$VENV_PYTHON" ]; then
    echo -e "${YELLOW}Virtual environment not found. Please run setup first.${NC}"
    exit 1
fi

# Display usage
usage() {
    echo -e "${BLUE}ChatDev Runner for SyncSenta${NC}"
    echo ""
    echo "Usage: $0 [workflow] [options]"
    echo ""
    echo "Workflows:"
    echo "  feature     - Feature development workflow"
    echo "  ai-safety   - AI safety implementation workflow"
    echo "  web4        - Web4/blockchain development workflow"
    echo "  custom      - Custom workflow (specify --path)"
    echo ""
    echo "Options:"
    echo "  --name NAME           Project name (default: syncsenta-task)"
    echo "  --path PATH           Path to custom workflow YAML"
    echo "  --attachment FILE     Attach a file (can be used multiple times)"
    echo "  --help                Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 feature --name user-auth"
    echo "  $0 ai-safety --name value-alignment --attachment .kiro/specs/syncsenta-education-os/requirements.md"
    echo "  $0 web4 --name smart-contract"
    exit 0
}

# Parse arguments
WORKFLOW=""
PROJECT_NAME="syncsenta-task"
WORKFLOW_PATH=""
ATTACHMENTS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        feature|ai-safety|web4|custom)
            WORKFLOW="$1"
            shift
            ;;
        --name)
            PROJECT_NAME="$2"
            shift 2
            ;;
        --path)
            WORKFLOW_PATH="$2"
            shift 2
            ;;
        --attachment)
            ATTACHMENTS+=("--attachment" "$2")
            shift 2
            ;;
        --help|-h)
            usage
            ;;
        *)
            echo -e "${YELLOW}Unknown option: $1${NC}"
            usage
            ;;
    esac
done

# Validate workflow
if [ -z "$WORKFLOW" ]; then
    echo -e "${YELLOW}Please specify a workflow${NC}"
    usage
fi

# Set workflow path based on workflow type
case $WORKFLOW in
    feature)
        WORKFLOW_PATH="$CHATDEV_DIR/yaml_instance/ChatDev_v1.yaml"
        ;;
    ai-safety)
        # You can create custom workflows later
        WORKFLOW_PATH="$CHATDEV_DIR/yaml_instance/ChatDev_v1.yaml"
        echo -e "${BLUE}Using feature workflow (AI safety workflow coming soon)${NC}"
        ;;
    web4)
        # You can create custom workflows later
        WORKFLOW_PATH="$CHATDEV_DIR/yaml_instance/ChatDev_v1.yaml"
        echo -e "${BLUE}Using feature workflow (Web4 workflow coming soon)${NC}"
        ;;
    custom)
        if [ -z "$WORKFLOW_PATH" ]; then
            echo -e "${YELLOW}Custom workflow requires --path option${NC}"
            exit 1
        fi
        ;;
esac

# Run ChatDev
echo -e "${GREEN}Starting ChatDev workflow: $WORKFLOW${NC}"
echo -e "${BLUE}Project name: $PROJECT_NAME${NC}"
echo -e "${BLUE}Workflow file: $WORKFLOW_PATH${NC}"
echo ""

cd "$CHATDEV_DIR" || exit 1
$VENV_PYTHON run.py \
    --path "$WORKFLOW_PATH" \
    --name "$PROJECT_NAME" \
    "${ATTACHMENTS[@]}"

echo ""
echo -e "${GREEN}ChatDev workflow completed!${NC}"
