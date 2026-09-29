/**
 * O-2 (second half) — the teacher-context module asked its own question about grades.
 *
 * `isOmegaClawGrade()` / `isOmegaClawSeniorGrade()` here did the same
 * whitespace-only normalisation the learner card was doing, so a profile reading
 * `Grade-6` — the spelling a `profiles.grade` column can genuinely hold — got
 * "Omega Claw AI and blockchain learning is available as an introduction in
 * Grade 6 … please use the learner's own grade-level CBC content instead" from
 * `getOmegaClawScopeMessage()`. That is a false refusal: the pack covers the
 * learner, and a teacher was told the opposite.
 *
 * Both predicates now read the pack mirror's scope rule, with one deliberate
 * exception kept visible: `S1`/`S2`/`S3` are Kenyan senior-school band labels this
 * module has always accepted, and the MeTTa pack has no rows for them, so they
 * cannot come from `omegaClawScopeFor()`. They stay as a named superset rather
 * than being silently dropped, and task #22 (one voice for the rules) is where the
 * pack itself decides whether to carry them.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getOmegaClawScopeMessage,
  isOmegaClawGrade,
  isOmegaClawSeniorGrade,
} from '../omega-claw-ai-blockchain';

describe('isOmegaClawGrade', () => {
  it('accepts every Grade 6 spelling the pack accepts', () => {
    for (const grade of ['Grade 6', 'Grade6', 'Grade-6', 'grade_6', 'G6', ' gRaDe  6 ']) {
      expect(isOmegaClawGrade(grade), `"${grade}" is Grade 6`).toBe(true);
    }
  });

  it('does not accept a senior grade or an uncovered grade', () => {
    for (const grade of ['Grade 10', 'Grade 4', 'PP1', '', 'Grade-13']) {
      expect(isOmegaClawGrade(grade), `"${grade}" is not the Grade 6 introduction`).toBe(false);
    }
  });
});

describe('isOmegaClawSeniorGrade', () => {
  it('accepts Grades 10–12 and the senior band name', () => {
    for (const grade of ['Grade 10', 'Grade-11', 'G12', 'senior', 'Senior School']) {
      expect(isOmegaClawSeniorGrade(grade), `"${grade}" is senior`).toBe(true);
    }
  });

  it('still accepts the S1–S3 labels, which the pack has no rows for', () => {
    for (const grade of ['S1', 's2', 'S3']) {
      expect(isOmegaClawSeniorGrade(grade), `"${grade}" is a senior band label`).toBe(true);
    }
  });

  it('refuses the grades the pack refuses', () => {
    for (const grade of ['Grade 6', 'Grade 8', 'Grade 9', 'Grade 13', '']) {
      expect(isOmegaClawSeniorGrade(grade), `"${grade}" is not senior`).toBe(false);
    }
  });
});

describe('the scope message stops refusing a covered learner', () => {
  it('gives the Grade 6 introduction to a hyphenated grade', () => {
    expect(getOmegaClawScopeMessage('Grade-6')).toContain('Grade 6 introduction');
  });

  it('gives the senior text to a senior band label', () => {
    expect(getOmegaClawScopeMessage('S1')).toContain('Senior School');
  });

  it('still refuses a grade the pack does not cover', () => {
    expect(getOmegaClawScopeMessage('Grade 4')).toContain("use the learner's own grade-level CBC content");
  });
});

describe('the module asks the mirror, not itself', () => {
  const source = readFileSync(
    join(process.cwd(), 'src', 'curriculum', 'omega-claw-ai-blockchain.ts'),
    'utf8',
  );

  it('imports the pack mirror’s canonicaliser', () => {
    expect(source).toMatch(/omegaClawScopeFor/);
    expect(source).toMatch(/canonicalOmegaClawGrade/);
  });

  it('has its own whitespace-only normalisation deleted', () => {
    expect(source).not.toContain('replace(/\\s+/g, "")');
  });

  it('has its second, private answer about which grade it covers deleted', () => {
    expect(source).not.toContain('OMEGA_CLAW_CURRICULUM_GRADE');
  });
});
