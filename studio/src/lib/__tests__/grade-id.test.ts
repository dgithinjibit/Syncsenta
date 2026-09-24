import { describe, expect, it } from 'vitest';
import { normalizeGradeKey } from '../curriculum/grade-id';
import { getAllGrades as getRegistryGrades } from '../../data/curriculum';

/**
 * Regression guard for the 2026-09-22 journey defect: the curriculum registry
 * (`src/data/curriculum`) keys grades as `Grade4` while journey/UI options are
 * `Grade 4`. An unnormalized Set membership check marked every grade card
 * aria-disabled, so learners could not enter a covered grade.
 */
describe('normalizeGradeKey', () => {
  it('collapses the spaced and unspaced registry forms to one key', () => {
    expect(normalizeGradeKey('Grade 4')).toBe('Grade4');
    expect(normalizeGradeKey('Grade4')).toBe('Grade4');
    expect(normalizeGradeKey('  grade 10 ')).toBe('grade10');
    expect(normalizeGradeKey('PP1')).toBe('PP1');
  });

  it('makes every CBC journey grade resolvable against the registry', () => {
    const covered = new Set(getRegistryGrades().map(normalizeGradeKey));
    const journeyGrades = [
      'PP1', 'PP2',
      'Grade 1', 'Grade 2', 'Grade 3',
      'Grade 4', 'Grade 5', 'Grade 6',
      'Grade 7', 'Grade 8', 'Grade 9',
    ];
    for (const grade of journeyGrades) {
      expect(covered.has(normalizeGradeKey(grade))).toBe(true);
    }
  });
});
