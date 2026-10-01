/**
 * Spoon 5c-4a — the handoff gate: the thing that reads `certification.handoff` instead of printing it.
 *
 * Since spoon 5a the reconciler has carried a `handoff: 'allowed' | 'refused'` field, and since 5b the page has
 * shown it. Shown, not enforced: for four spoons nothing in the codebase read the field, which is exactly the
 * difference between a policy and a decoration. This module is the reader. The lesson-plan generator is the
 * thing downstream of it, and in the demo it is reached through `requireHandoff` rather than around it.
 *
 * Two conditions, and the second is the reason this is a submission rather than a validator:
 *
 * 1. **The scheme must certify.** The policy pack's threshold applied to the blocking count — this module adds
 *    no rule of its own and changes none; it reads `certification` as the reconciler derived it from
 *    `scheme_check.metta`, and cites the pack line that states the threshold.
 * 2. **The record must verify.** `verifyLedger` recomputes every hash in the chain. A scheme with no blocking
 *    gap whose ledger has been edited afterwards is not an auditable decision — it is a story about one, told
 *    by whoever opened the file last. So the chain is checked even when the scheme certifies, and a broken
 *    link refuses the handoff naming the entry that broke.
 *
 * Both questions are asked on every call and both answers are reported. She is not made to fix the scheme,
 * re-run, and only then discover her record was tampered with: `details` carries each gate's finding in the
 * fixed order `certification`, `chain`, and `reason` reads the same way.
 *
 * `gate` is the *primary* failure, and certification is primary. The ordering is not a judgment about which
 * is worse — it is that the pack's threshold is a rule about her scheme, stated in a file she can open and
 * argue with, while a broken chain is a fact about the record. A decision that reported the record first
 * would let an uncertified scheme look like it only needed a re-hash.
 *
 * No clock, no network, no model, no writes. The same certification and the same ledger give the same
 * decision twice, byte for byte, because a gate that is not reproducible is not a gate — it is a coin flip
 * with an audit trail attached. And it never touches the ledger it is handed: verification that wrote a
 * record would be able to repair the very thing it was checking.
 */

import { verifyLedger, type Ledger, type LedgerBreak } from './ledger';
import type { Certification } from './reconcile';

export type HandoffInput = {
  readonly certification: Certification;
  readonly ledger: Ledger;
};

/** `'ok'` is a gate name, not a third gate: it is what `gate` says when nothing failed. */
export type HandoffGate = 'certification' | 'chain' | 'ok';

export type CertificationFailure = {
  readonly gate: 'certification';
  readonly reason: string;
  readonly threshold: string;
  readonly blocking: number;
  readonly citations: readonly string[];
};

export type ChainFailure = {
  readonly gate: 'chain';
  readonly reason: string;
  readonly invalid: readonly LedgerBreak[];
};

export type HandoffFailure = CertificationFailure | ChainFailure;

export type HandoffDecision = {
  readonly allowed: boolean;
  /** The primary gate. Use `details` for everything that failed, not just the first. */
  readonly gate: HandoffGate;
  /** One sentence for the page: the pack's own words, plus whichever record failure sits behind them. */
  readonly reason: string;
  /** Pack lines the decision rests on. Empty for a chain failure, whose evidence is an entry index and hash. */
  readonly citations: readonly string[];
  /** The ledger's own verdict, reported even when certification is the reason she was stopped. */
  readonly invalid: readonly LedgerBreak[];
  readonly details: readonly HandoffFailure[];
};

/** A caller that must not proceed gets this, with the full decision attached rather than a bare message. */
export class HandoffRefusedError extends Error {
  readonly decision: HandoffDecision;
  constructor(decision: HandoffDecision) {
    super(decision.reason);
    this.name = 'HandoffRefusedError';
    this.decision = decision;
  }
}

function describeBreaks(invalid: readonly LedgerBreak[]): string {
  return invalid
    .map((b) => `entry ${b.index} fails on its ${b.reason}`)
    .join('; ');
}

function certificationFailure(certification: Certification): CertificationFailure {
  return {
    gate: 'certification',
    threshold: certification.threshold,
    blocking: certification.blocking,
    // The pack's sentence first, the count second: she reads the rule she can argue with, then the number
    // this module compared against it. The wording belongs to scheme_check.metta, not to this file.
    reason:
      `${certification.blocking} blocking, and the rule is ${certification.threshold}. ${certification.reason}`,
    citations: [...certification.citations],
  };
}

function chainFailure(invalid: readonly LedgerBreak[]): ChainFailure {
  return {
    gate: 'chain',
    invalid,
    reason:
      `the audit record for this scheme no longer verifies — ${describeBreaks(invalid)}. ` +
      'Handing off would put a lesson plan behind a history that cannot be recomputed, so the record has to ' +
      'be re-produced from the draft it describes before the generator reads anything.',
  };
}

/**
 * Ask both gates, report both, allow only when neither objects.
 *
 * The returned object is a value the caller can log, print or compare; nothing here decides what to do about
 * a refusal beyond naming it.
 */
export async function authorizeHandoff(input: HandoffInput): Promise<HandoffDecision> {
  const { certification, ledger } = input;

  // Asked before the certification check, so an uncertified run still says whether the record holds.
  const verdict = await verifyLedger(ledger);

  const details: HandoffFailure[] = [];
  if (!certification.certified) details.push(certificationFailure(certification));
  if (!verdict.ok) details.push(chainFailure(verdict.invalid));

  const allowed = details.length === 0;
  return {
    allowed,
    gate: allowed ? 'ok' : details[0].gate,
    reason: allowed
      ? `${certification.blocking} blocking against the rule ${certification.threshold}, and every one of the ` +
        `${ledger.entries.length} records recomputes. ${certification.reason}`
      : details.map((detail) => detail.reason).join(' '),
    citations: details.flatMap((detail) => (detail.gate === 'certification' ? detail.citations : [])),
    invalid: verdict.invalid,
    details,
  };
}

/**
 * The form a caller cannot skip: the value for anyone who wants to show a verdict, this for anyone who has to
 * stop. A generator that forgets to read `allowed` still cannot produce a lesson plan from here.
 */
export async function requireHandoff(input: HandoffInput): Promise<HandoffDecision> {
  const decision = await authorizeHandoff(input);
  if (!decision.allowed) throw new HandoffRefusedError(decision);
  return decision;
}
