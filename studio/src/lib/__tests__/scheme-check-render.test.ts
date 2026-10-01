import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SchemeRow } from '@/types/curriculum';
import { buildCheckView } from '@/lib/scheme/check-view';

/**
 * The page's markup, rendered in Node and asserted as HTML.
 *
 * There is no jsdom or testing-library in this project, and this laptop has ~650 MB free — starting
 * `next dev` to look at a page is not a check I can run here, and a check nobody can run is not a check. So
 * the rendering half is separated from the fetching half on purpose: `SchemeCheckBody` is a pure function of
 * the view model, and `renderToStaticMarkup` proves what a browser would show for that view. The live page
 * is the remaining Tier-A step, and this suite does not claim to have done it.
 *
 * What the assertions guard is the one thing that would make the page a lie: the screen showing a verdict
 * the engine did not reach, or showing her draft already repaired by a proposal she never accepted.
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

const { SchemeCheckBody } = await import('@/components/omega/scheme-check');

function render(rows: readonly SchemeRow[] = draft.rows) {
  const view = buildCheckView({ grade: 'g8', rows, design, policy, origin: draft.origin });
  return renderToStaticMarkup(SchemeCheckBody({ view }));
}

const cleanRow: SchemeRow = {
  week: 14,
  lesson: 1,
  strand: '3.0 AI Techniques and Programming',
  subStrand: '3.3 Introduction to Neural Networks',
  specificLearningOutcome: 'Explain what a neuron weights.',
  keyInquiryQuestion: 'How is a neural network different from a set of rules?',
  learningExperiences: 'Trace one neuron on the board.',
  learningResources: 'Chalk, worked example.',
  assessmentMethods: 'Oral questions.',
};

describe('the page renders what the engine decided', () => {
  it('says not certified, in words, for the draft that is not', () => {
    const html = render();
    expect(html).toContain('Not certified');
    expect(html).toContain('blocking-must-be-zero');
    expect(html).not.toContain('Certified ·');
  });

  it('names the grade and the learning area the design pack states', () => {
    const html = render();
    expect(html).toContain('Grade 8');
    expect(html).toContain('Artificial Intelligence');
  });

  it('gives one card per finding, labelled with where in her document it is', () => {
    const html = render();
    expect(html).toContain('Lesson 2');
    expect(html).toContain('assessmentMethods');
    expect(html).toContain('Lesson 3');
    expect((html.match(/data-severity=/g) ?? []).length).toBe(2);
    expect(html).toContain('data-severity="blocking"');
  });

  it('prints the derivation on the page, not only in a variable', () => {
    const html = render();
    expect(html).toContain('scheme_check.metta');
    expect(html).toContain('→');
    expect(html).toContain('no network, no model, rules only');
  });
});

describe('the page shows her draft as she wrote it', () => {
  it('leaves her sub-strand cell alone while proposing a different one below it', () => {
    const html = render();
    expect(html).toContain('2.7 Neural network training');
    expect(html).toContain('Introduction to Neural Networks');
    expect(html).toMatch(/stays one until you accept it|Nothing has been changed/);
  });

  it('shows a blank column as blank, and prints the emptiness as the finding, not as a filled cell', () => {
    const html = render();
    expect(html).toContain('mandatory-field-empty');
    expect(html).toContain('is empty');
  });

  it('prints her own words in the table before it prints anything it proposes', () => {
    const html = render();
    expect(html.indexOf('2.7 Neural network training')).toBeLessThan(html.indexOf('</table>'));
    expect(html.indexOf('</table>')).toBeLessThan(html.indexOf('Not proposed'));
  });
});

describe('the page has a state for every way the check can come back', () => {
  it('says so plainly when there is nothing to fix', () => {
    const html = render([cleanRow]);
    expect(html).toContain('Certified');
    expect(html).toContain('No gap the packs name');
  });

  it('marks a row an advisory touches as advisory without calling it blocking', () => {
    const html = render([{ ...cleanRow, keyInquiryQuestion: 'Why do we need computers?' }]);
    expect(html).toContain('data-status="advisory"');
    expect(html).not.toContain('data-status="blocking"');
    expect(html).toContain('advisory · 1 rows');
  });

  it('renders no undefined and no NaN anywhere on the page', () => {
    expect(render()).not.toMatch(/undefined|NaN/);
    expect(render([cleanRow])).not.toMatch(/undefined|NaN/);
  });
});
