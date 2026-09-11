# SyncSenta Development Tasks

*Last updated: September 11, 2026*

## Overview

This document tracks the critical path to production readiness, prioritized by impact and risk. It includes:
- Red flags for agent-native coding (from code review)
- Completion breakdown template (for future codebases)
- Teacher feedback loop (both schemes and Omega thresholds)
- Task breakdown with dependencies

---

## Part 1: Red Flags for Agent-Native Coding

When coding agents work on this repo, watch for these patterns:

### 🚩 Import Barrel Anti-Pattern

**Problem:** Deprecated re-export shims create build failures.

```typescript
// ❌ BAD: lib/agentTrace.ts (just a shim)
export * from './telemetry/agentTrace';

// But route imports it as:
import agentTrace, { AgentTracePayload, ... } from '../../../../lib/agentTrace';
// FAILS: no default export
```

**Fix:**
- Comment out or delete shims immediately after refactor
- Update all call sites to import directly from new path
- Add ESLint rule to prevent shims from being committed

**Prevention:**
- Agents: Always search for `export * from` and verify callers have been updated
- Use exact paths in imports, never shims

---

### 🚩 Duplicate Implementations Without Sync Enforcement

**Problem:** TypeScript + Rust versions of Omega thresholds can drift.

```typescript
// lib/omega-agent/metta-core.ts (TypeScript, ACTIVE)
const INTENSIVE_MASTERY_MAX = 40;
const INTENSIVE_HINTS_MIN = 2;

// rust-core/src/agent_runtime.rs (Rust, NOT DEPLOYED but claims to be source of truth)
// If someone updates Rust and forgets to sync TS, thresholds drift.
```

**Fix:**
- Rust service is NOT deployed. Comment out as inactive.
- TypeScript is the active source of truth.
- CI script (`scripts/check-omega-thresholds.mjs`) enforces sync if Rust is ever deployed.

**Prevention:**
- Agents: Search for `OMEGA_THRESHOLDS`, `decide_tutoring`, `SYNCSENTA_RUST_ADAPTIVE_URL`
- If found with Rust: require CI check before merging
- If Rust is truly unused: comment out or archive

---

### 🚩 Hybrid AI Patterns Without Contract

**Problem:** Multiple AI paths (Omega, FastAPI agents, LangGraph, direct Groq calls) with no unified error handling.

```typescript
// Omega path: TS decision engine
const decision = evaluateTutoringDecision(learningState);

// FastAPI path: Teacher generators
const scheme = await fetch(`${NEXT_PUBLIC_AI_AGENTS_URL}/lesson-architect/...`);

// No retry logic, no fallback contract, different error formats.
```

**Fix:**
- Define AI request/response contract (shared types)
- Unified retry + fallback logic
- Test all paths independently, then integration tests

**Prevention:**
- Agents: When adding AI calls, check `lib/ai-contract.ts` first
- If it doesn't exist, create it and reference in all agent code

---

### 🚩 Service-Role Auth Used in Routes Without Verification

**Problem:** `getSupabaseServerClient()` bypasses RLS. If misused, data leaks.

```typescript
// ❌ Dangerous: service role fetches user's private data without RLS check
const supabaseAdmin = getSupabaseServerClient();
const allUserData = await supabaseAdmin.from('profiles').select('*');
```

**Fix:**
- Always use `createServerClient` (cookie-aware) for authenticated routes
- Service role only for trusted operations (RPC, batch inserts, admin tasks)
- Comment why service role is needed

**Prevention:**
- Agents: Grep for `getSupabaseServerClient` + verify the query has `eq('id', authenticatedUser.id)`
- If it doesn't, ask: "Why is this using service role?"

---

### 🚩 Rate Limiting Only on Critical Path

**Problem:** Teacher generators and external API calls unprotected → quota burn.

```typescript
// Protected: /api/chat
await checkChatRateLimit(user.id, tier);

// Unprotected: /api/generate/scheme (teacher calls FastAPI, no limit)
const scheme = await fetch(`${NEXT_PUBLIC_AI_AGENTS_URL}/generate-scheme`, ...);
```

**Fix:**
- Rate limit at middleware: all `/api/generate/*` routes
- Separate tier limits for student chat vs. teacher tools
- Alert on FastAPI quota depletion

**Prevention:**
- Agents: Before creating new external API route, add to rate limit middleware
- Check: `lib/session/rate-limit-upstash.ts` — is your route protected?

---

### 🚩 Test Coverage Gaps on High-Risk Code

**Problem:** Omega thresholds (most critical) have 0% test coverage.

**Fix:** Implement `TDD_ANALYSIS.md` phases:
- Phase 1 (Week 1): Omega + dynamic prompt + XP tests
- Phase 2 (Week 2): Redis + chat history + Supabase helpers
- Phase 3 (Week 3): Rate limiting + auth + validation

**Prevention:**
- Agents: Run `npx vitest run` before every commit
- If coverage drops, PR is blocked
- New features: write test first (Red → Green → Refactor)

---

### 🚩 Dead Code and Aspirational Components

**Problem:** MeTTa infrastructure (2,450 lines) is implemented but unused. Creates cognitive load.

```typescript
// Unused: metta-teacher-dashboard.tsx, metta-student-interface.tsx
// Unused: MeTTaRouter, MeTTaInterpreter (only Omega function is active)
// Misleading: docs claim full MeTTa system is live (it's not)
```

**Fix:**
- Comment "ARCHIVED" at top of unused files
- Add to `.gitignore` or move to `archive/metta-prototype/`
- Update `OMEGA_METTA_STATUS.md` to clarify: "Omega only, MeTTa is archived pending integration decision"

**Prevention:**
- Agents: If you see "TODO" or "not yet used" comments, ask: "Should we delete this?"
- Unused code = technical debt = slower onboarding

---

### 🚩 Environment Variable Drift

**Problem:** Dead env vars mislead developers.

```typescript
// DEVELOPMENT.md mentions this:
// SYNCSENTA_RUST_ADAPTIVE_URL=http://localhost:8091
// But Rust is not deployed. Developers waste time setting it up.
```

**Fix:**
- Audit all env vars against actual usage
- Comment out or remove dead ones
- Add `OPTIONAL:` or `ARCHIVED:` prefix to docs

**Prevention:**
- Agents: Before using `process.env.FOO`, grep the codebase for actual usage
- If it's not used, document why it's there or remove it

---

## Part 2: Completion Breakdown Template

Use this template to assess any GitHub repo for production readiness:

```markdown
## Production Readiness Assessment

### Overall: __% complete. ____ ready for ____.

#### Completion Breakdown by Component

| Component | % | Status | Notes |
|-----------|---|--------|-------|
| Core Feature A | 100% | ✅ Live | Tested, scaled to X |
| Feature B | 75% | ⚠️ Partial | Works, lacks tests |
| Infrastructure C | 50% | ❌ Not ready | Built, not deployed |
| Dead Code | 0% | 🗑️ Archived | Move to archive/ |

#### Critical Holes

| Hole | Risk | Impact | Fix ETA |
|------|------|--------|----------|
| Name | HIGH | Details | 1 week |

#### Red Flags for Agents

- [ ] Import barrels (shims) used as fallback
- [ ] Duplicate implementations without sync enforcement
- [ ] Hybrid AI patterns with no unified contract
- [ ] Service-role auth in user-facing routes
- [ ] Rate limiting only on critical path
- [ ] Zero test coverage on high-risk code
- [ ] Dead code left in main branch
- [ ] Environment variables not documented

#### Production Readiness by Path

| Path | Status | Tested? | Scalability | Caveat |
|------|--------|---------|-------------|--------|
| Path A | ✅ Live | Partial | Good | No load tests |
| Path B | ⚠️ Partial | No | Unknown | Needs tests |

#### Is It Production-Ready?

**For Pilot (100–500 users):** ✅ Yes / ⚠️ With fixes / ❌ No  
**For Soft Launch (500–5,000 users):** ✅ Yes / ⚠️ With fixes / ❌ No  
**For Scale (10,000+ users):** ✅ Yes / ⚠️ With fixes / ❌ No  

#### Priority Roadmap

| Week | Task | Impact | Risk |
|------|------|--------|------|
| 1 | X | High | Low |
```

---

## Part 3: Teacher Feedback Loop (Schemes + Omega Thresholds)

Teachers provide feedback on two fronts:
1. **Scheme feedback:** "This lesson plan order is wrong" → Lesson Architect learns
2. **Omega feedback:** "This student should have gotten Intensive, not Guided" → Thresholds adjust

### Architecture

```
┌─────────────────────┐
│  Teacher Dashboard  │
│ (Phase 2 view)      │
└──────────┬──────────┘
           │ User gives feedback on:
           │ - Generated lesson plan
           │ - Student scaffolding decision
           ▼
┌─────────────────────────────────────┐
│ POST /api/teacher/feedback          │
│ { type, competencyCode, context,    │
│   issue, correction, reasoning }    │
└──────────┬──────────────────────────┘
           │
           ├─→ MeTTa Session (request-scoped)
           │   recordTeacherFeedback()
           │
           └─→ POST to FastAPI
               /teacher/feedback-analysis
               │
               ├─→ Store in Supabase: teacher_feedback table
               ├─→ Query Hyperon/MeTTa for pattern matching
               └─→ Generate patch proposal
                   {
                     type: 'scheme_adjustment' | 'omega_threshold_fix',
                     affectedFile: 'metta-core.ts' | 'lesson-architect.py',
                     diff: "...",
                     rationale: "Teacher feedback: ...",
                     confidence: 0.85,
                   }
               │
               ▼
       ┌──────────────────┐
       │ POST /api/        │
       │ teacher/          │
       │ apply-feedback    │
       └────────┬─────────┘
                │
        (you review & approve)
                │
        approve=true?
                │
        ┌───────┴────────┐
        │ YES            │ NO
        ▼                ▼
   Git commit       Store as
   to feedback-*    rejected
   Run tests        feedback
   If pass:
   merge + redeploy
```

---

## Part 4: Task Breakdown

### Phase 1: Teacher Feedback Capture (This Week)

#### Task 1.1: Create teacher_feedback Supabase Table

**Files to create:**
- `supabase/migrations/20260911_teacher_feedback.sql`

**Schema:**
```sql
CREATE TABLE teacher_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id),
  student_id UUID REFERENCES auth.users(id),
  feedback_type VARCHAR(50) NOT NULL, -- 'scheme' | 'omega_threshold'
  competency_code VARCHAR(120),
  competency_name TEXT,
  current_context JSONB, -- { scaffolding, mastery, hints, attempts }
  issue_description TEXT NOT NULL,
  correction_details TEXT NOT NULL,
  reasoning TEXT,
  patch_proposed JSONB, -- { diff, file, confidence }
  patch_status VARCHAR(20) DEFAULT 'pending', -- pending | approved | rejected | deployed
  patch_deployed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

ALTER TABLE teacher_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can view their own feedback"
  ON teacher_feedback
  FOR SELECT
  USING (auth.uid() = teacher_id OR auth.uid() IN (
    SELECT user_id FROM profiles WHERE role = 'admin'
  ));
```

**Status:** 📝 To be created

---

#### Task 1.2: Create `/api/teacher/feedback` Route

**Files to create:**
- `studio/src/app/api/teacher/feedback/route.ts`

**Functionality:**
```typescript
export async function POST(req: NextRequest) {
  // 1. Auth: verify user is teacher
  // 2. Validate request: ChatRequest schema
  // 3. Store in Supabase: teacher_feedback table
  // 4. Record in MeTTa session boundary
  // 5. POST to FastAPI: /teacher/feedback-analysis
  // 6. Return: proposal + confirmation
}
```

**Response:**
```json
{
  "success": true,
  "feedbackId": "uuid",
  "proposedPatch": {
    "type": "scheme_adjustment" | "omega_threshold_fix",
    "file": "metta-core.ts",
    "diff": "@@ -60,3 +60,3 @@...",
    "rationale": "Teacher feedback: This student should have gotten Intensive...",
    "confidence": 0.85
  },
  "nextStep": "Review and approve patch at /teacher/feedback/{id}/review"
}
```

**Status:** 📝 To be created

---

#### Task 1.3: Add MeTTa Feedback Recording

**Files to modify:**
- `studio/src/lib/omega-agent/metta-core.ts` (MeTTaSession class)

**Add method:**
```typescript
recordTeacherFeedback(feedback: {
  teacherId: string;
  studentId: string;
  type: 'scheme' | 'omega';
  issue: string;
  correction: string;
  reasoning: string;
}): void {
  this.addSessionFact(
    `teacher_feedback(${
      feedback.teacherId}, ${
      feedback.studentId}, ${
      feedback.type}, "${
      feedback.issue}")`
  );
}
```

**Integration in `/api/chat`:**
```typescript
// Line 261, in MeTTa session block:
if (body.feedback) {
  mettaSession.recordTeacherFeedback(body.feedback);
}
```

**Status:** 📝 To be modified

---

### Phase 2: FastAPI Feedback Analysis (Week 2)

#### Task 2.1: Create FastAPI Feedback Handler

**Files to create:**
- `ai-agents/src/syncsenta_agents/api/routes/teacher_feedback.py`

**Router:**
```python
@router.post("/teacher/feedback-analysis")
async def analyze_teacher_feedback(feedback: TeacherFeedbackSchema):
    """
    1. Store feedback in Supabase
    2. Run Hyperon/MeTTa pattern analysis
    3. If scheme feedback: analyze Lesson Architect output
    4. If Omega feedback: compare student context vs thresholds
    5. Generate code patch proposal
    6. Return patch + confidence score
    """
    pass
```

**Status:** 📝 To be created

---

#### Task 2.2: LangGraph Workflow for Patch Generation

**Files to create:**
- `ai-agents/src/syncsenta_agents/workflows/feedback_patch_generator.py`

**Nodes:**
1. `analyze_feedback` — Parse issue, extract patterns
2. `query_metta` — Ask Hyperon: "What rule would fix this?"
3. `compare_thresholds` — If Omega: compare current vs. proposed
4. `generate_code` — Create TypeScript/Python diff
5. `validate_patch` — Ensure it doesn't break tests

**Status:** 📝 To be created

---

### Phase 3: Patch Review & Auto-Deploy (Week 3)

#### Task 3.1: Create `/api/teacher/apply-feedback` Route

**Files to create:**
- `studio/src/app/api/teacher/apply-feedback/route.ts`

**Functionality:**
```typescript
export async function POST(req: NextRequest) {
  const { feedbackId, approve } = await req.json();
  
  if (!approve) {
    // Store rejection reason, return
    return Response.json({ rejected: true });
  }
  
  // If approve:
  // 1. Fetch patch from Supabase
  // 2. Create git branch: omega/feedback-${date}-${competency}
  // 3. Apply patch to file
  // 4. Run: npm run test (validate tests pass)
  // 5. If pass: git commit + git merge to main + trigger Vercel redeploy
  // 6. If fail: store patch as pending_tests_fail, notify
}
```

**Status:** 📝 To be created

---

#### Task 3.2: Git + CI Integration

**Files to create:**
- `scripts/apply-feedback-patch.sh` — Apply patch + run tests + commit
- Update `.github/workflows/feedback-deploy.yml` — Auto-merge if tests pass

**Workflow:**
```bash
#!/bin/bash
# 1. Create branch
git checkout -b omega/feedback-${DATE}-${COMPETENCY}

# 2. Apply patch
patch -p1 < feedback.patch

# 3. Run tests
cd studio
npm run test
if [ $? -eq 0 ]; then
  git commit -m "chore: apply teacher feedback on ${COMPETENCY}"
  git push origin omega/feedback-${DATE}-${COMPETENCY}
  git checkout main
  git merge --ff-only omega/feedback-${DATE}-${COMPETENCY}
  git push origin main
  # Vercel auto-redeploys on main push
fi
```

**Status:** 📝 To be created

---

### Phase 4: Teacher UI (Week 4)

#### Task 4.1: Feedback Submission Form Component

**Files to create:**
- `studio/src/components/teacher/feedback-form.tsx`

**Form fields:**
- Feedback type: "Scheme issue" | "Student scaffolding wrong"
- Competency: dropdown (from current subject)
- Issue description: textarea
- Correction: textarea
- Reasoning: textarea (why this change matters)
- Submit button → POST /api/teacher/feedback

**Status:** 📝 To be created

---

#### Task 4.2: Feedback History & Patch Review View

**Files to create:**
- `studio/src/app/teacher/feedback/page.tsx`
- `studio/src/app/teacher/feedback/[id]/review.tsx`

**Displays:**
- List of all feedback you've submitted
- Patch proposals (pending, approved, rejected, deployed)
- Diff preview with context
- Approve/reject controls
- Deployment status

**Status:** 📝 To be created

---

## Part 5: Omega + Scheme Learning Examples

### Example 1: Scheme Feedback

**Scenario:**
You (teacher) generate a scheme for "Fractions, Grade 4" and notice the activities are in wrong order.

**Feedback:**
```json
{
  "type": "scheme",
  "competencyCode": "G4.MATH.FRACTIONS",
  "issueName": "activity_order_wrong",
  "currentContext": {
    "activities": ["Equivalent fractions", "Add fractions", "Fraction concepts"]
  },
  "correctionDetails": "Concept introduction must come before operations. Should be: 1) Fraction concepts, 2) Equivalent fractions, 3) Add fractions",
  "reasoning": "Students are failing on 'Add fractions' because they don't understand equivalence yet."
}
```

**FastAPI generates patch:**
```python
# ai-agents/src/syncsenta_agents/models/lesson_architect.py

# BEFORE:
ACTIVITY_SEQUENCE_G4_FRACTIONS = [
    "equivalent_fractions",
    "add_fractions_with_like_denominators",
    "fraction_concepts_intro",
]

# AFTER (from teacher feedback):
ACTIVITY_SEQUENCE_G4_FRACTIONS = [
    "fraction_concepts_intro",          # Moved: teach concept first
    "equivalent_fractions",
    "add_fractions_with_like_denominators",
]
```

**Confidence:** 0.92 (pattern matches "teach concept first")

---

### Example 2: Omega Threshold Feedback

**Scenario:**
Student attempted 5 questions, got 3 correct (60% mastery), used 1 hint, not frustrated.
Omega decided: **Guided** (correct per current thresholds).
But student is clearly overwhelmed (nervous behavior, slow response time).

**Feedback:**
```json
{
  "type": "omega_threshold",
  "studentId": "student-456",
  "competencyCode": "G4.MATH.FRACTIONS.ADD",
  "currentScaffolding": "Guided",
  "studentContext": {
    "attempts": 5,
    "correct": 3,
    "hintsUsed": 1,
    "frustrationSignal": false,
    "responseTimeSeconds": 45,  // Slow responses
    "errorPattern": "systematic_misconception"  // Same mistake repeatedly
  },
  "issueName": "frustration_undetected",
  "correctionDetails": "This student shows signs of struggle not captured by frustrationSignal. Should have been Intensive to break down the concept.",
  "reasoning": "Slow response + systematic error pattern suggests cognitive overload. Guided questions aren't helping; needs step-by-step."
}
```

**FastAPI + Hyperon analyzes:**
1. Current rule: Intensive if (frustration OR hintsUsed >= 2 OR mastery < 40)
2. Feedback: Student has mastery 60%, hints 1, no frustration flag → Guided
3. But: response time > 40s suggests struggle
4. Pattern: "systematic_misconception" + slow responses → often needs Intensive
5. Proposed rule addition: "OR responseTimeSeconds > 30 AND errorPattern includes 'systematic'"

**Generated patch:**
```typescript
// studio/src/lib/omega-agent/metta-core.ts

// BEFORE:
if (state.frustrationSignal || state.hintsUsed >= 2 || masteryPct < 40) {
  return { scaffolding: 'Intensive', ... };
}

// AFTER (from teacher feedback):
if (
  state.frustrationSignal ||
  state.hintsUsed >= 2 ||
  masteryPct < 40 ||
  (state.responseTimeSeconds > 30 && state.errorPattern === 'systematic_misconception')
) {
  return { scaffolding: 'Intensive', ... };
}
```

**Confidence:** 0.78 (new signal, needs validation)

---

## Part 6: Running the Full Loop

### Day 1 (You submit feedback)
```
1. Open teacher dashboard
2. Click "Give Feedback" on a scheme or student session
3. Select issue type, fill form, submit
4. See proposed patch with diff
5. Review + approve
6. System runs tests, deploys if green
```

### Day 2 (New behavior is live)
```
1. Log in → Omega uses updated thresholds (if Omega feedback)
2. Lesson Architect generates schemes with new activity ordering (if scheme feedback)
3. No old problems from yesterday
```

---

## Part 7: Safety Guardrails

### Automated Validation
- **Test suite must pass** before merge (TDD_ANALYSIS.md)
- **Threshold comparison:** New Omega rules must not break more than 5% of existing sessions
- **Patch size limit:** No single patch touches >10 files
- **Rate limit:** Max 1 feedback-driven patch per hour (prevent spam)

### Human Review
- **You approve** every patch before deployment
- **Rationale required:** Every patch must have reasoning from teacher
- **Rollback ready:** If new behavior breaks learning outcomes, revert within 1 hour

---

## Part 8: Success Criteria

✅ **By end of Week 1:**
- Feedback capture route works
- MeTTa records teacher feedback
- Supabase table stores feedback

✅ **By end of Week 2:**
- FastAPI analyzes feedback + generates patches
- LangGraph workflow produces code diffs
- Confidence scores are reasonable (0.70+)

✅ **By end of Week 3:**
- Patch review route works
- Git integration auto-commits + merges
- CI validates tests pass before deploy

✅ **By end of Week 4:**
- Teacher UI is intuitive
- Feedback → deployed fix < 30 minutes
- Zero regressions from feedback-driven patches

---

## References

- **Omega engine:** `studio/src/lib/omega-agent/metta-core.ts`
- **MeTTa session:** `studio/src/lib/omega-agent/metta-core.ts` (MeTTaSession class)
- **FastAPI routes:** `ai-agents/src/syncsenta_agents/api/routes/`
- **TDD plan:** `docs/TDD_ANALYSIS.md`
- **Architecture:** `docs/ARCHITECTURE.md`
- **Feedback schema:** (will be defined in Task 1.2)

---

*End of TASKS.md. Update as tasks are completed.*
