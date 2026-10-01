/**
 * Spoon 5c-3 — the override: the teacher argues with a rule at its source, and the next run reads what she said.
 *
 * `scheme_check.metta` has claimed since spoon 3 that *"the teacher's override is a response to that line, not
 * to a number in somebody's code"*. This is the module that makes that sentence true. She is not toggling a
 * setting and not asking the model to be more lenient: one statement in the policy text is rewritten, and the
 * only thing that differs between the blocking run and the passing one is a rule a human can read, cite and
 * disagree with.
 *
 * **It replaces in place rather than appending, and `derive.ts` is why.** `ask()` answers with the *first*
 * statement whose args bind — so an appended `(= (scheme-field-obligation g8 assessmentMethods) waived)` would
 * sit under the original `mandatory` row, never be reached, and the override would silently do nothing. A
 * silent no-op is worse than a refusal, because she would believe she had said it. Replacing in place also
 * keeps every other line number intact, so a transcript from before the override and one from after can be
 * compared line for line.
 *
 * **The pack in the repository is never touched.** The caller passes policy *text* and gets policy *text* back;
 * writing it anywhere is 5c-4's job (`out/`), and the on-disk pack stays the checker's own stance. An override
 * is therefore a claim about one run of one scheme, recorded in the ledger with who made it and when, not an
 * edit to shared rules.
 *
 * **What may not be overridden: the gate.** A field's obligation and a gap's severity are both hers to argue
 * with. `scheme-certification-threshold` is not. She may say *that column does not apply to my scheme*; she may
 * not say *blocking gaps need not be zero*, and this module will not help her say it either — a negotiable gate
 * is not a gate, and the certification is the one claim in this submission that has to hold without her.
 *
 * **And a waived column is not a silent one.** `reconcile.ts` re-raises it every run as advisory, citing the
 * line the override wrote. That is deliberate: an audit trail that only shows the current state is a status
 * report, and the whole argument of Track 5 challenge 1 is that a decision should stay legible after it is made.
 */

import { parsePack, type PackSource } from '@/lib/attest/derive';
import type { LedgerEntryDraft } from './ledger';

/** A column the checker insists on, or the one column she has said does not apply to her scheme. */
export type FieldObligationValue = 'mandatory' | 'optional' | 'waived';

/** How seriously a gap kind is taken. Advisory is a note; blocking is the gate. */
export type GapSeverityValue = 'blocking' | 'advisory';

/** The two kinds of rule a teacher may answer. The certification threshold is deliberately absent. */
export type OverrideTarget =
  | { readonly kind: 'field-obligation'; readonly field: string; readonly to: FieldObligationValue }
  | { readonly kind: 'gap-severity'; readonly gap: string; readonly to: GapSeverityValue };

export type OverrideInput = {
  readonly policy: PackSource;
  readonly grade: string;
  readonly target: OverrideTarget;
};

/** What was changed, where, and what the text reads now — the caller writes it and records it. */
export type OverrideOutcome = {
  readonly file: string;
  readonly text: string;
  readonly line: number;
  readonly head: string;
  readonly args: readonly string[];
  readonly before: string;
  readonly after: string;
};

/** The pack states no such rule, so there is no line for her to be answering. */
export class UnknownRuleError extends Error {}

/** The rule is the gate between a checked scheme and everything downstream of it. Not negotiable. */
export class UnoverridableRuleError extends Error {}

/**
 * A value the reconciler has no reading for, and the hazard is specific: `mandatoryFields` selects rows that
 * say `mandatory`, so *any* other word un-mandates the column — a typo would silently stop a check while
 * recording a waiver the run then cannot find. Refused rather than trusted.
 */
export class UnreadableValueError extends Error {}

/** The pack already says exactly that. Nothing changed, so nothing may be recorded. */
export class OverrideChangesNothingError extends Error {}

/** Heads whose *value* is what a run decides, so a teacher's argument has to be about them, not around them. */
const HEAD_BY_KIND: Record<string, string> = {
  'field-obligation': 'scheme-field-obligation',
  'gap-severity': 'scheme-gap-severity',
  'certification-threshold': 'scheme-certification-threshold',
};

/** Stated separately from the map above so that naming it is refused even though the parser knows the head. */
const NEVER_OVERRIDABLE = ['scheme-certification', 'scheme-check-version', 'scheme-check-stance'];

const READABLE_VALUES: Record<string, readonly string[]> = {
  'scheme-field-obligation': ['mandatory', 'optional', 'waived'],
  'scheme-gap-severity': ['blocking', 'advisory'],
};

function asked(head: string, args: readonly string[]): string {
  return `(${head} ${args.join(' ')})`;
}

function statement(head: string, args: readonly string[], value: string): string {
  return `(= ${asked(head, args)} ${value})`;
}

/**
 * Rewrite one policy statement in the text a run is handed.
 *
 * Every refusal here is deliberate, and each one names what she would have to change to be allowed to proceed:
 * an unknown rule kind, a rule the pack does not state, the gate, a value nobody reads, or a change that is not
 * a change.
 */
export function applyOverride({ policy, grade, target }: OverrideInput): OverrideOutcome {
  const kind = (target as { readonly kind: string }).kind;
  const head = HEAD_BY_KIND[kind];
  if (head === undefined) {
    throw new UnknownRuleError(
      `the checker has no overridable rule kind "${kind}" — the pack states rules, and an override answers one of them`,
    );
  }
  if (NEVER_OVERRIDABLE.some((forbidden) => head.startsWith(forbidden))) {
    throw new UnoverridableRuleError(
      `${head} is the gate, not a gap: a scheme is certified only when no blocking gap survives, ` +
        'and that is the one rule this agent will not rewrite on request. Argue with a column or a severity instead.',
    );
  }

  const args =
    kind === 'field-obligation'
      ? [grade, (target as { field: string }).field]
      : [grade, (target as { gap: string }).gap];
  const to = (target as { readonly to: string }).to;
  const readable = READABLE_VALUES[head];
  if (readable === undefined || !readable.includes(to)) {
    throw new UnreadableValueError(
      `the reconciler reads ${head} as one of ${readable?.join(', ') ?? 'nothing'}, not "${to}"`,
    );
  }

  const row = parsePack(policy.text).find(
    (candidate) =>
      candidate.head === head &&
      candidate.args.length === args.length &&
      candidate.args.every((arg, i) => arg === args[i]) &&
      candidate.value !== null,
  );
  if (row === undefined || row.value === null) {
    throw new UnknownRuleError(
      `${policy.file} states no ${asked(head, args)}, so there is no line here for an override to answer`,
    );
  }
  if (row.value === to) {
    throw new OverrideChangesNothingError(
      `${policy.file}:${row.line} already says ${to}, so recording this would add a non-event to the ledger`,
    );
  }

  const lines = policy.text.split('\n');
  lines[row.line - 1] = statement(head, args, to);
  return {
    file: policy.file,
    text: lines.join('\n'),
    line: row.line,
    head,
    args,
    before: row.value,
    after: to,
  };
}

/**
 * The ledger record for one override: `row: 'pack'`, because the change is about the rules rather than about a
 * line of her scheme, and `citations` pointing at the very line it answered — the same coordinate the next run
 * will print in its transcript.
 */
export function overrideEntry(input: {
  readonly outcome: OverrideOutcome;
  readonly actor: string;
  readonly timestamp: string;
  readonly note?: string;
}): LedgerEntryDraft {
  const { outcome, actor, timestamp, note } = input;
  return {
    timestamp,
    actor,
    row: 'pack',
    field: outcome.args[outcome.args.length - 1],
    before: outcome.before,
    after: outcome.after,
    basis: 'override-granted',
    citations: [`${outcome.file}:${outcome.line}`],
    ...(note === undefined ? {} : { note }),
  };
}
