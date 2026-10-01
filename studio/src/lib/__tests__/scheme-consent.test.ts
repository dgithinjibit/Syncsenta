import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SchemeRow } from '@/types/curriculum';
import type { Finding } from '@/lib/scheme/reconcile';
import type { LedgerEntryDraft, LedgerSubject } from '@/lib/scheme/ledger';

/**
 * Spoon 5c-2 — consent: what happens when the teacher accepts a proposal.
 *
 * 5a deliberately produced a proposal that nothing could accept, and 5b deliberately shipped no button, because
 * an accept that rewrites a row without a record is the one thing this submission cannot afford: it would be the
 * unaccountable decision with the wording changed. Now the record exists (5c-1), so the write is allowed.
 *
 * The invariant the whole suite is built on is one sentence: **the ledger records every change and only
 * changes.** Every assertion below is a way of trying to break that sentence — writing a cell no proposal
 * named, recording a change that did not happen, accepting a refusal, silently mutating the array she handed
 * over, or losing the citation that made the write legitimate.
 *
 * The draft and the packs are the real ones, and the finding under test is the one `reconcileScheme` actually
 * returns for row 3. Nothing here is a fixture built to be easy to accept.
 */

const STUDIO = process.cwd();
const design = {
  file: 'studio/public/omega/ai_g8_design.metta',
  text: readFileSync(join(STUDIO, 'public', 'omega', 'ai_g8_design.metta'), 'utf8'),
};
const policy = {
  file: 'studio/public/omega/scheme_check.metta',
  text: readFileSync(join(STUDIO, 'public', 'omega', 'scheme_check.metta'), 'utf8'),
};
const draft = JSON.parse(
  readFileSync(join(STUDIO, 'public', 'omega', 'drafts', 'kibera_g8_week14.json'), 'utf8'),
) as { grade: string; rows: SchemeRow[] };

const { reconcileScheme } = await import('@/lib/scheme/reconcile');
const { acceptProposal, NothingProposedError, UnknownRowError, UnknownColumnError } = await import(
  '@/lib/scheme/consent',
);
const { emptyLedger, appendToLedger, verifyLedger } = await import('@/lib/scheme/ledger');

const SUBJECT: LedgerSubject = {
  grade: draft.grade,
  draftFile: 'studio/public/omega/drafts/kibera_g8_week14.json',
  designFile: design.file,
  policyFile: policy.file,
};

const ACTOR = 'teacher:kibera_mama_joy';
const WHEN = '2026-10-02T08:41:00+03:00';

function check(rows: readonly SchemeRow[]) {
  return reconcileScheme({ grade: draft.grade, rows, design, policy });
}

const before = check(draft.rows);
const proposalFinding = before.findings.find((f) => f.row === 3) as Finding;
const refusalFinding = before.findings.find((f) => f.row === 2) as Finding;

function accept(rows: readonly SchemeRow[], finding: Finding) {
  return acceptProposal({ rows, finding, actor: ACTOR, timestamp: WHEN });
}

describe('the proposal under test is the one the reconciler produces', () => {
  it('names three cells, all of them values the design pack states', () => {
    expect(proposalFinding.field).toBe('subStrand');
    expect(proposalFinding.proposal?.values).toBeDefined();
    expect(Object.keys(proposalFinding.proposal?.values ?? {})).toHaveLength(3);
    expect(proposalFinding.refusal).toBeUndefined();
  });

  it('and the finding that gets refused stays refused', () => {
    expect(refusalFinding.field).toBe('assessmentMethods');
    expect(refusalFinding.proposal).toBeUndefined();
    expect(refusalFinding.refusal).toContain('will not write one');
  });
});

describe('accepting — the cells the design names get written, and no others', () => {
  it('writes the three proposed values into row 3', () => {
    const outcome = accept(draft.rows, proposalFinding);
    const row3 = outcome.rows[2];
    expect(row3.subStrand).toBe('3.3 Introduction to Neural Networks');
    expect(row3.strand).toBe('3.0 AI Techniques and Programming');
    expect(row3.keyInquiryQuestion).toBe('How is a neural network different from a set of rules?');
  });

  it('leaves the judgment columns she wrote herself exactly as they were', () => {
    const outcome = accept(draft.rows, proposalFinding);
    for (const field of [
      'week',
      'lesson',
      'specificLearningOutcome',
      'learningExperiences',
      'learningResources',
      'assessmentMethods',
      'reflection',
    ] as const) {
      expect(outcome.rows[2][field]).toBe(draft.rows[2][field]);
    }
    // Exactly one row is a new object — the one that changed. Every other row is the same reference she passed
    // in, so a caller can see which rows moved without comparing their contents.
    const replaced = outcome.rows.map((row, i) => (row === draft.rows[i] ? undefined : i)).filter((i) => i !== undefined);
    expect(replaced).toEqual([2]);
    expect(outcome.rows[0]).toEqual(draft.rows[0]);
    expect(outcome.rows[1]).toEqual(draft.rows[1]);
    expect(outcome.rows[3]).toEqual(draft.rows[3]);
  });

  it('does not touch the array she handed over', () => {
    const untouched = draft.rows.map((row) => ({ ...row }));
    accept(draft.rows, proposalFinding);
    expect(draft.rows).toEqual(untouched);
  });

  it('closes the gap it was raised for, when she checks again', () => {
    const outcome = accept(draft.rows, proposalFinding);
    expect(check(outcome.rows).findings.map((f) => f.row)).toEqual([2]);
  });
});

describe('recording — one entry per cell that actually changed', () => {
  it('writes three records, because three cells moved', () => {
    const { entries } = accept(draft.rows, proposalFinding);
    expect(entries.map((e) => e.field).sort()).toEqual(
      ['keyInquiryQuestion', 'strand', 'subStrand'].sort(),
    );
    expect(entries.every((e) => e.basis === 'proposal-accepted')).toBe(true);
    expect(entries.every((e) => e.row === 3)).toBe(true);
    expect(entries.every((e) => e.actor === ACTOR && e.timestamp === WHEN)).toBe(true);
  });

  it('records what was there before, in her own words, and what is there now', () => {
    const { entries } = accept(draft.rows, proposalFinding);
    const sub = entries.find((e) => e.field === 'subStrand') as LedgerEntryDraft;
    expect(sub.before).toBe('2.7 Neural network training');
    expect(sub.after).toBe('3.3 Introduction to Neural Networks');
    const kiq = entries.find((e) => e.field === 'keyInquiryQuestion') as LedgerEntryDraft;
    expect(kiq.before).toBe('How does a network get better with practice?');
  });

  it('carries the proposal’s citations into every record, unchanged', () => {
    const { entries } = accept(draft.rows, proposalFinding);
    const cited = proposalFinding.proposal?.citations ?? [];
    expect(cited.length).toBeGreaterThan(0);
    for (const entry of entries) expect(entry.citations).toEqual(cited);
  });

  it('records nothing for a cell whose value the row already had', () => {
    const alreadyApplied = draft.rows.map((row, i) =>
      i === 2 ? { ...row, ...(proposalFinding.proposal?.values as Partial<SchemeRow>) } : row,
    );
    const outcome = accept(alreadyApplied, proposalFinding);
    expect(outcome.entries).toEqual([]);
    expect(outcome.rows).toEqual(alreadyApplied);
  });

  it('goes into the ledger, and the ledger still verifies', async () => {
    const { entries } = accept(draft.rows, proposalFinding);
    let ledger = emptyLedger(SUBJECT);
    for (const entry of entries) ledger = await appendToLedger(ledger, entry);
    expect(ledger.entries).toHaveLength(3);
    await expect(verifyLedger(ledger)).resolves.toEqual({ ok: true, invalid: [] });
  });
});

describe('refusing — consent cannot make the agent write what it never proposed', () => {
  it('refuses to accept a finding that carries a refusal instead of a proposal', () => {
    expect(() => accept(draft.rows, refusalFinding)).toThrow(NothingProposedError);
  });

  it('leaves the draft alone when it refuses', () => {
    const untouched = draft.rows.map((row) => ({ ...row }));
    expect(() => accept(draft.rows, refusalFinding)).toThrow(NothingProposedError);
    expect(draft.rows).toEqual(untouched);
  });

  it('refuses a finding that points at a row the draft does not have', () => {
    const ghost = { ...proposalFinding, row: 9 };
    expect(() => accept(draft.rows, ghost)).toThrow(UnknownRowError);
  });

  it('refuses a proposal naming a column the row has no room for', () => {
    const invented = {
      ...proposalFinding,
      proposal: {
        ...(proposalFinding.proposal as NonNullable<Finding['proposal']>),
        values: { marksOutOf100: '40' },
      },
    };
    expect(() => accept(draft.rows, invented)).toThrow(UnknownColumnError);
  });
});
