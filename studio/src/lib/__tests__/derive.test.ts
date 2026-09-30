import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The derivation module's contract, written red first.
 *
 * Track 5 asks for "some visible piece of Omega's stateful, auditable-reasoning architecture … as the
 * actual feature, not decoration". That only survives a judge if the transcript cannot be hand-authored:
 * every step must name the pack line it came from, and a decision the pack does not support must fail
 * loudly instead of producing plausible text.
 *
 * Three properties are pinned here and nowhere else in the suite:
 *   1. every conclusion cites a real line of `omega_claw_rules.metta`;
 *   2. the derivation agrees with the mirror that answers learners today — one decision, two renderings,
 *      never a second engine;
 *   3. a missing or unsupportive pack is an error, not a fabricated transcript.
 */

const REPO = join(process.cwd(), '..');
const PACK_FILE = join(REPO, 'backend', 'syncsenta-backend', 'data', 'omega_claw_rules.metta');
const PACK_TEXT = readFileSync(PACK_FILE, 'utf8');
const pack = { file: 'backend/syncsenta-backend/data/omega_claw_rules.metta', text: PACK_TEXT };

const {
  deriveActivityApproval,
  deriveHintLevel,
  deriveNextAction,
  deriveScope,
  deriveTransfer,
  OmegaClawNoRowError,
  OmegaClawPackUnavailableError,
  parsePack,
  renderDerivation,
} = await import('@/lib/attest/derive');

type Derivation = ReturnType<typeof deriveScope>;

const {
  clampOmegaClawHintLevel,
  isOmegaClawActivityAllowed,
  omegaClawCanUnlockTransfer,
  omegaClawNextActionForOutcome,
  omegaClawScopeFor,
} = await import('@/lib/omega-agent/omega-claw-rules');

/** How many activity rows the pack pins, so the suite does not hardcode a count that edits change. */
const ACTIVITY_ROWS = parsePack(PACK_TEXT).filter((row) => row.head === 'omega-claw-activity').length;

/** Questions the pack answered. */
function answered(d: Derivation) {
  return d.steps.filter((step) => step.kind === 'question' && step.result === 'matched');
}
/** Questions the pack refused, row by row — the half a hand-written transcript never shows. */
function refused(d: Derivation) {
  return d.steps.filter((step) => step.kind === 'question' && step.result === 'rejected');
}

describe('the pack the derivation reads is the pack the product mirrors', () => {
  it('exists, and the line numbers this suite cites are the ones it states', () => {
    expect(existsSync(PACK_FILE), `${PACK_FILE} should exist`).toBe(true);
    const lines = PACK_TEXT.split('\n');
    expect(lines[4]).toContain('(= (omega-claw-scope-for grade6) introductory)');
    expect(lines[30]).toContain('(= (omega-claw-next-action correct) celebrate-transfer)');
    expect(lines[41]).toContain('(= (omega-claw-can-unlock-transfer true true) yes)');
  });

  it('parses into rows that keep their line numbers, their text and their value', () => {
    const rows = parsePack(PACK_TEXT);
    const scopeRow = rows.find((row) => row.head === 'omega-claw-scope-for' && row.args[0] === 'grade6');
    expect(scopeRow?.line).toBe(5);
    expect(scopeRow?.value).toBe('introductory');
    expect(scopeRow?.text).toContain('(= (omega-claw-scope-for grade6) introductory)');

    const activityRow = rows.find((row) => row.head === 'omega-claw-activity');
    expect(activityRow?.value).toBeNull();
    expect(activityRow?.args).toEqual(['grade6', 'ai-input-output']);
  });

  it('parses a comment-only source into no rows, so nothing can be derived from it', () => {
    expect(parsePack(';; only a comment\n')).toEqual([]);
    expect(parsePack('')).toEqual([]);
  });

  it('reads a double-quoted string as one value, spaces included', () => {
    // The design pack the reconciler needs carries prose: sub-strand names, outcome text. A value regex of
    // \S+ silently skips such a row, which turns "the pack says X" into "the pack has no row" — the failure
    // mode this module was built to avoid. The quotes are surface syntax, so the row keeps the string they
    // wrap: a caller comparing a teacher's draft text against a design name compares two plain strings.
    const rows = parsePack('(= (ai-design-name 2.1) "Search and Problem Solving")\n');
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe('Search and Problem Solving');
    expect(rows[0].args).toEqual(['2.1']);
    expect(rows[0].text).toContain('"Search and Problem Solving"');
  });

  it('cites a quoted value by line number like any other row', () => {
    const rows = parsePack('(a b c)\n(= (ai-design-inquiry 2.1) "How does a machine find a path to a goal?")\n');
    expect(rows[1]?.line).toBe(2);
    expect(rows[1]?.value).toBe('How does a machine find a path to a goal?');
  });
});

describe('deriveScope: the grade question, answered by the pack', () => {
  it('binds the conclusion and cites the line that states it', () => {
    const d = deriveScope('grade6', pack);
    expect(d.conclusion).toBe('introductory');
    const steps = answered(d);
    expect(steps).toHaveLength(1);
    expect(steps[0].asked).toBe('(omega-claw-scope-for grade6)');
    expect(steps[0].packLine).toBe(5);
    expect(steps[0].packText).toContain('introductory');
    expect(steps[0].isCatchAll).toBe(false);
  });

  it('records the normalisation it applied before asking, because "Grade 6" is not a pack token', () => {
    const d = deriveScope('Grade 6', pack);
    const normalised = d.steps.filter((step) => step.kind === 'normalised');
    expect(normalised.length).toBeGreaterThan(0);
    expect(normalised[0].binds).toBe('grade6');
    expect(d.conclusion).toBe('introductory');
  });

  it('falls through to the catch-all for a grade the pack never pins, and marks that row as one', () => {
    const d = deriveScope('grade4', pack);
    expect(d.conclusion).toBe('blocked');
    const steps = answered(d);
    expect(steps).toHaveLength(1);
    expect(steps[0].packLine).toBe(10);
    expect(steps[0].isCatchAll).toBe(true);
    expect(steps[0].packText).toContain('$lower-grade');
    expect(refused(d).length).toBeGreaterThan(0);
  });

  it('prefers the concrete row over the catch-all, the way the Rust façade resolves precedence', () => {
    const d = deriveScope('grade6', pack);
    expect(answered(d).map((step) => step.packLine)).toEqual([5]);
  });

  it('agrees with the mirror that answers learners today, for every grade the pack pins', () => {
    for (const grade of ['grade6', 'grade10', 'grade11', 'grade12', 'senior-school']) {
      expect(deriveScope(grade, pack).conclusion, `scope for ${grade}`).toBe(omegaClawScopeFor(grade));
    }
    for (const grade of ['grade4', 'grade5', 'Year 9', '']) {
      expect(deriveScope(grade, pack).conclusion, `blocked ${grade}`).toBe(omegaClawScopeFor(grade));
    }
  });
});

describe('deriveHintLevel: the ladder, rung by rung', () => {
  it.each([
    [1, 36, 'notice'],
    [2, 37, 'isolate-step'],
    [3, 38, 'representation'],
    [4, 39, 'worked-example'],
  ])('level %i binds %s from pack line %i', (level, line, binds) => {
    const d = deriveHintLevel(level, pack);
    expect(d.conclusion).toBe(binds);
    expect(answered(d).map((step) => step.packLine)).toEqual([line]);
  });

  it('clamps an out-of-range request before asking, using the clamp the mirror already owns', () => {
    const d = deriveHintLevel(9, pack);
    expect(d.conclusion).toBe('worked-example');
    expect(clampOmegaClawHintLevel(9)).toBe(4);
    expect(answered(d).map((step) => step.asked)).toEqual(['(omega-claw-hint 4)']);
    expect(d.steps.some((step) => step.kind === 'normalised' && step.binds === '4')).toBe(true);
  });
});

describe('deriveActivityApproval: scope first, then the row, in that order', () => {
  it('binds yes from both the scope row and the activity row', () => {
    const d = deriveActivityApproval({ grade: 'grade6', activity: 'ai-input-output' }, pack);
    expect(d.conclusion).toBe('yes');
    expect(answered(d).map((step) => step.packLine)).toEqual([5, 13]);
  });

  it('refuses a blocked grade without ever reaching the activity table', () => {
    const d = deriveActivityApproval({ grade: 'grade4', activity: 'ai-input-output' }, pack);
    expect(d.conclusion).toBe('no');
    expect(answered(d).map((step) => step.packLine)).toEqual([10]);
  });

  it('answers no for an activity with no row, and says that no came from absence', () => {
    // A closed-world fact: the approved list is the whole universe, so "no row binds" *is* the answer.
    // Contrast deriveNextAction, where a missing row means the question cannot be answered at all.
    const d = deriveActivityApproval({ grade: 'grade6', activity: 'crypto-trading' }, pack);
    expect(d.conclusion).toBe('no');
    expect(answered(d).map((step) => step.packLine)).toEqual([5]);
    expect(refused(d)).toHaveLength(ACTIVITY_ROWS);
    const absent = d.steps.filter((step) => step.result === 'absent');
    expect(absent).toHaveLength(1);
    expect(absent[0].asked).toBe('(omega-claw-activity grade6 crypto-trading)');
    expect(absent[0].packLine).toBeNull();
  });

  it('agrees with isOmegaClawActivityAllowed for rows the pack pins and one it does not', () => {
    for (const [grade, activity] of [
      ['grade6', 'ai-input-output'],
      ['grade6', 'blockchain-consensus'],
      ['grade10', 'blockchain-consensus'],
      ['senior-school', 'ai-data-literacy'],
      ['grade12', 'not-a-row'],
    ] as const) {
      const derived = deriveActivityApproval({ grade, activity }, pack).conclusion === 'yes';
      expect(derived, `${grade}/${activity}`).toBe(isOmegaClawActivityAllowed(grade, activity));
    }
  });
});

describe('deriveNextAction: the three questions a learner-facing decision rests on', () => {
  it('cites scope, approval and the outcome row, in that order', () => {
    const d = deriveNextAction({ grade: 'grade6', activity: 'ai-input-output', outcome: 'correct' }, pack);
    expect(d.conclusion).toBe('celebrate-transfer');
    expect(answered(d).map((step) => step.packLine)).toEqual([5, 13, 31]);
  });

  it('throws when the outcome is not a pack row, rather than defaulting to something plausible', () => {
    expect(() =>
      deriveNextAction({ grade: 'grade6', activity: 'ai-input-output', outcome: 'guessed' }, pack),
    ).toThrowError(OmegaClawNoRowError);
  });

  it('agrees with the mirror for every outcome the pack defines', () => {
    for (const outcome of ['incorrect', 'correct', 'explained', 'mastered']) {
      expect(
        deriveNextAction({ grade: 'grade6', activity: 'ai-input-output', outcome }, pack).conclusion,
      ).toBe(omegaClawNextActionForOutcome(outcome));
    }
  });

  it('refuses a learner an action for work the pack never approved', () => {
    expect(() =>
      deriveNextAction({ grade: 'grade6', activity: 'not-approved', outcome: 'correct' }, pack),
    ).toThrowError(/not approved|no row/i);
  });
});

describe('deriveTransfer: showing the row the answer did NOT match', () => {
  it('binds yes from the concrete row when both halves hold', () => {
    const d = deriveTransfer({ correct: true, explained: true }, pack);
    expect(d.conclusion).toBe('yes');
    expect(answered(d).map((step) => step.packLine)).toEqual([42]);
    expect(refused(d)).toHaveLength(0);
  });

  it('records the concrete row it tried and rejected before the catch-all answers no', () => {
    // This is the auditable half of the whole feature: a correct answer nobody can explain does not unlock,
    // and the trace shows the yes-row being refused rather than asserting the outcome from nowhere.
    const d = deriveTransfer({ correct: true, explained: false }, pack);
    expect(d.conclusion).toBe('no');
    expect(refused(d).map((step) => step.packLine)).toEqual([42]);
    expect(answered(d).map((step) => step.packLine)).toEqual([43]);
    expect(answered(d)[0].isCatchAll).toBe(true);
  });

  it('agrees with omegaClawCanUnlockTransfer for all four combinations', () => {
    for (const correct of [true, false]) {
      for (const explained of [true, false]) {
        const derived = deriveTransfer({ correct, explained }, pack).conclusion === 'yes';
        expect(derived, `${correct}/${explained}`).toBe(omegaClawCanUnlockTransfer(correct, explained));
      }
    }
  });
});

describe('a missing or unsupportive pack fails instead of inventing a trace', () => {
  it('throws when the caller gives a label but no pack text', () => {
    // This used to be "the file cannot be read": the engine would open `file` itself. It no longer touches a
    // filesystem, so the failure this pins is a caller that never handed the pack over — the one a browser
    // bundle or a route with the wrong working directory would hit.
    const withoutText = deriveScope as unknown as (grade: string, source?: unknown) => unknown;
    expect(() => withoutText('grade6', { file: 'no/such/pack.metta' })).toThrowError(
      OmegaClawPackUnavailableError,
    );
  });

  it('throws when the source exists but has no rows to ask', () => {
    expect(() => deriveScope('grade6', { file: 'empty.metta', text: ';; nothing here' })).toThrowError(
      OmegaClawPackUnavailableError,
    );
  });

  it('reports the source it was asked about, so a transcript names its pack', () => {
    const d = deriveScope('grade6', pack);
    expect(d.packFile).toContain('omega_claw_rules.metta');
    expect(d.conclusion).toBe('introductory');
    expect(d.packRowCount).toBeGreaterThan(30);
  });
});

describe('renderDerivation: the text a teacher reads', () => {
  it('numbers the steps and puts a file:line on every answered question', () => {
    const d = deriveNextAction({ grade: 'grade6', activity: 'ai-input-output', outcome: 'correct' }, pack);
    const text = renderDerivation(d);
    expect(text).toContain('omega_claw_rules.metta:5');
    expect(text).toContain('omega_claw_rules.metta:13');
    expect(text).toContain('omega_claw_rules.metta:31');
    expect(text).toContain('celebrate-transfer');
    expect(text.split('\n').length).toBeGreaterThanOrEqual(4);
  });

  it('shows a rejection as a rejection, naming the line that refused', () => {
    const text = renderDerivation(deriveTransfer({ correct: true, explained: false }, pack));
    expect(text).toMatch(/no match|rejected/i);
    expect(text).toContain('omega_claw_rules.metta:42');
  });

  it('compresses a long run of refusals into one line rather than burying the answer in it', () => {
    const text = renderDerivation(deriveActivityApproval({ grade: 'grade6', activity: 'crypto-trading' }, pack));
    expect(text).toMatch(new RegExp(`${ACTIVITY_ROWS} rows`));
    expect(text.split('\n').length).toBeLessThan(ACTIVITY_ROWS);
  });

  it('never prints learner-facing copy, because wording lives in one place and it is not here', () => {
    const text = renderDerivation(deriveHintLevel(2, pack));
    expect(text).not.toContain('Find the one step you are unsure about');
  });
});
