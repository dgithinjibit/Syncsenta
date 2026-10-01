import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SchemeRow } from '@/types/curriculum';

/**
 * The reconciler itself: the Monday-morning sequence, in the order the teacher meets it.
 *
 * Spoons 2–4 put facts, policy and a draft on disk. This is the piece that reads the draft and decides, and
 * the contract it has to honour is the one the roadmap wrote down before any of it existed: rules decide,
 * rules fill, rules cite. So every assertion below is about a step of her morning, not about a function's
 * shape — findings in row order, a *why* she can open, proposals limited to what the design pack already
 * states, a flat refusal to invent a judgment column, and a certification verdict that refuses the
 * lesson-plan handoff while a blocking gap survives.
 *
 * The ledger, the override-as-a-row and the browser page are the next slices and are not tested here.
 *
 * `scheme-fixture.test.ts` computes each row's gaps independently, straight from the packs. This suite asks
 * the module the same questions and requires the two answers to agree — two derivations of one decision,
 * which is the relationship the Omega Claw mirror already has with its pack.
 */

const STUDIO = process.cwd();
const DESIGN_FILE = join(STUDIO, 'public', 'omega', 'ai_g8_design.metta');
const POLICY_FILE = join(STUDIO, 'public', 'omega', 'scheme_check.metta');
const FIXTURE_FILE = join(STUDIO, 'public', 'omega', 'drafts', 'kibera_g8_week14.json');

const design = { file: 'studio/public/omega/ai_g8_design.metta', text: readFileSync(DESIGN_FILE, 'utf8') };
const policy = { file: 'studio/public/omega/scheme_check.metta', text: readFileSync(POLICY_FILE, 'utf8') };
const draft = JSON.parse(readFileSync(FIXTURE_FILE, 'utf8')) as {
  grade: string;
  rows: SchemeRow[];
  expected: { row: number; status: string; gaps: string[] }[];
};

const { reconcileScheme } = await import('@/lib/scheme/reconcile');

function reconcile(rows: SchemeRow[]) {
  return reconcileScheme({ grade: 'g8', rows, design, policy });
}

const result = reconcile(draft.rows);
const findingFor = (row: number) => result.findings.find((f) => f.row === row);

describe('step 2 — she reads what is wrong, in the order her scheme is written', () => {
  it('finds both blocking gaps and names the column each one sits in', () => {
    expect(result.findings.map((f) => f.row)).toEqual([2, 3]);
    expect(findingFor(2)?.field).toBe('assessmentMethods');
    expect(findingFor(3)?.field).toBe('subStrand');
  });

  it('takes the severity and the sentence she will read from the policy pack', () => {
    const gap = findingFor(2);
    expect(gap?.gap).toBe('mandatory-field-empty');
    expect(gap?.severity).toBe('blocking');
    expect(gap?.reason).toContain('empty');
    expect(gap?.citations.length).toBeGreaterThan(0);
    expect(gap?.citations[0]).toContain('scheme_check.metta:');
  });

  it('counts the rows the way the footer will print them', () => {
    expect(result.counts).toEqual({ blocking: 2, advisory: 0, clean: 2 });
  });

  it('agrees with the independent reading of the same two packs', () => {
    for (const claim of draft.expected) {
      const found = result.findings.filter((f) => f.row === claim.row).map((f) => f.gap).sort();
      expect(found, `row ${claim.row}`).toEqual([...claim.gaps].sort());
      expect(claim.status === 'clean').toBe(found.length === 0);
    }
  });

  it('says the same thing twice: no clock, no randomness, no second pass differing', () => {
    expect(reconcile(draft.rows)).toEqual(result);
  });
});

describe('step 3 — she asks why, and the answer is a pack line rather than an opinion', () => {
  it('carries a derivation for every finding, with the question it asked and the line that answered', () => {
    for (const finding of result.findings) {
      expect(finding.why, `row ${finding.row}`).toContain('scheme-gap-severity');
      expect(finding.why, `row ${finding.row}`).toMatch(/→|∴/);
      expect(finding.why, `row ${finding.row}`).toContain(`${finding.severity} —`);
    }
  });

  it('prints the transcript a teacher or a judge can read top to bottom', () => {
    expect(result.transcript).toContain('Grade 8');
    expect(result.transcript.split('\n').length).toBeGreaterThan(result.findings.length);
    for (const finding of result.findings) {
      expect(result.transcript).toContain(finding.reason.slice(0, 24));
    }
  });
});

describe('step 4 — it may only offer what the design already states, and asks before filling', () => {
  it('proposes the one sub-strand whose name the design matches, with the pack\'s own values', () => {
    const proposal = findingFor(3)?.proposal;
    expect(proposal, 'the mis-numbered row must have something to accept').toBeDefined();
    expect(proposal?.requiresConsent).toBe(true);
    expect(proposal?.values.subStrand).toBe('3.3 Introduction to Neural Networks');
    expect(proposal?.values.strand).toBe('3.0 AI Techniques and Programming');
    expect(proposal?.values.keyInquiryQuestion).toBe('How is a neural network different from a set of rules?');
  });

  it('never proposes a value for a column that requires a teacher\'s judgment', () => {
    const judgmentFields = [
      'specificLearningOutcome',
      'learningExperiences',
      'learningResources',
      'assessmentMethods',
      'reflection',
    ];
    for (const finding of result.findings) {
      if (finding.proposal === undefined) continue;
      for (const field of judgmentFields) {
        expect(
          Object.keys(finding.proposal.values),
          `row ${finding.row} proposed ${field}, which the design pack does not state`,
        ).not.toContain(field);
      }
    }
  });

  it('refuses the blank column instead of filling it, and cites the obligation it refused against', () => {
    const gap = findingFor(2);
    expect(gap?.proposal).toBeUndefined();
    expect(gap?.refusal, 'she must be told why nothing was offered').toBeTruthy();
    expect(gap?.refusal).toContain('assessment');
    expect(gap?.citations.some((c) => c.includes('scheme_check.metta:'))).toBe(true);
  });

  it('refuses to guess when the design pack matches more than one sub-strand', () => {
    const ambiguous: SchemeRow = {
      ...draft.rows[2],
      subStrand: '2.9 Data pipeline',
      strand: '2.0 Data and Representation',
    };
    const finding = reconcile([ambiguous]).findings.find((f) => f.row === 1);
    expect(finding?.gap).toBe('sub-strand-not-in-design');
    expect(finding?.proposal, 'a choice between several real sub-strands is the teacher\'s, not the agent\'s')
      .toBeUndefined();
    expect(finding?.refusal).toBeTruthy();
  });

  it('offers nothing for a row that has no gap', () => {
    expect(findingFor(1)).toBeUndefined();
    expect(result.findings.filter((f) => f.row === 4)).toHaveLength(0);
  });
});

describe('step 6 — the certified scheme is the only thing the lesson-plan generator may read', () => {
  it('withholds certification while a blocking gap survives, and asks the pack for the rule', () => {
    expect(result.certification.certified).toBe(false);
    expect(result.certification.threshold).toBe('blocking-must-be-zero');
    expect(result.certification.blocking).toBe(2);
    expect(result.certification.reason).toContain('certified');
    expect(result.certification.handoff).toBe('refused');
    expect(result.transcript).toContain('not certified');
  });

  it('certifies a scheme with no blocking gap, on the same rule', () => {
    const clean = reconcile([draft.rows[0], draft.rows[3]]);
    expect(clean.certification.certified).toBe(true);
    expect(clean.certification.blocking).toBe(0);
    expect(clean.certification.handoff).toBe('allowed');
    expect(clean.findings).toEqual([]);
    expect(clean.transcript).toContain('certified');
  });

  it('still reports an advisory gap without refusing the handoff over it', () => {
    const drifted: SchemeRow = {
      ...draft.rows[0],
      keyInquiryQuestion: 'Do computers think like people?',
    };
    const withAdvisory = reconcile([drifted]);
    expect(withAdvisory.findings.map((f) => [f.gap, f.severity])).toEqual([
      ['key-inquiry-question-drifted', 'advisory'],
    ]);
    expect(withAdvisory.certification.certified).toBe(true);
    expect(withAdvisory.certification.handoff).toBe('allowed');
    expect(withAdvisory.counts).toEqual({ blocking: 0, advisory: 1, clean: 0 });
  });
});
