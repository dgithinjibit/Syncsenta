/**
 * GET /api/teacher/students-scaffolding?studentIds=id1,id2,...
 *
 * Bulk-reads Redis LearningSession for each assigned student and returns the
 * last recorded Omega scaffolding decision snapshot. Session keys use auth
 * user IDs, so student-row IDs are resolved through students.user_id.
 *
 * Response: Record<studentId, ScaffoldingSnapshot | null>
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler';
import {
  getLearningSessionReadResult,
  type OmegaScaffoldingDecisionSnapshot,
  type OmegaScaffoldingLevel,
} from '@/lib/session/session-persistence';

export const dynamic = 'force-dynamic';

export interface ScaffoldingSnapshot {
  level: OmegaScaffoldingLevel;
  capturedAt: string | null;
  decidedAt?: string;
  nextAction?: string;
  hint?: string;
  rulesetVersion?: string;
  evidence?: string[];
}

export type ScaffoldingMap = Record<string, ScaffoldingSnapshot | null>;

interface ScaffoldingQuery {
  select(columns: string): ScaffoldingQuery;
  eq(column: string, value: unknown): ScaffoldingQuery;
  in(column: string, values: unknown[]): ScaffoldingQuery;
  limit(count: number): Promise<{
    data: unknown[] | null;
    error: { message: string } | null;
  }>;
}

interface AssignmentDb {
  from(table: string): ScaffoldingQuery;
}

function isScaffoldingLevel(value: unknown): value is OmegaScaffoldingLevel {
  return value === 'Independent' || value === 'Guided' || value === 'Intensive';
}

function isDecisionSnapshot(
  value: unknown,
): value is OmegaScaffoldingDecisionSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const snapshot = value as Record<string, unknown>;
  return (
    isScaffoldingLevel(snapshot.level) &&
    typeof snapshot.capturedAt === 'string' &&
    !Number.isNaN(Date.parse(snapshot.capturedAt)) &&
    (snapshot.decidedAt === undefined ||
      (typeof snapshot.decidedAt === 'string' &&
        !Number.isNaN(Date.parse(snapshot.decidedAt)))) &&
    typeof snapshot.nextAction === 'string' &&
    typeof snapshot.hint === 'string' &&
    (snapshot.rulesetVersion === undefined ||
      typeof snapshot.rulesetVersion === 'string') &&
    (snapshot.evidence === undefined ||
      (Array.isArray(snapshot.evidence) &&
        snapshot.evidence.every((item) => typeof item === 'string')))
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseRouteHandlerClient();

  // ── Auth ────────────────────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Role check ────────────────────────────────────────────────────────────
  const { data: requesterProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!['teacher', 'admin'].includes(requesterProfile?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Parse studentIds ──────────────────────────────────────────────────────
  const raw = request.nextUrl.searchParams.get('studentIds') ?? '';
  const studentIds = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50); // cap at 50 to prevent abuse

  if (studentIds.length === 0) {
    return NextResponse.json({} as ScaffoldingMap);
  }

  if (requesterProfile?.role === 'teacher') {
    const db = supabase as unknown as AssignmentDb;
    const { data: assignments, error: assignmentsError } = await db
      .from('teacher_student_assignments')
      .select('student_id')
      .eq('teacher_id', user.id)
      .eq('status', 'active')
      .in('student_id', studentIds)
      .limit(50);
    if (assignmentsError) {
      return NextResponse.json(
        { error: 'Failed to verify assigned students' },
        { status: 500 },
      );
    }
    const assignedIds = new Set(
      ((assignments ?? []) as Array<{ student_id: string }>).map(
        (row) => row.student_id,
      ),
    );
    const authorizedIds = studentIds.filter((id) => assignedIds.has(id));
    if (authorizedIds.length !== studentIds.length) {
      return NextResponse.json(
        { error: 'Student is outside the caller roster' },
        { status: 403 },
      );
    }
  }

  const db = supabase as unknown as AssignmentDb;
  const { data: studentRows, error: studentsError } = await db
    .from('students')
    .select('id, user_id')
    .in('id', studentIds)
    .limit(50);
  if (studentsError) {
    return NextResponse.json(
      { error: 'Failed to resolve student accounts' },
      { status: 500 },
    );
  }
  const students = (studentRows ?? []) as Array<{
    id: string;
    user_id: string | null;
  }>;
  const userIdsByStudentId = new Map(
    students
      .filter(
        (student): student is { id: string; user_id: string } =>
          typeof student.user_id === 'string',
      )
      .map((student) => [student.id, student.user_id] as const),
  );

  // ── Bulk-read Redis (in parallel) ─────────────────────────────────────────
  const reads = await Promise.all(
    studentIds.map(async (id) => {
      const userId = userIdsByStudentId.get(id);
      if (!userId) return { id, status: 'missing' as const };

      const read = await getLearningSessionReadResult(userId);
      if (read.status !== 'found') {
        return { id, status: read.status };
      }

      const session = read.session;
      const decision = session?.preferences?.scaffoldingDecision;
      if (isDecisionSnapshot(decision)) {
        return {
          id,
          status: 'found' as const,
          snapshot: {
            level: decision.level,
            capturedAt: decision.capturedAt,
            ...(decision.decidedAt ? { decidedAt: decision.decidedAt } : {}),
            nextAction: decision.nextAction,
            hint: decision.hint,
            ...(decision.rulesetVersion
              ? { rulesetVersion: decision.rulesetVersion }
              : {}),
            ...(decision.evidence ? { evidence: decision.evidence } : {}),
          },
        };
      }

      const legacyLevel = session?.preferences?.scaffoldingLevel;
      return {
        id,
        status: isScaffoldingLevel(legacyLevel) ? 'found' as const : 'missing' as const,
        snapshot: isScaffoldingLevel(legacyLevel)
          ? { level: legacyLevel, capturedAt: null }
          : null,
      };
    }),
  );

  if (reads.some((read) => read.status === 'unavailable')) {
    return NextResponse.json(
      { error: 'Teacher decision snapshots are temporarily unavailable' },
      { status: 503 },
    );
  }

  const result: ScaffoldingMap = Object.fromEntries(
    reads.map((read) => [
      read.id,
      read.status === 'found' ? read.snapshot : null,
    ]),
  );
  return NextResponse.json(result);
}
