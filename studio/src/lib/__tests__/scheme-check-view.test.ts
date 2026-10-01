import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SchemeRow } from '@/types/curriculum';
import { parsePack } from '@/lib/attest/derive';
import { HEADS } from '@/lib/scheme/reconcile';

/**
 * What the page is allowed to show, and nothing about how it looks.
 *
 * The reconciler decides; the page must not decide twice. Without this seam the tempting move is to put
 * `blocking > 0 ? 'Certified' : '…'` in JSX, and then the auditable-decision claim is a lie with a nicer
 * font — a verdict living in a template that no derivation cites and no test can flip. So the view model is
 * data, built by calling the one engine, and the page below it is allowed to be boring.
 *
 * Two things this suite exists to keep true:
 *
 * 1. Anything the header says about the curriculum comes out of the design pack. The test reads the pack
 *    itself and compares; it does not repeat a string the module already contains.
 * 2. The view *reports* her draft and never quietly repairs it. Her words are shown as she wrote them, and
 *    a substitution appears only as a proposal that says it needs her consent.
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
) as { grade: string; rows: SchemeRow[]; origin: Record<string, string> };

const { buildCheckView } = await import('@/lib/scheme/check-view');

function view(rows: readonly SchemeRow[] = draft.rows) {
  return buildCheckView({ grade: 'g8', rows, design, policy });
}

const cleanRows: SchemeRow[] = [
  {
    week: 14,
    lesson: 1,
    strand: '3.0 AI Techniques and Programming',
    subStrand: '3.3 Introduction to Neural Networks',
    specificLearningOutcome: 'Explain what a neuron weights.',
    keyInquiryQuestion: 'How is a neural network different from a set of rules?',
    learningExperiences: 'Trace one neuron on the board.',
    learningResources: 'Chalk, worked example.',
    assessmentMethods: 'Oral questions.',
  },
];

describe('the check view says where its facts come from', () => {
  it('names the learning area and the design version the pack states, not a copy', () => {
    const designRows = parsePack(design.text);
    const learningArea = designRows.find(
      (row) => row.head === HEADS.learningArea && row.args[0] === 'g8',
    )?.value;
    const version = designRows.find((row) => row.head === HEADS.version && row.args[0] === 'g8')?.value;

    expect(learningArea).toBeDefined();
    expect(version).toBeDefined();
    expect(view().learningArea).toBe(learningArea);
    expect(view().designVersion).toBe(version);
  });

  it('prints the grade in words a teacher reads, from the grade the caller asked about', () => {
    expect(view().gradeLabel).toBe('Grade 8');
    expect(view().title).toContain('Grade 8');
    expect(view().title).toContain('Artificial Intelligence');
  });

  it('repeats the draft origin the file carries and invents none when it has none', () => {
    const withOrigin = buildCheckView({
      grade: 'g8',
      rows: draft.rows,
      design,
      policy,
      origin: draft.origin,
    });
    expect(withOrigin.originLine).toContain(draft.origin.school);
    expect(withOrigin.originLine).toContain(draft.origin.teacher);

    expect(view().originLine).toBe('');
  });
});

describe('the check view lists her rows as she wrote them', () => {
  it('shows every row, in draft order, each with a status the engine supports', () => {
    const rows = view().rows;
    expect(rows.map((row) => row.lesson)).toEqual([1, 2, 3, 4]);
    expect(rows.map((row) => row.week)).toEqual([14, 14, 14, 14]);
    expect(rows.map((row) => row.status)).toEqual(['clean', 'blocking', 'blocking', 'clean']);
    for (const row of rows) expect(row.status).toMatch(/^(clean|blocking|advisory)$/);
  });

  it('carries the cells she typed, including the one the design pack does not know', () => {
    const third = view().rows[2];
    expect(third.subStrand).toBe('2.7 Neural network training');
    expect(third.strand).toBe('2.0 Data and Representation');
  });

  it('copies each cell straight from the draft, so a proposal cannot reach the table', () => {
    const proposed = new Set(
      view().cards.flatMap((card) => Object.values(card.proposal?.values ?? {})),
    );
    expect(proposed.size).toBeGreaterThan(0);
    for (const [index, row] of view().rows.entries()) {
      const source = draft.rows[index];
      expect(row.subStrand).toBe(source.subStrand);
      expect(row.strand).toBe(source.strand);
      expect(row.assessmentMethods).toBe(source.assessmentMethods);
    }
    expect(view().rows[2].subStrand).toBe('2.7 Neural network training');
  });
});

describe('the check view hands the teacher one card per finding', () => {
  it('puts the cards in the same order as the decision, oldest row first', () => {
    const cards = view().cards;
    expect(cards.map((card) => card.row)).toEqual([2, 3]);
    expect(cards.map((card) => card.field)).toEqual(['assessmentMethods', 'subStrand']);
  });

  it('labels each card with where in her document it is', () => {
    const [second, third] = view().cards;
    expect(second.heading).toContain('Week 14');
    expect(second.heading).toContain('Lesson 2');
    expect(second.heading).toContain('assessmentMethods');
    expect(third.heading).toContain('Lesson 3');
  });

  it('quotes the reason and the derivation the engine already cited', () => {
    for (const card of view().cards) {
      expect(card.reason.trim().length).toBeGreaterThan(10);
      expect(card.why).toMatch(/scheme_check\.metta:\d+|→|∴/);
      expect(card.citations.some((citation) => citation.includes('scheme_check.metta'))).toBe(true);
      expect(card.severity).toMatch(/^(blocking|advisory)$/);
    }
  });

  it('marks the one card with a substitution as needing consent, and says so in words', () => {
    const cards = view().cards;
    const withProposal = cards.filter((card) => card.proposal !== undefined);
    expect(withProposal).toHaveLength(1);
    expect(withProposal[0].consentNote).toMatch(/consent|you/i);
    expect(withProposal[0].proposal?.values.subStrand).toBe('3.3 Introduction to Neural Networks');
    for (const card of cards.filter((card) => card.proposal === undefined)) {
      expect(card.refusal).toBeTruthy();
    }
  });
});

describe('the check view states the verdict without softening it', () => {
  it('refuses certification in words while a blocking gap survives', () => {
    const verdict = view().verdict;
    expect(verdict.certified).toBe(false);
    expect(verdict.handoff).toBe('refused');
    expect(verdict.threshold).toBe('blocking-must-be-zero');
    expect(verdict.headline.toLowerCase()).toContain('not certified');
    expect(verdict.detail).toContain(verdict.reason);
  });

  it('certifies a draft with nothing left to fix, and only that draft', () => {
    const verdict = view(cleanRows).verdict;
    expect(verdict.certified).toBe(true);
    expect(verdict.handoff).toBe('allowed');
    expect(verdict.headline.toLowerCase()).toContain('certified');
    expect(verdict.headline.toLowerCase()).not.toContain('not certified');
  });

  it('counts the rows the way the transcript footer prints them', () => {
    const result = view();
    const footer = result.transcriptLines.find((line) => /rows$/.test(line));
    expect(footer).toBeDefined();
    expect(footer).toContain(`${result.verdict.counts.clean} clean`);
    expect(footer).toContain(`${result.verdict.counts.blocking} blocking`);
  });

  it('keeps the whole transcript so the why panel is the same decision, not a summary', () => {
    const result = view();
    expect(result.transcript.split('\n')).toEqual(result.transcriptLines);
    expect(result.transcriptLines.at(-1)).toMatch(/^∴/);
    expect(result.transcript).toContain('no network, no model, rules only');
  });
});

describe('the check view is a function of the packs and the draft', () => {
  it('gives the same answer twice, so no clock can sit inside a verdict', () => {
    expect(view()).toEqual(view());
    expect(JSON.stringify(view())).not.toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('reads an advisory as advisory and still certifies', () => {
    const drifted: SchemeRow[] = [
      { ...draft.rows[0], keyInquiryQuestion: 'Why do we need computers?' },
    ];
    const result = view(drifted);
    expect(result.verdict.certified).toBe(true);
    expect(result.verdict.counts.advisory).toBe(1);
    expect(result.rows[0].status).toBe('advisory');
    expect(result.cards[0].severity).toBe('advisory');
  });
});
