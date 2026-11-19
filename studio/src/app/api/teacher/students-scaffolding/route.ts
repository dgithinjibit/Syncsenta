/**
 * GET /api/teacher/students-scaffolding?studentIds=id1,id2,...
 *
 * Bulk-reads Redis LearningSession for each studentId and returns their
 * last Omega scaffolding level. Teachers use this to populate the Overview
 * student list with live scaffolding badges without a per-student round-trip.
 *
 * Response: Record<studentId, 'Independent' | 'Guided' | 'Intensive' | null>
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler';
import { getLearningSession } from '@/lib/session/session-persistence';

export const dynamic = 'force-dynamic';

export type ScaffoldingMap = Record<
  string,
  'Independent' | 'Guided' | 'Intensive' | null
>;

interface AssignmentQuery {
  select(columns: string): AssignmentQuery;
  eq(column: string, value: unknown): AssignmentQuery;
  in(column: string, values: unknown[]): AssignmentQuery;
  limit(count: number): Promise<{
    data: unknown[] | null;
    error: { message: string } | null;
  }>;
}

interface AssignmentDb {
  from(table: string): AssignmentQuery;
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

  // ── Bulk-read Redis (in parallel) ─────────────────────────────────────────
  const entries = await Promise.all(
    studentIds.map(async (id) => {
      try {
        const session = await getLearningSession(id);
        const level =
          (session?.preferences?.scaffoldingLevel as
            | 'Independent'
            | 'Guided'
            | 'Intensive'
            | undefined) ?? null;
        return [id, level] as const;
      } catch {
        return [id, null] as const;
      }
    }),
  );

  const result: ScaffoldingMap = Object.fromEntries(entries);
  return NextResponse.json(result);
}
