# Coding Standards — Studio

*Conventions for the Studio codebase (`studio/`). Last updated: September 2026.*

These standards ensure consistency, maintainability, and clarity across the
Studio Next.js application. Follow them for all new code and refactoring.

---

## File and directory organization

### Naming conventions

| Item | Convention | Example |
|---|---|---|
| React components | PascalCase | `SubjectChat.tsx`, `InteractiveSandbox.tsx` |
| Utility files | kebab-case | `subject-session.ts`, `chat-history-supabase.ts` |
| API routes | kebab-case | `route.ts` in `api/chat/`, `api/session/sync/` |
| Test files | Match source + `.test.ts` | `socratic-prompts.test.ts` |
| Type definition files | kebab-case + `.types.ts` | `sandbox-types.ts`, `curriculum-types.ts` |

### Directory structure

```
src/
├── app/                  # Next.js 16 App Router pages
│   ├── student/          # Student-facing routes
│   ├── teacher/          # Teacher-facing routes
│   ├── api/              # API route handlers
│   └── (auth)/           # Route groups for layout organization
├── components/           # React components
│   ├── student/          # Student-specific components
│   ├── teacher/          # Teacher-specific components
│   └── ui/               # shadcn/ui primitives
├── lib/                  # Business logic, utilities, integrations
│   ├── omega-agent/      # Omega decision engine
│   ├── supabase/         # Supabase client helpers
│   └── __tests__/        # Unit tests for lib modules
├── curriculum/           # Student activity data (PP1–Grade 6)
└── data/                 # Static data
    └── curriculum/       # Teacher tool CBC data (PP1–Grade 9)
```

**Rule:** Do not create parallel structures. If a component serves both students
and teachers, place it in `components/` root or create a `components/shared/`
directory.

---

## TypeScript

### General rules

1. **Always use TypeScript.** No `.js` or `.jsx` files in `studio/src/`.
2. **Prefer explicit types over `any`.** Use `unknown` when the type is truly unknown.
3. **Use `interface` for object shapes, `type` for unions, intersections, and
   utility types.**

### Type definitions

**Export types from the module that owns them:**

```typescript
// lib/subject-session.ts
export interface SubjectInfo {
  slug: string;
  label: string;
  layout: 'chat' | 'sandbox';
  grade: string;
}

export const SUBJECT_REGISTRY: Record<string, SubjectInfo> = { ... };
```

**Create dedicated `.types.ts` files for shared types:**

```typescript
// lib/sandbox-types.ts
export interface Activity {
  id: string;
  title: string;
  type: 'canvas' | 'worksheet';
}
```

### Function signatures

**Use explicit return types for exported functions:**

```typescript
// ✅ Good
export async function getSubjectXP(userId: string, subject: string): Promise<number> {
  // ...
}

// ❌ Avoid
export async function getSubjectXP(userId: string, subject: string) {
  // Return type inferred — harder to catch breaking changes
}
```

### Enums vs union types

**Prefer string literal unions over enums:**

```typescript
// ✅ Good
type ScaffoldingLevel = 'Independent' | 'Guided' | 'Intensive';

// ❌ Avoid
enum ScaffoldingLevel {
  Independent = 'Independent',
  Guided = 'Guided',
  Intensive = 'Intensive',
}
```

Unions are simpler, tree-shakeable, and work better with TypeScript's type narrowing.

---

## React components

### Component structure

**Order:**

1. Imports (external → internal → types)
2. Type definitions
3. Component function
4. Helper functions (if not extracted to utils)
5. Default export

**Example:**

```typescript
// External imports
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Internal imports
import { SubjectHeader } from '@/components/student/subject-header';
import { getSubjectXP } from '@/lib/subject-session';

// Types
interface SubjectPageProps {
  params: { slug: string };
}

// Component
export default function SubjectPage({ params }: SubjectPageProps) {
  const [xp, setXp] = useState(0);
  const router = useRouter();

  useEffect(() => {
    // ...
  }, []);

  return (
    <div>
      <SubjectHeader xp={xp} />
    </div>
  );
}
```

### Naming

- **Components:** PascalCase
- **Props interfaces:** `{ComponentName}Props`
- **Event handlers:** `handle{Action}` (e.g., `handleSubmit`, `handleClick`)

### Props

**Always define props with an interface:**

```typescript
interface SubjectChatProps {
  sessionId: string;
  subject: string;
  grade: string;
  onMessageSent?: () => void;
}

export function SubjectChat({ sessionId, subject, grade, onMessageSent }: SubjectChatProps) {
  // ...
}
```

**Use optional chaining and default values:**

```typescript
function MyComponent({ config }: { config?: Config }) {
  const timeout = config?.timeout ?? 5000; // ✅ Safe with default
}
```

### State management

**Use local state for UI-only concerns:**

```typescript
const [isOpen, setIsOpen] = useState(false);
```

**Use server state libraries for data fetching:**

For now, we use manual `fetch` + `useEffect`. Future: consider React Query.

**Avoid prop drilling beyond 2 levels.** Extract to context or lift state higher.

---

## API routes

### File structure

All API routes live in `src/app/api/` and export Next.js route handlers:

```typescript
// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // ...
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Request validation

**Use Zod for request body validation:**

```typescript
import { z } from 'zod';

const chatRequestSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().uuid().optional(),
  grade: z.string(),
  subject: z.string(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = chatRequestSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { message, sessionId, grade, subject } = parsed.data;
  // ...
}
```

### Error handling

**Always catch and log errors:**

```typescript
try {
  // operation
} catch (error) {
  console.error('Context about what failed:', error);
  return NextResponse.json(
    { error: 'User-facing message' },
    { status: 500 }
  );
}
```

**Never expose internal error details to the client in production.**

### Authentication

**Check auth early:**

```typescript
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Proceed with authorized operation
}
```

---

## Supabase integration

### Client selection

| Context | Helper | When to use |
|---|---|---|
| Client component | `lib/supabase/client.ts` | Browser-side operations, RLS applies |
| Server component | `lib/supabase/server.ts` | Cookie-aware server rendering |
| API route | `lib/supabase/route-handler.ts` | Route handlers, cookie-aware |
| Admin operations | `lib/supabase/server.ts` (service role) | Bypass RLS, trusted operations only |

**Example:**

```typescript
// Client component
import { createBrowserClient } from '@/lib/supabase/client';

export function MyClientComponent() {
  const supabase = createBrowserClient();
  // ...
}

// API route
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';

export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient();
  const { data } = await supabase.from('profiles').select('*');
  // ...
}
```

### Query patterns

**Use specific selects, not `select('*')`:**

```typescript
// ✅ Good
const { data } = await supabase
  .from('chat_sessions')
  .select('id, subject, grade, created_at')
  .eq('user_id', userId);

// ❌ Avoid
const { data } = await supabase
  .from('chat_sessions')
  .select('*')
  .eq('user_id', userId);
```

**Handle errors explicitly:**

```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('id, full_name')
  .eq('id', userId)
  .single();

if (error) {
  console.error('Failed to fetch profile:', error);
  throw new Error('Profile not found');
}

// Now data is guaranteed non-null
console.log(data.full_name);
```

---

## Environment variables

### Naming

- **Public (exposed to browser):** Prefix with `NEXT_PUBLIC_`
- **Server-only:** No prefix

**Example:**

```
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GROQ_API_KEY=...
```

### Validation

**Check required env vars at build time:**

Studio has a build-time check in `scripts/check-env.js`. Required vars:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GROQ_API_KEY`

**Access env vars through a typed helper:**

```typescript
// lib/env.ts
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  groqApiKey: process.env.GROQ_API_KEY!,
} as const;
```

---

## Testing

### Test file location

- Unit tests for `lib/` modules: `lib/__tests__/{module-name}.test.ts`
- Component tests: colocate in `components/__tests__/`
- API route tests: colocate in `api/{route}/route.test.ts`

### Test structure

**Use vitest + testing-library:**

```typescript
import { describe, it, expect } from 'vitest';
import { evaluateTutoringDecision } from '../omega-agent/metta-core';

describe('evaluateTutoringDecision', () => {
  it('returns Intensive when mastery < 40%', () => {
    const state = {
      attempts: 10,
      correctAttempts: 3,
      hintsUsed: 0,
      frustrationSignal: false,
    };

    const decision = evaluateTutoringDecision(state);
    expect(decision.scaffolding).toBe('Intensive');
  });

  it('returns Guided when mastery is between 40% and 80%', () => {
    const state = {
      attempts: 10,
      correctAttempts: 6,
      hintsUsed: 0,
      frustrationSignal: false,
    };

    const decision = evaluateTutoringDecision(state);
    expect(decision.scaffolding).toBe('Guided');
  });
});
```

### What to test

**High priority:**
- Pure functions with business logic (Omega decision engine, XP calculation)
- API route input validation (Zod schemas)
- Database query builders

**Low priority (defer until needed):**
- UI component rendering (unless complex conditional logic)
- Simple data transformations

### Running tests

```powershell
npx vitest run        # All tests once (CI mode)
npx vitest            # Watch mode
npx vitest run path/to/test.ts  # Single test file
```

---

## Git practices

### Commit messages

**Format:** `<type>: <short description>`

**Types:**
- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation only
- `chore` — tooling, dependencies, cleanup
- `refactor` — code change without behavior change
- `test` — add or update tests

**Examples:**

```
feat: add subject XP tracking to student dashboard
fix: prevent double-submit in chat input
docs: update ARCHITECTURE.md with Omega flow
chore: remove duplicate SQL migrations
```

### Branch strategy

Currently single-branch (`main`). If you need a feature branch:

1. Branch from `main`
2. Name: `feature/short-description` or `fix/issue-description`
3. Merge back to `main` via PR or direct merge

### What not to commit

- `.env.local` (contains secrets)
- `node_modules/`
- `.next/` (build output)
- Any file with API keys, tokens, or passwords

**Always review `git status` before committing.**

---

## Code style

### Formatting

**Use Prettier (already configured):**

```powershell
npm run format   # Format all files
```

Configuration in `.prettierrc` or `package.json`. Commit formatted code only.

### Imports

**Order:**
1. External packages (React, Next.js, third-party)
2. Internal absolute imports (`@/components`, `@/lib`)
3. Relative imports (`./`, `../`)
4. Type-only imports last

**Example:**

```typescript
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getSubjectXP } from '@/lib/subject-session';
import { SubjectHeader } from './subject-header';
import type { SubjectInfo } from '@/lib/subject-session';
```

### Line length

**Soft limit: 80–100 characters.** Break long lines for readability.

### Comments

**Write comments for "why", not "what":**

```typescript
// ✅ Good
// Omega decision must run before LLM call to compute scaffolding level
const decision = await evaluateTutoringDecision(learningState);

// ❌ Avoid
// Call evaluateTutoringDecision
const decision = await evaluateTutoringDecision(learningState);
```

**Document complex logic:**

```typescript
/**
 * Computes scaffolding level based on student mastery data.
 * 
 * Thresholds:
 * - Intensive: mastery < 40% OR hintsUsed >= 2 OR frustrated
 * - Guided: 40% <= mastery < 80% OR no attempts yet
 * - Independent: mastery >= 80%
 * 
 * Must stay synchronized with Rust implementation in rust-core/src/agent_runtime.rs
 */
export function evaluateTutoringDecision(state: LearningState): TutoringDecision {
  // ...
}
```

---

## Performance

### Database queries

**Fetch only what you need:**

```typescript
// ✅ Good
const { data } = await supabase
  .from('chat_messages')
  .select('id, content, role')
  .eq('session_id', sessionId)
  .order('created_at', { ascending: false })
  .limit(40);

// ❌ Avoid
const { data } = await supabase
  .from('chat_messages')
  .select('*')
  .eq('session_id', sessionId);
```

**Use indexes for frequently queried columns.** Check migrations for index definitions.

### React rendering

**Memoize expensive computations:**

```typescript
import { useMemo } from 'react';

function StudentDashboard({ sessions }: { sessions: Session[] }) {
  const totalXP = useMemo(
    () => sessions.reduce((sum, s) => sum + s.xp, 0),
    [sessions]
  );

  return <div>Total XP: {totalXP}</div>;
}
```

**Avoid inline object/array creation in render:**

```typescript
// ❌ Avoid (creates new object on every render)
<SubjectChat config={{ timeout: 5000 }} />

// ✅ Good
const chatConfig = { timeout: 5000 };
<SubjectChat config={chatConfig} />
```

---

## Security

### Authentication

**Always verify user identity in API routes:**

```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Use RLS policies for data access control.** Do not rely solely on application logic.

### Input validation

**Validate all user input with Zod before processing:**

```typescript
const schema = z.object({
  message: z.string().min(1).max(5000),
  subject: z.enum(['mathematics', 'english', 'kiswahili', /* ... */]),
});

const parsed = schema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
}
```

### Secrets

**Never log secrets:**

```typescript
// ❌ NEVER
console.log('API key:', process.env.GROQ_API_KEY);

// ✅ Good
console.log('Using Groq provider');
```

**Never expose server-only env vars to the client.**

---

## Documentation

### When to update docs

Update documentation **in the same commit** when you change:

- API route contracts (request/response shape)
- Environment variables (add, remove, or change required vars)
- Database schema (migrations)
- Deployment configuration
- Core algorithms (Omega thresholds, XP calculation)

### Which docs to update

| Change type | Update these docs |
|---|---|
| API route contract | `docs/ARCHITECTURE.md`, inline JSDoc |
| Env var | `docs/DEVELOPMENT.md`, `.env.example` |
| Omega thresholds | `docs/ARCHITECTURE.md`, `studio/docs/SOCRATIC_MENTOR_SPEC.md`, inline comment |
| Database schema | Migration file comment, `docs/ARCHITECTURE.md` (if major) |
| New feature | `README.md` (if user-facing), `SYNCSENTA_IMPLEMENTATION.lore.ai` |

---

## Common patterns

### Fetching subject XP

```typescript
import { getSubjectXP } from '@/lib/subject-session';

const xp = await getSubjectXP(userId, subject);
const level = Math.floor(xp / 100) + 1;
```

### Creating a chat session

```typescript
import { getOrCreateChatSession } from '@/lib/chat-history-supabase';

const session = await getOrCreateChatSession({
  userId,
  subject,
  grade,
  mode: 'socratic',
});
```

### Reading/writing Redis session

```typescript
import { getLearningSession, updateLearningSession } from '@/lib/session-persistence';

// Read
const session = await getLearningSession(userId);

// Write
await updateLearningSession(userId, {
  currentActivity: { id: 'activity-123', name: 'Fractions', progress: 50 },
  preferences: { scaffoldingLevel: 'Guided' },
});
```

### Streaming SSE from API route

```typescript
const encoder = new TextEncoder();
const stream = new ReadableStream({
  async start(controller) {
    for (const chunk of response) {
      const sseData = `data: ${JSON.stringify({ delta: chunk })}\n\n`;
      controller.enqueue(encoder.encode(sseData));
    }
    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
    controller.close();
  },
});

return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  },
});
```

---

## Reference

- **TypeScript:** https://www.typescriptlang.org/docs/
- **Next.js 16:** https://nextjs.org/docs
- **Supabase:** https://supabase.com/docs
- **shadcn/ui:** https://ui.shadcn.com/
- **Vitest:** https://vitest.dev/
- **Zod:** https://zod.dev/

For architecture and development setup, see:
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- [CONTEXT.md](CONTEXT.md)
