import { describe, expect, it } from 'vitest';
import { toLessonArchitectAllocation } from '@/app/api/generate/exam/route';
import { extractJson } from '@/lib/llm/complete-with-fallback';

/**
 * The exam generator and the marker both used to call `/api/v1/exams/*`, i.e.
 * the Rust MVP backend that is deployed nowhere, so /teacher/exams could never
 * produce or score a paper. They now call `/api/generate/exam` and
 * `/api/exams/mark`, which are Next handlers in the same deployment as the page.
 *
 * Two things those handlers get wrong if nobody writes them down: the shape the
 * Python `StrandAllocation` model accepts, and the shape a model actually
 * replies with. Both are pure functions, so both are testable without a key.
 */

describe('toLessonArchitectAllocation', () => {
  // `studio/src/data/curriculum/term-mappings.ts` emits one flat row per
  // sub-strand; `agents/scheme/exam.py` defines
  // `StrandAllocation{strandName, subStrands: [{name, lessons}]}` and
  // `generate_exam()` calls `model_validate()` on it directly, so forwarding the
  // studio shape unchanged is an `Invalid allocation` error, not a paper.
  const flat = [
    { strandName: '1.0 Numbers', subStrandName: '1.1 Counting', weeks: [1, 2] },
    { strandName: '1.0 Numbers', subStrandName: '1.2 Addition', weeks: [3] },
    { strandName: '2.0 Geometry', subStrandName: '2.1 Shapes', weeks: [4] },
  ];

  it('groups flat studio allocations by strand', () => {
    expect(toLessonArchitectAllocation(flat)).toEqual([
      {
        strandName: '1.0 Numbers',
        subStrands: [
          { name: '1.1 Counting', lessons: 2 },
          { name: '1.2 Addition', lessons: 1 },
        ],
      },
      {
        strandName: '2.0 Geometry',
        subStrands: [{ name: '2.1 Shapes', lessons: 1 }],
      },
    ]);
  });

  it('passes an already-grouped allocation through with defaults filled', () => {
    const grouped = toLessonArchitectAllocation([
      {
        strandName: '3.0 Money',
        subStrands: [{ name: '3.1 Coins', lessons: 4 }, { name: '' }],
      },
    ]);
    expect(grouped).toEqual([
      { strandName: '3.0 Money', subStrands: [{ name: '3.1 Coins', lessons: 4 }] },
    ]);
  });

  it('drops entries with no strand or no sub-strand name', () => {
    expect(
      toLessonArchitectAllocation([
        { strandName: '', subStrandName: 'x', weeks: [1] },
        { strandName: '  ', subStrandName: 'y' },
        { strandName: '4.0 Measurement', subStrandName: '' },
      ]),
    ).toEqual([]);
  });

  it('treats a missing week list as one lesson, never zero', () => {
    // `SubStrandInfo.lessons` is a required int and the prompt distributes
    // questions proportionally to it; 0 lessons would silently exclude a
    // sub-strand from the exam.
    const [strand] = toLessonArchitectAllocation([
      { strandName: '5.0 Life', subStrandName: '5.1 Plants' },
    ]);
    expect(strand.subStrands).toEqual([{ name: '5.1 Plants', lessons: 1 }]);
  });
});

describe('extractJson', () => {
  it('reads a bare object', () => {
    const parsed = extractJson('{"results":[{"index":0,"awarded":2}]}') as {
      results: unknown[];
    };
    expect(parsed.results).toEqual([{ index: 0, awarded: 2 }]);
  });

  it('reads a fenced array and ignores the prose around it', () => {
    const text = 'Here are the marks:\n```json\n[{"index":1,"awarded":3,"feedback":"Good"}]\n```\nWell done.';
    expect(extractJson(text)).toEqual([
      { index: 1, awarded: 3, feedback: 'Good' },
    ]);
  });

  it('recovers the first complete value when a model appends commentary', () => {
    expect(extractJson('{"a":1} trailing words')).toEqual({ a: 1 });
  });

  it('throws when there is no JSON at all', () => {
    expect(() => extractJson('the pupil answered well')).toThrow(/no JSON/i);
  });
});
