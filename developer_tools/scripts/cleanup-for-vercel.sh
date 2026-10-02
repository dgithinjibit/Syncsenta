#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# SyncSenta Vercel Cleanup Script
# ═══════════════════════════════════════════════════════════════════════════
# Removes unnecessary components for streamlined Vercel deployment
# Keeps only: studio/ (frontend), ai-agents/ (backend), docs/, scripts/

set -e

echo "🧹 Cleaning up SyncSenta for Vercel deployment..."
echo ""

# Backup important files
echo "📦 Creating backup..."
mkdir -p .backup
cp -r backend/syncsenta-blockchain .backup/ 2>/dev/null || true
cp -r backend/syncsenta-wasm .backup/ 2>/dev/null || true
cp -r backend/syncsenta-backend .backup/ 2>/dev/null || true
cp -r ChatDev .backup/ 2>/dev/null || true

echo "✅ Backup created in .backup/"
echo ""

# Remove blockchain components
echo "🗑️  Removing blockchain components..."
rm -rf backend/syncsenta-blockchain
rm -rf backend/syncsenta-wasm
echo "✅ Removed: backend/syncsenta-blockchain/, backend/syncsenta-wasm/"

# Remove Rust backend (replaced by Python)
echo "🗑️  Removing Rust backend..."
rm -rf backend/syncsenta-backend/src
rm -rf backend/syncsenta-backend/tests
rm -rf backend/target
rm -f backend/Cargo.lock
rm -f backend/Cargo.toml
echo "✅ Removed: Rust backend components"

# Remove ChatDev (separate project)
echo "🗑️  Removing ChatDev..."
rm -rf ChatDev
echo "✅ Removed: ChatDev/"

# Remove unnecessary data/logs
echo "🗑️  Removing temporary files..."
rm -rf data/
rm -rf logs/
rm -rf unsloth_compiled_cache/
rm -rf __pycache__
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true
echo "✅ Removed: temporary files and caches"

# Clean up old documentation
echo "🗑️  Removing outdated docs..."
rm -f IMPLEMENTATION_SUMMARY.md
rm -f SYSTEM_STATUS.md
rm -f TESTING_GUIDE.md
rm -f backend/syncsenta-backend/TASK_*.md
echo "✅ Removed: outdated documentation"

# Update .gitignore
echo "📝 Updating .gitignore..."
cat >> .gitignore << 'EOF'

# Vercel
.vercel

# Backup
.backup/

# Removed components
backend/syncsenta-blockchain/
backend/syncsenta-wasm/
backend/syncsenta-backend/src/
ChatDev/
EOF
echo "✅ Updated .gitignore"

# Create deployment structure
echo "📁 Creating deployment structure..."
mkdir -p studio
mkdir -p ai-agents
mkdir -p docs
mkdir -p scripts
mkdir -p notebooks
echo "✅ Deployment structure ready"

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "✨ Cleanup Complete!"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "📊 Project Structure:"
echo "   ├── studio/          (Next.js frontend)"
echo "   ├── ai-agents/       (Python FastAPI backend)"
echo "   ├── docs/            (Documentation)"
echo "   ├── scripts/         (Utility scripts)"
echo "   ├── notebooks/       (Jupyter notebooks)"
echo "   ├── .env             (Unified configuration)"
echo "   └── vercel.json      (Vercel deployment config)"
echo ""
echo "🗑️  Removed:"
echo "   ├── backend/syncsenta-blockchain/  (Web3 components)"
echo "   ├── backend/syncsenta-wasm/        (WASM modules)"
echo "   ├── backend/syncsenta-backend/     (Rust backend)"
echo "   ├── ChatDev/                       (Separate project)"
echo "   └── Temporary files and caches"
echo ""
echo "💾 Backup saved in: .backup/"
echo ""
echo "🚀 Next Steps:"
echo "   1. Review changes: git status"
echo "   2. Test locally: npm run dev (in studio/)"
echo "   3. Commit: git add . && git commit -m 'Streamlined for Vercel'"
echo "   4. Push: git push origin main"
echo "   5. Deploy: Follow VERCEL_DEPLOYMENT.md"
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
