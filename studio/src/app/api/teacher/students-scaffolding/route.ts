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
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getLearningSession } from '@/lib/session/session-persistence';

export const dynamic = 'force-dynamic';

export type ScaffoldingMap = Record<
  string,
  'Independent' | 'Guided' | 'Intensive' | null
>;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = getSupabaseServerClient();

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
