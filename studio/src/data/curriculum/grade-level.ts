/**
 * The one place a grade string becomes a `GradeLevel`.
 *
 * `GradeLevel` is a closed 15-member union (`types/curriculum.ts`), and the
 * curriculum data layer used to reach it with
 * `String(grade).replace(/\s+/g, '') as GradeLevel` — a cast that asserts a
 * string is one of fifteen values without checking. Unparseable input then fell
 * through the allowlist branches, and in `getLiteracyEnvelope()` the same string
 * was written into `LiteracyCurriculumEnvelope.grade` (typed `GradeLevel`) while
 * `Number(canonicalGrade.replace(/\D/g, ''))` produced `NaN`, so
 * `NaN <= 6 === false` filed a malformed grade under `senior_school`.
 *
 * Parsing here instead means the compiler's claim about that field is true.
 */

import type { GradeLevel } from '@/types/curriculum';

/** The registry keys, in band order. Anything outside this list is not a grade. */
export const GRADE_LEVELS: readonly GradeLevel[] = [
  'PP1',
  'PP2',
  'Grade1',
  'Grade2',
  'Grade3',
  'Grade4',
  'Grade5',
  'Grade6',
  'Grade7',
  'Grade8',
  'Grade9',
  'Grade10',
  'Grade11',
  'Grade12',
];

const BY_CANONICAL_KEY = new Map<string, GradeLevel>(
  GRADE_LEVELS.map((grade) => [grade.toUpperCase(), grade]),
);

/**
 * `'Grade 4'`, `'grade4'`, `'GRADE4'`, `4` → `'Grade4'`.
 *
 * A bare number means Grade n and never Pre-Primary: PP1/PP2 exist only by name,
 * because a learner record storing `1` cannot mean two different bands.
 *
 * Returns `null` for anything the registry does not hold, including values that
 * are not strings or numbers. Callers must handle `null`; they may not cast.
 */
export function parseGradeLevel(input: unknown): GradeLevel | null {
  if (typeof input === 'number') {
    if (!Number.isInteger(input) || input < 1 || input > 12) return null;
    return BY_CANONICAL_KEY.get(`GRADE${input}`) ?? null;
  }
  if (typeof input !== 'string') return null;

  const compact = input.trim().replace(/\s+/g, '').toUpperCase();
  if (compact === '') return null;

  const exact = BY_CANONICAL_KEY.get(compact);
  if (exact) return exact;

  // '4' and 'Grade4' are the same registry key; 'Grade4Grade5' is neither.
  const numeric = /^(?:GRADE)?(\d{1,2})$/.exec(compact);
  if (numeric) {
    const asNumber = Number(numeric[1]);
    if (asNumber >= 1 && asNumber <= 12) {
      return BY_CANONICAL_KEY.get(`GRADE${asNumber}`) ?? null;
    }
  }
  return null;
}
