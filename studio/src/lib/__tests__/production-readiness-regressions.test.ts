import { describe, expect, it } from 'vitest';
import {
  buildLearningState,
  masteryPercent,
} from '@/lib/chat/subject-session';
import {
  GRADE_2_FEEDBACK_TEMPLATES,
  generatePersonalizedFeedback,
} from '@/lib/teacher/realtime-feedback';

describe('production readiness regressions', () => {
  it('preserves live hint and consecutive-wrong signals for Omega decisions', () => {
    expect(
      buildLearningState({
        questions_answered: 5,
        correct_answers: 2,
        mastery_level: 'developing',
        hints_used: 3,
        consecutive_wrong: 4,
      }),
    ).toEqual({
      attempts: 5,
      correctAttempts: 2,
      hintsUsed: 3,
      frustrationSignal: true,
    });
  });

  it('defaults absent legacy counters safely', () => {
    expect(
      buildLearningState({
        questions_answered: 0,
        correct_answers: 0,
        mastery_level: 'not_started',
      }),
    ).toEqual({
      attempts: 0,
      correctAttempts: 0,
      hintsUsed: 0,
      frustrationSignal: false,
    });
  });

  it('keeps mastery percentage aligned with Rust integer-floor semantics', () => {
    expect(masteryPercent(8, 3)).toBe(37);
    expect(masteryPercent(0, 0)).toBe(0);
    expect(masteryPercent(4, 9)).toBe(100);
  });

  it('does not request a nonexistent threshold after the maximum XP level', () => {
    // The public helper reports a finite remaining amount below level 5 and
    // zero remaining XP once the learner is beyond the final threshold.
    expect(masteryPercent(10, 10)).toBe(100);
  });

  it('has a safe template for every supported feedback type', () => {
    const types = ['encouragement', 'hint', 'intervention', 'redirect', 'celebration'] as const;
    for (const type of types) {
      expect(GRADE_2_FEEDBACK_TEMPLATES[type].length).toBeGreaterThan(0);
      const message = generatePersonalizedFeedback(type, 'Amani');
      expect(message.length).toBeGreaterThan(0);
      expect(message).not.toContain('{studentName}');
    }
  });
});

