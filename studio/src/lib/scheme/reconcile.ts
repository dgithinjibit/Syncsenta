/**
 * The scheme-of-work reconciler: a teacher's draft in, a cited decision out.
 *
 * This is the Monday-morning step. She opens the page with no network, the draft she wrote on Saturday is
 * read, and every finding below is an answer to a question asked of a MeTTa line — the design pack for what
 * the curriculum *is*, the policy pack for what counts as a gap and how serious it is. Nothing here knows
 * what a good lesson plan looks like, and nothing here asks a model: an invented severity would be exactly
 * the unaccountable decision this submission claims to replace.
 *
 * Three rules the rest of the module exists to keep:
 *
 * 1. **A proposal may only carry values the design pack states.** For a sub-strand written with the wrong
 *    number, the name, the strand and the inquiry question are the curriculum's own words, so proposing them
 *    after she consents is a lookup, not a guess. Learning outcomes, experiences, resources, assessment and
 *    reflection are hers; a gap in one of those gets a refusal and a reason, never a filled cell.
 * 2. **A substitution is offered only when the design matches exactly one sub-strand.** "Data pipeline"
 *    matches two real ones, and choosing between them is a teacher's judgment. Ambiguity produces a refusal.
 * 3. **Certification is the policy pack's threshold applied to a count, not an opinion.** The pack returns
 *    `blocking-must-be-zero`; this module counts and compares, because the line-shaped parser does no
 *    arithmetic and the alternative is pretending the file does something it does not.
 *
 * It is pure: the same draft and the same packs produce the same object, twice, with no clock and no random
 * number. Timestamps belong to the ledger, which is the next slice and deliberately not here — a decision and
 * its audit record must not share a mutable field.
 */

import {
  deriveCertificationRule,
  deriveFieldObligation,
  deriveGapPolicy,
  parsePack,
  renderDerivation,
  type Derivation,
  type DerivationStep,
  type PackSource,
} from '@/lib/attest/derive';
import type { SchemeRow } from '@/types/curriculum';

export type ReconcileInput = {
  readonly grade: string;
  readonly rows: readonly SchemeRow[];
  readonly design: PackSource;
  readonly policy: PackSource;
};

export type Severity = 'blocking' | 'advisory';

export type Proposal = {
  /** Only columns the design pack states a value for. */
  readonly values: Readonly<Record<string, string>>;
  readonly requiresConsent: true;
  readonly citations: readonly string[];
};

export type Finding = {
  /** 1-based, in the order she wrote them, because that is the order she will look for them in. */
  readonly row: number;
  readonly field: string;
  readonly gap: string;
  readonly severity: Severity;
  readonly reason: string;
  /** The rendered derivation: the questions asked, the row that answered, the rows that refused. */
  readonly why: string;
  readonly citations: readonly string[];
  readonly proposal?: Proposal;
  readonly refusal?: string;
};

export type Counts = { readonly blocking: number; readonly advisory: number; readonly clean: number };

export type Certification = {
  readonly certified: boolean;
  readonly threshold: string;
  readonly reason: string;
  readonly blocking: number;
  readonly handoff: 'allowed' | 'refused';
  /**
   * The pack lines that state the threshold and its reason, exactly as `deriveCertificationRule` used them.
   * Carried here because a verdict nobody can cite is an opinion: `handoff.ts` refuses or allows in front of
   * the lesson-plan generator, and the teacher has to be able to open the line that decided it.
   */
  readonly citations: readonly string[];
};

export type ReconcileResult = {
  readonly findings: readonly Finding[];
  readonly counts: Counts;
  readonly certification: Certification;
  readonly transcript: string;
};

/** A threshold this module does not implement is an error, not a silent fallback to the one it does. */
export class UnsupportedThresholdError extends Error {}

/**
 * The design-pack heads this module asks about. Exported because the page's view model has to name the
 * learning area and the design version in its header, and a second spelling of those heads would be a
 * second place for a rename to go quietly wrong.
 */
export const HEADS = {
  name: 'ai-design-name',
  strand: 'ai-design-strand',
  inquiry: 'ai-design-inquiry',
  strandName: 'ai-design-strand-name',
  learningArea: 'ai-design-learning-area',
  version: 'ai-design-curriculum-version',
} as const;

/**
 * The gap kind a waived column raises (`scheme-override.ts` is what writes the word `waived` into the pack).
 * It is a gap kind like any other, which is why the policy pack has to state a severity and a sentence for it:
 * asking for a kind the pack never wrote down throws rather than defaulting to advisory.
 */
export const WAIVED_GAP = 'field-obligation-waived-by-teacher';

/** Words too general to identify one sub-strand, and too common to be worth matching on. */
const STOP_WORDS = new Set([
  'and',
  'the',
  'with',
  'from',
  'into',
  'that',
  'this',
  'using',
  'introduction',
]);

function idOf(cell: string): string | undefined {
  return /^(\d+(?:\.\d+)?)\s/.exec(cell)?.[1];
}

/** `g8` and `grade8` both read as 8; a grade with no digits keeps its own label rather than guessing. */
export function gradeNumber(grade: string): string {
  return /(\d+)/.exec(grade)?.[1] ?? grade;
}

function isEmpty(value: unknown): boolean {
  if (typeof value === 'number') return false;
  if (typeof value === 'string') return value.trim() === '';
  return value === undefined || value === null;
}

/**
 * The steps a decision rests on: the rows the pack answered with.
 *
 * A derivation also records the lines it *considered* and rejected — a `scheme-gap-reason` row written for a
 * different gap kind, say. Those belong in the printed trace, where the reader can see the search, and
 * nowhere else. Reading a value out of a rejected line is how row 3 of the demo draft ended up quoting the
 * blank-column sentence: both lookups here took the first step that mentioned a head, and the first one is
 * not the one that answered.
 */
function usedSteps(derivation: Derivation): DerivationStep[] {
  return derivation.steps.filter((step) => step.result === 'matched' || step.result === 'applied');
}

/** `…/scheme_check.metta:48` for every pack line the derivation actually used. */
function citationsOf(derivation: Derivation): string[] {
  return usedSteps(derivation)
    .filter((step) => step.packLine !== null)
    .map((step) => `${derivation.packFile}:${step.packLine}`);
}

function quotedValue(text: string | null): string | undefined {
  if (text === null) return undefined;
  return /"(.*)"\s*\)?\s*$/.exec(text)?.[1];
}

/** The sentence the pack carries for one head — the teacher reads the file's words, not this module's. */
function sentenceFrom(derivation: Derivation, head: string): string | undefined {
  const step = usedSteps(derivation).find((candidate) => candidate.asked.includes(head));
  return step === undefined ? undefined : quotedValue(step.packText ?? null);
}

export function reconcileScheme(input: ReconcileInput): ReconcileResult {
  const { grade, rows, design, policy } = input;
  const designRows = parsePack(design.text);
  const policyRows = parsePack(policy.text);

  const designValue = (head: string, ...args: string[]): string | undefined =>
    designRows.find((row) => row.head === head && row.args.join(' ') === args.join(' '))?.value ?? undefined;

  const mandatoryFields = policyRows
    .filter(
      (row) => row.head === 'scheme-field-obligation' && row.args[0] === grade && row.value === 'mandatory',
    )
    .map((row) => row.args[1]);

  /**
   * Columns she has recorded as not applying to her scheme (`scheme-override.ts` writes that word), with the
   * line in the pack that says so. A field is only waived if the pack no longer calls it mandatory: a hand-edited
   * pack that states both readings is treated as the stricter one, because a stray waived row must not be able
   * to cancel a live blocking rule.
   */
  const waivers = policyRows
    .filter(
      (row) =>
        row.head === 'scheme-field-obligation' &&
        row.args[0] === grade &&
        row.value === 'waived' &&
        !mandatoryFields.includes(row.args[1]),
    )
    .map((row) => ({ field: row.args[1], line: row.line }));

  /** Every design sub-strand whose name contains a distinctive word the teacher wrote. */
  function candidatesFor(cell: string): string[] {
    const words = cell
      .replace(/^\d+(?:\.\d+)?\s*/, '')
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));
    const hits = new Set<string>();
    for (const row of designRows) {
      if (row.head !== HEADS.name || typeof row.value !== 'string') continue;
      if (words.some((word) => row.value!.toLowerCase().includes(word))) {
        hits.add(row.args[row.args.length - 1]);
      }
    }
    return [...hits];
  }

  function makeFinding(
    row: number,
    field: string,
    gap: string,
    extra: { proposal?: Proposal; refusal?: string; extraCitations?: readonly string[] } = {},
  ): Finding {
    const derivation = deriveGapPolicy({ grade, gap }, policy);
    const reason = sentenceFrom(derivation, 'scheme-gap-reason');
    if (reason === undefined) {
      throw new Error(
        `scheme_check.metta states no reason for ${gap}; a bare label would tell the teacher nothing`,
      );
    }
    const { extraCitations, ...rest } = extra;
    return {
      row,
      field,
      gap,
      severity: derivation.conclusion as Severity,
      reason,
      why: renderDerivation(derivation),
      citations: [...citationsOf(derivation), ...(extraCitations ?? [])],
      ...rest,
    };
  }

  /** The design's own words for one real sub-strand — a lookup, and the only filling this module may propose. */
  function proposalFor(subId: string): Proposal | undefined {
    const name = designValue(HEADS.name, grade, subId);
    if (name === undefined) return undefined;
    const values: Record<string, string> = { subStrand: `${subId} ${name}` };
    const strandId = designValue(HEADS.strand, grade, subId);
    const strandName = strandId === undefined ? undefined : designValue(HEADS.strandName, strandId);
    if (strandId !== undefined) values.strand = `${strandId} ${strandName ?? ''}`.trim();
    const inquiry = designValue(HEADS.inquiry, grade, subId);
    if (inquiry !== undefined) values.keyInquiryQuestion = inquiry;
    const citations = designRows
      .filter((row) => row.args[row.args.length - 1] === subId && row.head.startsWith('ai-design-'))
      .map((row) => `${design.file}:${row.line}`);
    return { values, requiresConsent: true, citations };
  }

  const findings: Finding[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 1;

    for (const field of mandatoryFields) {
      if (!isEmpty((row as unknown as Record<string, unknown>)[field])) continue;
      const obligation = deriveFieldObligation({ grade, field }, policy);
      const why = sentenceFrom(obligation, 'scheme-field-obligation-why');
      findings.push(
        makeFinding(rowNumber, field, 'mandatory-field-empty', {
          refusal:
            `The ${field} column is empty and the policy pack calls it mandatory` +
            `${why === undefined ? '.' : `: ${why}`} The design states no value for it, so the agent will ` +
            'not write one. Fill it yourself, or tell the checker the column does not apply.',
        }),
      );
    }

    for (const waiver of waivers) {
      if (!isEmpty((row as unknown as Record<string, unknown>)[waiver.field])) continue;
      // She took responsibility for the empty cell, so it does not block — but it is reported on every later
      // run, citing the line her own override wrote, because a checker that forgets is not an auditable one.
      findings.push(
        makeFinding(rowNumber, waiver.field, WAIVED_GAP, {
          extraCitations: [`${policy.file}:${waiver.line}`],
        }),
      );
    }

    const subId = idOf(row.subStrand);
    if (subId === undefined || designValue(HEADS.name, grade, subId) === undefined) {
      // With no design row there is no strand and no inquiry to compare against, so reporting a second
      // finding here would be this module inventing a defect the curriculum never stated.
      const candidates = row.subStrand === undefined ? [] : candidatesFor(row.subStrand);
      const proposal = candidates.length === 1 ? proposalFor(candidates[0]) : undefined;
      findings.push(
        makeFinding(rowNumber, 'subStrand', 'sub-strand-not-in-design', {
          ...(proposal === undefined
            ? {
                refusal:
                  `Nothing in the Grade ${gradeNumber(grade)} design matches "${row.subStrand}" closely ` +
                  'enough to propose a substitution: the name matches no sub-strand, or it matches several. ' +
                  'Choosing between real sub-strands is your call, not the agent\'s.',
              }
            : { proposal }),
        }),
      );
      return;
    }

    const expectedStrand = designValue(HEADS.strand, grade, subId);
    if (expectedStrand !== undefined && idOf(row.strand) !== expectedStrand) {
      findings.push(makeFinding(rowNumber, 'strand', 'strand-mismatch'));
    }

    const expectedInquiry = designValue(HEADS.inquiry, grade, subId);
    if (expectedInquiry !== undefined && row.keyInquiryQuestion !== expectedInquiry) {
      findings.push(makeFinding(rowNumber, 'keyInquiryQuestion', 'key-inquiry-question-drifted'));
    }
  });

  const blocking = findings.filter((finding) => finding.severity === 'blocking').length;
  const advisory = findings.filter((finding) => finding.severity === 'advisory').length;
  const flagged = new Set(findings.map((finding) => finding.row));
  const counts: Counts = { blocking, advisory, clean: rows.length - flagged.size };

  const rule = deriveCertificationRule({ grade }, policy);
  if (rule.conclusion !== 'blocking-must-be-zero') {
    throw new UnsupportedThresholdError(
      `scheme_check.metta states "${rule.conclusion}" for ${grade}, and this module implements only blocking-must-be-zero`,
    );
  }
  const certified = blocking === 0;
  const certification: Certification = {
    certified,
    threshold: rule.conclusion,
    reason: sentenceFrom(rule, 'scheme-certification-reason') ?? rule.conclusion,
    blocking,
    handoff: certified ? 'allowed' : 'refused',
    citations: citationsOf(rule),
  };

  return {
    findings,
    counts,
    certification,
    transcript: transcriptFor(grade, rows.length, findings, counts, certification, designValue),
  };
}

function transcriptFor(
  grade: string,
  rowCount: number,
  findings: readonly Finding[],
  counts: Counts,
  certification: Certification,
  designValue: (head: string, ...args: string[]) => string | undefined,
): string {
  const learningArea = designValue(HEADS.learningArea, grade) ?? 'the curriculum';
  const version = designValue(HEADS.version, grade) ?? 'unversioned';
  const lines: string[] = [
    `Scheme check · Grade ${gradeNumber(grade)} ${learningArea} · design ${version}`,
    `${rowCount} rows read · no network, no model, rules only`,
    '',
  ];

  if (findings.length === 0) {
    lines.push('No gap the packs name. Every row matches the design and fills what the policy requires.');
  }

  for (const finding of findings) {
    lines.push(
      `Row ${finding.row}, ${finding.field} — ${finding.severity.toUpperCase()} · ${finding.gap}`,
      `  ${finding.reason}`,
    );
    if (finding.proposal !== undefined) {
      lines.push(`  Proposed, needs consent — cited ${finding.proposal.citations[0] ?? ''}`.trim());
      for (const [field, value] of Object.entries(finding.proposal.values)) {
        lines.push(`    ${field}: ${value}`);
      }
    }
    if (finding.refusal !== undefined) lines.push(`  Not proposed — ${finding.refusal}`);
    for (const line of finding.why.split('\n')) lines.push(`    ${line}`);
    lines.push('');
  }

  lines.push(
    `${counts.clean} clean · ${counts.blocking} blocking · ${counts.advisory} advisory · ${rowCount} rows`,
  );
  lines.push(
    certification.certified
      ? `∴ certified for classroom use — the lesson-plan generator may read this scheme. Rule: ${certification.threshold}. ${certification.reason}`
      : `∴ not certified — ${certification.blocking} blocking, and the rule is ${certification.threshold}. ${certification.reason}`,
  );
  return lines.join('\n');
}
