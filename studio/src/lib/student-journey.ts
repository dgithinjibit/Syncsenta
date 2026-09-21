export type JourneyStep = 'level' | 'grade' | 'dashboard';

/**
 * A covered grade completes onboarding and opens the LMS dashboard. Unsupported
 * grades remain on the grade step until curriculum coverage is available.
 */
export function getJourneyStepAfterGrade(
  grade: string,
  coveredGrades: ReadonlySet<string>,
): JourneyStep {
  return coveredGrades.has(grade) ? 'dashboard' : 'grade';
}

export function getGradePersonalizationCopy(grade: string): {
  title: string;
  description: string;
} {
  return {
    title: 'Personalizing your dashboard…',
    description: `Preparing ${grade} lessons, activities, and tutor support.`,
  };
}
