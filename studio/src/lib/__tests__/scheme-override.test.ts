import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SchemeRow } from '@/types/curriculum';
import type { LedgerSubject } from '@/lib/scheme/ledger';
import type { OverrideTarget } from '@/lib/scheme/override';
import { parsePack } from '@/lib/attest/derive';

/**
 * Spoon 5c-3 — the override: the teacher argues with a rule at its source, and the next run reads what she said.
 *
 * The policy pack's own header promises this: *"When the reconciler says 'blocking', the transcript names the
 * line that decided it, and the teacher's override is a response to that line, not to a number in somebody's
 * code."* Until now it was a promise with no implementation. Here it becomes one, with the two properties that
 * make it worth having:
 *
 * 1. **The override is a pack statement, not a flag.** It is written by rewriting one line of the policy text,
 *    so the only thing that changes between the blocking run and the passing run is a rule a human can read.
 *    `derive.ts` answers with the *first* statement that binds, which is why this replaces in place instead of
 *    appending — an appended row would sit under the original and be shadowed by it, silently doing nothing.
 * 2. **It stays visible.** A waiver that made the finding vanish would be a checker that forgets. The waived
 *    column is re-raised every run as an advisory whose citation is the overridden line, so a reader three
 *    months from now sees that the column is empty, that the rule says waived, and that a named person recorded
 *    it on a dated line in the ledger.
 *
 * The guard rail is the part this suite spends most of its effort on: an override may answer a line the pack
 * already states, and may not reach the certification threshold. The teacher is allowed to say *that column
 * does not apply to my scheme*; she is not allowed, and SyncSenta will not help her, to say *blocking gaps need
 * not be zero*. The gate is not negotiable because a negotiable gate is not a gate.
 */

const STUDIO = process.cwd();
const POLICY_FILE = join(STUDIO, 'public', 'omega', 'scheme_check.metta');
const POLICY_LABEL = 'studio/public/omega/scheme_check.metta';
const DESIGN_FILE = join(STUDIO, 'public', 'omega', 'ai_g8_design.metta');

const ORIGINAL_POLICY_TEXT = readFileSync(POLICY_FILE, 'utf8');
const design = { file: 'studio/public/omega/ai_g8_design.metta', text: readFileSync(DESIGN_FILE, 'utf8') };
const originalPolicy = { file: POLICY_LABEL, text: ORIGINAL_POLICY_TEXT };
const draft = JSON.parse(
  readFileSync(join(STUDIO, 'public', 'omega', 'drafts', 'kibera_g8_week14.json'), 'utf8'),
) as { grade: string; rows: SchemeRow[] };

const { reconcileScheme } = await import('@/lib/scheme/reconcile');
const { acceptProposal } = await import('@/lib/scheme/consent');
const {
  applyOverride,
  overrideEntry,
  UnknownRuleError,
  UnoverridableRuleError,
  UnreadableValueError,
  OverrideChangesNothingError,
} = await import('@/lib/scheme/override');
const { emptyLedger, appendToLedger, verifyLedger } = await import('@/lib/scheme/ledger');

const ACTOR = 'teacher:kibera_mama_joy';
const WHEN = '2026-10-02T08:52:40+03:00';

const SUBJECT: LedgerSubject = {
  grade: draft.grade,
  draftFile: 'studio/public/omega/drafts/kibera_g8_week14.json',
  designFile: design.file,
  policyFile: POLICY_LABEL,
};

/** The obligation the override answers: `assessmentMethods` is mandatory, on one known line of the real pack. */
const obligationLine = ORIGINAL_POLICY_TEXT.split('\n').findIndex(
  (line) => line === '(= (scheme-field-obligation g8 assessmentMethods) mandatory)',
);
const WAIVE_ASSESSMENT = { kind: 'field-obligation', field: 'assessmentMethods', to: 'waived' } as const;

function waive(policyText = ORIGINAL_POLICY_TEXT) {
  return applyOverride({
    policy: { file: POLICY_LABEL, text: policyText },
    grade: 'g8',
    target: WAIVE_ASSESSMENT,
  });
}

function check(rows: readonly SchemeRow[], policyText: string) {
  return reconcileScheme({
    grade: draft.grade,
    rows,
    design,
    policy: { file: POLICY_LABEL, text: policyText },
  });
}

describe('rewriting the rule — one line moves, and it is the line she is answering', () => {
  it('finds the statement by what it says, and reports the line it sits on', () => {
    expect(obligationLine).toBeGreaterThan(0);
    const outcome = waive();
    expect(outcome.line).toBe(obligationLine + 1);
    expect(outcome.before).toBe('mandatory');
    expect(outcome.after).toBe('waived');
  });

  it('changes exactly that line and nothing else in the file', () => {
    const outcome = waive();
    const before = ORIGINAL_POLICY_TEXT.split('\n');
    const after = outcome.text.split('\n');
    expect(after).toHaveLength(before.length);
    expect(after.filter((line, i) => line !== before[i])).toEqual([
      '(= (scheme-field-obligation g8 assessmentMethods) waived)',
    ]);
  });

  it('leaves a statement the engine can read, on the same line number', () => {
    const outcome = waive();
    const row = parsePack(outcome.text).find((r) => r.line === outcome.line);
    expect(row?.head).toBe('scheme-field-obligation');
    expect(row?.args).toEqual(['g8', 'assessmentMethods']);
    expect(row?.value).toBe('waived');
  });

  it('does not touch the file on disk: the pack in the repository still says mandatory', () => {
    waive();
    expect(readFileSync(POLICY_FILE, 'utf8')).toBe(ORIGINAL_POLICY_TEXT);
    expect(ORIGINAL_POLICY_TEXT).toContain('(= (scheme-field-obligation g8 assessmentMethods) mandatory)');
  });
});

describe('the next run — it reads the override, and it says so out loud', () => {
  it('no longer blocks on the waived column', () => {
    const outcome = waive();
    const result = check(draft.rows, outcome.text);
    expect(result.counts.blocking).toBe(1);
    expect(result.findings.map((f) => [f.row, f.gap])).toEqual([[2, 'field-obligation-waived-by-teacher'], [3, 'sub-strand-not-in-design']]);
  });

  it('raises it as advisory, at the severity and from the sentence the pack states', () => {
    const outcome = waive();
    const waived = check(draft.rows, outcome.text).findings[0];
    expect(waived.severity).toBe('advisory');
    expect(waived.reason).toBe(
      parsePack(outcome.text).find((r) => r.head === 'scheme-gap-reason' && r.args[1] === 'field-obligation-waived-by-teacher')?.value ?? '',
    );
    expect(waived.reason.length).toBeGreaterThan(20);
  });

  it('cites the overridden line, and that line really says waived in the text the run read', () => {
    const outcome = waive();
    const waived = check(draft.rows, outcome.text).findings[0];
    const citation = `${POLICY_LABEL}:${outcome.line}`;
    expect(waived.citations).toContain(citation);
    expect(outcome.text.split('\n')[outcome.line - 1]).toContain('waived');
  });

  it('and with her two acts together — the accepted proposal and the waiver — the scheme certifies', () => {
    const outcome = waive();
    const finding = check(draft.rows, ORIGINAL_POLICY_TEXT).findings.find((f) => f.row === 3);
    const accepted = acceptProposal({
      rows: draft.rows,
      finding: finding!,
      actor: ACTOR,
      timestamp: WHEN,
    });
    const certified = check(accepted.rows, outcome.text);
    expect(certified.counts.blocking).toBe(0);
    expect(certified.certification.certified).toBe(true);
    expect(certified.certification.handoff).toBe('allowed');
    expect(certified.transcript).toContain('waived');
  });

  it('will not let a stray waived row soften a mandatory row that is still in force', () => {
    // A pack edited by hand into having both statements for one column is a broken pack. When it is, the
    // blocking reading wins: a waived row must not be able to cancel a mandatory row it sits next to.
    const both = ORIGINAL_POLICY_TEXT.replace(
      '(= (scheme-field-obligation g8 learningResources) mandatory)',
      '(= (scheme-field-obligation g8 learningResources) mandatory)\n' +
        '(= (scheme-field-obligation g8 learningResources) waived)',
    );
    const emptyResources = { ...(draft.rows[1] as SchemeRow), learningResources: '' };
    const result = check([emptyResources], both);
    const forResources = result.findings.filter((f) => f.field === 'learningResources');
    expect(forResources.map((f) => f.gap)).toEqual(['mandatory-field-empty']);
    expect(result.findings.some((f) => f.gap === 'field-obligation-waived-by-teacher')).toBe(false);
  });
});

describe('the guard rails — an override answers a stated rule, and never the gate', () => {
  it('refuses to override the certification threshold, in any wording', () => {
    const target = { kind: 'certification-threshold', to: 'blocking-may-be-nonzero' };
    expect(() =>
      applyOverride({ policy: originalPolicy, grade: 'g8', target: target as unknown as OverrideTarget }),
    ).toThrow(UnoverridableRuleError);
  });

  it('refuses a rule the pack does not state, so an override cannot invent a column', () => {
    const target = { kind: 'field-obligation', field: 'marksOutOf100', to: 'waived' };
    expect(() =>
      applyOverride({ policy: originalPolicy, grade: 'g8', target: target as unknown as OverrideTarget }),
    ).toThrow(UnknownRuleError);
  });

  it('refuses a value the reconciler has no reading for, which would silently un-mandate a column', () => {
    const target = { kind: 'field-obligation', field: 'assessmentMethods', to: 'pineapple' };
    expect(() =>
      applyOverride({ policy: originalPolicy, grade: 'g8', target: target as unknown as OverrideTarget }),
    ).toThrow(UnreadableValueError);
  });

  it('refuses an override that changes nothing, because a record of a non-event hides the real ones', () => {
    const alreadyWaived = waive().text;
    expect(() => waive(alreadyWaived)).toThrow(OverrideChangesNothingError);
  });

  it('overrides a severity too, when the argument is about how serious a gap is', () => {
    const outcome = applyOverride({
      policy: originalPolicy,
      grade: 'g8',
      target: { kind: 'gap-severity', gap: 'sub-strand-not-in-design', to: 'advisory' },
    });
    expect(outcome.before).toBe('blocking');
    expect(outcome.text).toContain('(= (scheme-gap-severity g8 sub-strand-not-in-design) advisory)');
    const result = check(draft.rows, outcome.text);
    expect(result.findings.find((f) => f.row === 3)?.severity).toBe('advisory');
    expect(result.counts.blocking).toBe(1);
    expect(result.counts.advisory).toBe(1);
  });
});

describe('the record of the override — a policy change is history, not a setting', () => {
  it('says who, when, which rule, from what to what, and cites the line it answered', () => {
    const outcome = waive();
    const entry = overrideEntry({
      outcome,
      actor: ACTOR,
      timestamp: WHEN,
      note: 'Lesson 2 is oral; the assessment goes in the register, not the column.',
    });
    expect(entry).toMatchObject({
      basis: 'override-granted',
      row: 'pack',
      field: 'assessmentMethods',
      before: 'mandatory',
      after: 'waived',
      actor: ACTOR,
      timestamp: WHEN,
    });
    expect(entry.citations).toEqual([`${POLICY_LABEL}:${outcome.line}`]);
    expect(entry.note).toContain('the register');
  });

  it('chains into the same ledger as her accepted proposals, and the ledger verifies', async () => {
    const outcome = waive();
    const entry = overrideEntry({ outcome, actor: ACTOR, timestamp: WHEN, note: 'oral instead' });
    const proposalEntry = acceptProposal({
      rows: draft.rows,
      finding: check(draft.rows, ORIGINAL_POLICY_TEXT).findings.find((f) => f.row === 3)!,
      actor: ACTOR,
      timestamp: WHEN,
    }).entries[0];
    let ledger = emptyLedger(SUBJECT);
    ledger = await appendToLedger(ledger, proposalEntry);
    ledger = await appendToLedger(ledger, entry);
    expect(ledger.entries.map((e) => e.basis)).toEqual(['proposal-accepted', 'override-granted']);
    await expect(verifyLedger(ledger)).resolves.toEqual({ ok: true, invalid: [] });
  });

  it('is still refused by the chain if someone edits the note afterwards', async () => {
    const outcome = waive();
    const entry = overrideEntry({ outcome, actor: ACTOR, timestamp: WHEN, note: 'oral instead' });
    const ledger = await appendToLedger(emptyLedger(SUBJECT), entry);
    const edited = {
      ...ledger,
      entries: [{ ...ledger.entries[0], note: 'the head teacher said so' }],
    };
    await expect(verifyLedger(edited)).resolves.toMatchObject({ ok: false });
  });
});
