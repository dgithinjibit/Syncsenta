import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SchemeRow } from '@/types/curriculum';
import type { Ledger, LedgerSubject } from '@/lib/scheme/ledger';
import { parsePack } from '@/lib/attest/derive';

/**
 * Spoon 5c-4a — the gate in front of the lesson-plan handoff.
 *
 * `scheme_check.metta` states the threshold and the sentence that justifies it, and the reconciler has printed
 * `handoff: 'allowed' | 'refused'` since spoon 5a. Printing a verdict is not enforcing one: the field existed for
 * four spoons with nothing reading it. This module is the thing that reads it, and it enforces two conditions
 * rather than one, which is the part worth submitting:
 *
 * 1. **The scheme must certify** — the policy pack's threshold applied to the count, exactly as 5a computes it.
 * 2. **The record must verify** — because a certified scheme whose ledger has been edited afterwards is not an
 *    auditable decision, it is a story about one. The chain is checked even when the scheme certifies, and a
 *    broken link refuses the handoff while naming the entry that broke.
 *
 * Both are asked on every call and both are reported, so she learns everything at once rather than passing the
 * scheme and then failing on the record. And nothing here has a clock, a network or a file: the same inputs give
 * the same decision, which is what makes the decision defensible six months later.
 */

const STUDIO = process.cwd();
const POLICY_LABEL = 'studio/public/omega/scheme_check.metta';
const ORIGINAL_POLICY_TEXT = readFileSync(join(STUDIO, 'public', 'omega', 'scheme_check.metta'), 'utf8');
const design = {
  file: 'studio/public/omega/ai_g8_design.metta',
  text: readFileSync(join(STUDIO, 'public', 'omega', 'ai_g8_design.metta'), 'utf8'),
};
const draft = JSON.parse(
  readFileSync(join(STUDIO, 'public', 'omega', 'drafts', 'kibera_g8_week14.json'), 'utf8'),
) as { grade: string; rows: SchemeRow[] };

const { reconcileScheme } = await import('@/lib/scheme/reconcile');
const { acceptProposal } = await import('@/lib/scheme/consent');
const { applyOverride, overrideEntry } = await import('@/lib/scheme/override');
const { authorizeHandoff, requireHandoff, HandoffRefusedError } = await import('@/lib/scheme/handoff');
const { emptyLedger, appendToLedger } = await import('@/lib/scheme/ledger');

const ACTOR = 'teacher:kibera_mama_joy';
const WHEN = '2026-10-02T09:04:15+03:00';

const SUBJECT: LedgerSubject = {
  grade: draft.grade,
  draftFile: 'studio/public/omega/drafts/kibera_g8_week14.json',
  designFile: design.file,
  policyFile: POLICY_LABEL,
};

function check(rows: readonly SchemeRow[], policyText: string) {
  return reconcileScheme({ grade: draft.grade, rows, design, policy: { file: POLICY_LABEL, text: policyText } });
}

/** The state 5c-2 and 5c-3 build together: her accepted substitution, her recorded waiver, and both on record. */
const waiver = applyOverride({
  policy: { file: POLICY_LABEL, text: ORIGINAL_POLICY_TEXT },
  grade: 'g8',
  target: { kind: 'field-obligation', field: 'assessmentMethods', to: 'waived' },
});
const accepted = acceptProposal({
  rows: draft.rows,
  finding: check(draft.rows, ORIGINAL_POLICY_TEXT).findings.find((f) => f.row === 3)!,
  actor: ACTOR,
  timestamp: WHEN,
});
const certifiedRun = check(accepted.rows, waiver.text);

async function ledgerOf(entries: Parameters<typeof appendToLedger>[1][]): Promise<Ledger> {
  let ledger = emptyLedger(SUBJECT);
  for (const entry of entries) ledger = await appendToLedger(ledger, entry);
  return ledger;
}

const cleanLedger = await ledgerOf([
  ...accepted.entries,
  overrideEntry({ outcome: waiver, actor: ACTOR, timestamp: WHEN, note: 'Lesson 2 is oral.' }),
]);

describe('an uncertified scheme does not hand off, whatever the record says', () => {
  it('refuses the raw draft on the pack’s threshold, and cites the line that states it', async () => {
    const decision = await authorizeHandoff({
      certification: check(draft.rows, ORIGINAL_POLICY_TEXT).certification,
      ledger: emptyLedger(SUBJECT),
    });
    expect(decision.allowed).toBe(false);
    expect(decision.gate).toBe('certification');
    expect(decision.citations.some((c) => c.startsWith(`${POLICY_LABEL}:`))).toBe(true);
  });

  it('gives her the pack’s own sentence, not this module’s', async () => {
    const decision = await authorizeHandoff({
      certification: check(draft.rows, ORIGINAL_POLICY_TEXT).certification,
      ledger: emptyLedger(SUBJECT),
    });
    const stated = parsePack(ORIGINAL_POLICY_TEXT).find((r) => r.head === 'scheme-certification-reason')?.value;
    expect(decision.reason).toContain(stated ?? '');
    expect(decision.reason).toContain('2 blocking');
  });

  it('refuses on the threshold even when her record verifies perfectly', async () => {
    const decision = await authorizeHandoff({
      certification: check(draft.rows, ORIGINAL_POLICY_TEXT).certification,
      ledger: cleanLedger,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.gate).toBe('certification');
    expect(decision.invalid).toEqual([]);
  });
});

describe('a certified scheme hands off — and only while the record holds', () => {
  it('allows it once both her acts are recorded and the chain verifies', async () => {
    const decision = await authorizeHandoff({ certification: certifiedRun.certification, ledger: cleanLedger });
    expect(decision).toMatchObject({ allowed: true, gate: 'ok', invalid: [] });
  });

  it('is not blocked by the advisory her waiver left behind, because the pack says advisory does not block', async () => {
    const decision = await authorizeHandoff({ certification: certifiedRun.certification, ledger: cleanLedger });
    expect(certifiedRun.counts.advisory).toBe(1);
    expect(decision.allowed).toBe(true);
  });

  it('refuses, and names the entry, when the record has been edited afterwards', async () => {
    const edited = {
      ...cleanLedger,
      entries: cleanLedger.entries.map((e) =>
        e.index === 4 ? { ...e, note: 'The head teacher said it was fine.' } : e,
      ),
    };
    const decision = await authorizeHandoff({ certification: certifiedRun.certification, ledger: edited });
    expect(decision.allowed).toBe(false);
    expect(decision.gate).toBe('chain');
    expect(decision.invalid).toEqual([{ index: 4, reason: 'hash' }]);
    expect(decision.reason).toContain('record');
  });

  it('refuses when a record has been cut out of the middle of the history', async () => {
    const cut = { ...cleanLedger, entries: cleanLedger.entries.slice(0, 2).concat(cleanLedger.entries.slice(3)) };
    const decision = await authorizeHandoff({ certification: certifiedRun.certification, ledger: cut });
    expect(decision.allowed).toBe(false);
    expect(decision.gate).toBe('chain');
    expect(decision.invalid).toEqual([{ index: 4, reason: 'chain' }]);
  });

  it('reports both failures at once, so she is not told twice', async () => {
    const uncertified = check(draft.rows, ORIGINAL_POLICY_TEXT).certification;
    // A middle removal, not a trimmed tail: a prefix cut would verify, and the test would prove nothing
    // about the second gate while looking as though it did.
    const broken = {
      ...cleanLedger,
      entries: cleanLedger.entries.slice(0, 2).concat(cleanLedger.entries.slice(3)),
    };
    const both = await authorizeHandoff({ certification: uncertified, ledger: broken });
    expect(both.allowed).toBe(false);
    expect(both.gate).toBe('certification');
    expect(both.invalid).toEqual([{ index: 4, reason: 'chain' }]);
    expect(both.details.map((d) => d.gate)).toEqual(['certification', 'chain']);
  });
});

describe('the decision is a value, and the caller cannot proceed by ignoring it', () => {
  it('gives the same answer twice for the same inputs', async () => {
    const once = await authorizeHandoff({ certification: certifiedRun.certification, ledger: cleanLedger });
    const twice = await authorizeHandoff({ certification: certifiedRun.certification, ledger: cleanLedger });
    expect(twice).toEqual(once);
  });

  it('throws for a caller that asks to be stopped rather than told', async () => {
    await expect(
      requireHandoff({ certification: check(draft.rows, ORIGINAL_POLICY_TEXT).certification, ledger: cleanLedger }),
    ).rejects.toThrow(HandoffRefusedError);
  });

  it('returns the decision when a caller that must be stopped is allowed through', async () => {
    await expect(
      requireHandoff({ certification: certifiedRun.certification, ledger: cleanLedger }),
    ).resolves.toMatchObject({ allowed: true });
  });

  it('never writes to the ledger it was given', async () => {
    const before = JSON.stringify(cleanLedger);
    await authorizeHandoff({ certification: certifiedRun.certification, ledger: cleanLedger });
    expect(JSON.stringify(cleanLedger)).toBe(before);
  });
});
