# AI/MeTTa Integration Testing Guide

**Purpose:** Verify end-to-end AI chat functionality with authenticated students, MeTTa policy evaluation, and data persistence.

## Test Coverage

### 1. Authentication & Authorization ✓
- **Unauthenticated rejection**: Chat API returns 401 for unauthenticated requests
- **Authenticated access**: Valid JWT token allows chat requests
- **Session management**: Supabase auth integration working

### 2. MeTTa/Omega Policy Evaluation ✓
- **Low mastery → Intensive scaffolding**: Students with <40% mastery get step-by-step guidance
- **High mastery → Independent scaffolding**: Students with >80% mastery get minimal hints
- **Live signals**: `hints_used` and `consecutive_wrong` tracked and fed to Omega engine
- **Dynamic system prompt**: Scaffolding level adjusts prompt template

### 3. Progress Persistence ✓
- **Chat session creation**: Messages saved to `chat_sessions` table
- **Learning progress tracking**: `learning_progress` table updated with attempts, hints, mastery
- **Competency-specific tracking**: Progress tracked per competency code
- **Async persistence**: Fire-and-forget writes don't block chat response

### 4. RLS Security ✓
- **Cross-student isolation**: Students cannot read other students' progress
- **Own data only**: `user_id = auth.uid()` enforced on all queries
- **Chat session privacy**: Only own sessions returned

### 5. Multi-Provider AI Integration ✓
- **Subject-specific responses**: Mathematics, English, Science all work
- **Language support**: English, Kiswahili, Mixed mode
- **Chat modes**: Socratic, Homework Help, Compass

### 6. Error Handling ✓
- **Invalid grade rejection**: 400 error for invalid grades
- **Missing fields validation**: Zod schema validates all required fields
- **Empty message rejection**: Cannot send empty messages
- **Network error handling**: Graceful degradation on backend failures

---

## Running Tests

### Prerequisites

1. **Environment variables** (`.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
TEST_API_URL=http://localhost:3000  # Or your deployment URL
```

2. **Test user**: The suite creates `test-student@ascendra.test` if it doesn't exist

3. **Development server running**:
```bash
npm run dev
```

### Execute Tests

```bash
# Run all AI/MeTTa E2E tests
cd studio
npx vitest run src/lib/__tests__/ai-metta-e2e.test.ts

# Run with verbose output
npx vitest run src/lib/__tests__/ai-metta-e2e.test.ts --reporter=verbose

# Run in watch mode (for development)
npx vitest src/lib/__tests__/ai-metta-e2e.test.ts
```

### Expected Output

```
✓ Test user authenticated: 1a2b3c4d...
✓ Authentication & Authorization (2)
  ✓ should reject unauthenticated chat requests
  ✓ should accept authenticated chat requests
✓ MeTTa/Omega Policy Evaluation (2)
  ✓ should evaluate tutoring decision based on mastery
    ✓ Omega decision applied. Response length: 234
  ✓ should provide Independent scaffolding for high mastery
    ✓ Independent scaffolding applied. Response length: 156
✓ Progress Persistence (2)
  ✓ should persist chat session to database
    ✓ Chat session persisted: 7f8e9d10...
  ✓ should update learning_progress with hints and attempts
    ✓ Learning progress tracked: 1 attempts
✓ RLS Security (2)
  ✓ should prevent reading other students progress
    ✓ RLS prevents cross-student data access
  ✓ should only return own chat sessions
    ✓ RLS enforces user owns 3 sessions
✓ Multi-Provider AI Integration (1)
  ✓ should handle different subjects correctly
    ✓ Mathematics chat working
    ✓ English chat working
    ✓ Science chat working
✓ Error Handling (3)
  ✓ should handle invalid grade gracefully
    ✓ Invalid grade rejected: Invalid grade format
  ✓ should handle missing required fields
    ✓ Missing fields validation working
  ✓ should handle empty message
    ✓ Empty message validation working

Test Files  1 passed (1)
     Tests  12 passed (12)
  Start at  10:45:23
  Duration  87.23s (transform 23ms, setup 1.2s, collect 45ms, tests 85.96s)
```

---

## Manual Testing Checklist

For scenarios that require human judgment:

### Student Chat Quality
- [ ] **Socratic Mode**: Questions guide thinking, don't give direct answers
- [ ] **Homework Help**: Step-by-step solutions provided
- [ ] **Compass Mode**: Teacher context incorporated into responses
- [ ] **Language**: Kiswahili responses use correct grammar and cultural references
- [ ] **Grade-appropriate**: Content matches CBC curriculum for selected grade

### Scaffolding Adaptation
- [ ] **First interaction**: Starts with Guided (no history)
- [ ] **After correct answers**: Gradually reduces hints
- [ ] **After struggles**: Provides more structure
- [ ] **Consistent errors**: Suggests reviewing fundamentals

### Progress Tracking
- [ ] **Dashboard updates**: XP and progress reflect chat activity
- [ ] **Learning path**: Checkpoints marked complete after practice
- [ ] **Streak tracking**: Daily engagement counted
- [ ] **Subject levels**: Level up after consistent progress

### Edge Cases
- [ ] **Long conversation**: 50+ turns without performance degradation
- [ ] **Network interruption**: Can resume after reconnection
- [ ] **Multiple tabs**: Syncs across tabs (localStorage + Supabase)
- [ ] **Session timeout**: Graceful re-auth prompt

---

## Troubleshooting

### Test failures

**"401 Unauthorized"**
- Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- Verify dev server is running
- Check Supabase RLS policies are enabled

**"Network error" / "ECONNREFUSED"**
- Ensure `npm run dev` is running
- Check `TEST_API_URL` points to correct port
- Verify firewall isn't blocking localhost:3000

**"Policy verdict not found"**
- Check Python backend is running (`ai-agents` service)
- Verify `GROQ_API_KEY` or other LLM provider key is set
- Check `/api/chat` route calls `evaluateTutoringDecision`

**"RLS test fails"**
- Verify Supabase RLS policies are enabled
- Check `user_id = auth.uid()` policy exists on `learning_progress`
- Confirm test user has valid session

### Performance issues

**Tests timing out (>30s)**
- LLM provider may be slow (OpenAI/Groq)
- Increase timeout in test: `{ timeout: 60000 }`
- Check network latency to Supabase/AI providers

**Flaky tests**
- Add delays after writes: `await new Promise(r => setTimeout(r, 1000))`
- Check async persistence is completing
- Verify no race conditions in chat history hydration

---

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/test.yml`:

```yaml
name: AI/MeTTa E2E Tests

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: supabase/postgres:latest
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd studio
          npm ci
      
      - name: Start dev server
        run: |
          cd studio
          npm run dev &
          sleep 10
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
      
      - name: Run E2E tests
        run: |
          cd studio
          npx vitest run src/lib/__tests__/ai-metta-e2e.test.ts
        env:
          TEST_API_URL: http://localhost:3000
```

### Vercel Preview Deployments

Test against preview URLs:

```bash
TEST_API_URL=https://your-preview-deployment.vercel.app \
  npx vitest run src/lib/__tests__/ai-metta-e2e.test.ts
```

---

## Test Data Cleanup

Tests automatically clean up:
- `learning_progress` rows for test user
- `chat_sessions` for test user

Manual cleanup (if needed):

```sql
-- Delete test user's data
DELETE FROM learning_progress WHERE user_id = '<test-user-id>';
DELETE FROM chat_sessions WHERE user_id = '<test-user-id>';
DELETE FROM chat_messages WHERE session_id IN (
  SELECT id FROM chat_sessions WHERE user_id = '<test-user-id>'
);

-- Delete test user account (via Supabase dashboard)
-- Auth → Users → Delete user
```

---

## Success Criteria

✅ **All 12 automated tests pass**  
✅ **Manual checklist items verified**  
✅ **No RLS policy bypasses found**  
✅ **Response quality meets CBC standards**  
✅ **Performance under 5s for typical chat turn**

---

## Next Steps

1. **Add performance benchmarks**: Track p50/p95 response times
2. **Load testing**: Simulate 100 concurrent students
3. **Policy coverage**: Test all MeTTa safeguarding rules
4. **A/B testing**: Compare scaffolding strategies
5. **Production monitoring**: Set up alerts for high error rates

---

**Last Updated:** August 29, 2026  
**Test Suite Version:** 1.0.0  
**Coverage:** 80% (12/15 scenarios)
