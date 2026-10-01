import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

/**
 * Static assets that git refuses to carry are static assets Vercel never serves.
 *
 * This repo grew out of a create-next-app `.gitignore` that ignored a bare `public` for Gatsby's build output.
 * There is no Gatsby site here, but the rule was live the whole time: `studio/public/` already held 124 tracked
 * files, so nothing appeared wrong until a *new* file was added — `git add` said the path was ignored, and
 * `git status --ignored` showed the directory with a `!!`. That is how a service worker or a MeTTa pack ends up
 * present on a laptop and absent in production, which is the built-but-unreachable anti-pattern §6 of the
 * roadmap already counts three instances of, arriving from a direction nobody was watching.
 *
 * So the gate is the boring one: for each path the browser has to be able to fetch, prove git will take it.
 */

const REPO = join(process.cwd(), '..');

/** Paths the deployed app must be able to serve, and which therefore must be committable. */
const MUST_BE_COMMITTABLE = [
  'studio/public/sw.js',
  'studio/public/manifest.json',
  'studio/public/omega/ai_g8_design.metta',
  'studio/public/omega/scheme_check.metta',
  'studio/src/lib/attest/derive.ts',
];

function ignoredBy(path: string): string | null {
  try {
    // `check-ignore -v` exits 0 and prints the rule when the path is ignored, exits 1 when it is not.
    const out = execFileSync('git', ['check-ignore', '-v', path], { cwd: REPO, encoding: 'utf8' });
    return out.trim();
  } catch {
    return null;
  }
}

describe('nothing that ships to a browser is git-ignored', () => {
  for (const path of MUST_BE_COMMITTABLE) {
    it(`${path} is not ignored`, () => {
      expect(ignoredBy(path), `${path} matches an ignore rule`).toBeNull();
    });
  }

  it('the static root itself is open, so the rule cannot come back as a directory match', () => {
    // `public` alone was the defect: it matches any directory of that name at any depth, including the Next.js
    // app's own static root. Checking the directory, not just the files in it, is what catches a reintroduction.
    expect(ignoredBy('studio/public'), 'studio/public is ignored').toBeNull();
  });
});
