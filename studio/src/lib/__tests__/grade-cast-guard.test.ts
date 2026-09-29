/**
 * S-4 tail — grade strings must pass through the parser.
 *
 * S-3 put every grade string on the server through `parseGradeLevel()`, which
 * returns `GradeLevel | null` and refuses anything the curriculum registry does
 * not hold. Two call sites still reached `GradeLevel` with a bare cast, which is
 * the compiler being told something instead of being shown it:
 *
 *   1. `lib/quiz-trigger.ts` — `context.grade as GradeLevel`. The class was dead
 *      (nothing imported it), and it carried the same phantom-memory shape as the
 *      engine deleted in S-4: a `static lastQuizTime` record that a cold start
 *      wipes. So it is deleted rather than patched.
 *   2. `app/test-schemer/page.tsx` — `e.target.value as GradeLevel` on a
 *      `<select>`. The options happen to come from `getAllGrades()`, so today the
 *      cast holds, but nothing keeps it honest if the option list changes.
 *
 * Comments are stripped before matching (the precedent set by
 * `legacy-auth-surface.test.ts` and `mwalimu-no-phantom-memory.test.ts`), because
 * `grade-level.ts` documents the cast it replaced.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(process.cwd(), 'src');

function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, ' ');
}

function tsFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      found.push(...tsFiles(full));
    } else if (/\.tsx?$/.test(entry)) {
      found.push(full);
    }
  }
  return found;
}

/**
 * These two guards walk every `.ts`/`.tsx` under `src` and read each file, so their cost is the size of the
 * repository, not the size of the assertion. Vitest's 5 s default was enough when this file was written and
 * is not enough on the 3.7 GB development laptop: measured 2026-09-29, that walk takes 0.49 s when this file
 * runs alone and 6.36 s inside `vitest run --no-file-parallelism`, where the run spends 26.8 s transforming
 * and 117.5 s importing modules for 54.4 s of actual test time. The assertion is
 * unchanged — this only stops a filesystem budget from being reported as a grade-parser regression.
 */
const WALK_TIMEOUT_MS = 40_000;

describe('no bare cast into GradeLevel', () => {
  it('leaves bare casts into GradeLevel out of every executable line in src', () => {
    const offenders = tsFiles(SRC)
      .filter((file) => /as\s+GradeLevel\b/.test(codeOnly(readFileSync(file, 'utf8'))))
      .map((file) => relative(SRC, file));
    expect(offenders, `these files still cast a string into GradeLevel: ${offenders.join(', ')}`).toEqual([]);
  }, WALK_TIMEOUT_MS);
});

describe('the dead quiz trigger is cut', () => {
  it('removes lib/quiz-trigger.ts', () => {
    expect(
      existsSync(join(SRC, 'lib', 'quiz-trigger.ts')),
      'quiz-trigger.ts was unreferenced and kept its cooldown in a module-level record',
    ).toBe(false);
  });

  it('leaves no importer of it', () => {
    const importers = tsFiles(SRC)
      .filter((file) => /from '[^']*quiz-trigger'/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC, file));
    expect(importers, `quiz-trigger.ts is dead but still imported by: ${importers.join(', ')}`).toEqual([]);
  }, WALK_TIMEOUT_MS);
});

describe('the schemer test page validates its grade', () => {
  const page = codeOnly(
    readFileSync(join(SRC, 'app', 'test-schemer', 'page.tsx'), 'utf8'),
  );

  it('runs the select value through parseGradeLevel', () => {
    expect(page).toMatch(/parseGradeLevel\(/);
  });

  it('carries no `any`, per AGENTS.md', () => {
    expect(page).not.toMatch(/:\s*any\b/);
    expect(page).not.toMatch(/as any\b/);
  });
});
