import { NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler';
import {
  buildPhase2Overview,
  type Phase2Assignment,
  type Phase2Profile,
  type Phase2Session,
  type Phase2Student,
} from '@/lib/teacher/phase2-dashboard-shaping';

export const dynamic = 'force-dynamic';

type QueryResult = Promise<{
  data: unknown[] | null;
  error: { message: string } | null;
}>;

interface DashboardQuery {
  select(columns: string): DashboardQuery;
  eq(column: string, value: unknown): DashboardQuery;
  in(column: string, values: unknown[]): DashboardQuery;
  gte(column: string, value: unknown): DashboardQuery;
  order(column: string, options?: { ascending: boolean }): DashboardQuery;
  limit(count: number): QueryResult;
  maybeSingle(): Promise<{
    data: unknown | null;
    error: { message: string } | null;
  }>;
}

interface DashboardDb {
  from(table: string): DashboardQuery;
}

export async function GET() {
  try {
    const supabase = await createSupabaseRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 },
      );
    }

    const db = supabase as unknown as DashboardDb;
    const profileResult = await db
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const profile = profileResult.data as { role?: string } | null;
    const profileError = profileResult.error;

    if (profileError) {
      console.error('Failed to load the dashboard caller profile:', profileError);
      return NextResponse.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: 'Unable to verify the caller role' } },
        { status: 500 },
      );
    }
    if (profile?.role !== 'teacher') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Teacher access required' } },
        { status: 403 },
      );
    }

    const { data: assignmentRows, error: assignmentsError } = await db
      .from('teacher_student_assignments')
      .select('student_id, subject, class_name')
      .eq('teacher_id', user.id)
      .eq('status', 'active')
      .limit(500);

    if (assignmentsError) {
      console.error('Failed to load the dashboard roster:', assignmentsError);
      return NextResponse.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: 'Unable to load the teacher roster' } },
        { status: 500 },
      );
    }

    const assignments = (assignmentRows ?? []) as Phase2Assignment[];
    const studentIds = [...new Set(assignments.map((row) => row.student_id))];
    if (studentIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        asOf: new Date().toISOString(),
        metric: 'phase2-active-students-v1',
      });
    }

    const { data: studentRows, error: studentsError } = await db
      .from('students')
      .select('id, student_id, user_id, student_name, grade, school_name')
      .in('id', studentIds)
      .limit(500);

    if (studentsError) {
      console.error('Failed to load assigned student records:', studentsError);
      return NextResponse.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: 'Unable to load assigned learners' } },
        { status: 500 },
      );
    }

    const students = (studentRows ?? []) as Phase2Student[];
    const telemetryIds = [
      ...new Set(
        students.flatMap((student) =>
          [student.id, student.student_id, student.user_id].filter(
            (id): id is string => typeof id === 'string' && id.length > 0,
          ),
        ),
      ),
    ];

    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: sessionRows, error: sessionsError } = await db
      .from('student_sessions')
      .select('session_id, student_id, activity_type, competency, subject, started_at, ended_at, created_at')
      .in('student_id', telemetryIds)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(200);

    if (sessionsError) {
      console.error('Failed to load dashboard sessions:', sessionsError);
      return NextResponse.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: 'Unable to load learner activity' } },
        { status: 503 },
      );
    }

    const sessions = (sessionRows ?? []) as Phase2Session[];
    const sessionIds = [...new Set(sessions.map((session) => session.session_id))];
    let profilesBySession: Record<string, Phase2Profile> = {};

    if (sessionIds.length > 0) {
      const { data: profileRows, error: profilesError } = await db
        .from('behavioral_profiles')
        .select('session_id, primary_pattern, engagement_score, mastery_indicator, intervention_needed, intervention_urgency')
        .in('session_id', sessionIds)
        .limit(200);

      if (profilesError) {
        console.error('Failed to load dashboard behavioral profiles:', profilesError);
        return NextResponse.json(
          { success: false, error: { code: 'DATABASE_ERROR', message: 'Unable to load learner profiles' } },
          { status: 503 },
        );
      }

      profilesBySession = Object.fromEntries(
        ((profileRows ?? []) as Phase2Profile[]).map((profile) => [
          profile.session_id,
          profile,
        ]),
      );
    }

    const now = new Date();
    return NextResponse.json({
      success: true,
      data: buildPhase2Overview(assignments, students, sessions, profilesBySession, now),
      asOf: now.toISOString(),
      metric: 'phase2-active-students-v1',
    });
  } catch (error) {
    console.error('Unexpected dashboard overview failure:', error);
    return NextResponse.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Unable to load dashboard data' } },
      { status: 500 },
    );
  }
}
