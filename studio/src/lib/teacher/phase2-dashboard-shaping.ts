export type Phase2Profile = {
  session_id: string;
  primary_pattern: string | null;
  engagement_score: number | null;
  mastery_indicator: number | null;
  intervention_needed: boolean;
  intervention_urgency: string | null;
};

export type Phase2Assignment = {
  student_id: string;
  subject: string | null;
  class_name: string;
};

export type Phase2Student = {
  id: string;
  student_id: string | null;
  user_id: string | null;
  student_name: string;
  grade: string;
  school_name: string | null;
};

export type Phase2Session = {
  session_id: string;
  student_id: string;
  activity_type: string | null;
  competency: string | null;
  subject: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string | null;
};

export type Phase2OverviewStudent = {
  student_id: string;
  student_name: string;
  status: 'active' | 'struggling' | 'idle';
  current_subject: string | null;
  current_topic: string | null;
  current_agent: 'telemetry';
  duration_minutes: number;
  last_activity: string;
  mastery_indicator: number | null;
  engagement_score: number | null;
  primary_pattern: string | null;
};

export function derivePhase2StudentStatus(
  profile: Pick<
    Phase2Profile,
    'intervention_needed' | 'intervention_urgency' | 'mastery_indicator'
  > | null,
): 'active' | 'struggling' | 'idle' {
  if (!profile) return 'idle';
  if (
    profile.intervention_needed &&
    ['high', 'critical'].includes(
      (profile.intervention_urgency ?? '').toLowerCase(),
    )
  ) {
    return 'struggling';
  }
  return 'active';
}

function parseTimestamp(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function buildPhase2Overview(
  assignments: Phase2Assignment[],
  students: Phase2Student[],
  sessions: Phase2Session[],
  profilesBySession: Record<string, Phase2Profile>,
  now: Date,
): Phase2OverviewStudent[] {
  const studentById = new Map(students.map((student) => [student.id, student]));
  const latestByStudent = new Map<string, Phase2Session>();

  for (const session of sessions) {
    const student = students.find((candidate) =>
      [candidate.id, candidate.student_id, candidate.user_id].includes(
        session.student_id,
      )
    );
    if (!student) continue;

    const existing = latestByStudent.get(student.id);
    const currentCreated = parseTimestamp(session.created_at);
    const existingCreated = existing
      ? parseTimestamp(existing.created_at)
      : null;
    if (
      !existing ||
      (currentCreated &&
        (!existingCreated || currentCreated.getTime() > existingCreated.getTime()))
    ) {
      latestByStudent.set(student.id, session);
    }
  }

  const byAssignment = new Map<
    string,
    { student: Phase2Student; subjects: Set<string> }
  >();
  for (const assignment of assignments) {
    const student = studentById.get(assignment.student_id);
    if (!student) continue;
    const current = byAssignment.get(student.id) ?? {
      student,
      subjects: new Set<string>(),
    };
    if (assignment.subject) current.subjects.add(assignment.subject);
    byAssignment.set(student.id, current);
  }

  const rows: Phase2OverviewStudent[] = [];
  for (const [studentId, { student }] of byAssignment) {
    const session = latestByStudent.get(studentId);
    const profile = session
      ? profilesBySession[session.session_id] ?? null
      : null;
    const ended = parseTimestamp(session?.ended_at ?? null);
    const started = parseTimestamp(session?.started_at ?? null);
    const durationMinutes =
      ended && started
        ? Math.max(0, Math.floor((ended.getTime() - started.getTime()) / 60_000))
        : 0;
    const lastActivity =
      ended ?? parseTimestamp(session?.created_at ?? null) ?? now;

    rows.push({
      student_id: student.id,
      student_name: student.student_name,
      status: derivePhase2StudentStatus(profile),
      current_subject: session?.subject ?? null,
      current_topic: session?.activity_type ?? null,
      current_agent: 'telemetry',
      duration_minutes: durationMinutes,
      last_activity: lastActivity.toISOString(),
      mastery_indicator: profile?.mastery_indicator ?? null,
      engagement_score: profile?.engagement_score ?? null,
      primary_pattern: profile?.primary_pattern ?? null,
    });
  }

  return rows.sort((a, b) => a.student_name.localeCompare(b.student_name));
}
