import { NextRequest, NextResponse } from 'next/server';
import { buildApiUrl, getAiAgentsServiceHeaders } from '@/lib/api-config';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler';

export const runtime = 'nodejs';
export const maxDuration = 10;

type QuizRequest = {
  grade?: string;
  subject?: string;
  competency?: string;
  num_questions?: number;
  language?: 'english' | 'kiswahili' | 'mixed';
  question_types?: string[];
};

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseRouteHandlerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Sign in to generate a quiz.' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as QuizRequest;

  let target: string;
  let headers: Record<string, string>;
  try {
    target = buildApiUrl('/agents/assessment/quiz');
    headers = getAiAgentsServiceHeaders({
      'Content-Type': 'application/json',
      'X-Forwarded-User': user.id,
    });
  } catch {
    return NextResponse.json(
      { error: 'Quiz generation is not configured for this deployment.' },
      { status: 503 },
    );
  }

  const upstreamBody = {
    grade: body.grade,
    subject: body.subject,
    competency: body.competency,
    num_questions: body.num_questions,
    language: body.language,
    question_types: body.question_types,
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
        { error: 'Quiz generation failed.' },
        { status: res.status >= 500 ? 502 : res.status },
      );
    }

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
    });
  } catch {
    return NextResponse.json({ error: 'Quiz generation failed.' }, { status: 502 });
  }
}
