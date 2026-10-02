/**
 * Spoon 12 — the teacher session: one place where accept, waive, ledger, and handoff move together.
 *
 * The terminal CLI (`developer_tools/scripts/reconcile.mts`) has called `consent.ts`, `override.ts`,
 * `ledger.ts`, and `handoff.ts` in one run since 5c — this module is that same sequence for a page a signed-in
 * teacher can actually click, and it adds no fifth decision-maker. Every transition here is one call into a
 * module that was already tested; the session only orders them and threads the state through.
 *
 * What it is not:
 *
 * - Not a second engine. There is no verdict logic in this file — `sessionView` asks `buildCheckView`, which
 *   asks `reconcileScheme`, which reads the packs. After an accept or a waive the page re-runs the *whole*
 *   check on the new state, so the banner a teacher sees is derived from what she did, never asserted by it.
 * - Not a clock or a network client. Timestamps come from the caller (the component stamps the moment she
 *   clicked), and nothing here touches Supabase, an API, or a model. Persistence is `serializeSession`/
 *   `parseSession` handing the component a JSON string it may keep wherever it likes — localStorage in the
 *   browser, nowhere in a test.
 * - Not a trust boundary. The actor string is what the component says it is; real authentication is
 *   `middleware.ts` gating `/teacher/*`. This module's promise is narrower and checkable: a change that
 *   happens in the browser records exactly what happened, and the handoff gate refuses to open on a record
 *   that was edited afterwards.
 *
 * The card keys (`row:field`, from `check-view.ts`) are the only way to name a finding to a button. If a key
 * matches no current finding, that is not a no-op — the pack or the draft moved under the page — so it throws
 * `UnknownCardError` and the component tells her to re-check rather than recording a change nothing asked for.
 */

import type { PackSource } from '@/lib/attest/derive';
import type { SchemeRow } from '@/types/curriculum';
import { acceptProposal, NothingProposedError } from './consent';
import { applyOverride, overrideEntry } from './override';
import { emptyLedger, appendToLedger, type Ledger, type LedgerSubject } from './ledger';
import { authorizeHandoff, type HandoffDecision } from './handoff';
import { buildCheckView, type CheckView } from './check-view';
import { reconcileScheme, type Finding, type ReconcileResult } from './reconcile';

/** The draft this demo session is about; `parseSession` refuses records made against anything else. */
export const DEFAULT_DRAFT_FILE = 'studio/public/omega/drafts/kibera_g8_week14.json';

/** A card the page named that no current finding answers — the state moved under the click. */
export class UnknownCardError extends Error {}

export type TeacherSessionInput = {
  readonly grade: string;
  /** The draft as she handed it over. Transitions copy-on-write; this array is never mutated. */
  readonly rows: readonly SchemeRow[];
  readonly design: PackSource;
  readonly policy: PackSource;
  readonly actor: string;
  readonly draftFile?: string;
};

export type TeacherSessionState = {
  readonly rows: readonly SchemeRow[];
  readonly policyText: string;
  readonly ledger: Ledger;
};

function subjectOf(input: TeacherSessionInput): LedgerSubject {
  return {
    grade: input.grade,
    draftFile: input.draftFile ?? DEFAULT_DRAFT_FILE,
    designFile: input.design.file,
    policyFile: input.policy.file,
  };
}

export function startSession(input: TeacherSessionInput): TeacherSessionState {
  return { rows: input.rows, policyText: input.policy.text, ledger: emptyLedger(subjectOf(input)) };
}

function policySource(input: TeacherSessionInput, state: TeacherSessionState): PackSource {
  return { file: input.policy.file, text: state.policyText };
}

export function sessionResult(
  state: TeacherSessionState,
  input: TeacherSessionInput,
): ReconcileResult {
  return reconcileScheme({
    grade: input.grade,
    rows: state.rows,
    design: input.design,
    policy: policySource(input, state),
  });
}

/** The page's entire view model, rebuilt from the session's current state. One engine, re-asked. */
export function sessionView(state: TeacherSessionState, input: TeacherSessionInput): CheckView {
  return buildCheckView({
    grade: input.grade,
    rows: state.rows,
    design: input.design,
    policy: policySource(input, state),
  });
}

function cardFinding(state: TeacherSessionState, input: TeacherSessionInput, key: string): Finding {
  const finding = sessionResult(state, input).findings.find(
    (candidate) => `${candidate.row}:${candidate.field}` === key,
  );
  if (finding === undefined) {
    throw new UnknownCardError(
      `no current finding is card "${key}" — the packs or the draft moved since the page rendered it, ` +
        'so this click records nothing until the check is re-run',
    );
  }
  return finding;
}

async function appendAll(ledger: Ledger, drafts: readonly import('./ledger').LedgerEntryDraft[]): Promise<Ledger> {
  let next = ledger;
  for (const draft of drafts) next = await appendToLedger(next, draft);
  return next;
}

/**
 * Accept one proposed card: `consent.ts` writes only the proposal's own cells and returns one record per
 * cell that actually changed; every record goes into the chain in that order. Refusals throw through —
 * `NothingProposedError` included — because consent is a rule of the engine, not of this file.
 */
export async function acceptProposalForCard(
  state: TeacherSessionState,
  input: TeacherSessionInput,
  key: string,
  timestamp: string,
): Promise<TeacherSessionState> {
  const finding = cardFinding(state, input, key);
  const outcome = acceptProposal({
    rows: state.rows,
    finding,
    actor: input.actor,
    timestamp,
  });
  return {
    rows: outcome.rows,
    policyText: state.policyText,
    ledger: await appendAll(state.ledger, outcome.entries),
  };
}

/**
 * Waive one column: `override.ts` rewrites the policy statement *in the session's copy of the text only* —
 * the pack on disk and in `public/omega/` is never touched by this path — and the one `pack`-row record
 * cites the line it answered. The next run re-raises the waived column as advisory, so the waiver is visible
 * forever rather than silent.
 */
export async function waiveObligationOnCard(
  state: TeacherSessionState,
  input: TeacherSessionInput,
  key: string,
  timestamp: string,
): Promise<TeacherSessionState> {
  const finding = cardFinding(state, input, key);
  const outcome = applyOverride({
    policy: policySource(input, state),
    grade: input.grade,
    target: { kind: 'field-obligation', field: finding.field, to: 'waived' },
  });
  const entry = overrideEntry({ outcome, actor: input.actor, timestamp });
  return {
    rows: state.rows,
    policyText: outcome.text,
    ledger: await appendToLedger(state.ledger, entry),
  };
}

/** Both gates, asked on the session's live state: the certification the packs reached and the chain so far. */
export async function sessionHandoff(
  state: TeacherSessionState,
  input: TeacherSessionInput,
): Promise<HandoffDecision> {
  const result = sessionResult(state, input);
  return authorizeHandoff({ certification: result.certification, ledger: state.ledger });
}

/** Everything a reload needs: her rows, her policy text as this session changed it, and the signed chain. */
export function serializeSession(state: TeacherSessionState): string {
  return JSON.stringify({ rows: state.rows, policyText: state.policyText, ledger: state.ledger });
}

/**
 * Restore, or refuse. The subject check is the whole reason a saved session cannot be pasted onto a
 * different scheme: the hashes were computed *named to this draft and these packs*, so a record whose
 * subject moved is not this teacher's history and will not verify as one either.
 */
export function parseSession(text: string, input: TeacherSessionInput): TeacherSessionState {
  const parsed = JSON.parse(text) as Partial<TeacherSessionState>;
  const expected = subjectOf(input);
  const subject = parsed.ledger?.subject;
  if (
    !Array.isArray(parsed.rows) ||
    typeof parsed.policyText !== 'string' ||
    !Array.isArray(parsed.ledger?.entries) ||
    subject === undefined ||
    subject.grade !== expected.grade ||
    subject.draftFile !== expected.draftFile ||
    subject.designFile !== expected.designFile ||
    subject.policyFile !== expected.policyFile
  ) {
    throw new Error(
      'this saved record is not this draft: it was written against different files, and restoring it would ' +
        'put yesterday\'s scheme under today\'s buttons',
    );
  }
  return { rows: parsed.rows, policyText: parsed.policyText, ledger: parsed.ledger as Ledger };
}

export { NothingProposedError };
