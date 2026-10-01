import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SchemeRow } from '@/types/curriculum';
import { buildCheckView } from '@/lib/scheme/check-view';

/**
 * The same decision, printed by a terminal.
 *
 * The video needs one shot of a page and one shot of proof that the page is not where the thinking happens.
 * `scripts/reconcile.mts` is that proof: it reads the identical two packs and the identical draft, from disk,
 * in Node, with no bundler and no browser, and prints the identical transcript. The assertion that makes this
 * worth having is the string comparison at the bottom of this file — CLI stdout must equal what
 * `buildCheckView` produced in-process. If the two ever disagree, the demo is two engines wearing one coat,
 * which is the exact failure §6 of the roadmap already counts three instances of.
 *
 * Spawned as a child process, with no flags, exactly the way a reviewer types it. Importing the script
 * through vitest instead would test the bundler's alias resolver rather than Node's.
 */

const STUDIO = process.cwd();
const REPO = join(STUDIO, '..');
const SCRIPT = join(REPO, 'scripts', 'reconcile.mts');
const DRAFT = join(STUDIO, 'public', 'omega', 'drafts', 'kibera_g8_week14.json');

const design = {
  file: 'studio/public/omega/ai_g8_design.metta',
  text: readFileSync(join(STUDIO, 'public', 'omega', 'ai_g8_design.metta'), 'utf8'),
};
const policy = {
  file: 'studio/public/omega/scheme_check.metta',
  text: readFileSync(join(STUDIO, 'public', 'omega', 'scheme_check.metta'), 'utf8'),
};
const draft = JSON.parse(readFileSync(DRAFT, 'utf8')) as {
  grade: string;
  rows: SchemeRow[];
  origin: Record<string, string>;
};

function run(...args: string[]) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO,
    encoding: 'utf8',
  });
}

describe('the terminal prints what the page prints', () => {
  it('runs the sample draft with no flags and exits 0', () => {
    const result = run();
    // Node prints one warning about `studio/package.json` carrying no `"type"` while it re-parses a `.ts`
    // import as an ES module. Silence was not bought by adding `"type": "module"` to the studio package,
    // which would move every config file's module kind under Next, nor by a nested `package.json` inside
    // `src/`. What this test insists on is that a clean run says nothing *wrong*.
    expect(result.stderr).not.toMatch(/Error|cannot read|Traceback/);
    expect(result.status).toBe(0);
    expect(result.stdout).not.toBe('');
  });

  it('names the grade, the learning area and the design version it read', () => {
    const stdout = run().stdout;
    expect(stdout).toContain('Scheme check · Grade 8 Artificial Intelligence');
    expect(stdout).toMatch(/design 2026-\d{2}-\d{2}\./);
  });

  it('says what the check did not need', () => {
    const stdout = run().stdout;
    expect(stdout).toContain('no network, no model, rules only');
  });

  it('cites the policy pack the way the page cites it', () => {
    const stdout = run().stdout;
    expect(stdout).toContain('scheme_check.metta:');
    expect(stdout).toContain('ai_g8_design.metta:');
  });

  it('prints the footer counts and the verdict, in that order', () => {
    const stdout = run().stdout;
    expect(stdout).toContain('2 clean · 2 blocking · 0 advisory · 4 rows');
    expect(stdout.trimEnd().split('\n').at(-1)).toMatch(/^∴ not certified/);
  });

  it('prints exactly the transcript the in-process view model produced', () => {
    const stdout = run().stdout;
    const expected = buildCheckView({
      grade: draft.grade,
      rows: draft.rows,
      design,
      policy,
      origin: draft.origin,
    }).transcript;
    expect(stdout.trimEnd()).toBe(expected);
  });
});

describe('the terminal fails when it has to', () => {
  it('refuses a draft that is not there, rather than printing an empty scheme', () => {
    const result = run('--draft', 'studio/public/omega/drafts/nope.json');
    expect(result.status).not.toBe(0);
    expect(`${result.stderr}${result.stdout}`).toMatch(/nope\.json/);
  });

  it('takes another draft when it is pointed at one', () => {
    const result = run('--draft', 'studio/public/omega/drafts/kibera_g8_week14.json');
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(run().stdout);
  });
});
