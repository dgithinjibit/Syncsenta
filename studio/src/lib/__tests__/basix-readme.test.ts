import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Spoon 6a — the README section a judge actually reads, held to the same standard as the code.
 *
 * Track 5's deliverable list asks for a short README: problem, solution, technology, and it scores
 * documentation and build process at 20%. Prose written once and never re-checked is how this repository
 * acquired the Tier C sentences `docs/BASIX-NORTH-STAR.md` §4 lists — a performance table with no artefact
 * behind it, two docs pointing at a file one directory up. The README cannot be guarded by review, because
 * review is exactly the process that let those through. It can be guarded by a test that runs the terminal
 * and reads the page.
 *
 * What this insists on, in order:
 *
 * 1. The three headings the brief asks for, in the submission's own section, so a judge does not have to
 *    find the feature inside a platform pitch.
 * 2. The transcript it quotes is *the* transcript — produced by `node scripts/reconcile.mts` at the moment
 *    the test runs, not pasted from a run that has since changed.
 * 3. Every path cited in backticks exists in this repository. A citation to a missing file is the single
 *    most expensive kind of error in a submission, because it tells the judge to stop trusting the rest.
 * 4. The claim about tests carries the command that produced it. No bare count, no bare percentage.
 * 5. The banned sentences stay banned: "built on Omega", and any "works fully offline" / "no internet"
 *    line, which is false about a hosted Next.js app and would be an integrity problem, not a typo.
 */

const STUDIO = process.cwd();
const REPO = join(STUDIO, '..');
const README = readFileSync(join(REPO, 'README.md'), 'utf8');
const SCRIPT = join(REPO, 'scripts', 'reconcile.mts');

function section(): string {
  const start = README.indexOf('## One feature, proven');
  if (start === -1) return '';
  const next = README.indexOf('\n## ', start + 1);
  return README.slice(start, next === -1 ? README.length : next);
}

describe('the submission section says what the brief asks for', () => {
  it('exists, and is findable by a reader who arrives at the top of the page', () => {
    expect(section()).not.toBe('');
    expect(README.indexOf('## One feature, proven')).toBeLessThan(README.indexOf('## Monorepo structure'));
  });

  it('has the three headings Track 5 names: problem, solution, technology', () => {
    const body = section();
    for (const heading of ['### Problem', '### Solution', '### Technology']) {
      expect(body).toContain(heading);
    }
  });

  it('names the agent, the challenge, and the one feature rather than the whole platform', () => {
    const body = section();
    expect(body).toContain('Track 5');
    expect(body).toContain('One agent producing an auditable decision');
    expect(body).toContain('scheme-of-work');
  });
});

describe('the section is backed by the thing it shows', () => {
  it('quotes exactly the transcript the terminal prints right now', () => {
    const stdout = spawnSync(process.execPath, [SCRIPT], { cwd: REPO, encoding: 'utf8' }).stdout.trimEnd();
    expect(stdout).not.toBe('');
    expect(section()).toContain(stdout);
  });

  it('cites no file that is not in the repository', () => {
    const cited = [...section().matchAll(/`((?:studio|scripts|docs|supabase)\/[^`\s]+)`/g)].map((m) => m[1]);
    expect(cited.length).toBeGreaterThan(5);
    for (const path of cited) {
      expect(existsSync(join(REPO, path)), `${path} is cited but not in the tree`).toBe(true);
    }
  });

  it('gives the command behind any number it states, because a count without a command is a mood', () => {
    const body = section();
    const numbers = body.match(/\b\d{3,}\b/g) ?? [];
    if (numbers.length > 0) expect(body).toContain('npx vitest run --no-file-parallelism');
  });
});

describe('the sentences the north star bans stay banned', () => {
  it('never claims the project is built on the upstream Omega', () => {
    expect(README).not.toMatch(/built on Omega/i);
  });

  it('never claims the submitted feature needs no connection to a browser it is served from', () => {
    expect(section()).not.toMatch(/fully offline|works without (an )?internet|no internet required/i);
  });
});
