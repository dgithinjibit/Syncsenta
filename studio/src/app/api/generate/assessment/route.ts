import { NextRequest, NextResponse } from 'next/server';
import { buildApiUrl, getAiAgentsServiceHeaders } from '@/lib/api-config';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler';
import {
  detectBlockedOmegaClawContent,
  omegaClawGenerationHaystack,
  omegaClawTeacherRefusal,
} from '@/lib/omega-agent/omega-claw-safety';

export const runtime = 'nodejs';
export const maxDuration = 10;

type AssessmentRequest = {
  message?: string;
  grade?: string;
  subject?: string;
  term?: string;
  assessment_type?: 'quiz' | 'test' | 'rubric' | 'formative';
  assessment_period?: 'midterm' | 'end_of_term';
  language?: 'english' | 'kiswahili' | 'mixed';
  role?: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as AssessmentRequest;

  // Omega Claw's blocked topics apply to what a teacher generates as much as to
  // what a learner asks: this route forwards the request to the AI service, so a
  // check after `buildApiUrl` would be a prompt that already left the building.
  const blocked = detectBlockedOmegaClawContent(
    omegaClawGenerationHaystack([body.message, body.subject, body.term]),
  );
  if (blocked) return Response.json(omegaClawTeacherRefusal(blocked), { status: 400 });

  const supabase = await createSupabaseRouteHandlerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Sign in as a teacher to generate an assessment.' }, {
      status: 401,
    });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) {
    console.error('Unable to verify assessment-generation role:', profileError);
    return NextResponse.json({ error: 'Unable to verify teacher access.' }, { status: 500 });
  }
  if (profile?.role !== 'teacher') {
    return NextResponse.json({ error: 'Teacher access required.' }, { status: 403 });
  }

  let target: string;
  let headers: Record<string, string>;
  try {
    target = buildApiUrl('/agents/chat');
    headers = getAiAgentsServiceHeaders({
      'Content-Type': 'application/json',
      'X-Forwarded-User': user.id,
    });
  } catch {
    return NextResponse.json(
      { error: 'Assessment generation is not configured for this deployment.' },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(target, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...body,
        user_id: user.id,
        role: 'teacher',
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      console.error('Assessment generation failed on the AI service:', res.status);
      return NextResponse.json(
        { error: 'Assessment content generation failed.' },
        { status: 502 },
      );
    }
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
    });
  } catch {
    console.error('Assessment generation could not reach the AI service.');
    return NextResponse.json(
      { error: 'Assessment content generation failed.' },
      { status: 502 },
    );
  }
}
