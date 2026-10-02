import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler';
import {
  buildRoster,
  type AssignmentRow,
  type ProfileRow,
  type StudentRow,
} from '@/lib/teacher/roster-shaping';

/**
 * API Route: /api/teacher/roster
 *
 * The roster for the legacy live-monitoring view (`/teacher`). Before this
 * route existed, that view asked the undeployed Rust service
 * (`NEXT_PUBLIC_BACKEND_API_URL` + `/students`) and therefore showed
 * "Live monitoring is not connected / No students to show" even though the
 * data has been in Supabase the whole time.
 *
 * Only the HTTP half lives here. The shaping (`deriveStatus`, `buildRoster`,
 * `RosterStudent`) is in `@/lib/teacher/roster-shaping`, because Next forbids
 * non-handler exports in a route module — spoon 13 lost a Vercel build to
 * exactly that (2026-10-02: `"deriveStatus" is not a valid Route export
 * field`), the same trap `route-exports.test.ts` was written for.
 *
 * Security model — same as /api/teacher/assignments:
 *   - the caller is identified by the session cookie; teacherId always comes
 *     from auth.getUser(), never from query or body;
 *   - explicit `.eq('teacher_id', user.id)` plus RLS as the second defense.
 *
 * questions/progress are 0 by design: no deployed table feeds them per
 * learner yet, and inventing numbers in a monitoring view is exactly the
 * kind of fake this project has been cutting. (ROADMAP: wire real
 * analytics post-submission.)
 */

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generated Database types do not cover these tables (same allowlist
    // situation as /api/teacher/assignments); cast once here rather than
    // sprinkling `any` through the shaping code.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    const { data: assignmentRows, error: assignmentsError } = await db
      .from('teacher_student_assignments')
      .select('student_id, subject, class_name')
      .eq('teacher_id', user.id)
      .eq('status', 'active')
      .limit(500);

    if (assignmentsError) {
      console.error('Error fetching teacher assignments for roster:', assignmentsError);
      return NextResponse.json({ error: 'Failed to fetch roster' }, { status: 500 });
    }

    const rows = (assignmentRows ?? []) as AssignmentRow[];
    const studentIds = [...new Set(rows.map((r) => r.student_id))];
    if (studentIds.length === 0) {
      return NextResponse.json({ success: true, students: [] });
    }

    const { data: studentRecords, error: studentsError } = await db
      .from('students')
      .select('id, student_name, grade, school_name, user_id')
      .in('id', studentIds)
      .limit(500);

    if (studentsError) {
      console.error('Error fetching student records for roster:', studentsError);
      return NextResponse.json({ error: 'Failed to fetch roster' }, { status: 500 });
    }

    const studentList = (studentRecords ?? []) as StudentRow[];
    const userIds = [...new Set(studentList.map((s) => s.user_id).filter(Boolean))] as string[];

    let profileRecords: ProfileRow[] = [];
    if (userIds.length > 0) {
      const { data, error: profilesError } = await db
        .from('profiles')
        .select('id, last_seen_at')
        .in('id', userIds);
      if (profilesError) {
        // Last-seen is cosmetic (online/idle/offline); a failure here must
        // not blank the whole roster.
        console.warn('Roster: profiles last_seen unavailable:', profilesError.message);
      } else {
        profileRecords = (data ?? []) as ProfileRow[];
      }
    }

    return NextResponse.json({
      success: true,
      students: buildRoster(rows, studentList, profileRecords, new Date()),
    });
  } catch (error) {
    console.error('Error in GET /api/teacher/roster:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
