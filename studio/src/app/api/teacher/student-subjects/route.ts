/**
 * GET /api/teacher/student-subjects?studentId=<uuid>
 *
 * Returns the subject-session summary for a specific student, restricted to
 * teachers/admins whose classroom_id matches the student's classroom_id.
 *
 * Response: SubjectSessionSummary[]  (empty array if no sessions)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getLearningSession } from '@/lib/session/session-persistence';
import { SUBJECT_REGISTRY } from '@/lib/chat/subject-session';

export const dynamic = 'force-dynamic';

export interface SubjectSessionSummary {
  subject: string;
  label: string;
  lastSessionDate: string | null;
  lastActivityName: string | null;
  lastActivityProgress: number;
  sessionCount: number;
  timeSpentMinutes: number;
  masteryPercent: number;
  scaffoldingLevel: 'Independent' | 'Guided' | 'Intensive' | null;
  lastMessages: { role: string; content: string; created_at: string }[];
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    // ── Auth ────────────────────────────────────────────────────────────────
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Check requester role ─────────────────────────────────────────────────
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('role, classroom_id')
      .eq('id', user.id)
      .single();

    if (
      !requesterProfile ||
      !['teacher', 'admin'].includes(requesterProfile.role ?? '')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── Validate studentId param ─────────────────────────────────────────────
    const studentId = request.nextUrl.searchParams.get('studentId');
    if (!studentId) {
      return NextResponse.json(
        { error: 'Missing required query param: studentId' },
        { status: 400 },
      );
    }

    // ── Fetch student profile to verify classroom match ──────────────────────
    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('grade, classroom_id')
      .eq('id', studentId)
      .single();

    if (!studentProfile) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Admins bypass classroom restriction; teachers must share a classroom.
    if (
      requesterProfile.role === 'teacher' &&
      requesterProfile.classroom_id !== studentProfile.classroom_id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── Fetch Redis learning session (scaffolding level + last activity) ──────
    const redisSession = await getLearningSession(studentId).catch(() => null);
    const redisScaffolding =
      (redisSession?.preferences as any)?.scaffoldingLevel ?? null;
    const redisActivity = redisSession?.currentActivity ?? null;

    // ── Build per-subject summary in parallel ────────────────────────────────
    const slugs = Object.keys(SUBJECT_REGISTRY);

    const summaries = await Promise.all(
      slugs.map(async (slug): Promise<SubjectSessionSummary | null> => {
        // Count chat sessions for this student + subject
        const { count: sessionCount } = await supabase
          .from('chat_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', studentId)
          .eq('subject', slug)
          .eq('status', 'active');

        // Aggregate learning_progress for this subject
        const { data: progressRows } = await supabase
          .from('learning_progress')
          .select('progress_percentage, time_spent_minutes')
          .eq('user_id', studentId)
          .eq('subject', slug);

        const timeSpentMinutes = (progressRows ?? []).reduce(
          (sum, r) => sum + (r.time_spent_minutes ?? 0),
          0,
        );
        const masteryPercent =
          (progressRows ?? []).length > 0
            ? Math.round(
                (progressRows ?? []).reduce(
                  (sum, r) => sum + (r.progress_percentage ?? 0),
                  0,
                ) / (progressRows ?? []).length,
              )
            : 0;

        // Skip subjects with no engagement at all
        if ((sessionCount ?? 0) === 0 && timeSpentMinutes === 0) return null;

        // Latest chat session date + last 5 messages
        const { data: latestSession } = await supabase
          .from('chat_sessions')
          .select('id, last_message_at')
          .eq('user_id', studentId)
          .eq('subject', slug)
          .eq('status', 'active')
          .order('last_message_at', { ascending: false })
          .limit(1)
          .single();

        let lastMessages: SubjectSessionSummary['lastMessages'] = [];
        if (latestSession?.id) {
          const { data: msgs } = await supabase
            .from('chat_messages')
            .select('role, content, created_at')
            .eq('session_id', latestSession.id)
            .order('created_at', { ascending: false })
            .limit(5);
          lastMessages = ((msgs ?? []) as typeof lastMessages).reverse();
        }

        // Last activity name/progress from Redis (only for matching subject)
        const lastActivityName =
          redisActivity?.subject === slug ? redisActivity.name : null;
        const lastActivityProgress =
          redisActivity?.subject === slug ? redisActivity.progress : 0;

        // Scaffolding is stored globally (last subject the student used chat for)
        const scaffoldingLevel: SubjectSessionSummary['scaffoldingLevel'] =
          redisActivity?.subject === slug ? (redisScaffolding ?? null) : null;

        return {
          subject: slug,
          label: SUBJECT_REGISTRY[slug].label,
          lastSessionDate: latestSession?.last_message_at ?? null,
          lastActivityName,
          lastActivityProgress,
          sessionCount: sessionCount ?? 0,
          timeSpentMinutes,
          masteryPercent,
          scaffoldingLevel,
          lastMessages,
        };
      }),
    );

    const result = summaries.filter(Boolean) as SubjectSessionSummary[];

    // Sort by most-recent session descending
    result.sort((a, b) => {
      if (!a.lastSessionDate) return 1;
      if (!b.lastSessionDate) return -1;
      return a.lastSessionDate > b.lastSessionDate ? -1 : 1;
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/teacher/student-subjects]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
