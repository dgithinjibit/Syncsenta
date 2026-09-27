import { NextRequest } from 'next/server';
import { buildApiUrl } from '@/lib/api-config';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type LessonPlanRequest = {
  teacher_id?: string;
  week?: number;
  lesson?: number;
  grade?: string;
  subject?: string;
  term?: string;
  language?: 'english' | 'kiswahili' | 'mixed';
  row?: {
    week?: number;
    lesson?: number;
    strand?: string;
    subStrand?: string;
    specificLearningOutcome?: string;
    learningExperiences?: string;
    keyInquiryQuestion?: string;
    learningResources?: string;
    assessmentMethods?: string;
    reflection?: string;
  };
  additional_notes?: string;
};

function prescribedLessonPlan(payload: LessonPlanRequest, reason: string) {
  const row = payload.row || {};
  const isSwahili = payload.language === 'kiswahili' || (payload.subject || '').toLowerCase().includes('kiswahili');
  const subStrand = row.subStrand || (isSwahili ? 'Mada ya somo' : 'Lesson concept');
  const objective = row.specificLearningOutcome || (isSwahili
    ? `Mwisho wa somo, mwanafunzi aweze kueleza na kutumia ${subStrand}.`
    : `By the end of the lesson, the learner should be able to explain and apply ${subStrand}.`);
  const experiences = row.learningExperiences || (isSwahili
    ? `Kumbusha maarifa ya awali, onyesha ${subStrand}, fanya mazoezi kwa jozi na jadili majibu.`
    : `Activate prior knowledge, model ${subStrand}, practise in pairs, and discuss responses.`);
  const inquiry = row.keyInquiryQuestion || (isSwahili
    ? `Tunawezaje kutumia ${subStrand} katika maisha ya kila siku?`
    : `How can we use ${subStrand} in everyday life?`);
  const resources = (row.learningResources || (isSwahili
    ? 'Kitabu cha mwanafunzi, mwongozo wa mwalimu, chati na vifaa vinavyopatikana karibu.'
    : 'Learner book, teacher guide, chart paper, and locally available materials.')).split(',').map((item) => item.trim()).filter(Boolean);
  const assessment = row.assessmentMethods || (isSwahili
    ? 'Uchunguzi, maswali ya mdomo na kazi ya mwisho ya somo.'
    : 'Observation, oral questions, and an exit task.');
  const lessonPlan = {
    title: isSwahili ? `Mpango wa Somo: ${subStrand}` : `Lesson Plan: ${subStrand}`,
    grade: payload.grade || '',
    subject: payload.subject || '',
    strand: row.strand || '',
    subStrand,
    duration: isSwahili ? 'Dakika 40' : '40 minutes',
    objectives: [objective],
    keyInquiryQuestion: inquiry,
    introduction: {
      duration: isSwahili ? 'Dakika 5' : '5 minutes',
      activities: [isSwahili ? 'Amsha maarifa ya awali kwa maswali mafupi na mfano wa mazingira ya karibu.' : 'Activate prior knowledge with short questions and a local example.'],
    },
    development: {
      duration: isSwahili ? 'Dakika 25' : '25 minutes',
      activities: [experiences],
    },
    conclusion: {
      duration: isSwahili ? 'Dakika 10' : '10 minutes',
      activities: [isSwahili ? 'Wanafunzi washirikishe majibu, wafanye kazi ya mwisho na watafakari walichojifunza.' : 'Learners share responses, complete the exit task, and reflect on learning.'],
    },
    assessment: [assessment],
    differentiation: {
      advanced: isSwahili ? 'Wape wanafunzi changamoto ya kutoa mfano wao wenyewe na kueleza sababu.' : 'Ask advanced learners to create their own example and explain their reasoning.',
      struggling: isSwahili ? 'Tumia mfano halisi, maneno muhimu na usaidizi wa jozi kabla ya kazi ya kujitegemea.' : 'Use a concrete example, key vocabulary, and peer support before independent work.',
    },
    resources,
    teacherReflection: row.reflection || '',
  };
  return { success: true, lesson_plan: lessonPlan, lesson_plan_id: `prescribed_lesson_${Date.now()}`, source: 'frontend-prescribed-fallback', fallback_reason: reason };
}

export async function POST(req: NextRequest) {
  // Proxy POST to configured AI agents backend's lesson-plan endpoint
  const body = (await req.json().catch(() => ({}))) as LessonPlanRequest;

  let target: string;
  try {
    target = buildApiUrl('/lesson-architect/generate-lesson-plan');
  } catch {
    return Response.json(prescribedLessonPlan(body, 'AI service is not configured for this deployment.'));
  }

  // Attach user context if available
  const supabase = getSupabaseServerClient();
  const authResult = await supabase.auth.getUser().catch(() => null);
  const user = authResult?.data?.user ?? null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (user?.id) headers['X-Forwarded-User'] = user.id;

  // GenerateLessonPlanRequest requires teacher_id, week and lesson. Callers
  // that only have a SchemeRow (the wizard dialog, for one) omit them, and a
  // missing required field is a 422 that used to be reported to the teacher as
  // "AI service returned an unavailable response". Fill them in here, and
  // prefer the session over any teacher_id the client chose to send.
  const upstreamPayload = {
    ...body,
    teacher_id: user?.id ?? body.teacher_id ?? 'teacher_demo',
    week: Number.isFinite(body.week) ? body.week : 1,
    lesson: Number.isFinite(body.lesson) ? body.lesson : 1,
  };

  try {
    const res = await fetch(target, {
      method: 'POST',
      headers,
      body: JSON.stringify(upstreamPayload),
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      const reason = res.status === 404
        ? 'The AI service does not expose lesson plans at /lesson-architect/generate-lesson-plan.'
        : `AI service returned ${res.status}.`;
      return Response.json(prescribedLessonPlan(body, reason));
    }

    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
    });
  } catch {
    return Response.json(prescribedLessonPlan(body, 'AI service could not be reached from this deployment.'));
  }
}
