/**
 * Developmental planes and the posture each one implies for screen time and
 * reward language.
 *
 * The pedagogy registry (./pedagogy.ts) records two positions it deliberately
 * does *not* adopt — Waldorf's screen limits and Montessori/Reggio's rejection
 * of extrinsic reward — and resolves both the same way: the answer depends on
 * the learner's developmental plane. That makes this mapping load-bearing. As
 * prose in `docs/research/` it decides nothing; every surface would pick its own
 * cut-off and the registry's boundary lines would be unfalsifiable. So the
 * cut-off is one pure, tested function here and every surface reads it.
 *
 * The planes are Montessori's (see the four planes of development, cited in the
 * registry). Grade 12 is the oldest learner SyncSenta serves, so Plane IV
 * (18-24) is deliberately absent rather than padded.
 */

export type LearningPlane = 'plane-i' | 'plane-ii' | 'plane-iii';

/**
 * What the learner, as opposed to a teacher or parent, is shown first.
 * `mastery-only` still records points — it changes which surface leads.
 */
export type LearnerFacingRewardSurface = 'mastery-only' | 'points-may-lead';

export interface PlanePosture {
  plane: LearningPlane;
  /** Montessori's own name for the plane, so the mapping stays checkable. */
  readonly montessoriName: string;
  /** CBC grades this plane covers, in the app's canonical spelling. */
  readonly grades: readonly string[];
  /** Approximate age band. Ages are indicative; the grade is what the system has. */
  readonly ages: string;
  /** Upper bound on one continuous learner-facing session, in minutes. */
  readonly sessionCapMinutes: number;
  /** True when a session must route the learner to a named offline activity. */
  readonly offlineActivityRequired: boolean;
  readonly learnerFacingRewardSurface: LearnerFacingRewardSurface;
  /** Why these numbers, in one line a reviewer can argue with. */
  readonly rationale: string;
}

export const LEARNING_PLANES: readonly PlanePosture[] = [
  {
    plane: 'plane-i',
    montessoriName: 'The Absorbent Mind (birth-6)',
    grades: ['PP1', 'PP2'],
    ages: '4-6',
    sessionCapMinutes: 15,
    offlineActivityRequired: true,
    learnerFacingRewardSurface: 'mastery-only',
    rationale:
      'Waldorf reads this band as needing no electronic media at all, so the screen posture is a short guided session that hands the learner back to a physical activity. Reward language is mastery because a five-year-old cannot yet use a score as information.',
  },
  {
    plane: 'plane-ii',
    montessoriName: 'The Reasoning Mind (6-12)',
    grades: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
    ages: '6-12',
    sessionCapMinutes: 45,
    offlineActivityRequired: false,
    learnerFacingRewardSurface: 'mastery-only',
    rationale:
      'The cap matches one timed CBC lesson (35-45 minutes) so the tutor never outlasts the period it sits inside. Points keep recording for the teacher and parent views but do not lead the reply: the registry follows Montessori in treating "you can now do X" as the useful message at this age.',
  },
  {
    plane: 'plane-iii',
    montessoriName: 'The Social Self (12-18)',
    grades: ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
    ages: '12-18',
    sessionCapMinutes: 60,
    offlineActivityRequired: false,
    learnerFacingRewardSurface: 'points-may-lead',
    rationale:
      'Junior and Senior School learners read a streak as feedback on their own persistence, which is closer to each approach\'s own age theory than one rule applied to a five-year-old and a seventeen-year-old. The cap stays because a longer ceiling is a timetable decision, not a developmental licence.',
  },
] as const;

/**
 * Canonical grade spellings used elsewhere in the app are 'PP1' and 'Grade 7';
 * the database and route params also deliver 'pp1', 'g7', 'grade-7' and
 * 'Grade 7'. Normalise to 'pp1' / '7' / '' and let callers see one shape.
 */
export function normalizeGradeKey(grade: string): string {
  const raw = String(grade ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (raw === 'pp1' || raw === 'pp2') return raw;
  const withPrefix = raw.replace(/^(grade|g)/, '');
  return /^\d{1,2}$/.test(withPrefix) ? withPrefix : '';
}

/** The plane a learner sits in, or null when the grade is not recognisable. */
export function learningPlaneForGrade(grade: string): LearningPlane | null {
  const key = normalizeGradeKey(grade);
  if (key === 'pp1' || key === 'pp2') return 'plane-i';
  const number = Number(key);
  if (!Number.isInteger(number) || number < 1 || number > 12) return null;
  return number <= 6 ? 'plane-ii' : 'plane-iii';
}

export function planePostureForGrade(grade: string): PlanePosture | null {
  const plane = learningPlaneForGrade(grade);
  if (!plane) return null;
  return LEARNING_PLANES.find((posture) => posture.plane === plane) ?? null;
}

/**
 * One-line rendering for a tutor or lesson-plan prompt. This is what makes the
 * two hybrids real: a reply that never sees the session cap or the reward
 * surface cannot honour them.
 */
export function formatPlanePostureLine(grade: string): string {
  const posture = planePostureForGrade(grade);
  if (!posture) {
    return '# LEARNER STAGE POSTURE\nThe learner grade was not recognisable, so no stage posture applies. Ask for the grade before setting session length or reward language, and default to mastery language rather than points.';
  }
  const reward =
    posture.learnerFacingRewardSurface === 'mastery-only'
      ? 'Lead with what the learner can now do. Do not open or close a reply with points, badges or streaks; they are recorded for the teacher and parent views instead.'
      : 'Points, streaks and badges may lead, but still name the specific skill the learner gained.';
  const offline = posture.offlineActivityRequired
    ? `Every session in this plane must end by routing the learner to a named offline, no-screen activity.`
    : `An offline activity is optional at this stage; do not extend a session past ${posture.sessionCapMinutes} minutes.`;
  return [
    '# LEARNER STAGE POSTURE (from the pedagogy registry)',
    `Stage: ${posture.montessoriName}, grades ${posture.grades[0]}-${posture.grades[posture.grades.length - 1]} (approx. ages ${posture.ages}).`,
    `Session cap: ${posture.sessionCapMinutes} minutes of continuous learner-facing work.`,
    offline,
    `Reward language (${posture.learnerFacingRewardSurface}): ${reward}`,
  ].join('\n');
}
