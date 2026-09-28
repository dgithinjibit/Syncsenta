import { describe, it, expect } from 'vitest';
import {
  syncsentaPedagogy,
  pedagogyAdaptations,
  formatPedagogyConstraintBlock,
} from '../pedagogy';
import * as omegaClawCourse from '../omega-claw-ai-blockchain';
import { getOmegaClawTeacherCurriculumContext } from '../omega-claw-ai-blockchain';

/**
 * The registry is only worth having if three things stay true: every approach
 * it names carries a boundary line, nothing forks a second copy of it, and it
 * actually reaches the prompts. These tests enforce exactly that, so adding an
 * approach without wiring it fails here rather than shipping as decoration.
 */

const APPROACH_KEYWORDS = [
  'suzuki',
  'kumon',
  'universal design',
  'project-based',
  'montessori',
  'waldorf',
  'reggio',
];

describe('SyncSenta pedagogy registry', () => {
  it('carries every approach the product says it draws on', () => {
    const names = pedagogyAdaptations.map((a) => a.name.toLowerCase()).join(' | ');
    for (const keyword of APPROACH_KEYWORDS) {
      expect(names).toContain(keyword);
    }
  });

  it('has one entry per approach and no duplicates', () => {
    const names = pedagogyAdaptations.map((a) => a.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBe(APPROACH_KEYWORDS.length);
  });

  it('gives every adaptation a source and actionable principles', () => {
    for (const adaptation of pedagogyAdaptations) {
      expect(adaptation.name.length, 'name').toBeGreaterThan(0);
      expect(adaptation.source.length, `${adaptation.name} source`).toBeGreaterThan(0);
      expect(
        adaptation.principles.length,
        `${adaptation.name} needs at least two principles an interface can act on`,
      ).toBeGreaterThanOrEqual(2);
      for (const principle of adaptation.principles) {
        expect(principle.length, `${adaptation.name} principle`).toBeGreaterThan(20);
      }
    }
  });

  it('states what every adaptation is NOT', () => {
    for (const adaptation of pedagogyAdaptations) {
      expect(adaptation.boundary.length, `${adaptation.name} boundary`).toBeGreaterThan(30);
      expect(
        /\bnot\b|\bnever\b|\bno \w+\b/.test(adaptation.boundary),
        `${adaptation.name}: a boundary that does not negate a claim is a description, not a boundary`,
      ).toBe(true);
    }
  });

  it('records the deliberately excluded positions with what happens instead', () => {
    const approaches = syncsentaPedagogy.excludedPositions.map((p) => p.approach).join(' | ');
    expect(approaches).toContain('Waldorf');
    expect(approaches).toContain('Montessori');
    expect(approaches).toContain('Reggio');
    for (const position of syncsentaPedagogy.excludedPositions) {
      expect(position.approach.length, 'approach label').toBeGreaterThan(0);
      for (const field of ['position', 'reason', 'instead', 'source'] as const) {
        expect(position[field].length, `${position.approach}.${field}`).toBeGreaterThan(20);
      }
    }
  });

  it('cites a distinct primary source per URL', () => {
    const urls = syncsentaPedagogy.sources.map((s) => s.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) expect(url.startsWith('https://')).toBe(true);
    expect(urls.length).toBeGreaterThanOrEqual(pedagogyAdaptations.length);
  });

  it('renders every approach and boundary into the tutor constraint block', () => {
    const block = formatPedagogyConstraintBlock();
    for (const adaptation of pedagogyAdaptations) {
      expect(block, `${adaptation.name} missing from the prompt block`).toContain(adaptation.name);
      expect(block, `${adaptation.name} boundary missing`).toContain(adaptation.boundary);
    }
  });
});

describe('the course file reads the registry instead of owning it', () => {
  it('no longer exports a second pedagogy object', () => {
    expect('omegaClawPedagogy' in omegaClawCourse).toBe(false);
  });

  it('puts every registered approach in the teacher curriculum context', () => {
    const gradeSix = getOmegaClawTeacherCurriculumContext('Grade 6', 'Science', 'What is blockchain?');
    const senior = getOmegaClawTeacherCurriculumContext(
      'Grade 11',
      'Computer Science',
      'Machine learning evaluation',
    );
    for (const context of [gradeSix, senior]) {
      expect(context).toBeTruthy();
      for (const adaptation of pedagogyAdaptations) {
        expect(context).toContain(adaptation.name);
        expect(context).toContain(adaptation.boundary);
      }
    }
  });
});
