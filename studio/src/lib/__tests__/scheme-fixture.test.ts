import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SchemeRow } from '@/types/curriculum';

/**
 * The teacher's Saturday-night draft, and the suite that will not let it lie.
 *
 * The reconciler demo runs on one artefact: a Grade 8 AI scheme of work for week 14, written offline in
 * Kibera and synced Monday morning. Everything the terminal prints in the video — the two blocking gaps,
 * the clean rows, the refusal to invent an assessment column — is a claim about that file. If the file is
 * an illustration, the claims are decoration.
 *
 * So the fixture's own assertions are checked against the two packs rather than taken on trust. This suite
 * recomputes each row's gaps from `ai_g8_design.metta` (the facts) and `scheme_check.metta` (the policy) and
 * compares them with what the fixture says it will show. A row that quietly gains a third defect, a clean
 * row that is not clean, a "2.7" that actually exists in the curriculum, a Chinese artefact that some tool
 * normalised away: each one of those turns a test red here, before any detection code exists to be blamed.
 *
 * Field names come from the packs, never from a list copied into this file, which is the difference between
 * testing the contract and restating it.
 */

const STUDIO = process.cwd();
const REL_FIXTURE = 'studio/public/omega/drafts/kibera_g8_week14.json';
const FIXTURE_FILE = join(STUDIO, 'public', 'omega', 'drafts', 'kibera_g8_week14.json');
const DESIGN_FILE = join(STUDIO, 'public', 'omega', 'ai_g8_design.metta');
const POLICY_FILE = join(STUDIO, 'public', 'omega', 'scheme_check.metta');
const POLICY_PACK = {
  file: 'studio/public/omega/scheme_check.metta',
  text: readFileSync(POLICY_FILE, 'utf8'),
};
const DESIGN_PACK = {
  file: 'studio/public/omega/ai_g8_design.metta',
  text: readFileSync(DESIGN_FILE, 'utf8'),
};

const { deriveGapPolicy, parsePack } = await import('@/lib/attest/derive');

const designRows = parsePack(DESIGN_PACK.text);
const policyRows = parsePack(POLICY_PACK.text);

/** The ten fields `SchemeRow` declares — the shape the rest of the product already speaks. */
const SCHEME_FIELDS: string[] = [
  'week',
  'lesson',
  'strand',
  'subStrand',
  'specificLearningOutcome',
  'keyInquiryQuestion',
  'learningExperiences',
  'learningResources',
  'assessmentMethods',
  'reflection',
];

type Claim = { row: number; status: 'clean' | 'blocking' | 'advisory'; gaps: string[] };
type Fixture = {
  description: string;
  grade: string;
  curriculumVersion: string;
  origin: Record<string, string>;
  rows: SchemeRow[];
  expected: Claim[];
};

function readFixtureBytes(): string {
  if (!existsSync(FIXTURE_FILE)) {
    throw new Error(`${REL_FIXTURE} does not exist — spoon 4 has not been written`);
  }
  return readFileSync(FIXTURE_FILE, 'utf8');
}

function readFixture(): Fixture {
  return JSON.parse(readFixtureBytes()) as Fixture;
}

/** `(= (ai-design-name g8 3.3) "…")`: the last argument is the id being described. */
function designValue(head: string, id: string | undefined): string | undefined {
  if (id === undefined) return undefined;
  return designRows.find((row) => row.head === head && row.args[row.args.length - 1] === id)?.value;
}

/** A real scheme cell reads `3.3 Introduction to Neural Networks`; the number is the only part that joins to the pack. */
function idOf(cell: string): string | undefined {
  return /^(\d+(?:\.\d+)?)\s/.exec(cell)?.[1];
}

/** The fields the policy pack, not this suite, calls mandatory. */
function mandatoryFields(): string[] {
  return policyRows
    .filter((row) => row.head === 'scheme-field-obligation' && row.args[0] === 'g8' && row.value === 'mandatory')
    .map((row) => row.args[1]);
}

function emptyMandatoryFields(row: SchemeRow): string[] {
  return mandatoryFields().filter((field) => {
    const value = (row as Record<string, unknown>)[field];
    if (typeof value === 'number') return false;
    if (typeof value === 'string') return value.trim() === '';
    return value === undefined || value === null;
  });
}

/**
 * The gap kinds one row shows, computed from both packs.
 *
 * `lesson-count-mismatch` is deliberately absent: it compares a whole sub-strand's rows against
 * `(ai-design-lessons …)`, which a single row cannot answer. It belongs to the reconciler, not the fixture.
 */
function gapsOf(row: SchemeRow): string[] {
  const gaps: string[] = [];
  if (emptyMandatoryFields(row).length > 0) gaps.push('mandatory-field-empty');

  const subId = idOf(row.subStrand);
  if (designValue('ai-design-name', subId) === undefined) {
    // With no design row there is no strand and no inquiry to compare against, so saying more than
    // "this sub-strand is not in the design" would be the reconciler inventing a second finding.
    gaps.push('sub-strand-not-in-design');
    return gaps;
  }
  if (idOf(row.strand) !== designValue('ai-design-strand', subId)) gaps.push('strand-mismatch');
  if (row.keyInquiryQuestion !== designValue('ai-design-inquiry', subId)) {
    gaps.push('key-inquiry-question-drifted');
  }
  return gaps;
}

/** Severity is the policy pack's answer, asked through the same function the browser will call. */
function severityOf(gap: string): string {
  return deriveGapPolicy({ grade: 'g8', gap }, POLICY_PACK).conclusion;
}

function statusOf(gaps: string[]): Claim['status'] {
  if (gaps.length === 0) return 'clean';
  return gaps.some((gap) => severityOf(gap) === 'blocking') ? 'blocking' : 'advisory';
}

describe('the draft is one file the packs can be checked against', () => {
  it('exists, and states the grade and curriculum version the design pack actually holds', () => {
    const fixture = readFixture();
    expect(fixture.grade).toBe('g8');
    expect(fixture.curriculumVersion).toBe(designValue('ai-design-curriculum-version', 'g8'));
    expect(fixture.rows).toHaveLength(4);
    expect(fixture.expected).toHaveLength(4);
  });

  it('spells its fields the way SchemeRow and the policy pack both spell them', () => {
    const fields = mandatoryFields();
    expect(fields.length).toBeGreaterThanOrEqual(9);
    for (const field of [...fields, 'reflection']) {
      expect(SCHEME_FIELDS, `${field} is in scheme_check.metta but not in SchemeRow`).toContain(field);
    }
    const fixture = readFixture();
    for (const [index, row] of fixture.rows.entries()) {
      const keys = Object.keys(row);
      for (const key of keys) {
        expect(SCHEME_FIELDS, `row ${index + 1} carries ${key}, which SchemeRow does not declare`).toContain(key);
      }
      for (const field of fields) {
        expect(keys, `row ${index + 1} omits ${field} entirely instead of filling or leaving it`).toContain(field);
      }
    }
  });

  it('is one week of one class, in lesson order, and says where it came from', () => {
    const fixture = readFixture();
    expect(fixture.rows.map((row) => row.week)).toEqual([14, 14, 14, 14]);
    expect(fixture.rows.map((row) => row.lesson)).toEqual([1, 2, 3, 4]);
    expect(Object.keys(fixture.origin).length).toBeGreaterThanOrEqual(3);
    expect(fixture.description.length).toBeGreaterThan(60);
  });
});

describe('the rows the draft calls clean are clean in the design, not in the draft', () => {
  it('words a real sub-strand and strand exactly as the pack words them', () => {
    const fixture = readFixture();
    for (const [index, row] of fixture.rows.entries()) {
      const subId = idOf(row.subStrand);
      const name = designValue('ai-design-name', subId);
      if (name === undefined) continue; // row 3's point is that this lookup finds nothing.
      expect(row.subStrand, `row ${index + 1}`).toBe(`${subId} ${name}`);
      const strandId = designValue('ai-design-strand', subId);
      expect(row.strand, `row ${index + 1}`).toBe(
        `${strandId} ${designValue('ai-design-strand-name', strandId)}`,
      );
    }
  });

  it('asks the clean rows with the design pack key-inquiry question, in its exact words', () => {
    const fixture = readFixture();
    const clean = fixture.expected.filter((claim) => claim.status === 'clean');
    expect(clean.length).toBeGreaterThanOrEqual(2);
    for (const claim of clean) {
      const row = fixture.rows[claim.row - 1];
      expect(row.keyInquiryQuestion).toBe(designValue('ai-design-inquiry', idOf(row.subStrand)));
    }
  });

  it('fills every mandatory field the policy pack demands of a clean row', () => {
    const fixture = readFixture();
    for (const claim of fixture.expected.filter((c) => c.status === 'clean')) {
      expect(emptyMandatoryFields(fixture.rows[claim.row - 1]), `row ${claim.row}`).toEqual([]);
    }
  });

  it('leaves the reflection column empty on a clean row, because the policy pack allows it', () => {
    const fixture = readFixture();
    const reflection = policyRows.find(
      (row) => row.head === 'scheme-field-obligation' && row.args[1] === 'reflection',
    );
    expect(reflection?.value).toBe('optional');
    const row = fixture.rows[0];
    expect(row.reflection).toBe('');
    expect(emptyMandatoryFields(row)).toEqual([]);
  });
});

describe('the defects are the ones the draft claims, and no others', () => {
  it('has a 2.7 that the Grade 8 design genuinely does not contain', () => {
    expect(designRows.filter((row) => row.head === 'ai-design-name' && row.args.includes('2.7'))).toHaveLength(0);
    const neural = designRows.filter(
      (row) => row.head === 'ai-design-name' && typeof row.value === 'string' && /neural/i.test(row.value),
    );
    expect(neural).toHaveLength(1);
    expect(neural[0].args).toEqual(['g8', '3.3']);
    expect(designValue('ai-design-strand', '3.3')).toBe('3.0');
  });

  it('puts the mis-numbered row under a strand that exists, so the gap is the id and nothing else', () => {
    const fixture = readFixture();
    const row = fixture.rows[2];
    expect(idOf(row.subStrand)).toBe('2.7');
    expect(idOf(row.strand)).toBe('2.0');
    expect(designValue('ai-design-strand-name', '2.0')).toBeDefined();
    expect(emptyMandatoryFields(row), 'a second defect would hide the one being demonstrated').toEqual([]);
    expect(gapsOf(row)).toEqual(['sub-strand-not-in-design']);
  });

  it('leaves exactly one column blank in the blank-column row', () => {
    const fixture = readFixture();
    const row = fixture.rows[1];
    expect(row.assessmentMethods).toBe('');
    expect(gapsOf(row)).toEqual(['mandatory-field-empty']);
    expect(severityOf('mandatory-field-empty')).toBe('blocking');
  });

  it('agrees with itself: each row shows exactly the gaps its own claim lists', () => {
    const fixture = readFixture();
    for (const claim of fixture.expected) {
      const row = fixture.rows[claim.row - 1];
      expect(row, `row ${claim.row} has no claim`).toBeDefined();
      expect(gapsOf(row).sort(), `row ${claim.row}: gaps computed from the packs`).toEqual(
        [...claim.gaps].sort(),
      );
      expect(statusOf(claim.gaps), `row ${claim.row}: status from the severities the pack states`).toBe(
        claim.status,
      );
    }
    const blocking = fixture.expected.filter((c) => c.status === 'blocking').map((c) => c.row);
    expect(blocking).toEqual([2, 3]);
  });

  it('refuses to invent the column the teacher left blank', () => {
    const fixture = readFixture();
    const row = fixture.rows[1];
    // The draft must not carry a plausible-looking assessment strategy for the row the reconciler is
    // supposed to flag: an invented value here would make the demo's central claim false.
    expect(row.assessmentMethods).toBe('');
    expect(JSON.stringify(row)).not.toMatch(/observation|rubric|checklist/i);
  });
});

describe('the draft arrives with what the teacher actually typed', () => {
  it('carries the CJK artefact in its bytes, once, and keeps it through the parse', () => {
    const bytes = readFixtureBytes();
    expect((bytes.match(/观察/g) ?? []).length).toBe(1);
    const fixture = readFixture();
    const carriers = fixture.rows.filter((row) => JSON.stringify(row).includes('观察'));
    expect(carriers).toHaveLength(1);
    expect(carriers[0].learningExperiences).toContain('观察');
    expect(JSON.parse(JSON.stringify(carriers[0])).learningExperiences).toBe(carriers[0].learningExperiences);
    expect(idOf(carriers[0].subStrand)).toBe('3.3');
    expect(gapsOf(carriers[0])).toEqual([]);
  });
});
