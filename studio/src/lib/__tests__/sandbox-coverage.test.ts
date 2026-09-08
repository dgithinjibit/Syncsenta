import { describe, expect, it } from 'vitest';
import { getActivitiesForGradeSubject } from '../sandbox-activities';

describe('sandbox subject coverage', () => {
  it('provides a guided foundation activity when authored content is not yet available', () => {
    const activities = getActivitiesForGradeSubject('g4', 'english');

    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({
      id: 'g4-english-guided-foundations',
      grade: 'g4',
      subject: 'english',
      type: 'explore',
    });
    expect(activities[0].learningObjectives.length).toBeGreaterThan(0);
  });
});
