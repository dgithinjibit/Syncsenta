# Autonomous Build Agent for SyncSenta

**Purpose**: Orchestrate Bonsai/ChatDev autonomously with smart permission handling

## Agent Configuration

### Safe Commands (Auto-approve)
- File reads (reading specs, code)
- Directory listing
- Git status/checks
- Test execution
- Code formatting
- Documentation updates

### Permission-Required Commands
- File writes (new code)
- Database migrations
- Dependency installations
- Network requests
- System modifications

## Workflow

1. **Read specs** → Auto-approved
2. **Analyze requirements** → Auto-approved
3. **Generate code** → Ask Bonsai (permission needed)
4. **Write code** → Ask user (permission needed)
5. **Run tests** → Auto-approved
6. **Commit changes** → Ask user (permission needed)

## Implementation Plan

### Phase 1: Agent Setup
- Create agent configuration
- Define safe vs permission-required commands
- Set up notification system

### Phase 2: Task Execution
- Read Task 2.1 requirements
- Ask Bonsai for implementation
- Review output
- Request permission to write
- Write code
- Run tests
- Commit

### Phase 3: Continuous Operation
- Process tasks sequentially
- Auto-approve safe operations
- Request permission for risky operations
- Update progress

## User Experience

**You say**: "Start autonomous build mode"

**Agent does**:
1. Processes tasks without constant interruptions
2. Only asks when it needs to write/modify
3. Updates you with progress summaries
4. Builds while you do other things

## Bonsai Integration

Agent will:
- Monitor Bonsai terminal output
- Detect when Bonsai needs input
- Provide context automatically
- Handle permission requests

---

**Ready to implement?** This is the real solution - an autonomous agent that handles the patience needed for Bonsai.
