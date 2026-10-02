/**
 * Roster shaping for `/api/teacher/roster` — the pure half of the route.
 *
 * This lives OUTSIDE `src/app/` on purpose: a Next.js `route.ts` may export only
 * HTTP handlers and route-config fields, and `route-exports.test.ts` enforces it.
 * Spoon 13 learned this the expensive way — exporting `deriveStatus` from the
 * route module failed `next build` on Vercel (2026-10-02) even though `tsc` and
 * vitest were green, exactly the trap the exam-allocation helper had already
 * documented (§ "the exam helper moved out of its route module").
 *
 * Data path (verified live 2026-10-02, project tumikgwhrbvirpjswlzh):
 *   teacher_student_assignments.student_id -> students.id   (FK)
 *   students.user_id == profiles.id                         (last_seen_at)
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

export type AssignmentRow = { student_id: string; subject: string | null; class_name: string };
export type StudentRow = { id: string; student_name: string; grade: string; school_name: string | null; user_id: string | null };
export type ProfileRow = { id: string; last_seen_at: string | null };

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
