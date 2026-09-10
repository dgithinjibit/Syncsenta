export type EvidenceBand = 'emerging' | 'developing' | 'secure';

export interface TeacherReflectionInput {
  teacherId: string;
  studentId: string;
  schoolName: string;
  subject: string;
  masteryPercent: number;
  teacherSummary: string;
  nextStep: string;
  parentLinked: boolean;
  parentConsent: boolean;
}

export interface ReflectionEvidencePlan {
  head: {
    schoolName: string;
    learnerCount: 1;
    subject: string;
    band: EvidenceBand;
    metric: 'mastery_percent';
    message: string;
  };
  parent: {
    studentReference: string;
    schoolName: string;
    subject: string;
    masteryPercent: number;
    band: EvidenceBand;
    teacherSummary: string;
    nextStep: string;
  } | null;
}

const MAX_FIELD = 500;

function bounded(value: unknown, max = MAX_FIELD): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function bandForMastery(value: number): EvidenceBand {
  if (value >= 70) return 'secure';
  if (value >= 40) return 'developing';
  return 'emerging';
}

export function buildReflectionEvidencePlan(input: TeacherReflectionInput): ReflectionEvidencePlan | null {
  if (!bounded(input.teacherId) || !bounded(input.studentId, 256) || !bounded(input.schoolName)
    || !bounded(input.subject, 120) || !bounded(input.teacherSummary)
    || !bounded(input.nextStep) || !Number.isFinite(input.masteryPercent)
    || input.masteryPercent < 0 || input.masteryPercent > 100) return null;

  const masteryPercent = Math.round(input.masteryPercent);
  const band = bandForMastery(masteryPercent);
  return {
    head: {
      schoolName: input.schoolName.trim(),
      learnerCount: 1,
      subject: input.subject.trim(),
      band,
      metric: 'mastery_percent',
      message: `One learner in ${input.subject.trim()} is in the ${band} band (${masteryPercent}%).`,
    },
    parent: input.parentLinked && input.parentConsent ? {
      studentReference: input.studentId.trim(),
      schoolName: input.schoolName.trim(),
      subject: input.subject.trim(),
      masteryPercent,
      band,
      teacherSummary: input.teacherSummary.trim(),
      nextStep: input.nextStep.trim(),
    } : null,
  };
}
