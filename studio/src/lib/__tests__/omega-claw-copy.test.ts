/**
 * O-1 — the challenge path renders the words the API already returns.
 *
 * `interactive-challenge-path.tsx` printed the rule engine's raw symbol
 * (`Guided hint 2: isolate-step`) while the very response it had just received
 * carried `hintMessage` with the child-readable sentence, and it kept a
 * hand-written near-duplicate of `nextActionMessage` for each branch. Two
 * consequences: a learner reads a symbol instead of a sentence, and learner-
 * facing copy exists in two places, so only the untested one can be trusted.
 *
 * The strings the server sends are what `OMEGA_CLAW_HINT_COPY` /
 * `OMEGA_CLAW_ACTION_COPY` produce (`omega-claw-api.ts:130,163`), and those
 * tables are asserted against the MeTTa pack by `omega-claw-rules.test.ts`, so
 * rendering them verbatim puts the copy under the pack's own tests. The
 * fallbacks below are for the one case where there is no server answer at all:
 * `postOmegaClaw()` returns `null` when the fetch fails.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  OMEGA_CLAW_ACTION_COPY,
  OMEGA_CLAW_HINT_COPY,
  type OmegaClawHint,
} from '@/lib/omega-agent/omega-claw-rules';
import { answerFeedback, hintFeedback } from '@/lib/omega-claw-copy';

describe('hintFeedback', () => {
  it('says the server sentence rather than the rule symbol', () => {
    const line = hintFeedback({
      hintLevel: 2,
      hint: 'isolate-step',
      hintMessage: OMEGA_CLAW_HINT_COPY['isolate-step'],
    });
    expect(line).toBe(OMEGA_CLAW_HINT_COPY['isolate-step']);
    expect(line).not.toContain('isolate-step');
  });

  it('renders the pack sentence for every rung of the ladder', () => {
    for (const hint of Object.keys(OMEGA_CLAW_HINT_COPY) as OmegaClawHint[]) {
      expect(hintFeedback({ hint, hintMessage: OMEGA_CLAW_HINT_COPY[hint] })).toBe(
        OMEGA_CLAW_HINT_COPY[hint],
      );
    }
  });

  it('does not invent a sentence when the response has no message', () => {
    expect(hintFeedback({ hintLevel: 3, hint: 'representation' })).toBe(hintFeedback(null));
  });

  it('falls back once, and the fallback is the same string for every level', () => {
    expect(hintFeedback(null)).toBe(hintFeedback({}));
  });
});

describe('answerFeedback', () => {
  it('renders nextActionMessage for a correct answer', () => {
    expect(
      answerFeedback(
        { nextAction: 'celebrate-transfer', nextActionMessage: OMEGA_CLAW_ACTION_COPY['celebrate-transfer'] },
        true,
      ),
    ).toBe(OMEGA_CLAW_ACTION_COPY['celebrate-transfer']);
  });

  it('keeps the per-action distinction through the server words, not two local strings', () => {
    const celebrate = answerFeedback(
      { nextActionMessage: OMEGA_CLAW_ACTION_COPY['celebrate-transfer'] },
      true,
    );
    const unlock = answerFeedback(
      { nextActionMessage: OMEGA_CLAW_ACTION_COPY['unlock-next-node'] },
      true,
    );
    expect(celebrate).not.toBe(unlock);
  });

  it('renders the server sentence for an incorrect answer too', () => {
    const message = OMEGA_CLAW_ACTION_COPY['scaffold-retry'];
    expect(
      answerFeedback({ nextAction: 'scaffold-retry', nextActionMessage: message }, false),
    ).toBe(message);
  });

  it('never claims a server verdict when the request failed', () => {
    const offline = answerFeedback(null, true);
    expect(offline).toBe(answerFeedback({}, true));
    expect(offline.length).toBeGreaterThan(0);
  });
});

describe('the component keeps no learner copy of its own', () => {
  const file = join(process.cwd(), 'src', 'components', 'student', 'interactive-challenge-path.tsx');

  it('exists, and asks the copy module for its strings', () => {
    expect(existsSync(file)).toBe(true);
    const source = readFileSync(file, 'utf8');
    expect(source).toMatch(/from '@\/lib\/omega-claw-copy'/);
    expect(source).toMatch(/hintFeedback\(/);
    expect(source).toMatch(/answerFeedback\(/);
  });

  it('has the duplicate sentences deleted', () => {
    const source = readFileSync(file, 'utf8');
    for (const duplicate of [
      'Guided hint',
      'Correct. Now transfer the idea',
      'Correct. Explain why it works',
      'Not quite yet. The next step is a smaller clue',
      'Not quite yet. Look for the step',
    ]) {
      expect(source, `"${duplicate}" is still hand-written in the component`).not.toContain(duplicate);
    }
  });

  it('no longer branches on the raw action symbol', () => {
    const source = readFileSync(file, 'utf8');
    expect(source).not.toMatch(/nextAction\s*===\s*'/);
    expect(source).not.toMatch(/typeof result\?\.hint === 'string'/);
  });
});
