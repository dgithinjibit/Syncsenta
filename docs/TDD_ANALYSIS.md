# TDD Analysis — Studio Codebase

*Test-Driven Development assessment for SyncSenta Studio*  
*Generated: September 2, 2026*

---

## Executive Summary

**Current test coverage:** ~15% of critical business logic  
**Priority gaps:** Omega decision engine, subject session flow, Supabase integration  
**Recommendation:** Implement TDD for new features; retrofit tests for high-risk modules

**September 8, 2026 progress:** The Omega decision-engine suite is present in
`src/lib/__tests__/omega-decision.test.ts`, and the MeTTa knowledge graph/session
contract suite is implemented in `src/lib/__tests__/metta-core.test.ts`. The new
MeTTa tests cover seeded CBC knowledge, cultural adaptation matching, additive
knowledge insertion, session isolation facts, and activity-progress processing.

---

## Existing Test Coverage

### ✅ Currently tested (15 test files)

| Test file | Module | Status |
|---|---|---|
| `socratic-prompts.test.ts` | Compass prompt builder | ✓ Golden tests |
| `socratic-history.test.ts` | Chat history persistence | ✓ |
| `curriculum-activities-mapper.test.ts` | Activity catalog | ✓ |
| `adaptive-question-bridge.test.ts` | Rust service bridge | ✓ |
| `emotional-intelligence.test.ts` | EI detection | ✓ |
| `sandbox-*.test.ts` (7 files) | Sandbox runtime | ✓ |
| `student-learning-loop.test.ts` | Learning loop | ✓ |
| `teacher-reflection-evidence.test.ts` | Teacher feedback | ✓ |
| `reflection-evidence-delivery.test.ts` | Evidence delivery | ✓ |

**Strength:** Sandbox runtime and teacher tools have decent coverage.

---

## Critical Gaps (High Priority)

### ✅ Priority 1: Omega Decision Engine

**Module:** `lib/omega-agent/metta-core.ts`  
**Function:** `evaluateTutoringDecision()`  
**Risk:** Core tutoring logic, thresholds must match Rust implementation  
**Current tests:** `src/lib/__tests__/omega-decision.test.ts` — branch, boundary, and edge-case coverage implemented.

**Required test cases:**

```typescript
describe('evaluateTutoringDecision', () => {
  describe('Intensive scaffolding', () => {
    it('triggers when mastery < 40%', () => {
      const state = {
        attempts: 10,
        correctAttempts: 3,  // 30%
        hintsUsed: 0,
        frustrationSignal: false,
      };
      expect(evaluateTutoringDecision(state).scaffolding).toBe('Intensive');
    });

    it('triggers when hintsUsed >= 2', () => {
      const state = {
        attempts: 10,
        correctAttempts: 8,  // 80% mastery
        hintsUsed: 2,
        frustrationSignal: false,
      };
      expect(evaluateTutoringDecision(state).scaffolding).toBe('Intensive');
    });

    it('triggers when frustrationSignal is true', () => {
      const state = {
        attempts: 10,
        correctAttempts: 9,  // 90% mastery
        hintsUsed: 0,
        frustrationSignal: true,
      };
      expect(evaluateTutoringDecision(state).scaffolding).toBe('Intensive');
    });

    it('returns appropriate hint for Intensive', () => {
      const state = {
        attempts: 10,
        correctAttempts: 2,
        hintsUsed: 0,
        frustrationSignal: false,
      };
      const decision = evaluateTutoringDecision(state);
      expect(decision.hint).toContain('small step');
      expect(decision.nextAction).toBe('show_conceptual_example');
    });
  });

  describe('Guided scaffolding', () => {
    it('triggers when no attempts yet', () => {
      const state = {
        attempts: 0,
        correctAttempts: 0,
        hintsUsed: 0,
        frustrationSignal: false,
      };
      expect(evaluateTutoringDecision(state).scaffolding).toBe('Guided');
    });

    it('triggers when 40% <= mastery < 80%', () => {
      const state = {
        attempts: 10,
        correctAttempts: 6,  // 60%
        hintsUsed: 0,
        frustrationSignal: false,
      };
      expect(evaluateTutoringDecision(state).scaffolding).toBe('Guided');
    });

    it('returns appropriate hint for Guided', () => {
      const state = {
        attempts: 5,
        correctAttempts: 3,
        hintsUsed: 0,
        frustrationSignal: false,
      };
      const decision = evaluateTutoringDecision(state);
      expect(decision.hint).toContain('What do you notice');
      expect(decision.nextAction).toBe('ask_guiding_question');
    });
  });

  describe('Independent scaffolding', () => {
    it('triggers when mastery >= 80%', () => {
      const state = {
        attempts: 10,
        correctAttempts: 8,  // 80%
        hintsUsed: 0,
        frustrationSignal: false,
      };
      expect(evaluateTutoringDecision(state).scaffolding).toBe('Independent');
    });

    it('triggers when mastery is 100%', () => {
      const state = {
        attempts: 10,
        correctAttempts: 10,  // 100%
        hintsUsed: 0,
        frustrationSignal: false,
      };
      expect(evaluateTutoringDecision(state).scaffolding).toBe('Independent');
    });

    it('returns appropriate hint for Independent', () => {
      const state = {
        attempts: 10,
        correctAttempts: 9,
        hintsUsed: 0,
        frustrationSignal: false,
      };
      const decision = evaluateTutoringDecision(state);
      expect(decision.hint).toContain('independently');
      expect(decision.nextAction).toBe('present_next_challenge');
    });
  });

  describe('Boundary conditions', () => {
    it('handles exactly 40% mastery (should be Guided)', () => {
      const state = {
        attempts: 10,
        correctAttempts: 4,  // 40%
        hintsUsed: 0,
        frustrationSignal: false,
      };
      expect(evaluateTutoringDecision(state).scaffolding).toBe('Guided');
    });

    it('handles exactly 80% mastery (should be Independent)', () => {
      const state = {
        attempts: 10,
        correctAttempts: 8,  // 80%
        hintsUsed: 0,
        frustrationSignal: false,
      };
      expect(evaluateTutoringDecision(state).scaffolding).toBe('Independent');
    });

    it('handles exactly 1 hint used (should not trigger Intensive)', () => {
      const state = {
        attempts: 10,
        correctAttempts: 9,
        hintsUsed: 1,
        frustrationSignal: false,
      };
      expect(evaluateTutoringDecision(state).scaffolding).toBe('Independent');
    });

    it('handles exactly 2 hints used (should trigger Intensive)', () => {
      const state = {
        attempts: 10,
        correctAttempts: 9,
        hintsUsed: 2,
        frustrationSignal: false,
      };
      expect(evaluateTutoringDecision(state).scaffolding).toBe('Intensive');
    });
  });

  describe('Edge cases', () => {
    it('handles zero attempts safely', () => {
      const state = {
        attempts: 0,
        correctAttempts: 0,
        hintsUsed: 0,
        frustrationSignal: false,
      };
      const decision = evaluateTutoringDecision(state);
      expect(decision.scaffolding).toBe('Guided');
      expect(decision).toHaveProperty('hint');
      expect(decision).toHaveProperty('nextAction');
    });

    it('never divides by zero when calculating mastery', () => {
      const state = {
        attempts: 0,
        correctAttempts: 5,  // Invalid state, but should not crash
        hintsUsed: 0,
        frustrationSignal: false,
      };
      expect(() => evaluateTutoringDecision(state)).not.toThrow();
    });
  });
});
```

**Implementation file:** `studio/src/lib/__tests__/omega-decision.test.ts`

---

### 🔴 Priority 2: Dynamic System Prompt Builder

**Module:** `lib/subject-session.ts`  
**Function:** `buildDynamicSystemPrompt()`  
**Risk:** System prompt construction, scaffolding instruction injection  
**Current tests:** **NONE**

**Required test cases:**

```typescript
describe('buildDynamicSystemPrompt', () => {
  it('injects correct scaffolding instructions for Independent level', () => {
    const prompt = buildDynamicSystemPrompt({
      grade: 'grade-6',
      subject: 'mathematics',
      language: 'english',
      scaffolding: 'Independent',
      studentName: 'John',
    });

    expect(prompt).toContain('Ask open-ended questions');
    expect(prompt).toContain('Do NOT give the answer');
    expect(prompt).toContain('John');
    expect(prompt).toContain('Grade 6');
    expect(prompt).toContain('Mathematics');
  });

  it('injects correct scaffolding instructions for Guided level', () => {
    const prompt = buildDynamicSystemPrompt({
      grade: 'grade-3',
      subject: 'kiswahili',
      language: 'mixed',
      scaffolding: 'Guided',
      studentName: 'Mary',
    });

    expect(prompt).toContain('Ask ONE guiding question per turn');
    expect(prompt).toContain('Acknowledge what is correct before redirecting');
    expect(prompt).not.toContain('Do NOT give the answer');
  });

  it('injects correct scaffolding instructions for Intensive level', () => {
    const prompt = buildDynamicSystemPrompt({
      grade: 'grade-2',
      subject: 'english',
      language: 'english',
      scaffolding: 'Intensive',
      studentName: 'Peter',
    });

    expect(prompt).toContain('smallest possible step');
    expect(prompt).toContain('concrete Kenyan examples');
    expect(prompt).toContain('matatus');
  });

  it('includes hint when scaffolding is Intensive', () => {
    const prompt = buildDynamicSystemPrompt({
      grade: 'grade-4',
      subject: 'mathematics',
      language: 'english',
      scaffolding: 'Intensive',
      hint: 'Focus on the numerator first',
      studentName: 'Jane',
    });

    expect(prompt).toContain('Focus on the numerator first');
  });

  it('does not include hint when scaffolding is not Intensive', () => {
    const prompt = buildDynamicSystemPrompt({
      grade: 'grade-4',
      subject: 'mathematics',
      language: 'english',
      scaffolding: 'Guided',
      hint: 'This should not appear',
      studentName: 'Jane',
    });

    expect(prompt).not.toContain('This should not appear');
  });

  it('adapts language style for english mode', () => {
    const prompt = buildDynamicSystemPrompt({
      grade: 'grade-5',
      subject: 'english',
      language: 'english',
      scaffolding: 'Guided',
      studentName: 'David',
    });

    expect(prompt).toContain('English');
    expect(prompt).not.toContain('Kiswahili');
  });

  it('adapts language style for mixed mode', () => {
    const prompt = buildDynamicSystemPrompt({
      grade: 'grade-5',
      subject: 'mathematics',
      language: 'mixed',
      scaffolding: 'Guided',
      studentName: 'Sarah',
    });

    expect(prompt).toContain('mixed');
    // Should allow both languages
  });

  it('includes grade-appropriate register for Grade 1-3', () => {
    const prompt = buildDynamicSystemPrompt({
      grade: 'grade-2',
      subject: 'mathematics',
      language: 'english',
      scaffolding: 'Guided',
      studentName: 'Tom',
    });

    expect(prompt).toContain('Grade 2');
    // Should use simpler language
  });

  it('includes grade-appropriate register for Grade 7-9', () => {
    const prompt = buildDynamicSystemPrompt({
      grade: 'grade-8',
      subject: 'mathematics',
      language: 'english',
      scaffolding: 'Independent',
      studentName: 'Alice',
    });

    expect(prompt).toContain('Grade 8');
    // Can use more technical terms
  });
});
```

**Implementation file:** `studio/src/lib/__tests__/dynamic-prompt.test.ts`

---

### 🔴 Priority 3: Subject XP Calculation

**Module:** `lib/subject-session.ts`  
**Function:** `getSubjectXP()`, level calculation  
**Risk:** XP integrity, student progression  
**Current tests:** **NONE**

**Required test cases:**

```typescript
describe('getSubjectXP', () => {
  it('fetches total XP for a subject', async () => {
    // Mock Supabase response
    const xp = await getSubjectXP('user-123', 'mathematics');
    expect(xp).toBeGreaterThanOrEqual(0);
  });

  it('returns 0 for new subject with no XP', async () => {
    const xp = await getSubjectXP('new-user', 'blockchain');
    expect(xp).toBe(0);
  });

  it('aggregates XP from multiple competencies', async () => {
    // Test that XP from different competency_codes sums correctly
  });
});

describe('calculateLevel', () => {
  it('returns level 1 for 0-99 XP', () => {
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(50)).toBe(1);
    expect(calculateLevel(99)).toBe(1);
  });

  it('returns level 2 for 100-199 XP', () => {
    expect(calculateLevel(100)).toBe(2);
    expect(calculateLevel(150)).toBe(2);
    expect(calculateLevel(199)).toBe(2);
  });

  it('returns level 10 for 900+ XP (cap)', () => {
    expect(calculateLevel(900)).toBe(10);
    expect(calculateLevel(1500)).toBe(10);
  });

  it('handles negative XP gracefully', () => {
    expect(calculateLevel(-10)).toBe(1);
  });
});
```

**Implementation file:** `studio/src/lib/__tests__/subject-xp.test.ts`

---

### 🔴 Priority 4: Redis Session Persistence

**Module:** `lib/session-persistence.ts`  
**Functions:** `getLearningSession()`, `updateLearningSession()`  
**Risk:** Cross-device continuity, data loss  
**Current tests:** **NONE**

**Required test cases:**

```typescript
describe('session-persistence', () => {
  describe('getLearningSession', () => {
    it('returns null for user with no session', async () => {
      const session = await getLearningSession('no-session-user');
      expect(session).toBeNull();
    });

    it('returns existing session', async () => {
      // Mock Redis response
      const session = await getLearningSession('user-123');
      expect(session).toHaveProperty('currentActivity');
      expect(session).toHaveProperty('preferences');
    });

    it('handles Redis connection failure gracefully', async () => {
      // Mock Redis error
      await expect(getLearningSession('user-123')).resolves.toBeNull();
    });
  });

  describe('updateLearningSession', () => {
    it('creates new session if none exists', async () => {
      const result = await updateLearningSession('new-user', {
        currentActivity: { id: 'act-1', name: 'Fractions', progress: 50 },
      });
      expect(result).toBe(true);
    });

    it('updates existing session', async () => {
      const result = await updateLearningSession('user-123', {
        preferences: { scaffoldingLevel: 'Intensive' },
      });
      expect(result).toBe(true);
    });

    it('merges partial updates with existing data', async () => {
      // Should not overwrite unspecified fields
    });

    it('sets TTL to 7 days', async () => {
      // Verify Redis TTL is set correctly
    });
  });
});
```

**Implementation file:** `studio/src/lib/__tests__/session-persistence.test.ts`

---

## Medium Priority Gaps

### 🟡 Priority 5: Supabase Helpers

**Modules:**
- `lib/supabase/client.ts`
- `lib/supabase/route-handler.ts`
- `lib/supabase/server.ts`

**Risk:** Auth bypass, data leakage  
**Current tests:** **NONE**

**Required:**
- Cookie handling verification
- RLS policy compliance
- Service role isolation

---

### 🟡 Priority 6: Chat History Persistence

**Module:** `lib/chat-history-supabase.ts`  
**Functions:** `getOrCreateChatSession()`, `addChatMessage()`, `getChatMessages()`  
**Risk:** Message loss, session corruption  
**Current tests:** **NONE**

---

### 🟡 Priority 7: Rate Limiting

**Module:** `lib/rate-limit-upstash.ts`  
**Risk:** DOS vulnerability, cost overrun  
**Current tests:** **NONE**

---

## Low Priority (Defer)

### Components
- UI components (unless complex state logic)
- Layout components
- Simple data transformations

### Utilities
- Formatting functions (already visually testable)
- Constants and type definitions

---

## TDD Workflow for New Features

### Red → Green → Refactor Loop

**Example: Adding a new scaffolding level "Review"**

#### 1. Red (Write failing test first)

```typescript
// lib/__tests__/omega-decision.test.ts
it('triggers Review scaffolding when mastery 60-70% and > 5 days since last practice', () => {
  const state = {
    attempts: 10,
    correctAttempts: 7,  // 70%
    hintsUsed: 0,
    frustrationSignal: false,
    daysSinceLastPractice: 6,
  };
  expect(evaluateTutoringDecision(state).scaffolding).toBe('Review');
});
```

**Run:** `npx vitest run lib/__tests__/omega-decision.test.ts`  
**Expected:** Test fails (Red)

#### 2. Green (Minimal implementation)

```typescript
// lib/omega-agent/metta-core.ts
export function evaluateTutoringDecision(state: {
  attempts: number;
  correctAttempts: number;
  hintsUsed: number;
  frustrationSignal: boolean;
  daysSinceLastPractice?: number;
}): TutoringDecision {
  const masteryPct = state.attempts === 0 ? 0 : Math.round((state.correctAttempts / state.attempts) * 100);

  // New Review branch
  if (
    masteryPct >= 60 &&
    masteryPct < 70 &&
    (state.daysSinceLastPractice ?? 0) > 5
  ) {
    return {
      scaffolding: 'Review',
      hint: 'Let\'s review what you learned before. Can you remember the steps?',
      nextAction: 'present_review_challenge',
    };
  }

  // Existing logic...
  if (state.frustrationSignal || state.hintsUsed >= 2 || masteryPct < 40) {
    return {
      scaffolding: 'Intensive',
      hint: 'Let us take one small step together.',
      nextAction: 'show_conceptual_example',
    };
  }

  // ... rest of function
}
```

**Run:** `npx vitest run lib/__tests__/omega-decision.test.ts`  
**Expected:** Test passes (Green)

#### 3. Refactor (Optional cleanup)

- Extract `calculateMasteryPercent()` helper
- Add JSDoc comments
- Update type definitions

**Run tests again:** All green  
**Commit:** `feat: add Review scaffolding level for spaced repetition`

---

## Test Seams (Where to Test)

**Agreed seams for this project:**

| Seam | What to test | Example module |
|---|---|---|
| **Pure functions** | Input → Output | `evaluateTutoringDecision()` |
| **API routes** | Request → Response | `POST /api/chat` |
| **Database queries** | Query builder output | `getSubjectXP()` |
| **Business logic** | Decision trees, calculations | XP/level, Omega thresholds |
| **Integration points** | External service calls | Redis, Supabase, Groq |

**Do NOT test at these seams:**
- React component render output (unless complex state logic)
- Tailwind class application
- shadcn/ui component internals
- Next.js framework internals

---

## Implementation Plan

### Phase 1: Critical Path (Week 1)
1. **Omega decision engine tests** — 2 hours
2. **Dynamic prompt builder tests** — 1.5 hours
3. **Subject XP tests** — 1 hour

### Phase 2: Data Layer (Week 2)
4. **Redis session persistence tests** — 2 hours
5. **Chat history tests** — 1.5 hours
6. **Supabase helper tests** — 2 hours

### Phase 3: Security (Week 3)
7. **Rate limiting tests** — 1 hour
8. **Auth flow tests** — 1.5 hours
9. **Input validation tests** — 1 hour

---

## Running Tests

### All tests
```powershell
cd studio
npx vitest run
```

### Watch mode (development)
```powershell
npx vitest
```

### Single test file
```powershell
npx vitest run src/lib/__tests__/omega-decision.test.ts
```

### Coverage report
```powershell
npx vitest run --coverage
```

---

## Anti-Patterns to Avoid

### ❌ Implementation-coupled tests

```typescript
// BAD - tests internal implementation
it('calls setState with the correct argument', () => {
  const setStateSpy = vi.spyOn(component, 'setState');
  component.handleClick();
  expect(setStateSpy).toHaveBeenCalledWith({ clicked: true });
});
```

```typescript
// GOOD - tests observable behavior
it('marks button as clicked when clicked', () => {
  component.handleClick();
  expect(component.getButtonState()).toBe('clicked');
});
```

### ❌ Tautological tests

```typescript
// BAD - recomputes the same way as the code
it('calculates level correctly', () => {
  const xp = 250;
  const expected = Math.floor(xp / 100) + 1;  // Same logic as implementation
  expect(calculateLevel(xp)).toBe(expected);
});
```

```typescript
// GOOD - uses known correct values
it('calculates level correctly', () => {
  expect(calculateLevel(0)).toBe(1);
  expect(calculateLevel(100)).toBe(2);
  expect(calculateLevel(250)).toBe(3);
  expect(calculateLevel(900)).toBe(10);
});
```

### ❌ Horizontal slicing

```typescript
// BAD - all tests first, then implementation
describe('feature X', () => {
  it('does A', () => { /* test */ });
  it('does B', () => { /* test */ });
  it('does C', () => { /* test */ });
});
// ... then implement all at once
```

```typescript
// GOOD - vertical slicing (one test, one implementation)
describe('feature X', () => {
  it('does A', () => { /* test */ });
});
// Implement A
// Commit

describe('feature X', () => {
  it('does B', () => { /* test */ });
});
// Implement B
// Commit
```

---

## Success Criteria

**By end of Phase 1:**
- Omega decision engine has 100% branch coverage
- All boundary conditions tested
- Thresholds verified against Rust implementation

**By end of Phase 2:**
- Data persistence functions have integration tests
- Error handling verified
- TTL and expiry logic covered

**By end of Phase 3:**
- Security functions have edge case coverage
- Rate limiting tested under load simulation
- Auth bypass attempts detected

**Overall goal:** 80% coverage of critical business logic by end of Phase 3

---

## References

- **TDD Skill:** `.kiro/skills/tdd.md`
- **Vitest docs:** https://vitest.dev/
- **Testing Library:** https://testing-library.com/
- **Rust source of truth:** `rust-core/src/agent_runtime.rs`

---

*This document is a living artifact. Update it as seams change, new modules are added, or test coverage improves.*
