import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The scheme-of-work checker's policy pack, written red first.
 *
 * What this suite is guarding is the one claim the submission rests on: the reconciler's verdicts come out
 * of a pack that already exists, so removing a row changes the transcript. A checker whose severities and
 * reason sentences live in TypeScript could be argued with — "where did 'blocking' come from?" has no
 * answer. Here every verdict names a line of `studio/public/omega/scheme_check.metta`, which is also the
 * line a teacher can disagree with and override.
 *
 * Three properties pinned here and nowhere else:
 *   1. every gap verdict cites a real line, and the line really says what the step claims;
 *   2. absence is answered by the pack, never by a default in the caller — an undefined field or gap kind
 *      throws rather than quietly becoming `advisory`, which is the failure mode a policy engine dies of;
 *   3. there are exactly two severities, because a third tier would be a policy nobody wrote down.
 *
 * The grade key is `g8`, spelled the way `ai_g8_design.metta` spells it. That is deliberate: two spellings
 * for one grade in one pipeline is how a checker starts reporting `no row binds` for work it was written to
 * cover, so the pack holds the only authority and `grade8` is refused loudly.
 */

const REPO = join(process.cwd(), '..');
const PACK_FILE = join(REPO, 'studio', 'public', 'omega', 'scheme_check.metta');
const PACK_TEXT = existsSync(PACK_FILE) ? readFileSync(PACK_FILE, 'utf8') : '';
const pack = { file: 'studio/public/omega/scheme_check.metta', text: PACK_TEXT };

const {
  deriveCertificationRule,
  deriveFieldObligation,
  deriveGapPolicy,
  OmegaClawNoRowError,
  OmegaClawPackUnavailableError,
  renderDerivation,
} = await import('@/lib/attest/derive');

type Derivation = ReturnType<typeof deriveGapPolicy>;

/** The gap kinds the reconciler will raise, so this suite cannot drift behind the runner. */
const GAP_KINDS = [
  'mandatory-field-empty',
  'sub-strand-not-in-design',
  'strand-mismatch',
  'lesson-count-mismatch',
  'key-inquiry-question-drifted',
  'field-obligation-waived-by-teacher',
] as const;

/** The scheme columns a checker is allowed to call empty. Mirrors `SchemeRow` in `curriculum/types.ts`. */
const SCHEME_FIELDS = [
  'week',
  'lesson',
  'strand',
  'subStrand',
  'specificLearningOutcome',
  'keyInquiryQuestion',
  'learningExperiences',
  'learningResources',
  'assessmentMethods',
  'reflection',
] as const;

/**
 * Citation integrity, checked against the file rather than against line numbers hardcoded here: every step
 * that cites a line must cite the line that actually holds the text it printed. Edit the pack and a stale
 * citation fails, which is the point — a transcript that cites the wrong row is worse than no transcript.
 */
function expectRealCitations(d: Derivation): void {
  const lines = PACK_TEXT.split('\n');
  const cited = d.steps.filter((step) => step.packLine !== null);
  expect(cited.length, `${d.question}: at least one step must cite the pack`).toBeGreaterThan(0);
  for (const step of cited) {
    expect(lines[step.packLine! - 1]).toContain(step.packText!);
  }
  if (d.conclusionLine !== null) {
    expect(lines[d.conclusionLine - 1]).toContain(d.conclusion);
  }
}

function answered(d: Derivation) {
  return d.steps.filter((step) => step.kind === 'question' && step.result === 'matched');
}

describe('scheme_check.metta exists and says what the reconciler will be asked', () => {
  it('is a real file, and parses into statements the engine can read', () => {
    expect(existsSync(PACK_FILE), `${PACK_FILE} should exist`).toBe(true);
    expect(PACK_TEXT).toContain('(= (scheme-check-version g8)');
  });

  it('refuses to derive when nobody hands it the pack text', () => {
    expect(() => deriveGapPolicy({ grade: 'g8', gap: 'strand-mismatch' }, { file: 'no pack' } as never))
      .toThrow(OmegaClawPackUnavailableError);
  });
});

describe('deriveGapPolicy: what a gap is, and why, both by the pack', () => {
  for (const gap of GAP_KINDS) {
    it(`binds ${gap} to a severity and carries the sentence a teacher reads`, () => {
      const d = deriveGapPolicy({ grade: 'g8', gap }, pack);
      expect(['blocking', 'advisory']).toContain(d.conclusion);
      expectRealCitations(d);

      const asks = answered(d);
      expect(asks.length).toBeGreaterThanOrEqual(2);
      expect(asks[0].asked).toBe(`(scheme-gap-severity g8 ${gap})`);
      const reason = asks.find((step) => step.asked.includes('scheme-gap-reason'));
      expect(reason, `${gap}: the pack must state the reason, not the caller`).toBeDefined();
      expect(reason!.packText).toContain('"');
    });
  }

  it('makes the three gaps that break a lesson blocking, and the three that merely disagree advisory', () => {
    expect(deriveGapPolicy({ grade: 'g8', gap: 'mandatory-field-empty' }, pack).conclusion).toBe('blocking');
    expect(deriveGapPolicy({ grade: 'g8', gap: 'sub-strand-not-in-design' }, pack).conclusion).toBe('blocking');
    expect(deriveGapPolicy({ grade: 'g8', gap: 'strand-mismatch' }, pack).conclusion).toBe('blocking');
    expect(deriveGapPolicy({ grade: 'g8', gap: 'lesson-count-mismatch' }, pack).conclusion).toBe('advisory');
    expect(deriveGapPolicy({ grade: 'g8', gap: 'key-inquiry-question-drifted' }, pack).conclusion).toBe('advisory');
    // A waiver she recorded is advisory: it stops the block and keeps the sentence in every later run.
    expect(deriveGapPolicy({ grade: 'g8', gap: 'field-obligation-waived-by-teacher' }, pack).conclusion).toBe('advisory');
  });

  it('throws on a gap kind the pack never wrote down, instead of defaulting to advisory', () => {
    expect(() => deriveGapPolicy({ grade: 'g8', gap: 'teacher-was-in-a-hurry' }, pack))
      .toThrow(OmegaClawNoRowError);
  });

  it('throws for a grade the pack does not cover, so a verdict cannot be borrowed across the ladder', () => {
    expect(() => deriveGapPolicy({ grade: 'grade8', gap: 'strand-mismatch' }, pack))
      .toThrow(OmegaClawNoRowError);
  });
});

describe('deriveFieldObligation: mandatory is a rule, optional is a rule, silence is neither', () => {
  for (const field of SCHEME_FIELDS) {
    it(`answers ${field} with a cited obligation`, () => {
      const d = deriveFieldObligation({ grade: 'g8', field }, pack);
      expect(['mandatory', 'optional']).toContain(d.conclusion);
      expectRealCitations(d);
    });
  }

  it('calls reflection optional by row, not by absence, because the reason is the point', () => {
    const d = deriveFieldObligation({ grade: 'g8', field: 'reflection' }, pack);
    expect(d.conclusion).toBe('optional');
    expect(d.conclusionLine).not.toBeNull();
    expect(answered(d).length).toBe(2);
  });

  it('calls assessment methods mandatory, which is the gap the fixture will trip', () => {
    expect(deriveFieldObligation({ grade: 'g8', field: 'assessmentMethods' }, pack).conclusion)
      .toBe('mandatory');
  });

  it('throws on a column nobody defined, rather than treating an unknown field as free to leave blank', () => {
    expect(() => deriveFieldObligation({ grade: 'g8', field: 'homeworkGiven' }, pack))
      .toThrow(OmegaClawNoRowError);
  });
});

describe('deriveCertificationRule: the gate between a checked scheme and a lesson plan', () => {
  it('states the threshold and the sentence that justifies refusing the handoff', () => {
    const d = deriveCertificationRule({ grade: 'g8' }, pack);
    expect(d.conclusion).toBe('blocking-must-be-zero');
    expectRealCitations(d);
    expect(answered(d).some((step) => step.asked.includes('scheme-certification-reason'))).toBe(true);
  });

  it('is asked of the pack, not printed from the caller: the transcript shows both lines', () => {
    const text = renderDerivation(deriveCertificationRule({ grade: 'g8' }, pack));
    expect(text).toContain('scheme_check.metta:');
    expect(text).toContain('∴ blocking-must-be-zero');
  });
});

describe('the printed transcript cites, so a teacher can argue with a line', () => {
  it('renders a gap verdict with its severity, its reason and both pack lines', () => {
    const text = renderDerivation(deriveGapPolicy({ grade: 'g8', gap: 'sub-strand-not-in-design' }, pack));
    expect(text).toContain('(scheme-gap-severity g8 sub-strand-not-in-design)');
    expect(text).toContain('∴ blocking — scheme_check.metta:');
    expect(text.split('\n').filter((line) => line.includes('scheme_check.metta:')).length).toBeGreaterThanOrEqual(3);
  });
});
