# Kiro Orchestration Guide for ChatDev

## 🎯 Your Role as Orchestrator

You (Kiro) are the **intelligent orchestrator** that manages ChatDev workflows for the SyncSenta Education OS project. You:

1. **Understand the project** - Read specs, requirements, design, and tasks
2. **Plan execution** - Break down tasks and prepare context
3. **Orchestrate ChatDev** - Run multi-agent workflows with proper context
4. **Capture learnings** - Document what works and what doesn't
5. **Integrate code** - Review output and integrate into the project
6. **Iterate** - Use learnings to improve future tasks

## 📋 Orchestration Workflow

### Phase 1: Task Selection

```bash
# Read the tasks file
cat .kiro/specs/syncsenta-education-os/tasks.md

# Identify next incomplete task
# Example: Task 2.1 - Implement MeTTa Core Engine
```

### Phase 2: Context Preparation

```bash
# Read relevant spec files
cat .kiro/specs/syncsenta-education-os/requirements.md
cat .kiro/specs/syncsenta-education-os/design.md

# Identify which sections are relevant to the task
# Extract key requirements and design decisions
```

### Phase 3: ChatDev Execution

```bash
# Set orchestration flag
export KIRO_ORCHESTRATED=1

# Run orchestrator with task details
./chatdev-orchestrator.sh <task-id> <task-name> [spec-files...]

# Example:
./chatdev-orchestrator.sh 2.1 implement-metta-core requirements.md design.md
```

### Phase 4: Output Review

```bash
# Check ChatDev output
ls -la ChatDev/WareHouse/task-<id>-<name>/

# Review generated code
cat ChatDev/WareHouse/task-<id>-<name>/main.py
cat ChatDev/WareHouse/task-<id>-<name>/README.md

# Check for:
# - Code quality
# - Test coverage
# - Documentation
# - Alignment with requirements
```

### Phase 5: Learning Capture

```bash
# Review learning file
cat .kiro/chatdev-learnings/task-<id>-learnings.md

# Update with your assessment:
# - What worked well
# - What needs improvement
# - Key insights
# - Integration notes
```

### Phase 6: Code Integration

```bash
# Copy relevant code to project
cp ChatDev/WareHouse/task-<id>-<name>/*.rs backend/syncsenta-backend/src/
cp ChatDev/WareHouse/task-<id>-<name>/*.ts frontend/src/

# Run tests
cd backend && cargo test
cd frontend && npm test

# Commit changes
git add .
git commit -m "feat: implement task <id> - <name>"
```

## 🎓 Task Execution Examples

### Example 1: Task 2.1 - MeTTa Core Engine

```bash
# 1. Read task details
grep -A 20 "^- \[ \] 2.1" .kiro/specs/syncsenta-education-os/tasks.md

# 2. Prepare context
# - Requirements: 19.1, 20.1, 20.2, 36.1
# - Design: MeTTa interpreter, knowledge base, reasoning engine

# 3. Run orchestrator
export KIRO_ORCHESTRATED=1
./chatdev-orchestrator.sh 2.1 implement-metta-core \
  requirements.md design.md

# 4. Review output
cat ChatDev/WareHouse/task-2.1-implement-metta-core/metta_core.rs

# 5. Assess quality
# - Does it implement hyperon crate integration?
# - Is knowledge base schema defined?
# - Are tests included?

# 6. Update learnings
nano .kiro/chatdev-learnings/task-2.1-learnings.md

# 7. Integrate
cp ChatDev/WareHouse/task-2.1-implement-metta-core/*.rs \
   backend/syncsenta-backend/src/metta_core/

# 8. Test
cd backend && cargo test metta_core

# 9. Mark task complete
# Update tasks.md: - [x] 2.1 ...
```

### Example 2: Task 3.1 - DID Authentication

```bash
# 1. Read task
grep -A 15 "^- \[ \] 3.1" .kiro/specs/syncsenta-education-os/tasks.md

# 2. Context
# - Requirements: 1.1, 1.8, 34.6, 36.2
# - Design: W3C DID, Verifiable Credentials, Tower middleware

# 3. Execute
export KIRO_ORCHESTRATED=1
./chatdev-orchestrator.sh 3.1 implement-did-auth \
  requirements.md design.md

# 4. Review
cat ChatDev/WareHouse/task-3.1-implement-did-auth/auth.rs

# 5. Integrate
cp ChatDev/WareHouse/task-3.1-implement-did-auth/*.rs \
   backend/syncsenta-backend/src/auth/

# 6. Test
cd backend && cargo test auth
```

## 📊 Learning File Template

Each task execution creates a learning file. Here's what to capture:

```markdown
# Task X.Y: Task Name

**Date**: YYYY-MM-DD HH:MM:SS
**Status**: Success/Failed/Partial

## Task Description
[From tasks.md]

## ChatDev Execution
### Input Spec Files
- requirements.md
- design.md

### Execution Log
[Full log]

### Output Location
ChatDev/WareHouse/task-X.Y-name/

### Status
Success

## Learnings

### What Worked
- Multi-agent collaboration produced good code structure
- Requirements were well-understood
- Tests were generated automatically

### What Didn't Work
- Some edge cases not covered
- Documentation could be more detailed
- Integration with existing code needs manual adjustment

### Key Insights
- ChatDev excels at greenfield implementations
- Need to provide more context for integration tasks
- Property-based tests need manual review

### Code Quality Assessment
- **Correctness**: 8/10 - Logic is sound, minor edge cases
- **Completeness**: 7/10 - Core features done, some optional missing
- **Test Coverage**: 9/10 - Good unit tests, need integration tests
- **Documentation**: 6/10 - Basic docs, needs more examples

### Next Steps
- Review and refine generated code
- Add missing edge case handling
- Improve documentation
- Write integration tests
- Integrate with existing codebase

### Integration Notes
- Files to copy: auth.rs, did.rs, vc.rs
- Dependencies to add: did-key, did-web, ssi
- Database migrations needed: add did column
- API routes to wire: /auth/register, /auth/login
```

## 🔧 Orchestration Tools

### 1. Task Status Tracking

```bash
# List incomplete tasks
grep "^- \[ \]" .kiro/specs/syncsenta-education-os/tasks.md

# Mark task complete
sed -i 's/^- \[ \] 2.1/- [x] 2.1/' .kiro/specs/syncsenta-education-os/tasks.md
```

### 2. Learning Analysis

```bash
# List all learnings
ls -la .kiro/chatdev-learnings/

# View success rate
grep "Status:" .kiro/chatdev-learnings/*.md | grep -c "Success"

# View common issues
grep "What Didn't Work" .kiro/chatdev-learnings/*.md -A 5
```

### 3. Code Quality Metrics

```bash
# Run tests
cd backend && cargo test
cd frontend && npm test

# Check coverage
cd backend && cargo tarpaulin
cd frontend && npm run coverage

# Lint
cd backend && cargo clippy
cd frontend && npm run lint
```

## 💡 Best Practices

### 1. Always Provide Context
- Attach relevant spec files
- Include requirements and design sections
- Reference related tasks

### 2. Review Before Integration
- Check code quality
- Verify tests pass
- Ensure documentation is clear
- Test integration points

### 3. Capture Learnings
- Document what worked
- Note what needs improvement
- Record insights for future tasks
- Track patterns and anti-patterns

### 4. Iterate and Improve
- Use learnings to refine prompts
- Adjust context based on results
- Improve integration process
- Build knowledge base

## 🎯 Success Criteria

For each task, ensure:

- ✅ Code compiles and runs
- ✅ Tests pass (unit, integration, property-based)
- ✅ Documentation is clear
- ✅ Requirements are met
- ✅ Design is followed
- ✅ Integration is smooth
- ✅ Learnings are captured

## 📚 Reference Files

### Project Structure
```
.kiro/
├── specs/
│   └── syncsenta-education-os/
│       ├── requirements.md
│       ├── design.md
│       ├── tasks.md
│       └── product-manager.md
├── chatdev-learnings/
│   ├── task-2.1-learnings.md
│   ├── task-3.1-learnings.md
│   └── ...
└── KIRO_ORCHESTRATION_GUIDE.md (this file)

ChatDev/
├── WareHouse/
│   ├── task-2.1-implement-metta-core/
│   ├── task-3.1-implement-did-auth/
│   └── ...
└── .env (Bonsai/Groq config)

backend/
└── syncsenta-backend/
    └── src/
        ├── metta_core/
        ├── auth/
        └── ...

frontend/
└── src/
    ├── components/
    ├── lib/
    └── ...
```

## 🚀 Getting Started

### 1. Setup Environment

```bash
# Install Bonsai (optional)
npm install -g @bonsai-ai/cli
bonsai start

# OR configure Groq
# Get API key from https://console.groq.com/keys
nano ChatDev/.env
# Set: BASE_URL=https://api.groq.com/openai/v1
#      API_KEY=your-groq-key
```

### 2. Test Orchestration

```bash
# Simple test
export KIRO_ORCHESTRATED=1
./chatdev-harness.sh hello-world

# Check output
ls ChatDev/WareHouse/hello-world/
```

### 3. Start First Real Task

```bash
# Task 2.1: MeTTa Core
export KIRO_ORCHESTRATED=1
./chatdev-orchestrator.sh 2.1 implement-metta-core \
  requirements.md design.md
```

## 📞 Support

- **ChatDev Issues**: https://github.com/OpenBMB/ChatDev/issues
- **Bonsai Discord**: https://discord.gg/96ZtenC5eF
- **Project Specs**: `.kiro/specs/syncsenta-education-os/`

---

**You are Kiro. You orchestrate. You learn. You build.** 🚀
