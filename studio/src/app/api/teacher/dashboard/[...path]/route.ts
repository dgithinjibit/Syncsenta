import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler';

export const dynamic = 'force-dynamic';

type Assignment = {
  student_id: string;
  subject: string | null;
  class_name: string;
};

type Student = {
  id: string;
  student_id: string | null;
  user_id: string | null;
  student_name: string;
};

type Session = {
  session_id: string;
  student_id: string;
  subject: string | null;
  activity_type: string | null;
  competency: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string | null;
};

type Profile = {
  session_id: string;
  student_id: string;
  primary_pattern: string | null;
  engagement_score: number | null;
  mastery_indicator: number | null;
  intervention_needed: boolean;
  intervention_urgency: string | null;
  created_at: string | null;
};

type Misconception = {
  misconception_id: string;
  session_id: string;
  student_id: string;
  competency: string | null;
  misconception_type: string | null;
  description: string | null;
  confidence: number | null;
  severity: string | null;
  created_at: string | null;
};

type Intervention = {
  intervention_id: string;
  session_id: string | null;
  student_id: string;
  intervention_type: string | null;
  title: string | null;
  objective: string | null;
  priority: string | null;
  created_at: string | null;
};

type QueryResult = Promise<{
  data: unknown[] | null;
  error: { message: string } | null;
}>;

interface DashboardQuery {
  select(columns: string): DashboardQuery;
  eq(column: string, value: unknown): DashboardQuery;
  in(column: string, values: unknown[]): DashboardQuery;
  gte(column: string, value: unknown): DashboardQuery;
  lte(column: string, value: unknown): DashboardQuery;
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

function errorResponse(
  code:
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'DATABASE_ERROR'
    | 'NOT_FOUND'
    | 'VALIDATION_ERROR',
  message: string,
  status: number,
) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status },
  );
}

function parseIso(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  try {
    const supabase = await createSupabaseRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const db = supabase as unknown as DashboardDb;
    const profileResult = await db
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileResult.error) {
      return errorResponse('DATABASE_ERROR', 'Unable to verify the caller role', 500);
    }
    const callerProfile = profileResult.data as { role?: string } | null;
    if (callerProfile?.role !== 'teacher') {
      return errorResponse('FORBIDDEN', 'Teacher access required', 403);
    }

    const assignmentsResult = await db
      .from('teacher_student_assignments')
      .select('student_id, subject, class_name')
      .eq('teacher_id', user.id)
      .eq('status', 'active')
      .limit(500);

    if (assignmentsResult.error) {
      return errorResponse('DATABASE_ERROR', 'Unable to load the teacher roster', 500);
    }

    const assignments = (assignmentsResult.data ?? []) as Assignment[];
    const studentIds = [...new Set(assignments.map((row) => row.student_id))];
    if (studentIds.length === 0) {
      return emptyOrScopedResponse(params.path);
    }

    const studentsResult = await db
      .from('students')
      .select('id, student_id, user_id, student_name')
      .in('id', studentIds)
      .limit(500);

    if (studentsResult.error) {
      return errorResponse('DATABASE_ERROR', 'Unable to load assigned learners', 500);
    }
    const students = (studentsResult.data ?? []) as Student[];

    const telemetryIds = [
      ...new Set(
        students.flatMap((student) =>
          [student.id, student.student_id, student.user_id].filter(
            (id): id is string => typeof id === 'string' && id.length > 0,
          ),
        ),
      ),
    ];

    const path = params.path;
    const now = new Date();

    if (path[0] === 'students' && path.length >= 3) {
      const studentId = path[1];
      const student = students.find((row) => row.id === studentId);
      if (!student) {
        return errorResponse('FORBIDDEN', 'Student is outside the caller roster', 403);
      }
      const learnerTelemetryIds = [
        student.id,
        student.student_id,
        student.user_id,
      ].filter((id): id is string => typeof id === 'string' && id.length > 0);
      const action = path[2];

      if (action === 'progress') {
        return getStudentProgress(db, learnerTelemetryIds, now);
      }
      if (action === 'misconceptions') {
        return getStudentMisconceptions(db, learnerTelemetryIds, _request);
      }
      if (action === 'interventions') {
        return getStudentInterventions(db, learnerTelemetryIds, _request);
      }
      if (action === 'timeline') {
        return getStudentTimeline(db, learnerTelemetryIds, _request);
      }
    }

    if (
      path[0] === 'competencies' &&
      (path.length === 1 || (path.length === 2 && path[1] === 'summary'))
    ) {
      return getCompetencySummary(db, telemetryIds, _request);
    }
    if (path[0] === 'competencies' && path.length === 3 && path[2] === 'trends') {
      return getCompetencyTrends(db, telemetryIds, decodeURIComponent(path[1]));
    }

    if (path[0] === 'alerts') {
      return getAlerts(db, telemetryIds, _request);
    }

    return errorResponse('NOT_FOUND', 'Unknown dashboard route', 404);
  } catch (error) {
    console.error('Unexpected teacher dashboard route failure:', error);
    return errorResponse('DATABASE_ERROR', 'Unable to load dashboard data', 500);
  }
}

function emptyOrScopedResponse(path: string[]) {
  const now = new Date().toISOString();
  if (path[0] === 'alerts') {
    return NextResponse.json({ success: true, data: [], asOf: now });
  }
  if (path[0] === 'competencies') {
    return NextResponse.json({ success: true, data: [], asOf: now });
  }
  if (path[0] === 'students') {
    return NextResponse.json({ success: true, data: [], asOf: now });
  }
  return NextResponse.json({ success: true, data: [], asOf: now });
}

async function getStudentProgress(
  db: DashboardDb,
  telemetryIds: string[],
  now: Date,
) {
  const sessionsResult = await db
    .from('student_sessions')
    .select('session_id, subject, activity_type, competency, started_at, ended_at, created_at')
    .in('student_id', telemetryIds)
    .order('created_at', { ascending: false })
    .limit(25);
  if (sessionsResult.error) {
    return errorResponse('DATABASE_ERROR', 'Unable to load learner progress', 503);
  }
  const sessions = (sessionsResult.data ?? []) as Session[];
  const sessionIds = [...new Set(sessions.map((row) => row.session_id))];
  let profiles: Profile[] = [];
  if (sessionIds.length > 0) {
    const profileResult = await db
      .from('behavioral_profiles')
      .select('session_id, student_id, mastery_indicator, engagement_score, primary_pattern, intervention_needed, intervention_urgency, created_at')
      .in('session_id', sessionIds)
      .limit(25);
    if (profileResult.error) {
      return errorResponse('DATABASE_ERROR', 'Unable to load learner profiles', 503);
    }
    profiles = (profileResult.data ?? []) as Profile[];
  }
  const profileBySession = new Map(profiles.map((row) => [row.session_id, row]));
  const data = sessions.map((session) => {
    const profile = profileBySession.get(session.session_id);
    const started = parseIso(session.started_at);
    const ended = parseIso(session.ended_at);
    return {
      student_id: telemetryIds[0],
      subject: session.subject ?? '',
      topic: session.activity_type ?? '',
      mastery_level: profile?.mastery_indicator ?? 0,
      time_spent_minutes:
        started && ended
          ? Math.max(0, Math.floor((ended.getTime() - started.getTime()) / 60_000))
          : 0,
      quiz_scores: [],
      last_activity:
        parseIso(session.ended_at)?.toISOString() ??
        parseIso(session.created_at)?.toISOString() ??
        now.toISOString(),
      competency: session.competency,
      session_id: session.session_id,
      engagement_score: profile?.engagement_score ?? null,
      primary_pattern: profile?.primary_pattern ?? null,
    };
  });
  return NextResponse.json({ success: true, data, asOf: now.toISOString() });
}

async function getStudentMisconceptions(
  db: DashboardDb,
  telemetryIds: string[],
  request: NextRequest,
) {
  const limit = Math.min(
    50,
    Math.max(1, Number(request.nextUrl.searchParams.get('limit') ?? 50)),
  );
  const grouped = request.nextUrl.searchParams.get('grouped') === 'true';
  const result = await db
    .from('misconceptions')
    .select('misconception_id, session_id, student_id, competency, misconception_type, description, confidence, severity, created_at')
    .in('student_id', telemetryIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (result.error) {
    return errorResponse('DATABASE_ERROR', 'Unable to load misconceptions', 503);
  }
  const rows = (result.data ?? []) as Misconception[];
  if (!grouped) {
    return NextResponse.json({
      success: true,
      data: rows.map((row) => ({
        id: row.misconception_id,
        student_id: row.student_id,
        misconception_type: row.misconception_type ?? 'unknown',
        confidence: row.confidence ?? 0,
        severity: row.severity ?? 'low',
        description: row.description ?? '',
        competency: row.competency,
        created_at: row.created_at ?? new Date(0).toISOString(),
      })),
      asOf: new Date().toISOString(),
    });
  }
  const groupedRows = new Map<string, {
    misconception_type: string;
    count: number;
    max_severity: 'low' | 'medium' | 'high' | 'critical';
    latest_confidence: number;
    latest_description: string;
    latest_seen: string;
    competencies: Set<string>;
  }>();
  const severityRank = { low: 0, medium: 1, high: 2, critical: 3 };
  for (const row of rows) {
    const type = row.misconception_type ?? 'unknown';
    const severity = (row.severity ?? 'low') as 'low' | 'medium' | 'high' | 'critical';
    const current = groupedRows.get(type) ?? {
      misconception_type: type,
      count: 0,
      max_severity: 'low' as const,
      latest_confidence: row.confidence ?? 0,
      latest_description: row.description ?? '',
      latest_seen: row.created_at ?? new Date(0).toISOString(),
      competencies: new Set<string>(),
    };
    current.count += 1;
    if (severityRank[severity] > severityRank[current.max_severity]) {
      current.max_severity = severity;
    }
    if (row.competency) current.competencies.add(row.competency);
    groupedRows.set(type, current);
  }
  return NextResponse.json({
    success: true,
    data: [...groupedRows.values()].map((row) => ({
      ...row,
      competencies: [...row.competencies],
    })),
    asOf: new Date().toISOString(),
  });
}

async function getStudentInterventions(
  db: DashboardDb,
  telemetryIds: string[],
  request: NextRequest,
) {
  const limit = Math.min(
    25,
    Math.max(1, Number(request.nextUrl.searchParams.get('limit') ?? 25)),
  );
  const result = await db
    .from('interventions')
    .select('intervention_id, session_id, student_id, intervention_type, title, objective, priority, created_at')
    .in('student_id', telemetryIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (result.error) {
    return errorResponse('DATABASE_ERROR', 'Unable to load interventions', 503);
  }
  const rows = (result.data ?? []) as Intervention[];
  return NextResponse.json({
    success: true,
    data: rows.map((row) => ({
      id: row.intervention_id,
      student_id: row.student_id,
      intervention_type: row.intervention_type ?? 'unknown',
      description: row.objective ?? row.title ?? '',
      priority: row.priority ?? 'low',
      created_at: row.created_at ?? new Date(0).toISOString(),
      status: 'open',
    })),
    asOf: new Date().toISOString(),
  });
}

async function getStudentTimeline(
  db: DashboardDb,
  telemetryIds: string[],
  request: NextRequest,
) {
  const limit = Math.min(
    30,
    Math.max(1, Number(request.nextUrl.searchParams.get('limit') ?? 30)),
  );
  const sessionsResult = await db
    .from('student_sessions')
    .select('session_id, student_id, subject, activity_type, competency, started_at, ended_at, created_at')
    .in('student_id', telemetryIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (sessionsResult.error) {
    return errorResponse('DATABASE_ERROR', 'Unable to load learner timeline', 503);
  }
  const sessions = (sessionsResult.data ?? []) as Session[];
  const sessionIds = sessions.map((row) => row.session_id);
  const [misconceptionsResult, interventionsResult, profilesResult] = await Promise.all([
    sessionIds.length
      ? db.from('misconceptions').select('session_id').in('session_id', sessionIds).limit(limit * 10)
      : Promise.resolve({ data: [] as unknown[], error: null }),
    sessionIds.length
      ? db.from('interventions').select('session_id').in('session_id', sessionIds).limit(limit * 10)
      : Promise.resolve({ data: [] as unknown[], error: null }),
    sessionIds.length
      ? db.from('behavioral_profiles').select('session_id, mastery_indicator').in('session_id', sessionIds).limit(limit)
      : Promise.resolve({ data: [] as unknown[], error: null }),
  ]);
  if (misconceptionsResult.error || interventionsResult.error || profilesResult.error) {
    return errorResponse('DATABASE_ERROR', 'Unable to complete learner timeline', 503);
  }
  const misconceptionCounts = new Map<string, number>();
  for (const row of (misconceptionsResult.data ?? []) as Array<{ session_id: string }>) {
    misconceptionCounts.set(row.session_id, (misconceptionCounts.get(row.session_id) ?? 0) + 1);
  }
  const interventionCounts = new Map<string, number>();
  for (const row of (interventionsResult.data ?? []) as Array<{ session_id: string | null }>) {
    if (row.session_id) {
      interventionCounts.set(row.session_id, (interventionCounts.get(row.session_id) ?? 0) + 1);
    }
  }
  const masteryBySession = new Map(
    ((profilesResult.data ?? []) as Array<{ session_id: string; mastery_indicator: number | null }>)
      .map((row) => [row.session_id, row.mastery_indicator]),
  );
  return NextResponse.json({
    success: true,
    data: sessions.map((session) => {
      const started = parseIso(session.started_at);
      const ended = parseIso(session.ended_at);
      return {
        session_id: session.session_id,
        started_at: session.started_at ?? session.created_at ?? new Date(0).toISOString(),
        ended_at: session.ended_at,
        duration_minutes:
          started && ended
            ? Math.max(0, Math.floor((ended.getTime() - started.getTime()) / 60_000))
            : 0,
        topic: session.activity_type,
        competency: session.competency,
        mastery_indicator: masteryBySession.get(session.session_id) ?? undefined,
        misconception_count: misconceptionCounts.get(session.session_id) ?? 0,
        intervention_count: interventionCounts.get(session.session_id) ?? 0,
      };
    }),
    asOf: new Date().toISOString(),
  });
}

async function getCompetencySummary(
  db: DashboardDb,
  telemetryIds: string[],
  request: NextRequest,
) {
  const limit = Math.min(
    50,
    Math.max(1, Number(request.nextUrl.searchParams.get('limit') ?? 50)),
  );
  const sessionsResult = await db
    .from('student_sessions')
    .select('session_id, competency')
    .in('student_id', telemetryIds)
    .limit(limit * 4);
  if (sessionsResult.error) {
    return errorResponse('DATABASE_ERROR', 'Unable to load competency summary', 503);
  }
  const sessions = (sessionsResult.data ?? []) as Array<{ session_id: string; competency: string | null }>;
  const sessionIds = [...new Set(sessions.map((row) => row.session_id))];
  const [profilesResult, misconceptionsResult] = await Promise.all([
    sessionIds.length
      ? db.from('behavioral_profiles').select('session_id, mastery_indicator').in('session_id', sessionIds).limit(limit * 4)
      : Promise.resolve({ data: [] as unknown[], error: null }),
    sessionIds.length
      ? db.from('misconceptions').select('session_id, competency').in('session_id', sessionIds).limit(limit * 4)
      : Promise.resolve({ data: [] as unknown[], error: null }),
  ]);
  if (profilesResult.error || misconceptionsResult.error) {
    return errorResponse('DATABASE_ERROR', 'Unable to complete competency summary', 503);
  }
  const masteryBySession = new Map(
    ((profilesResult.data ?? []) as Array<{ session_id: string; mastery_indicator: number | null }>)
      .map((row) => [row.session_id, row.mastery_indicator]),
  );
  const misconceptionCountBySession = new Map<string, number>();
  for (const row of (misconceptionsResult.data ?? []) as Array<{ session_id: string }>) {
    misconceptionCountBySession.set(row.session_id, (misconceptionCountBySession.get(row.session_id) ?? 0) + 1);
  }
  const grouped = new Map<string, { session_count: number; misconception_count: number; mastery: number[] }>();
  for (const session of sessions) {
    if (!session.competency) continue;
    const current = grouped.get(session.competency) ?? { session_count: 0, misconception_count: 0, mastery: [] };
    current.session_count += 1;
    current.misconception_count += misconceptionCountBySession.get(session.session_id) ?? 0;
    const mastery = masteryBySession.get(session.session_id);
    if (mastery !== undefined && mastery !== null) current.mastery.push(mastery);
    grouped.set(session.competency, current);
  }
  const data = [...grouped.entries()].map(([competency, values]) => ({
    competency,
    session_count: values.session_count,
    misconception_count: values.misconception_count,
    average_mastery:
      values.mastery.length
        ? values.mastery.reduce((sum, value) => sum + value, 0) / values.mastery.length
        : 0,
  })).slice(0, limit);
  return NextResponse.json({ success: true, data, asOf: new Date().toISOString() });
}

async function getCompetencyTrends(
  db: DashboardDb,
  telemetryIds: string[],
  competency: string,
) {
  const sessionsResult = await db
    .from('student_sessions')
    .select('session_id')
    .in('student_id', telemetryIds)
    .eq('competency', competency)
    .limit(200);
  if (sessionsResult.error) {
    return errorResponse('DATABASE_ERROR', 'Unable to load competency trends', 503);
  }
  const sessionIds = ((sessionsResult.data ?? []) as Array<{ session_id: string }>).map((row) => row.session_id);
  if (sessionIds.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        competency,
        session_count: 0,
        misconception_frequency: {},
        severity_distribution: {},
        mastery_histogram: [0, 0, 0, 0, 0],
      },
      asOf: new Date().toISOString(),
    });
  }
  const [profilesResult, misconceptionsResult] = await Promise.all([
    db.from('behavioral_profiles').select('mastery_indicator').in('session_id', sessionIds).limit(200),
    db.from('misconceptions').select('misconception_type, severity').in('session_id', sessionIds).limit(200),
  ]);
  if (profilesResult.error || misconceptionsResult.error) {
    return errorResponse('DATABASE_ERROR', 'Unable to complete competency trends', 503);
  }
  const histogram = [0, 0, 0, 0, 0];
  for (const row of (profilesResult.data ?? []) as Array<{ mastery_indicator: number | null }>) {
    if (row.mastery_indicator === null) continue;
    const bucket = Math.max(0, Math.min(4, Math.floor(row.mastery_indicator * 5)));
    histogram[bucket] += 1;
  }
  const misconceptionFrequency: Record<string, number> = {};
  const severityDistribution: Record<string, number> = {};
  for (const row of (misconceptionsResult.data ?? []) as Array<{ misconception_type: string | null; severity: string | null }>) {
    const type = row.misconception_type ?? 'unknown';
    misconceptionFrequency[type] = (misconceptionFrequency[type] ?? 0) + 1;
    const severity = row.severity ?? 'low';
    severityDistribution[severity] = (severityDistribution[severity] ?? 0) + 1;
  }
  return NextResponse.json({
    success: true,
    data: {
      competency,
      session_count: sessionIds.length,
      misconception_frequency: misconceptionFrequency,
      severity_distribution: severityDistribution,
      mastery_histogram: histogram,
    },
    asOf: new Date().toISOString(),
  });
}

async function getAlerts(
  db: DashboardDb,
  telemetryIds: string[],
  request: NextRequest,
) {
  const limit = Math.min(
    50,
    Math.max(1, Number(request.nextUrl.searchParams.get('limit') ?? 50)),
  );
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const result = await db
    .from('behavioral_profiles')
    .select('session_id, student_id, primary_pattern, intervention_urgency, mastery_indicator, created_at')
    .in('student_id', telemetryIds)
    .eq('intervention_needed', true)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (result.error) {
    return errorResponse('DATABASE_ERROR', 'Unable to load alerts', 503);
  }
  const rows = (result.data ?? []) as Profile[];
  const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
  };
  return NextResponse.json({
    success: true,
    data: rows.map((row, index) => {
      const urgency = (row.intervention_urgency ?? 'medium').toLowerCase();
      return {
        id: `${row.session_id}:${index}`,
        alert_type: row.primary_pattern ?? 'intervention_needed',
        severity: severityMap[urgency] ?? 'medium',
        student_id: row.student_id,
        student_name: row.student_id,
        message: `${row.primary_pattern ?? 'Needs review'} pattern (${urgency} urgency)`,
        created_at: row.created_at ?? new Date(0).toISOString(),
        acknowledged: false,
      };
    }),
    asOf: new Date().toISOString(),
  });
}
