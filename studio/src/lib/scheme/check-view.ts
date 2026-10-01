import type { PackSource } from '@/lib/attest/derive';
import { parsePack } from '@/lib/attest/derive';
import type { SchemeRow } from '@/types/curriculum';
import { gradeNumber, HEADS, reconcileScheme } from './reconcile';
import type { Counts, Finding, Proposal, ReconcileResult, Severity } from './reconcile';

/**
 * Page data for the scheme check — the reconciler's answer, arranged for a screen and decided nowhere else.
 *
 * This module exists so the JSX cannot become a second decision-maker. A page that computes
 * `blocking > 0 ? 'Certified' : 'Not certified'` in a template has taken over the verdict: it is no longer
 * a line the pack states, it is a line the front end assumed, and nothing in the test suite would notice if
 * it disagreed with the derivation. So every field below is either copied from the draft exactly as she
 * wrote it, or read out of `reconcileScheme`, or read out of the design pack with `parsePack`. There is no
 * fourth source.
 *
 * Note what is *not* here: no timestamp, no random id, no `Date`. The view is a function of the packs and
 * the draft, so two renders of one draft print one decision. That is what makes the terminal runner and the
 * browser page the same engine rather than two implementations of it.
 */

export type CheckViewInput = {
  readonly grade: string;
  readonly rows: readonly SchemeRow[];
  readonly design: PackSource;
  readonly policy: PackSource;
  /** The draft file's own provenance block, shown verbatim. Nothing here invents a school or a name. */
  readonly origin?: Readonly<Record<string, string | undefined>>;
};

export type RowStatus = 'clean' | 'blocking' | 'advisory';

export type ViewRow = SchemeRow & {
  readonly index: number;
  readonly status: RowStatus;
  readonly gaps: readonly string[];
};

export type ViewCard = {
  readonly key: string;
  readonly row: number;
  readonly field: string;
  readonly gap: string;
  readonly heading: string;
  readonly severity: Severity;
  readonly reason: string;
  readonly why: string;
  readonly citations: readonly string[];
  readonly proposal?: Proposal;
  readonly refusal?: string;
  /** Present only on a card that proposes something, in the teacher's own terms. */
  readonly consentNote?: string;
};

export type Verdict = {
  readonly headline: string;
  readonly detail: string;
  readonly certified: boolean;
  readonly threshold: string;
  readonly reason: string;
  readonly handoff: ReconcileResult['certification']['handoff'];
  readonly counts: Counts;
};

export type CheckView = {
  readonly title: string;
  readonly gradeLabel: string;
  readonly learningArea: string;
  readonly designVersion: string;
  readonly originLine: string;
  readonly rows: readonly ViewRow[];
  readonly cards: readonly ViewCard[];
  readonly verdict: Verdict;
  readonly transcript: string;
  readonly transcriptLines: readonly string[];
};

const CONSENT_NOTE =
  'Nothing has been changed. This is a proposal, and it stays one until you accept it.';

export function buildCheckView(input: CheckViewInput): CheckView {
  const result = reconcileScheme(input);
  const designRows = parsePack(input.design.text);
  const designValue = (head: string): string | undefined =>
    designRows.find((row) => row.head === head && row.args[0] === input.grade)?.value ?? undefined;

  const learningArea = designValue(HEADS.learningArea) ?? 'the curriculum';
  const designVersion = designValue(HEADS.version) ?? 'unversioned';
  const gradeLabel = `Grade ${gradeNumber(input.grade)}`;

  return {
    title: `Scheme check · ${gradeLabel} ${learningArea}`,
    gradeLabel,
    learningArea,
    designVersion,
    originLine: originLineOf(input.origin),
    rows: viewRows(input.rows, result),
    cards: result.findings.map((finding) => cardFor(finding, input.rows)),
    verdict: verdictFor(result),
    transcript: result.transcript,
    transcriptLines: result.transcript.split('\n'),
  };
}

/**
 * Provenance the teacher wrote, reprinted in the order the file lists it. An absent block is an empty
 * string rather than a placeholder, because "Unknown School" on camera reads as a fact about a school.
 */
function originLineOf(origin: CheckViewInput['origin']): string {
  if (origin === undefined) return '';
  return ['school', 'teacher', 'term']
    .map((key) => origin[key])
    .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
    .join(' · ');
}

function viewRows(
  rows: readonly SchemeRow[],
  result: ReconcileResult,
): ViewRow[] {
  return rows.map((row, index) => {
    const findings = result.findings.filter((finding) => finding.row === index + 1);
    const status: RowStatus = findings.some((finding) => finding.severity === 'blocking')
      ? 'blocking'
      : findings.length > 0
        ? 'advisory'
        : 'clean';
    return {
      ...row,
      index,
      status,
      gaps: [...new Set(findings.map((finding) => finding.gap))],
    };
  });
}

function cardFor(finding: Finding, rows: readonly SchemeRow[]): ViewCard {
  const source = rows[finding.row - 1];
  const location =
    source === undefined
      ? `Row ${finding.row}`
      : `Week ${source.week} · Lesson ${source.lesson}`;
  return {
    key: `${finding.row}:${finding.field}`,
    row: finding.row,
    field: finding.field,
    gap: finding.gap,
    heading: `${location} · ${finding.field}`,
    severity: finding.severity,
    reason: finding.reason,
    why: finding.why,
    citations: finding.citations,
    ...(finding.proposal === undefined
      ? { refusal: finding.refusal }
      : { proposal: finding.proposal, consentNote: CONSENT_NOTE }),
  };
}

/**
 * The verdict line, worded from the pack's own threshold and reason. The count sentence is the same one the
 * transcript footer prints, so the banner and the derivation cannot drift apart on screen.
 */
function verdictFor(result: ReconcileResult): Verdict {
  const { certification, counts } = result;
  const headline = certification.certified
    ? `Certified — ${counts.clean} of ${counts.clean + counts.blocking + counts.advisory} rows, and ${certification.threshold}`
    : `Not certified — ${certification.threshold}, and ${certification.blocking} row${
        certification.blocking === 1 ? '' : 's'
      } still blocking`;
  const detail = `${certification.reason} ${counts.clean} clean · ${counts.blocking} blocking · ${counts.advisory} advisory.`;

  return {
    headline,
    detail,
    certified: certification.certified,
    threshold: certification.threshold,
    reason: certification.reason,
    handoff: certification.handoff,
    counts,
  };
}
