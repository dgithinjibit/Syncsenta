import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler';

/**
 * API Route: /api/teacher/roster
 *
 * The roster for the legacy live-monitoring view (`/teacher`). Before this
 * route existed, that view asked the undeployed Rust service
 * (`NEXT_PUBLIC_BACKEND_API_URL` + `/students`) and therefore showed
 * "Live monitoring is not connected / No students to show" even though the
 * data has been in Supabase the whole time.
 *
 * Data path (verified live 2026-10-02, project tumikgwhrbvirpjswlzh):
 *   teacher_student_assignments.student_id -> students.id   (FK)
 *   students.user_id == profiles.id                         (last_seen_at)
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

export type RosterStudent = {
  id: string;
  name: string;
  location: string;
  grade: string;
  subject: string;
  status: 'online' | 'idle' | 'offline';
  questions: number;
  progress: number;
  last_active: string | null;
};

type AssignmentRow = { student_id: string; subject: string | null; class_name: string };
type StudentRow = { id: string; student_name: string; grade: string; school_name: string | null; user_id: string | null };
type ProfileRow = { id: string; last_seen_at: string | null };

const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const IDLE_WINDOW_MS = 60 * 60 * 1000;

export function deriveStatus(lastSeenAt: string | null, now: Date): 'online' | 'idle' | 'offline' {
  if (!lastSeenAt) return 'offline';
  const seen = new Date(lastSeenAt).getTime();
  if (Number.isNaN(seen)) return 'offline';
  const age = now.getTime() - seen;
  if (age <= ONLINE_WINDOW_MS) return 'online';
  if (age <= IDLE_WINDOW_MS) return 'idle';
  return 'offline';
}

export function buildRoster(
  assignments: AssignmentRow[],
  students: StudentRow[],
  profiles: ProfileRow[],
  now: Date,
): RosterStudent[] {
  const studentById = new Map(students.map((s) => [s.id, s]));
  const lastSeenByProfileId = new Map(profiles.map((p) => [p.id, p.last_seen_at]));

  // One entry per learner; their subjects collapse into one string.
  const byStudent = new Map<string, { subjects: string[]; class_name: string }>();
  for (const row of assignments) {
    const current = byStudent.get(row.student_id) ?? { subjects: [], class_name: row.class_name };
    if (row.subject && !current.subjects.includes(row.subject)) current.subjects.push(row.subject);
    byStudent.set(row.student_id, current);
  }

  const roster: RosterStudent[] = [];
  for (const [studentId, { subjects, class_name }] of byStudent) {
    const student = studentById.get(studentId);
    if (!student) continue; // assignment points at a deleted learner: no ghost rows
    const lastSeenAt = student.user_id ? lastSeenByProfileId.get(student.user_id) ?? null : null;
    roster.push({
      id: student.id,
      name: student.student_name,
      location: student.school_name ?? '',
      grade: student.grade || class_name,
      subject: subjects.join(' · '),
      status: deriveStatus(lastSeenAt, now),
      questions: 0,
      progress: 0,
      last_active: lastSeenAt,
    });
  }

  return roster.sort((a, b) => a.name.localeCompare(b.name));
}

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
