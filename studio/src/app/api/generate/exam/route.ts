/**
 * POST /api/generate/exam
 *
 * Proxies end-of-term exam generation to the Python Lesson Architect.
 * Replaces `/api/v1/exams/generate`, which is rewritten to the Rust MVP backend
 * that is deployed nowhere — so on Vercel the generator button at /teacher/exams
 * could only ever toast "Failed to generate exam".
 *
 * There is no prescribed fallback here, on purpose. The scheme and lesson-plan
 * proxies degrade to template rows because a teacher edits a draft before using
 * it; a fabricated question set is pupil-facing assessment material, and the
 * studio has a standing rule about child-facing content that looks generated but
 * is not. If the AI service cannot answer, this says so.
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildApiUrl } from '@/lib/api-config';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const UPSTREAM_TIMEOUT_MS = Number(process.env.EXAM_AI_TIMEOUT_MS) > 0
  ? Number(process.env.EXAM_AI_TIMEOUT_MS)
  : 55_000;

type StudioAllocation = {
  strandName?: string;
  subStrandName?: string;
  weeks?: number[];
  /** Accepted pre-grouped, in case a caller already speaks the Python shape. */
  subStrands?: Array<{ name?: string; lessons?: number }>;
};

type ExamRequest = {
  teacher_id?: string;
  grade?: string;
  subject?: string;
  term?: string;
  allocation?: StudioAllocation[];
  counts?: { mcq?: number; short?: number; long?: number };
  forceRefresh?: boolean;
};

/**
 * `studio/src/data/curriculum/term-mappings.ts` emits one flat entry per
 * sub-strand (`{strandName, subStrandName, weeks[]}`). The Python
 * `StrandAllocation` model is strict and grouped
 * (`{strandName, subStrands: [{name, lessons}]}`), and
 * `LessonArchitectAgent.generate_exam` calls `model_validate` on it directly, so
 * the studio shape forwarded unchanged is a guaranteed `Invalid allocation`
 * error. Grouping happens here instead of in every component that owns a
 * curriculum allocation.
 */
export function toLessonArchitectAllocation(allocation: StudioAllocation[]) {
  const grouped = new Map<string, Array<{ name: string; lessons: number }>>();

  for (const entry of allocation) {
    const strandName = (entry.strandName || '').trim();
    if (!strandName) continue;
    const bucket = grouped.get(strandName) ?? [];
    grouped.set(strandName, bucket);

    if (Array.isArray(entry.subStrands)) {
      for (const sub of entry.subStrands) {
        const name = (sub?.name || '').trim();
        if (!name) continue;
        bucket.push({ name, lessons: Math.max(1, Number(sub.lessons) || 1) });
      }
      continue;
    }

    const subStrandName = (entry.subStrandName || '').trim();
    if (!subStrandName) continue;
    const lessons = Array.isArray(entry.weeks) && entry.weeks.length > 0
      ? entry.weeks.length
      : 1;
    const existing = bucket.find((sub) => sub.name === subStrandName);
    if (existing) existing.lessons += lessons;
    else bucket.push({ name: subStrandName, lessons });
  }

  return Array.from(grouped, ([strandName, subStrands]) => ({ strandName, subStrands }))
    // A strand with no sub-strands validates fine and then scopes the paper to
    // nothing, which reads to the teacher as a generated exam that quietly
    // ignores part of the term. Drop it, and let the caller's empty check see it.
    .filter((strand) => strand.subStrands.length > 0);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as ExamRequest | null;
  if (!body || !body.grade || !body.subject || !body.term) {
    return NextResponse.json(
      { error: 'Grade, subject and term are required to scope an exam.' },
      { status: 400 },
    );
  }

  const allocation = Array.isArray(body.allocation) ? body.allocation : [];
  const scopedAllocation = toLessonArchitectAllocation(allocation);
  if (scopedAllocation.length === 0) {
    return NextResponse.json(
      {
        error: 'No curriculum allocation to scope the exam',
        detail: 'The selected grade/subject/term has no strand data in the studio curriculum.',
      },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user?.id) {
    return NextResponse.json(
      { error: 'Sign in as a teacher to generate an exam.' },
      { status: 401 },
    );
  }

  let target: string;
  try {
    target = buildApiUrl('/lesson-architect/generate-exam');
  } catch {
    return NextResponse.json(
      { error: 'Exam generation is not configured for this deployment.' },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-User': user.id },
      // teacher_id is taken from the session, never from the body: the agent
      // caches and persists exams under it.
      body: JSON.stringify({
        teacher_id: user.id,
        grade: body.grade,
        subject: body.subject,
        term: body.term,
        allocation: scopedAllocation,
        counts: body.counts,
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return NextResponse.json(
        {
          error: res.status === 404
            ? 'The AI service does not expose exam generation at /lesson-architect/generate-exam.'
            : 'Exam generation failed on the AI service.',
          detail: detail.slice(0, 500),
          status: res.status,
        },
        { status: 502 },
      );
    }

    const data = await res.json();
    const questions = Array.isArray(data?.questions) ? data.questions : [];
    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'The AI service returned no questions.', detail: 'Nothing was saved.' },
        { status: 502 },
      );
    }

    // `examId` is what the studio component reads; `exam_id` is what Python
    // returns. Emit both so the runner works whichever way the contract goes.
    return NextResponse.json({
      success: true,
      questions,
      exam_id: data.exam_id ?? null,
      examId: data.exam_id ?? null,
      total_marks: data.total_marks ?? 0,
      meta: data.meta ?? {},
      source: data.source ?? 'ai-agents',
      cached: false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'The AI service could not be reached from this deployment.',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
