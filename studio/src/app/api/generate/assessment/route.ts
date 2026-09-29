import { NextRequest, NextResponse } from 'next/server';
import { buildApiUrl } from '@/lib/api-config';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  detectBlockedOmegaClawContent,
  omegaClawGenerationHaystack,
  omegaClawTeacherRefusal,
} from '@/lib/omega-agent/omega-claw-safety';

export const runtime = 'nodejs';
export const maxDuration = 10;

const AUTH_LOOKUP_TIMEOUT_MS = 1_500;

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

function prescribedAssessment(body: AssessmentRequest, reason: string) {
  const type = body.assessment_type || 'test';
  const isSwahili = body.language === 'kiswahili' || (body.subject || '').toLowerCase().includes('kiswahili');
  const term = body.term || 'Term 1';
  const period = body.assessment_period === 'midterm' ? (isSwahili ? 'MTIHANI WA KATI YA MUHULA' : 'MIDTERM EXAMINATION') : (isSwahili ? 'MTIHANI WA MWISHO WA MUHULA' : 'END OF TERM EXAMINATION');
  const grade = body.grade || '';
  const subject = body.subject || '';
  const heading = type === 'test' ? period : type === 'quiz' ? (isSwahili ? 'JARIBIO FUPI' : 'QUICK QUIZ') : type === 'rubric' ? (isSwahili ? 'RUBRIKI YA TATHMINI' : 'ASSESSMENT RUBRIC') : (isSwahili ? 'ZANA ZA TATHMINI ENDELEVU' : 'FORMATIVE ASSESSMENT TOOLKIT');
  const response = isSwahili
    ? `# ${heading}\n## ${subject} — ${grade}\n**Muhula:** ${term}\n\n**Jina:** ____________________  **Nambari:** __________\n**Darasa:** __________________  **Tarehe:** __________\n\n### Maelekezo\n1. Jibu maswali yote kwa makini.\n2. Onyesha hatua za kazi inapohitajika.\n3. Tumia mifano inayohusiana na mazingira ya mwanafunzi.\n\n### Sehemu A: Maarifa na Uelewa\n1. Eleza dhana kuu ya mada iliyochaguliwa.\n2. Toa mfano mmoja kutoka katika maisha ya kila siku.\n\n### Sehemu B: Matumizi\n3. Tumia maarifa hayo kutatua tatizo linalohusiana na mada.\n\n### Tathmini ya Mwalimu\nAlama: ______ / ______\nMaoni: ______________________________________________\n\n> Huu ni muundo wa ndani wa maendeleo uliotengenezwa bila huduma ya AI ya nje. Kamilisha au uhariri maswali kabla ya matumizi rasmi.`
    : `# ${heading}\n## ${subject} — ${grade}\n**Term:** ${term}\n\n**Name:** ____________________  **Adm No:** __________\n**Class:** ___________________  **Date:** ____________\n\n### Instructions\n1. Answer all questions carefully.\n2. Show working where required.\n3. Use examples relevant to the learner's Kenyan context.\n\n### SECTION A: Knowledge and Understanding\n1. Explain the main concept from the selected topic.\n2. Give one example from everyday learning.\n\n### SECTION B: Application\n3. Apply the concept to solve a problem related to the topic.\n\n### Teacher Assessment\nMarks: ______ / ______\nComments: ____________________________________________\n\n> This is a local development template generated without an external AI service. Edit and verify the questions before formal use.`;

  return NextResponse.json({ success: true, response, source: 'frontend-prescribed-fallback', fallback_reason: reason });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as AssessmentRequest;

  // Omega Claw's blocked topics apply to what a teacher generates as much as to
  // what a learner asks: this route forwards the request to the AI service, so a
  // check after `buildApiUrl` would be a prompt that already left the building.
  const blocked = detectBlockedOmegaClawContent(
    omegaClawGenerationHaystack([body.message, body.subject, body.term]),
  );
  if (blocked) return Response.json(omegaClawTeacherRefusal(blocked), { status: 400 });

  let target: string;
  try {
    target = buildApiUrl('/agents/chat');
  } catch {
    return prescribedAssessment(body, 'AI service is not configured for this deployment.');
  }

  const supabase = getSupabaseServerClient();
  const authResult = await Promise.race([
    supabase.auth.getUser().catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), AUTH_LOOKUP_TIMEOUT_MS)),
  ]);
  const user = authResult?.data?.user ?? null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (user?.id) headers['X-Forwarded-User'] = user.id;

  try {
    const res = await fetch(target, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return prescribedAssessment(body, 'AI service returned an unavailable response.');
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
    });
  } catch {
    return prescribedAssessment(body, 'AI service could not be reached from this deployment.');
  }
}
