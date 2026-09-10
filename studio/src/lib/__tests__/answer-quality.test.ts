/**
 * Tests for classifyAnswerQuality()
 *
 * Source: lib/omega-agent/answer-quality.ts
 *
 * These tests validate that the multi-signal classifier correctly identifies
 * correct, incorrect, partial, and unanswered turns — replacing the old
 * "response ends with ?" heuristic.
 *
 * Run: npx vitest run src/lib/__tests__/answer-quality.test.ts
 */

import { describe, it, expect } from 'vitest';
import { classifyAnswerQuality } from '../omega-agent/answer-quality';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function classify(
  student: string,
  assistant: string,
  scaffolding: 'Independent' | 'Guided' | 'Intensive' = 'Guided',
) {
  return classifyAnswerQuality(student, assistant, scaffolding);
}

// ─────────────────────────────────────────────────────────────────────────────
// Correct branch
// ─────────────────────────────────────────────────────────────────────────────

describe('correct classification', () => {
  it('detects "Exactly!" in the response', () => {
    const result = classify('The answer is 7', 'Exactly! 3 + 4 = 7. Can you try the next one?');
    expect(result.quality).toBe('correct');
    expect(result.shouldIncrementCorrect).toBe(true);
    expect(result.shouldResetConsecutiveWrong).toBe(true);
    expect(result.consecutiveWrongDelta).toBe(0);
  });

  it('detects "Well done" in the response', () => {
    const result = classify('Ndiyo, ni ugali', 'Well done! That is correct.');
    expect(result.quality).toBe('correct');
    expect(result.shouldIncrementCorrect).toBe(true);
  });

  it('detects "That\'s right" variant', () => {
    const result = classify('I think it is 42', "That's right! Great thinking. Now explain why.");
    expect(result.quality).toBe('correct');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('detects Kiswahili sawa confirmation', () => {
    const result = classify('Matatu tisa', 'Sawa! Hiyo ni sahihi. Una maswali zaidi?');
    expect(result.quality).toBe('correct');
  });

  it('detects "Spot on" confirmation', () => {
    const result = classify('8/10', 'Spot on! You got it. What about halves?');
    expect(result.quality).toBe('correct');
  });

  it('returns shouldIncrementCorrect=true when confidence >= 0.7', () => {
    const result = classify('3', 'Correct! Three matatus. Now can you count to ten?');
    expect(result.shouldIncrementCorrect).toBe(true);
  });

  it('Intensive scaffolding reduces confidence slightly but stays >= 0.7 for clear signals', () => {
    const result = classify('7', 'Exactly! Well done.', 'Intensive');
    expect(result.quality).toBe('correct');
    // Confidence should still be high enough to increment (>= 0.7)
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Incorrect branch
// ─────────────────────────────────────────────────────────────────────────────

describe('incorrect classification', () => {
  it('detects "Not quite" redirect', () => {
    const result = classify('I think it is 5', 'Not quite — remember that 3 + 4 = 7. Try again!');
    expect(result.quality).toBe('incorrect');
    expect(result.shouldIncrementCorrect).toBe(false);
    expect(result.consecutiveWrongDelta).toBe(1);
    expect(result.shouldResetConsecutiveWrong).toBe(false);
  });

  it('detects "The correct answer is" correction', () => {
    const result = classify('10', 'Almost! The correct answer is 8, not 10.');
    expect(result.quality).toBe('incorrect');
    expect(result.consecutiveWrongDelta).toBe(1);
  });

  it('detects Kiswahili "si sahihi"', () => {
    const result = classify('Saba', 'Si sahihi. Jaribu tena!');
    expect(result.quality).toBe('incorrect');
    expect(result.shouldIncrementCorrect).toBe(false);
  });

  it('detects "Let\'s try again" redirect', () => {
    const result = classify('I guess 100?', "Let's try again. What is 3 groups of 4?");
    expect(result.quality).toBe('incorrect');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unanswered branch
// ─────────────────────────────────────────────────────────────────────────────

describe('unanswered classification', () => {
  it('classifies a plain question from the student', () => {
    const result = classify('What is fractions?', 'Great question! A fraction is a part of a whole.');
    expect(result.quality).toBe('unanswered');
    expect(result.consecutiveWrongDelta).toBe(0); // question ≠ wrong
  });

  it('classifies "I don\'t know" as unanswered', () => {
    const result = classify("I don't know how to do this", 'That\'s OK. Let us start with something simple.');
    expect(result.quality).toBe('unanswered');
  });

  it('classifies "Can you explain?" as unanswered', () => {
    const result = classify('Can you explain how addition works?', 'Of course! Addition is combining groups...');
    expect(result.quality).toBe('unanswered');
  });

  it('classifies Kiswahili "Sijui" as unanswered', () => {
    const result = classify('Sijui hii', 'Sawa, tutaanza polepole.');
    expect(result.quality).toBe('unanswered');
  });

  it('does NOT increment consecutive_wrong for questions (just unanswered)', () => {
    const result = classify('How do I count?', 'Let me show you step by step.');
    expect(result.consecutiveWrongDelta).toBe(0);
    expect(result.shouldIncrementCorrect).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Partial branch
// ─────────────────────────────────────────────────────────────────────────────

describe('partial classification', () => {
  it('detects student gave an answer-like message with neutral response', () => {
    const result = classify(
      'I think it is because the numbers are added together',
      'Interesting! Can you be more specific about what happens when we add 3 and 4?',
    );
    // Student used "because" (answer pattern), response has no clear confirm/deny
    expect(result.quality).toBe('partial');
    expect(result.shouldIncrementCorrect).toBe(false); // 0.60 < 0.70 threshold
    expect(result.shouldResetConsecutiveWrong).toBe(true); // they tried
    expect(result.consecutiveWrongDelta).toBe(0);
  });

  it('student gives a numeric answer to neutral probing question', () => {
    const result = classify(
      '42',
      'Interesting choice! What makes you think 42 is the answer?',
    );
    expect(result.quality).toBe('partial');
    expect(result.shouldResetConsecutiveWrong).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Socratic question edge case
//
// A Socratic tutor ALWAYS ends with a question. The old heuristic would flag
// "Well done! Can you try the next one?" as UNANSWERED because it ends with '?'.
// The new classifier should recognise the confirmation before the trailing question.
// ─────────────────────────────────────────────────────────────────────────────

describe('Socratic trailing question edge case', () => {
  it('strips trailing question from response before checking correctness signals', () => {
    const result = classify(
      'The answer is 7',
      'Exactly! 3 + 4 = 7. Now can you tell me what 5 + 3 equals?',
    );
    expect(result.quality).toBe('correct');
    expect(result.shouldIncrementCorrect).toBe(true);
  });

  it('"Great answer! What comes next?" → correct, not unanswered', () => {
    const result = classify(
      'Fifteen',
      'Great answer! 15 is right. What comes after 15?',
    );
    expect(result.quality).toBe('correct');
  });

  it('"Well done! Now try this harder one?" → correct', () => {
    const result = classify(
      'I think it is a triangle',
      'Well done! That is a triangle. Can you name all three sides?',
    );
    expect(result.quality).toBe('correct');
    expect(result.shouldIncrementCorrect).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Return shape
// ─────────────────────────────────────────────────────────────────────────────

describe('return shape', () => {
  it('always returns all required fields', () => {
    const inputs = [
      ['I think 7', 'Exactly! Well done.'],
      ['How does this work?', 'Let me explain.'],
      ['Maybe 10?', "Not quite. Let's try again."],
      ['Because the numbers', 'Interesting. Can you say more?'],
    ] as const;

    for (const [student, assistant] of inputs) {
      const d = classify(student, assistant);
      expect(d).toHaveProperty('quality');
      expect(d).toHaveProperty('confidence');
      expect(d).toHaveProperty('reason');
      expect(d).toHaveProperty('shouldIncrementCorrect');
      expect(d).toHaveProperty('shouldResetConsecutiveWrong');
      expect(d).toHaveProperty('consecutiveWrongDelta');
    }
  });

  it('quality is always one of the four valid values', () => {
    const valid = ['correct', 'incorrect', 'partial', 'unanswered'];
    const inputs = [
      ['7', 'Exactly right!'],
      ['100', "Not quite, let's try again."],
      ['because reasons', 'Tell me more?'],
      ['what is this?', 'A good question!'],
    ] as const;
    for (const [s, a] of inputs) {
      expect(valid).toContain(classify(s, a).quality);
    }
  });

  it('confidence is always between 0 and 1', () => {
    const inputs = [
      ['7', 'Exactly!'],
      ['wrong', "Not quite"],
      ['huh?', 'Let me explain'],
    ] as const;
    for (const [s, a] of inputs) {
      const { confidence } = classify(s, a);
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    }
  });

  it('shouldIncrementCorrect is never true when quality is not correct', () => {
    const result = classify('5', "Not quite! Let's try again.");
    expect(result.quality).not.toBe('correct');
    expect(result.shouldIncrementCorrect).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Regression: the old "endsWith('?')" heuristic failure modes
// ─────────────────────────────────────────────────────────────────────────────

describe('regression: old endsWith(?) heuristic failures', () => {
  it('confirms a correct answer even when response ends with "?"', () => {
    // Old code: fullResponse.trimEnd().endsWith('?') → unanswered (WRONG)
    const result = classify('8', 'Correct! 8 is right. Can you do one more?');
    expect(result.quality).not.toBe('unanswered');
    expect(result.quality).toBe('correct');
  });

  it('detects incorrect even when response ends with "?"', () => {
    // Old code would see "?" → unanswered, missing that student was wrong
    const result = classify('3', "Not quite. Remember: 3 + 4 = 7, not 3. Want to try again?");
    expect(result.quality).toBe('incorrect');
  });
});
