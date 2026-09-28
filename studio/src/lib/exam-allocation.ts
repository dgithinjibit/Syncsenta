/**
 * Exam allocation shaping for the Lesson Architect.
 *
 * Lives in `src/lib`, not in `src/app/api/generate/exam/route.ts`, because a
 * Next.js App Router route file may only export HTTP methods and route config
 * fields. Exporting anything else — even a pure helper — fails `next build`
 * with `"toLessonArchitectAllocation" is not a valid Route export field`.
 * `tsc --noEmit` and vitest both accept it, so the only local defence is the
 * gate test in `src/lib/__tests__/route-exports.test.ts`.
 */

export type StudioAllocation = {
  strandName?: string;
  subStrandName?: string;
  weeks?: number[];
  /** Accepted pre-grouped, in case a caller already speaks the Python shape. */
  subStrands?: Array<{ name?: string; lessons?: number }>;
};

export type GroupedAllocation = {
  strandName: string;
  subStrands: Array<{ name: string; lessons: number }>;
};

/**
 * `studio/src/data/curriculum/term-mappings.ts` emits one flat entry per
 * sub-strand (`{strandName, subStrandName, weeks[]}`). The Python
 * `StrandAllocation` model is strict and grouped
 * (`{strandName, subStrands: [{name, lessons}]}`), and
 * `LessonArchitectAgent.generate_exam` calls `model_validate` on it directly, so
 * the studio shape forwarded unchanged is a guaranteed `Invalid allocation`
 * error. Grouping happens here instead of in every component that owns a
 * curriculum allocation.
 */
export function toLessonArchitectAllocation(
  allocation: StudioAllocation[],
): GroupedAllocation[] {
  const grouped = new Map<string, Array<{ name: string; lessons: number }>>();

  for (const entry of allocation) {
    const strandName = (entry.strandName || '').trim();
    if (!strandName) continue;
    const bucket = grouped.get(strandName) ?? [];
    grouped.set(strandName, bucket);

    if (Array.isArray(entry.subStrands)) {
      for (const sub of entry.subStrands) {
        const name = (sub?.name || '').trim();
        if (!name) continue;
        bucket.push({ name, lessons: Math.max(1, Number(sub.lessons) || 1) });
      }
      continue;
    }

    const subStrandName = (entry.subStrandName || '').trim();
    if (!subStrandName) continue;
    const lessons = Array.isArray(entry.weeks) && entry.weeks.length > 0
      ? entry.weeks.length
      : 1;
    const existing = bucket.find((sub) => sub.name === subStrandName);
    if (existing) existing.lessons += lessons;
    else bucket.push({ name: subStrandName, lessons });
  }

  return Array.from(grouped, ([strandName, subStrands]) => ({ strandName, subStrands }))
    // A strand with no sub-strands validates fine and then scopes the paper to
    // nothing, which reads to the teacher as a generated exam that quietly
    // ignores part of the term. Drop it, and let the caller's empty check see it.
    .filter((strand) => strand.subStrands.length > 0);
}
