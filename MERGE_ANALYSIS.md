# 🔍 Frontend/Backend Merge Analysis

**Date**: May 3, 2026  
**Goal**: Extract useful features from new `frontend/` and merge with production `studio/`

## 📊 What They Added

### 1. New Frontend (`frontend/`) - Simple Vite+React

**Useful Features:**
- ✅ **QuizPage.tsx** - CBC quiz generator with grading (NEW FEATURE!)
  - Generate quizzes by grade/subject/competency
  - Multiple choice, true/false, short answer questions
  - Auto-grading with rubric feedback
  - Difficulty levels (easy/medium/hard)
  - CBC citations and competency tracking
  
- ✅ **HomePage.tsx** - Nice landing page with feature cards
  - Clean design with gradient text
  - Feature showcase grid
  - Tech stack display
  
- ⚠️ **TutorPage.tsx** - Basic chat (we have better in studio/)
  - Simple chat interface
  - Grade/subject/language selection
  - Less features than our mwalimu-chat.tsx

**Verdict**: 
- **Keep**: QuizPage.tsx (new feature we don't have)
- **Keep**: HomePage.tsx design elements
- **Discard**: TutorPage.tsx (our mwalimu-chat.tsx is superior)

### 2. Backend Files

**app.py** - FastAPI wrapper for AI agents
- ✅ Useful: Runs AI agents on port 8000
- ✅ Already integrated with our ai-agents/
- ✅ Offline demo mode support

**main.py** - Empty placeholder
- ❌ Useless: Just prints "Hello from repl-nix-workspace!"

**Verdict**:
- **Keep**: app.py (useful for running AI agents standalone)
- **Discard**: main.py (useless)

### 3. Configuration Files

**.replit** - Replit IDE configuration
- ⚠️ Useful only if deploying to Replit
- Not needed for local development

**start.sh** - Starts FastAPI + Vite
- ✅ Useful: Simple startup script
- Can adapt for our studio/

**start_notebook.sh** - Starts JupyterLab
- ✅ Useful: For ML training
- Keep for fine-tuning work

**jupyter_config.py** - JupyterLab config
- ✅ Useful: For notebook development

**Verdict**:
- **Keep**: start.sh, start_notebook.sh, jupyter_config.py
- **Optional**: .replit (only if using Replit)

### 4. ML/AI Training Files

**patch_unsloth_cpu.py** - CPU compatibility patches
- ✅ Useful: Allows unsloth to run on CPU
- Keep for ML training

**unsloth_compiled_cache/** - Compiled cache
- ✅ Useful: Pre-compiled MoE utils
- Keep for ML training

**pyproject.toml** - Python dependencies
- ✅ Useful: Defines all Python packages
- Merge with existing requirements

**uv.lock** - Dependency lock file
- ✅ Useful: Ensures reproducible builds

**Verdict**: **Keep all** - useful for ML training

## 🎯 Merge Plan

### Phase 1: Extract Quiz Feature
1. Port QuizPage.tsx to studio/src/app/quiz/page.tsx
2. Update to use our UI components (shadcn/ui)
3. Update API calls to match our backend structure
4. Add to navigation

### Phase 2: Enhance Landing Page
1. Extract design elements from HomePage.tsx
2. Update studio/src/app/page.tsx with feature cards
3. Keep our dark theme styling

### Phase 3: Backend Integration
1. Keep app.py for standalone AI agents server
2. Update start.sh to work with studio/ instead of frontend/
3. Document how to run AI agents standalone

### Phase 4: ML Training Setup
1. Keep all ML/training files in root
2. Document how to use JupyterLab for fine-tuning
3. Keep pyproject.toml for Python dependencies

### Phase 5: Cleanup
1. Remove frontend/ directory
2. Remove main.py (useless)
3. Update documentation

## 📝 Files to Keep

```
✅ Keep (Merge into studio/):
- frontend/src/pages/QuizPage.tsx → studio/src/app/quiz/page.tsx
- frontend/src/pages/HomePage.tsx → Extract design elements

✅ Keep (Root level):
- app.py (AI agents server)
- start.sh (update for studio/)
- start_notebook.sh (JupyterLab)
- jupyter_config.py (JupyterLab config)
- patch_unsloth_cpu.py (ML training)
- unsloth_compiled_cache/ (ML training)
- pyproject.toml (Python deps)
- uv.lock (Dependency lock)
- .replit (optional, for Replit deployment)
- replit.md (documentation)

❌ Remove:
- frontend/ (entire directory after extracting quiz feature)
- main.py (useless placeholder)
```

## 🚀 Implementation Steps

### Step 1: Create Quiz Page in Studio
```bash
# Create quiz page
mkdir -p studio/src/app/quiz
# Port QuizPage.tsx with our UI components
```

### Step 2: Update Landing Page
```bash
# Update studio/src/app/page.tsx with feature cards
```

### Step 3: Update Start Scripts
```bash
# Update start.sh to use studio/ instead of frontend/
```

### Step 4: Remove Duplicate Frontend
```bash
git rm -rf frontend/
git rm main.py
git commit -m "chore: Merge quiz feature and remove duplicate frontend"
```

## 📊 Feature Comparison

| Feature | studio/ (Ours) | frontend/ (New) | Action |
|---------|----------------|-----------------|--------|
| Student Chat | ✅ Full-featured | ⚠️ Basic | Keep ours |
| Teacher Dashboard | ✅ Complete | ❌ None | Keep ours |
| Quiz Generator | ❌ None | ✅ Full | **Port to studio/** |
| Landing Page | ⚠️ Basic | ✅ Nice design | **Enhance ours** |
| Voice Input/Output | ✅ Yes | ❌ No | Keep ours |
| WebSocket Live | ✅ Yes | ❌ No | Keep ours |
| Dark Theme | ✅ mp3juice style | ⚠️ Basic | Keep ours |

## 🎯 Final Structure

```
syncsenta/
├── backend/                    # Rust API
├── ai-agents/                  # Python AI agents
├── studio/                     # Production Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx       # Enhanced landing page
│   │   │   ├── student/       # Student chat (existing)
│   │   │   ├── teacher/       # Teacher dashboard (existing)
│   │   │   └── quiz/          # NEW: Quiz generator
│   │   │       └── page.tsx   # Ported from frontend/
│   │   └── components/
│   │       ├── student/       # Existing
│   │       └── teacher/       # Existing
├── app.py                      # AI agents server (keep)
├── start.sh                    # Updated startup script
├── start_notebook.sh           # JupyterLab (keep)
├── jupyter_config.py           # JupyterLab config (keep)
├── patch_unsloth_cpu.py        # ML training (keep)
├── unsloth_compiled_cache/     # ML training (keep)
├── pyproject.toml              # Python deps (keep)
└── uv.lock                     # Dependency lock (keep)
```

---

**Ready to proceed with merge?**
