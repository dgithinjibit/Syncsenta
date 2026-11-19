import { describe, expect, it } from 'vitest';
import {
  buildPhase2Overview,
  derivePhase2StudentStatus,
} from '@/lib/teacher/phase2-dashboard-shaping';

describe('derivePhase2StudentStatus', () => {
  it('marks high-urgency interventions as intervention-needed', () => {
    expect(derivePhase2StudentStatus({
      intervention_needed: true,
      intervention_urgency: 'high',
      mastery_indicator: 0.8,
    })).toBe('struggling');
  });

  it('does not infer a learner is struggling from low mastery alone', () => {
    expect(derivePhase2StudentStatus({
      intervention_needed: false,
      intervention_urgency: null,
      mastery_indicator: 0.15,
    })).toBe('active');
  });

  it('returns idle when no profile is available', () => {
    expect(derivePhase2StudentStatus(null)).toBe('idle');
  });
});

describe('buildPhase2Overview', () => {
  it('deduplicates assigned students and uses the latest session', () => {
    const overview = buildPhase2Overview(
      [
        { student_id: 'learner-db-id', subject: 'Mathematics', class_name: 'Grade 4A' },
        { student_id: 'learner-db-id', subject: 'English', class_name: 'Grade 4A' },
      ],
      [
        {
          id: 'learner-db-id',
          student_id: 'learner-school-id',
          user_id: 'learner-user-id',
          student_name: 'Amina Test',
          grade: 'Grade 4',
          school_name: 'Test School',
        },
      ],
      [
        {
          session_id: 'older',
          student_id: 'learner-user-id',
          activity_type: 'Fraction bars',
          competency: 'MATH.G4.FRACTIONS',
          subject: 'Mathematics',
          started_at: '2026-11-19T06:00:00Z',
          ended_at: '2026-11-19T06:20:00Z',
          created_at: '2026-11-19T06:20:00Z',
        },
        {
          session_id: 'newer',
          student_id: 'learner-school-id',
          activity_type: 'Fraction comparison',
          competency: 'MATH.G4.FRACTIONS',
          subject: 'Mathematics',
          started_at: '2026-11-19T06:40:00Z',
          ended_at: '2026-11-19T07:00:00Z',
          created_at: '2026-11-19T07:00:00Z',
        },
      ],
      {
        newer: {
          session_id: 'newer',
          primary_pattern: 'exploratory',
          engagement_score: 0.82,
          mastery_indicator: 0.75,
          intervention_needed: false,
          intervention_urgency: null,
        },
      },
      new Date('2026-11-19T07:05:00Z'),
    );

    expect(overview).toHaveLength(1);
    expect(overview[0]).toMatchObject({
      student_id: 'learner-db-id',
      student_name: 'Amina Test',
      status: 'active',
      current_subject: 'Mathematics',
      current_topic: 'Fraction comparison',
      duration_minutes: 20,
      mastery_indicator: 0.75,
      engagement_score: 0.82,
      primary_pattern: 'exploratory',
    });
  });

  it('does not create a learner row for an assignment missing a student record', () => {
    expect(buildPhase2Overview(
      [{ student_id: 'missing', subject: 'Mathematics', class_name: 'Grade 4A' }],
      [],
      [],
      {},
      new Date('2026-11-19T07:05:00Z'),
    )).toEqual([]);
  });
});
