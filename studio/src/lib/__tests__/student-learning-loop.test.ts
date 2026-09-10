import { describe, expect, it } from 'vitest';
import {
  buildTutorContext,
  createLearningLoop,
  restoreLearningLoop,
  serializeLearningLoop,
  enqueueLearningEvent,
  evaluateAttempt,
  getNextHint,
  type LearningLoopState,
} from '@/lib/progress/student-learning-loop';

describe('student learning loop', () => {
  it('starts with a deterministic, resumable state', () => {
    expect(createLearningLoop({ lessonId: 'fractions-1', masteryThreshold: 2 })).toEqual({
      lessonId: 'fractions-1',
      masteryThreshold: 2,
      attemptCount: 0,
      correctCount: 0,
      currentIndex: 0,
      hintLevel: 0,
      mastered: false,
      status: 'active',
    });
  });

  it('keeps an incorrect attempt active and increases the bounded hint level', () => {
    const state = createLearningLoop({ lessonId: 'fractions-1', masteryThreshold: 2 });
    const next = evaluateAttempt(state, { correct: false, answer: '1/3' });

    expect(next.attemptCount).toBe(1);
    expect(next.correctCount).toBe(0);
    expect(next.currentIndex).toBe(0);
    expect(next.hintLevel).toBe(1);
    expect(next.mastered).toBe(false);
    expect(getNextHint(next)).toMatch(/try|part|whole/i);
  });

  it('advances after a correct attempt and marks mastery at the threshold', () => {
    let state = createLearningLoop({ lessonId: 'fractions-1', masteryThreshold: 2 });
    state = evaluateAttempt(state, { correct: true, answer: '1/2' });
    expect(state.currentIndex).toBe(1);
    expect(state.correctCount).toBe(1);
    expect(state.hintLevel).toBe(0);

    state = evaluateAttempt(state, { correct: true, answer: '3/4' });
    expect(state.correctCount).toBe(2);
    expect(state.mastered).toBe(true);
    expect(state.status).toBe('completed');
  });

  it('creates compact tutor context with policy facts, not full history', () => {
    const state: LearningLoopState = {
      ...createLearningLoop({ lessonId: 'fractions-1', masteryThreshold: 2 }),
      attemptCount: 2,
      correctCount: 1,
      currentIndex: 1,
      hintLevel: 1,
    };
    const context = buildTutorContext({
      state,
      grade: 'Grade 4',
      subject: 'Mathematics',
      competency: 'MAT.G4.FRACTIONS',
      question: 'Which fraction is larger?',
    });

    expect(context).toContain('MAT.G4.FRACTIONS');
    expect(context).toContain('hint_level=1');
    expect(context).toContain('policy:bounded_hint');
    expect(context.length).toBeLessThan(700);
  });

  it('round-trips a bounded resumable loop and learner interest', () => {
    const state = evaluateAttempt(
      createLearningLoop({ lessonId: 'fractions-1', masteryThreshold: 2 }),
      { correct: false, answer: '1/3' },
    );
    const restored = restoreLearningLoop(
      serializeLearningLoop({ state, interestText: 'octopus'.repeat(80), savedAt: 123 }),
      { lessonId: 'fractions-1', masteryThreshold: 2 },
    );

    expect(restored?.state).toEqual(state);
    expect(restored?.interestText).toHaveLength(120);
  });

  it('rejects malformed or cross-lesson persisted state', () => {
    const state = createLearningLoop({ lessonId: 'fractions-1', masteryThreshold: 2 });
    const payload = serializeLearningLoop({ state, interestText: '' });

    expect(restoreLearningLoop('{"version":1}', { lessonId: 'fractions-1', masteryThreshold: 2 })).toBeNull();
    expect(restoreLearningLoop(payload, { lessonId: 'other-lesson', masteryThreshold: 2 })).toBeNull();
    expect(restoreLearningLoop(payload, { lessonId: 'fractions-1', masteryThreshold: 3 })).toBeNull();
  });

  it('deduplicates offline learning events by event id', () => {
    const event = { id: 'attempt-1', type: 'attempt' as const, payload: { correct: true } };
    expect(enqueueLearningEvent([], event)).toHaveLength(1);
    expect(enqueueLearningEvent([event], event)).toHaveLength(1);
  });
});
