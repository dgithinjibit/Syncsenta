/**
 * Active Scheme Context API — currently not backed by any deployed service.
 *
 * This handler used to call `getStudentSchemes()` in `@/lib/scheme-v2-client`,
 * which fetches `${NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/schemes/v2/student/<id>`.
 * That is the Rust MVP backend (`backend/syncsenta-backend`), deployed nowhere:
 * from a Vercel function `http://localhost:8080` is the function's own container,
 * so the call failed for every learner, every time, and the client swallowed it
 * as "no active scheme". The AI prompt then silently lost its curriculum
 * grounding while the code read as if it had it.
 *
 * The route now says what is true instead of failing inside a try/catch. Restore
 * real behaviour by doing ONE of:
 *   - deploying `backend/syncsenta-backend` and setting `MVP_BACKEND_URL` in
 *     `next.config.js`, then reimplementing the student→class→scheme lookup here
 *     (it needs the class membership table, which Supabase does not have yet); or
 *   - persisting schemes against `/lesson-architect/schemes` in ai-agents and
 *     looking them up by teacher + subject, which is the shape the deployed data
 *     actually has today.
 *
 * `lib/scheme-context-client.ts` treats a non-200 as "no context" and keeps
 * going, so learners are unaffected either way — they just no longer get a
 * phantom grounding that silently does nothing.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.nextUrl);

  return NextResponse.json(
    {
      error: 'Scheme context is not available in this deployment',
      detail:
        'Reading a student\'s active scheme requires the class→scheme lookup in '
        + 'backend/syncsenta-backend, which is not deployed. Schemes generated in the '
        + 'teacher wizard are persisted by the Lesson Architect and are not yet joined '
        + 'to a class.',
      student_id: searchParams.get('student_id') ?? null,
      subject: searchParams.get('subject') ?? null,
      status: 'awaiting-backend',
    },
    { status: 503 },
  );
}
