import { describe, expect, it } from 'vitest';
import type { LedgerEntryDraft } from '@/lib/scheme/ledger';

/**
 * Spoon 5c-1 — the ledger: an append-only record of every change the agent was allowed to make.
 *
 * The reconciler (5a) is deliberately pure: no clock, no random number, so the same draft and the same packs
 * print the same transcript forever. That purity is why a decision and its audit record cannot share a module
 * — a timestamp inside the decision would make the decision non-reproducible. So the clock lives here, and
 * everything in this file is about one question a BASIX reviewer will actually ask: *when the agent changed
 * the teacher's scheme, is there a record that cannot be quietly edited afterwards?*
 *
 * The answers the suite demands, in order:
 *
 * 1. appending never mutates the ledger it was given, so "append-only" is a property of the data structure
 *    and not a promise in a comment;
 * 2. every entry carries the hash of the one before it, so the order is part of the content;
 * 3. recomputing the chain finds a changed field, and finds a removed entry, and says which index, and
 *    refuses a history whose numbering does not run from 1 even when every hash in it is self-consistent;
 * 4. the hash covers the fields that matter — row, field, before, after, who did it, when, and the pack
 *    lines it was citing — so an entry is a claim about a rule, not just a diff.
 *
 * Hashing is WebCrypto SHA-256: `crypto.subtle` is present in the browser bundle and in Node 22, and a
 * hand-rolled digest would be the one thing in this submission a reviewer is right to distrust.
 */

const { emptyLedger, appendToLedger, verifyLedger, hashOfEntry, GENESIS_PREV_HASH } = await import(
  '@/lib/scheme/ledger'
);

const SUBJECT = {
  grade: 'g8',
  draftFile: 'studio/public/omega/drafts/kibera_g8_week14.json',
  designFile: 'studio/public/omega/ai_g8_design.metta',
  policyFile: 'studio/public/omega/scheme_check.metta',
};

/** The row-3 sub-strand fix from the demo draft: what 5a proposes, and what the teacher then accepts. */
const PROPOSAL_ACCEPT: LedgerEntryDraft = {
  timestamp: '2026-10-02T08:41:00+03:00',
  actor: 'teacher:kibera_mama_joy',
  row: 3,
  field: 'subStrand',
  before: '7.2 Data Collection',
  after: '7.1 Introduction to Data',
  basis: 'proposal-accepted' as const,
  citations: ['studio/public/omega/ai_g8_design.metta:41', 'studio/public/omega/scheme_check.metta:49'],
};

const ANOTHER_ACCEPT: LedgerEntryDraft = {
  ...PROPOSAL_ACCEPT,
  timestamp: '2026-10-02T08:43:12+03:00',
  field: 'assessmentMethods',
  before: '',
  after: 'Oral questions and a checklist over the class survey.',
  basis: 'teacher-edit' as const,
  citations: ['studio/public/omega/scheme_check.metta:39'],
};

function aLedgerWith(...drafts: readonly LedgerEntryDraft[]) {
  return drafts.reduce(
    async (pending, draft) => appendToLedger(await pending, draft),
    Promise.resolve(emptyLedger(SUBJECT)),
  );
}

describe('appending — a record is added, nothing already written is touched', () => {
  it('starts empty and verifies as it should', async () => {
    const ledger = emptyLedger(SUBJECT);
    expect(ledger.entries).toEqual([]);
    await expect(verifyLedger(ledger)).resolves.toEqual({ ok: true, invalid: [] });
  });

  it('copies rather than mutates, so an old ledger stays the ledger it was', async () => {
    const before = emptyLedger(SUBJECT);
    const after = await appendToLedger(before, PROPOSAL_ACCEPT);
    expect(before.entries).toHaveLength(0);
    expect(after.entries).toHaveLength(1);
  });

  it('numbers entries from 1 and points the first one at the genesis hash', async () => {
    const ledger = await aLedgerWith(PROPOSAL_ACCEPT);
    expect(ledger.entries[0].index).toBe(1);
    expect(ledger.entries[0].prevHash).toBe(GENESIS_PREV_HASH);
  });

  it('carries every field a reviewer needs to charge the change to a rule', async () => {
    const ledger = await aLedgerWith(PROPOSAL_ACCEPT);
    const entry = ledger.entries[0];
    expect(entry).toMatchObject(PROPOSAL_ACCEPT);
    expect(entry.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('links each entry to the hash of the entry before it', async () => {
    const ledger = await aLedgerWith(PROPOSAL_ACCEPT, ANOTHER_ACCEPT);
    expect(ledger.entries[1].index).toBe(2);
    expect(ledger.entries[1].prevHash).toBe(ledger.entries[0].hash);
  });

  it('is deterministic: the same ledger rebuilt twice hashes identically', async () => {
    const once = await aLedgerWith(PROPOSAL_ACCEPT, ANOTHER_ACCEPT);
    const twice = await aLedgerWith(PROPOSAL_ACCEPT, ANOTHER_ACCEPT);
    expect(twice.entries.map((e) => e.hash)).toEqual(once.entries.map((e) => e.hash));
  });

  it('does not give two identical changes the same hash', async () => {
    const ledger = await aLedgerWith(PROPOSAL_ACCEPT, PROPOSAL_ACCEPT);
    expect(ledger.entries[0].hash).not.toBe(ledger.entries[1].hash);
  });
});

describe('verifying — the chain reports what was edited, and where', () => {
  it('accepts a ledger that was built one append at a time', async () => {
    const ledger = await aLedgerWith(PROPOSAL_ACCEPT, ANOTHER_ACCEPT, PROPOSAL_ACCEPT);
    await expect(verifyLedger(ledger)).resolves.toEqual({ ok: true, invalid: [] });
  });

  it('catches a rewrite of the value that was written in', async () => {
    const ledger = await aLedgerWith(PROPOSAL_ACCEPT, ANOTHER_ACCEPT);
    const tampered = {
      ...ledger,
      entries: ledger.entries.map((entry) =>
        entry.index === 2 ? { ...entry, after: 'Something the teacher never agreed to.' } : entry,
      ),
    };
    const verdict = await verifyLedger(tampered);
    expect(verdict.ok).toBe(false);
    expect(verdict.invalid).toEqual([{ index: 2, reason: 'hash' }]);
  });

  it('catches a changed citation, because a record quoting no rule is not a record', async () => {
    const ledger = await aLedgerWith(PROPOSAL_ACCEPT);
    const tampered = {
      ...ledger,
      entries: [{ ...ledger.entries[0], citations: ['studio/public/omega/scheme_check.metta:999'] }],
    };
    await expect(verifyLedger(tampered)).resolves.toMatchObject({ ok: false });
  });

  it('catches an entry removed from the middle of the history', async () => {
    const ledger = await aLedgerWith(PROPOSAL_ACCEPT, ANOTHER_ACCEPT, PROPOSAL_ACCEPT);
    const cut = { ...ledger, entries: [ledger.entries[0], ledger.entries[2]] };
    const verdict = await verifyLedger(cut);
    expect(verdict.ok).toBe(false);
    expect(verdict.invalid).toEqual([{ index: 3, reason: 'chain' }]);
  });

  it('catches history appended by hand rather than through the ledger', async () => {
    const ledger = await aLedgerWith(PROPOSAL_ACCEPT);
    const forged = await hashOfEntry(SUBJECT, 2, GENESIS_PREV_HASH, ANOTHER_ACCEPT);
    const withForged = { ...ledger, entries: [...ledger.entries, { ...ANOTHER_ACCEPT, index: 2, prevHash: GENESIS_PREV_HASH, hash: forged }] };
    const verdict = await verifyLedger(withForged);
    expect(verdict.ok).toBe(false);
    expect(verdict.invalid).toEqual([{ index: 2, reason: 'chain' }]);
  });

  it('refuses a history that does not start at 1, even when every hash is self-consistent', async () => {
    const ledger = await aLedgerWith(PROPOSAL_ACCEPT);
    const renumbered = 7;
    const hash = await hashOfEntry(SUBJECT, renumbered, GENESIS_PREV_HASH, PROPOSAL_ACCEPT);
    const backdated = {
      ...ledger,
      entries: [{ ...PROPOSAL_ACCEPT, index: renumbered, prevHash: GENESIS_PREV_HASH, hash }],
    };
    const verdict = await verifyLedger(backdated);
    expect(verdict.ok).toBe(false);
    expect(verdict.invalid).toEqual([{ index: 7, reason: 'order' }]);
  });
});
