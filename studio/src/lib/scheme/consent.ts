/**
 * Spoon 5c-2 — consent: turning an accepted proposal into a new draft and a record of the change.
 *
 * 5a produced proposals that nothing could accept, and 5b shipped no button for exactly that reason: a write
 * with no record is the unaccountable decision this submission claims to replace, only quieter. The record now
 * exists (`ledger.ts`), so the write is allowed — under these rules.
 *
 * 1. **Only the proposal's own cells are written.** `proposal.values` carries the columns the *design pack*
 *     states a value for, which is the whole reason 5a refused to invent the rest. This module adds nothing to
 *     that list; if a field is not in `values`, no code path in here can put text in it.
 * 2. **A refusal is not a proposal, and consent does not convert one into one.** The teacher who asks the agent
 *     to fill in her assessment column is told the same thing she was told before: the design states no value
 *     for it. `NothingProposedError` is that refusal, re-raised at the moment it would otherwise be silent.
 * 3. **One record per cell that actually changed** — and no record for a cell that already held the value,
 *     because a ledger of non-events hides the events. The invariant is *the ledger records every change and
 *     only changes*: `rows.length` never moves, and `entries.length` is exactly the number of cells that differ.
 * 4. **The draft she handed over is not touched.** Only the changed row is replaced; every other row is the
 *     same object, so a caller comparing before and after can tell which rows moved by identity as well as value.
 *
 * The citations each record carries are the proposal's citations, unchanged and unchecked — the point is not
 * that this module vouches for them, it is that the number a reviewer can open is the number the agent read.
 *
 * It is pure: no clock (the caller supplies the timestamp, as with the ledger), no storage, no model. Whether
 * the resulting rows are certified is the reconciler's answer to the packs, and she should expect to re-check.
 */

import type { SchemeRow } from '@/types/curriculum';
import type { Finding } from './reconcile';
import type { LedgerEntryDraft } from './ledger';

/** The finding offers a refusal. Nothing here can turn that into a write, however it is asked. */
export class NothingProposedError extends Error {}

/** The finding names a row the draft does not contain, so there is no cell to write and nothing to record. */
export class UnknownRowError extends Error {}

/**
 * The proposal names a column the row has no room for, or one that is not text. Both would write a value the
 * `SchemeRow` type says cannot exist, which is the definition of a decision the schema cannot audit.
 */
export class UnknownColumnError extends Error {}

export type AcceptInput = {
  readonly rows: readonly SchemeRow[];
  /** The finding to accept, exactly as `reconcileScheme` returned it. */
  readonly finding: Finding;
  readonly actor: string;
  readonly timestamp: string;
};

export type AcceptOutcome = {
  /** A new array; the row at `finding.row` is a copy with the proposed cells written, the rest are untouched. */
  readonly rows: readonly SchemeRow[];
  readonly entries: readonly LedgerEntryDraft[];
};

export function acceptProposal({ rows, finding, actor, timestamp }: AcceptInput): AcceptOutcome {
  const proposal = finding.proposal;
  if (proposal === undefined) {
    throw new NothingProposedError(
      `row ${finding.row}, ${finding.field} carries a refusal (${finding.gap}), not a proposal. ` +
        'The agent will write this cell only if the design pack states a value for it, and it does not.',
    );
  }

  const index = finding.row - 1;
  const row = rows[index];
  if (row === undefined) {
    throw new UnknownRowError(
      `the finding is about row ${finding.row} and the draft has ${rows.length} rows`,
    );
  }

  const written: Record<string, unknown> = { ...row };
  const entries: LedgerEntryDraft[] = [];
  for (const [field, value] of Object.entries(proposal.values)) {
    if (!Object.prototype.hasOwnProperty.call(row, field)) {
      throw new UnknownColumnError(
        `the proposal would write "${field}", which row ${finding.row} of this draft has no column for`,
      );
    }
    const current = (row as unknown as Record<string, unknown>)[field];
    if (typeof current !== 'string') {
      throw new UnknownColumnError(
        `the proposal would write "${field}", and ${field} is not a text column of a scheme row`,
      );
    }
    if (current === value) continue;
    written[field] = value;
    entries.push({
      timestamp,
      actor,
      row: finding.row,
      field,
      before: current,
      after: value,
      basis: 'proposal-accepted',
      citations: proposal.citations,
    });
  }

  if (entries.length === 0) return { rows, entries: [] };
  const nextRows = [...rows];
  nextRows[index] = written as unknown as SchemeRow;
  return { rows: nextRows, entries };
}
