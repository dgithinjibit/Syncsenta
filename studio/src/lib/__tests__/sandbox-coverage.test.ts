import { describe, expect, it } from 'vitest';
import { getActivitiesForGradeSubject, getActivityById } from '../sandbox-activities';

describe('sandbox subject coverage', () => {
  it('provides a guided foundation activity when authored content is not yet available', () => {
    const activities = getActivitiesForGradeSubject('g4', 'english');

    expect(activities.length).toBeGreaterThan(1);
    expect(activities).toContainEqual(expect.objectContaining({
      id: 'g4-english-guided-foundations',
      grade: 'g4',
      subject: 'english',
      type: 'explore',
    }));
    expect(activities[0].learningObjectives.length).toBeGreaterThan(0);
  });

  it('resolves the generated activity ID for the activity player', () => {
    expect(getActivityById('g4-english-guided-foundations')).toMatchObject({
      grade: 'g4',
      subject: 'english',
    });
  });

  it('resolves the generated Grade 4 Mathematics fallback activity', () => {
    expect(getActivityById('g4-mathematics-guided-foundation')).toMatchObject({
      grade: 'g4',
      subject: 'mathematics',
      type: 'explore',
    });
  });

  it('provides curriculum-backed Grade 4 catalogues for every core subject', () => {
    const subjects = [
      'mathematics', 'english', 'kiswahili', 'environmental',
      'social-studies', 'cre', 'creative', 'indigenous',
    ] as const;

    for (const subject of subjects) {
      const activities = getActivitiesForGradeSubject('g4', subject, false);
      expect(activities.length, subject).toBeGreaterThan(1);
      const curriculumActivity = activities.find(activity => /^g4-.*-s\d+-ss\d+$/.test(activity.id));
      expect(curriculumActivity, subject).toBeDefined();
      expect(getActivityById(curriculumActivity!.id)).toMatchObject({ grade: 'g4', subject });
    }
  });

  it('consumes all available lower-primary, upper-primary, and junior-secondary curriculum data', () => {
    const curriculumCombos = [
      ...(['g1', 'g2', 'g3'] as const).flatMap(grade =>
        (['mathematics', 'english', 'kiswahili', 'environmental', 'cre', 'creative'] as const)
          .map(subject => [grade, subject] as const),
      ),
      ...(['g4', 'g5', 'g6'] as const).flatMap(grade =>
        (['mathematics', 'english', 'kiswahili', 'environmental', 'social-studies', 'cre', 'creative', 'indigenous'] as const)
          .map(subject => [grade, subject] as const),
      ),
      ...(['g7', 'g8', 'g9'] as const).flatMap(grade =>
        (['mathematics', 'english', 'environmental', 'social-studies'] as const)
          .map(subject => [grade, subject] as const),
      ),
    ];

    for (const [grade, subject] of curriculumCombos) {
      const activities = getActivitiesForGradeSubject(grade, subject, false);
      const curriculumActivity = activities.find(activity => activity.id.startsWith(`${grade}-${subject}-s`));
      expect(curriculumActivity, `${grade}/${subject}`).toBeDefined();
      expect(getActivityById(curriculumActivity!.id)).toMatchObject({ grade, subject });
    }
  });
});
