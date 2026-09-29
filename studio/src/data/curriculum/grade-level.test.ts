/**
 * Grade input is parsed, not cast.
 *
 * The curriculum data layer used to do this in three places:
 *
 *   const normalizedGrade = String(grade).replace(/\s+/g, '') as GradeLevel;
 *
 * The cast is the defect. `GradeLevel` is a 15-member union, and the cast said
 * "whatever string arrives is one of them" without checking. The allowlist
 * branches then silently fell through, and worse — `getLiteracyEnvelope()` put
 * that unvalidated string into `LiteracyCurriculumEnvelope.grade`, which the
 * type says is a `GradeLevel`, and computed
 * `Number(canonicalGrade.replace(/\D/g, ''))` for the band, so `"Grade 6 or 7"`
 * produced `NaN`, `NaN <= 6` was false, and the garbage landed in
 * `gradeBand: 'senior_school'` on an envelope the teacher library and the exam
 * generator both read.
 *
 * The directive that prompted this called it "format string injection". It is
 * not injection — nothing here is a format string. It is an unvalidated cast
 * into a closed union, which is a real defect with a smaller name.
 */

import { describe, expect, it } from 'vitest';

import { GRADE_LEVELS, parseGradeLevel } from '@/data/curriculum/grade-level';
import { getLiteracyEnvelope, getLiteracyScheduleAudit } from '@/data/curriculum';

describe('parseGradeLevel', () => {
  it('accepts every registry key verbatim', () => {
    for (const grade of GRADE_LEVELS) {
      expect(parseGradeLevel(grade)).toBe(grade);
    }
  });

  it('accepts the spaced and mixed-case spellings the UI produces', () => {
    expect(parseGradeLevel('Grade 4')).toBe('Grade4');
    expect(parseGradeLevel(' grade 12 ')).toBe('Grade12');
    expect(parseGradeLevel('pp1')).toBe('PP1');
    expect(parseGradeLevel('PP 2')).toBe('PP2');
    expect(parseGradeLevel('Grade  6')).toBe('Grade6');
  });

  it('reads a bare number as Grade n, never as Pre-Primary', () => {
    expect(parseGradeLevel(6)).toBe('Grade6');
    expect(parseGradeLevel('9')).toBe('Grade9');
    expect(parseGradeLevel(1)).toBe('Grade1');
    expect(parseGradeLevel(0)).toBeNull();
    expect(parseGradeLevel(13)).toBeNull();
  });

  it('rejects anything outside the registry instead of casting it in', () => {
    const junk = [
      '',
      '   ',
      'Grade 13',
      'Grade 0',
      'PP3',
      'Grade 4 or Grade 6; DROP',
      'fourth grade',
      'Grade4Grade5',
      'NaN',
      'null',
      null,
      undefined,
      {},
      [],
      Number.NaN,
      Infinity,
      4.5,
      true,
    ];
    for (const input of junk) {
      const parsed = parseGradeLevel(input);
      expect(`${String(input)} -> ${String(parsed)}`).toBe(`${String(input)} -> null`);
    }
  });

  it('never returns a value the registry does not hold', () => {
    const inputs = [...GRADE_LEVELS, 'Grade 9', 'pp2', 'garbage', '', 7, 99, null, undefined];
    for (const input of inputs) {
      const parsed = parseGradeLevel(input);
      if (parsed !== null) {
        expect(GRADE_LEVELS).toContain(parsed);
      }
    }
  });
});

describe('the envelope refuses an unparseable grade', () => {
  it('returns null rather than an envelope carrying a fake grade', () => {
    // Before the parser, this returned an envelope with
    // curriculumId "Grade6or7|AI Literacy" and gradeBand "senior_school".
    expect(getLiteracyEnvelope('Grade 6 or 7', 'AI Literacy')).toBeNull();
    expect(getLiteracyEnvelope('', 'AI Literacy')).toBeNull();
  });

  it('still bands the authored grades correctly', () => {
    expect(getLiteracyEnvelope('Grade 6', 'AI Literacy')?.gradeBand).toBe('upper_primary');
    expect(getLiteracyEnvelope('Grade 7', 'AI Literacy')?.gradeBand).toBe('junior_secondary');
    expect(getLiteracyEnvelope('Grade 10', 'AI Literacy')?.gradeBand).toBe('senior_school');
  });

  it('carries a grade that is actually in the registry', () => {
    const envelope = getLiteracyEnvelope('grade 6', 'AI Literacy');
    expect(envelope?.grade).toBe('Grade6');
    expect(GRADE_LEVELS).toContain(envelope?.grade);
  });
});

describe('the schedule audit cannot emit NaN or Infinity', () => {
  it('computes a finite audit for a real request', () => {
    const audit = getLiteracyScheduleAudit('Grade 6', 'AI Literacy');
    expect(audit).not.toBeNull();
    for (const value of Object.values(audit ?? {})) {
      if (typeof value === 'number') {
        expect(Number.isFinite(value)).toBe(true);
      }
    }
  });

  it('returns null when the week count is zero, negative or not a number', () => {
    expect(getLiteracyScheduleAudit('Grade 6', 'AI Literacy', 0)).toBeNull();
    expect(getLiteracyScheduleAudit('Grade 6', 'AI Literacy', -5)).toBeNull();
    expect(getLiteracyScheduleAudit('Grade 6', 'AI Literacy', Number.NaN)).toBeNull();
    expect(getLiteracyScheduleAudit('Grade 6', 'AI Literacy', Infinity)).toBeNull();
  });
});
