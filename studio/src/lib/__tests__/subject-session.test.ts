import { describe, expect, it } from 'vitest';
import { SUBJECT_REGISTRY } from '../chat/subject-session';

describe('extended subject registry', () => {
  it('exposes one AI Literacy course on the stable ai slug', () => {
    expect(SUBJECT_REGISTRY.ai).toMatchObject({
      label: 'AI Literacy',
      layout: 'chat',
      xpPrefix: 'ai.',
    });
  });

  it('does not expose the duplicate Superintelligence subject', () => {
    expect(SUBJECT_REGISTRY.superintelligence).toBeUndefined();
  });
});
