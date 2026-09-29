/**
 * O-2 — one canonicaliser decides whether the challenge path shows.
 *
 * `interactive-challenge-path.tsx` had its own `isOmegaClawGrade()`, which
 * stripped whitespace only: `Grade-6` became `grade-6`, matched neither
 * `=== 'grade6'` nor `/grade1[0-2]/` nor `.includes('senior')`, and the card
 * returned `null` for a learner the MeTTa pack covers. Both the Rust service and
 * `omega-claw-rules.ts` drop `-` and `_` as well as spaces, so this was a third
 * answer to one question — and the odd one out was the one a learner sees.
 *
 * The card now asks `omegaClawScopeFor()`, the mirrored `scope_for` rule, so
 * "which grades does the pack cover" has exactly one answer in the frontend.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { omegaClawScopeFor } from '@/lib/omega-agent/omega-claw-rules';
import { showsOmegaClawPath } from '@/lib/omega-claw-path';

describe('showsOmegaClawPath', () => {
  it('accepts every spelling a CBC record actually arrives with for Grade 6', () => {
    for (const grade of ['Grade 6', 'Grade6', 'grade-6', 'Grade-6', 'grade_6', 'G6', ' gRaDe  6 ']) {
      expect(showsOmegaClawPath(grade), `"${grade}" is in the pack`).toBe(true);
    }
  });

  it('accepts the senior grades and the band name', () => {
    for (const grade of ['Grade 10', 'Grade-11', 'G12', 'senior', 'Senior School', 'senior-school']) {
      expect(showsOmegaClawPath(grade), `"${grade}" is in the pack`).toBe(true);
    }
  });

  it('refuses grades and values the pack does not cover', () => {
    for (const grade of ['Grade 4', 'Grade13', 'Grade-13', 'PP1', '', '   ', 'nonsense']) {
      expect(showsOmegaClawPath(grade), `"${grade}" is not in the pack`).toBe(false);
    }
  });

  it('is the mirror’s scope rule itself, not a second opinion on it', () => {
    const cases = ['Grade-6', 'grade 6', 'G6', 'Grade 8', 'Grade-13', 'senior school', ''];
    for (const grade of cases) {
      expect(showsOmegaClawPath(grade)).toBe(omegaClawScopeFor(grade) !== 'blocked');
    }
  });
});

describe('the component has no local grade logic', () => {
  const source = readFileSync(
    join(process.cwd(), 'src', 'components', 'student', 'interactive-challenge-path.tsx'),
    'utf8',
  );

  it('asks the mirror instead', () => {
    expect(source).toMatch(/from '@\/lib\/omega-claw-path'/);
    expect(source).toMatch(/showsOmegaClawPath\(grade\)/);
  });

  it('has its own canonicaliser deleted', () => {
    expect(source).not.toMatch(/isOmegaClawGrade/);
    expect(source).not.toMatch(/includes\('senior'\)/);
    expect(source).not.toMatch(/grade1\[0-2\]/);
  });
});
