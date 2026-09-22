import { describe, expect, it } from 'vitest';
import { buildSocraticGuidancePrompt, getSocraticGuidanceStage } from '../socratic-guidance';

describe('socratic guidance', () => {
  it('starts with an orientation stage for a first short question', () => {
    expect(getSocraticGuidanceStage({ currentMessage: 'What is AI?', history: [] })).toBe('orient');
  });

  it('uses a hint stage when a learner reports being stuck after trying', () => {
    expect(getSocraticGuidanceStage({
      currentMessage: "I am stuck and don't know",
      history: [
        { role: 'user', content: 'I tried the example' },
        { role: 'model', content: 'What did you notice?' },
        { role: 'user', content: 'I am stuck and do not know' },
      ],
    })).toBe('hint');
  });

  it('keeps the tutor from immediately dumping the final answer', () => {
    const prompt = buildSocraticGuidancePrompt({ currentMessage: 'Explain blockchain', history: [] });
    expect(prompt).toContain('Ask at most one meaningful question per turn');
    expect(prompt).toContain('progressive hint ladder');
    expect(prompt).not.toContain('always give the final answer');
  });
});
