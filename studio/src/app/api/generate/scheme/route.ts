import { NextRequest, NextResponse } from 'next/server';
import { buildApiUrl } from '@/lib/api-config';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// The local AI service is reached over the server network. Edge runtime cannot
// open that localhost connection during development, so keep this proxy in the
// Node.js runtime (which also works for normal server deployments).
export const runtime = 'nodejs';
const DEFAULT_AI_TIMEOUT_MS = 8_000;

type SchemeRequest = {
  grade?: string;
  subject?: string;
  term?: string;
  strands?: Array<{
    strand?: string;
    name?: string;
    subStrands?: string[];
    sub_strands?: string[];
  }>;
  teacherInputs?: Record<string, string>;
  mode?: string;
  language?: 'english' | 'kiswahili' | 'mixed';
};

/**
 * Keeps the presentation and offline experience usable when the optional AI
 * service is not configured in a deployment. The Python service has the same
 * safety net, but this proxy also needs one when Vercel cannot reach it.
 */
function prescribedScheme(payload: SchemeRequest, reason: string) {
  const grade = payload.grade || 'Grade 4';
  const subject = payload.subject || 'General Studies';
  const term = payload.term || 'Term 1';
  const isSwahili = payload.language === 'kiswahili' || subject.toLowerCase().includes('kiswahili');
  const selectedStrands = Array.isArray(payload.strands) ? payload.strands : [];
  const strandChoices = selectedStrands.length
    ? selectedStrands
    : [{ strand: `${subject} foundations`, subStrands: ['Core concepts'] }];

  const rows = strandChoices.flatMap((choice, strandIndex) => {
    const strand = choice.strand || choice.name || `${subject} foundations`;
    const subStrands = choice.subStrands || choice.sub_strands || ['Core concepts'];

    return (subStrands.length ? subStrands : ['Core concepts']).map((subStrand, subIndex) => {
      const lesson = strandIndex * 2 + subIndex + 1;
      return {
        week: Math.ceil(lesson / 2),
        lesson,
        strand,
        subStrand,
        specificLearningOutcome: isSwahili
          ? `Mwisho wa somo, mwanafunzi aweze kueleza na kutumia ${subStrand}.`
          : `By the end of the lesson, the learner should be able to explain and apply ${subStrand}.`,
        learningExperiences: isSwahili
          ? `Kumbusha maarifa ya awali, onyesha dhana, fanya mazoezi ya ${subStrand} kwa jozi, kisha mwanafunzi atafakari kwa ufupi.`
          : `Activate prior knowledge, model the concept, practise ${subStrand} in pairs, and share a short reflection.`,
        keyInquiryQuestion: isSwahili
          ? `Tunawezaje kutumia ${subStrand} katika ujifunzaji wa kila siku?`
          : `How can we use ${subStrand} in everyday learning?`,
        learningResources: isSwahili
          ? 'Kitabu cha mwanafunzi, mwongozo wa mwalimu, karatasi ya chati na vifaa vinavyopatikana katika mazingira ya karibu.'
          : 'Learner book, teacher guide, chart paper, and locally available materials.',
        assessmentMethods: isSwahili
          ? 'Orodha ya uchunguzi, maswali ya mdomo na kazi ya mwisho ya somo.'
          : 'Observation checklist, oral questions, and an exit task.',
        reflection: '',
      };
    });
  });

  return {
    scheme_id: `prescribed_${Date.now()}`,
    title: isSwahili ? `${grade} ${subject} ${term} - Mpango wa Kazi wa CBC` : `${grade} ${subject} ${term} - Prescribed CBC Scheme`,
    grade,
    subject,
    term,
    rows,
    total_weeks: Math.max(...rows.map((row) => row.week)),
    lessons_per_week: 2,
    source: 'frontend-prescribed-fallback',
    fallback_reason: reason,
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as SchemeRequest;

  // Presentation deployments can opt out of the network call entirely. This
  // is useful when only the prescribed CBC demonstration data is required.
  if (process.env.SCHEME_GENERATION_MODE?.toLowerCase() === 'prescribed') {
    return NextResponse.json(
      prescribedScheme(body, 'Presentation mode is using the prescribed CBC scheme.'),
    );
  }

  let target: string;
  try {
    target = buildApiUrl('/lesson-architect/generate-scheme');
  } catch {
    return NextResponse.json(
      prescribedScheme(body, 'AI service is not configured for this deployment.'),
    );
  }

  const supabase = getSupabaseServerClient();
  const authResult: any = await supabase.auth.getUser().catch(() => ({}));
  const user = authResult.data?.user;

  if (!user?.id) {
    // `GenerateSchemeRequest.teacher_id` is required by the Python model, so a
    // body without it is a guaranteed 422 -> prescribed row. Ask for the
    // session up front instead of spending a round trip and blaming the AI
    // service for it, and keep anonymous traffic off the metered provider.
    return NextResponse.json(
      prescribedScheme(body, 'Sign in to generate a scheme with the AI service.'),
    );
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  headers['X-Forwarded-User'] = user.id;

  // teacher_id is derived from the session, never from the request body: the
  // agent uses it to read the teacher's stored personalization, and a client
  // could otherwise name another teacher's row.
  const upstreamPayload = {
    ...body,
    teacher_id: user.id,
    selected_strands: body.strands ?? [],
  };

  const configuredTimeout = Number(process.env.SCHEME_AI_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : DEFAULT_AI_TIMEOUT_MS;

  try {
    const res = await fetch(target, {
      method: 'POST',
      headers,
      body: JSON.stringify(upstreamPayload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      // 404 here means the router is not mounted on the deployed service, not
      // that the provider hiccuped. Say which, because the two have different
      // fixes and the fallback JSON looks identical to the teacher.
      const reason = res.status === 404
        ? 'The AI service does not expose scheme generation at /lesson-architect/generate-scheme.'
        : `AI service returned ${res.status}.`;
      return NextResponse.json(prescribedScheme(body, reason));
    }

    const data = await res.json();
    if (!Array.isArray(data?.rows) || data.rows.length === 0) {
      return NextResponse.json(
        prescribedScheme(body, 'AI service returned no usable scheme rows.'),
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      prescribedScheme(body, 'AI service could not be reached from this deployment.'),
    );
  }
}
