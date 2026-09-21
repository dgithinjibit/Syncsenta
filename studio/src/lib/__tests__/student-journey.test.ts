import { describe, expect, it } from 'vitest';
import { getGradePersonalizationCopy, getJourneyStepAfterGrade } from '../student-journey';

describe('student journey grade transition', () => {
  const coveredGrades = new Set(['Grade 1', 'Grade 2', 'Grade 3']);

  it('advances a covered grade to the LMS dashboard', () => {
    expect(getJourneyStepAfterGrade('Grade 2', coveredGrades)).toBe('dashboard');
  });

  it('keeps an unsupported grade on the grade step', () => {
    expect(getJourneyStepAfterGrade('Grade 10', coveredGrades)).toBe('grade');
  });

  it('gives the learner explicit feedback while the dashboard is prepared', () => {
    expect(getGradePersonalizationCopy('Grade 6')).toEqual({
      title: 'Personalizing your dashboard…',
      description: 'Preparing Grade 6 lessons, activities, and tutor support.',
    });
  });
});
