import { NextRequest, NextResponse } from 'next/server';
import { buildApiUrl, getAiAgentsServiceHeaders } from '@/lib/api-config';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler';

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseRouteHandlerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Sign in to submit a quiz.' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    quiz?: Record<string, unknown>;
    submission?: {
      submission_id?: string;
      quiz_id?: string;
      answers?: Array<{ question_id: string; answer: string }>;
    };
  };

  const quiz = body.quiz;
  const submission = body.submission;
  if (!quiz || typeof quiz !== 'object' || !submission || !submission.submission_id ||
      !submission.quiz_id || !Array.isArray(submission.answers)) {
    return NextResponse.json({ error: 'A valid quiz and submission are required.' }, { status: 400 });
  }

  let target: string;
  let headers: Record<string, string>;
  try {
    target = buildApiUrl('/agents/assessment/grade');
    headers = getAiAgentsServiceHeaders({
      'Content-Type': 'application/json',
      'X-Forwarded-User': user.id,
    });
  } catch {
    return NextResponse.json(
      { error: 'Quiz grading is not configured for this deployment.' },
      { status: 503 },
    );
  }

  const upstreamBody = {
    quiz,
    submission: {
      submission_id: submission.submission_id,
      quiz_id: submission.quiz_id,
      student_id: user.id,
      answers: submission.answers,
    },
  };

  try {
    const res = await fetch(target, {
      method: 'POST',
      headers,
      body: JSON.stringify(upstreamBody),
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Quiz grading failed.' },
        { status: res.status >= 500 ? 502 : res.status },
      );
    }

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
    });
  } catch {
    return NextResponse.json({ error: 'Quiz grading failed.' }, { status: 502 });
  }
}
