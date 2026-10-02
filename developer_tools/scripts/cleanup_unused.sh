#!/bin/bash
# Cleanup unused directories and files for SyncSenta MVP

echo "🧹 Cleaning up unused files and directories..."

# Remove large unused directories
echo "Removing frontend-legacy (1.1GB)..."
rm -rf frontend-legacy

echo "Removing repos directory (1.7GB)..."
rm -rf repos

echo "Removing dataset-generation (381MB)..."
rm -rf dataset-generation

echo "Removing ai-training (70MB)..."
rm -rf ai-training

# Remove unused documentation files
echo "Removing old documentation files..."
rm -f EMOTIONAL_INTELLIGENCE_FEATURE.md
rm -f GIKUYU_IMPLEMENTATION_SUMMARY.md
rm -f GIKUYU_INTEGRATION_SUMMARY.md
rm -f KENYA_LLM_INTEGRATION_SUMMARY.md
rm -f MVP_PIVOT_SUMMARY.md
rm -f STUDENT_BUILD_README.md
rm -f STUDENT_BUILD_STATUS.md
rm -f STUDENT_CHATBOT_COMPLETION.md
rm -f immediate-action-plan.md
rm -f kenya_llm_bench_creator.py
rm -f quick_start.py
rm -f test_mwalimu.html
rm -f data-pipeline-strategy.md
rm -f Fine_tune_Gikuyu_Mwalimu.ipynb

# Remove old cleanup script
rm -f cleanup_dev_files.sh

# Remove .sqlx cache files (they're regenerated)
echo "Removing .sqlx cache files..."
rm -rf backend/syncsenta-backend/.sqlx

echo "✅ Cleanup complete!"
echo ""
echo "Freed up approximately 3.2GB of disk space"
echo ""
echo "Remaining structure:"
echo "  - backend/          (Rust API)"
echo "  - ai-agents/        (Python AI agents)"
echo "  - studio/           (Next.js frontend)"
echo "  - docs/             (Documentation)"
echo "  - .kiro/            (Specs and build config)"
