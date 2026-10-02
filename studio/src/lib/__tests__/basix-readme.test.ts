import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
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
 * 6. The headline command is executed inside a clean extraction of `HEAD`, and every path the section cites has to
 *    be in that extraction. Items 2 and 3 read this working tree, and a working tree can contain fixes that the
 *    commit being submitted does not — which is precisely how `1db6334` went green while a clone of it failed.
 */

const STUDIO = process.cwd();
const REPO = join(STUDIO, '..');
const README = readFileSync(join(REPO, 'README.md'), 'utf8');
// The real path, not the `scripts/` alias. A judge on a checkout that does not materialise symlinks — Windows
// without developer mode — gets a 23-byte text file where `scripts` should be, so the alias is a convenience and
// the real path is the promise. The guard runs the promise; a separate test below still proves the alias works.
const SCRIPT = join(REPO, 'developer_tools', 'scripts', 'reconcile.mts');
/** A commit that shipped the file moves without the in-file path fixes, used to prove the probe can fail. */
const BROKEN_COMMIT = '1db6334';

/**
 * Extract `ref` into a throwaway directory the way a reviewer's clone would hold it, with no `.git`, no
 * `node_modules` and nothing inherited from this working tree. `git archive` rather than `git clone` because the
 * pack is 101 MB of history and the tree is 1,825 files, and both materialise the compatibility symlink the same
 * way on this machine.
 */
function cleanCheckoutOf(ref: string): string {
  const work = mkdtempSync(join(tmpdir(), 'basix-clean-checkout-'));
  const archive = join(work, `${ref}.tar`);
  const made = spawnSync('git', ['archive', `--format=tar`, `-o`, archive, ref], { cwd: REPO, encoding: 'utf8' });
  if (made.status !== 0) throw new Error(`git archive ${ref} failed: ${made.stderr}`);
  const extracted = spawnSync('tar', ['-xf', archive, '-C', work], { encoding: 'utf8' });
  if (extracted.status !== 0) throw new Error(`tar -x of ${ref} failed: ${extracted.stderr}`);
  rmSync(archive, { force: true });
  return work;
}

function refExists(ref: string): boolean {
  return spawnSync('git', ['cat-file', '-e', `${ref}^{commit}`], { cwd: REPO }).status === 0;
}

/**
 * One extraction per ref, because each costs seconds and tens of megabytes on a 3.7 GB laptop and four tests want
 * the same tree. `cleanCheckoutOf` is only ever called through here.
 */
const checkouts = new Map<string, string>();
function checkoutOf(ref: string): string {
  const cached = checkouts.get(ref);
  if (cached) return cached;
  const dir = cleanCheckoutOf(ref);
  checkouts.set(ref, dir);
  return dir;
}

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
    const cited = [...section().matchAll(/`((?:studio|scripts|developer_tools|docs|supabase)\/[^`\s]+)`/g)]
      .map((m) => m[1]);
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

  it('names the deployment it was checked against, and does not pretend the click-through happened', () => {
    // "It 404s in production" was itself an unverified claim about a URL nobody had opened. So the section has
    // to carry the deployment it was checked on and the sentence that says the teacher screen has not been
    // walked through. Pinning the hedges is the point: a later edit that upgrades "not been done" into a
    // demonstration fails here. Measured 2026-10-01, 17:2x EAT: `vercel inspect` on
    // sentastudio-gady22na2-… says `status ● Blocked`, reason "The deployment was blocked because the commit
    // author doesn't have permission to create deployments for this project", and `curl -L` on `/` and
    // `/omega/check` both end at `https://vercel.com/login?next=/sso-api…` -- Vercel's own SSO wall, not our
    // app's sign-in page. The previous version of this guard *required* the string "sign-in page", which is how
    // a wrong sentence survived an assertion meant to catch wrong sentences: it pinned a hedge instead of a
    // fact. So the guard now requires what the commands printed and forbids what they did not.
    const body = section();
    expect(body, 'the section must name the deployment it was checked against').toContain(
      'sentastudio-gady22na2-dans-projects-5f474b51.vercel.app',
    );
    expect(body).toMatch(/●\s*Blocked|status[\s\S]{0,20}Blocked/);
    expect(body).toMatch(/permission\s+to\s+create\s+deployments/);
    expect(body).toMatch(/vercel\.com\/login/);
    expect(body).not.toMatch(/show the sign-in page|Ready in 54/);
    expect(body).toMatch(/click-through[^.]*has not been done|has not been done[^.]*click-through/);
  });

  it('quotes the suite count that §9 of the roadmap records as the current baseline', () => {
    // §9 is where a run is recorded with its timing; the README is where a judge reads the number. Comparing
    // against the *first* "N passed" anywhere in the roadmap would pass on a month-old green run, so the
    // anchor is the line §9 labels as the baseline.
    const quoted = /\*\*(\d+) passed, (\d+) skipped\*\*/.exec(section());
    expect(quoted, 'the section must state the suite result as "**N passed, M skipped**"').toBeTruthy();
    const roadmap = readFileSync(join(REPO, 'docs', 'ROADMAP.md'), 'utf8');
    const anchor = roadmap.search(/Suite baseline/i);
    expect(anchor, '§9 must carry a line labelled "Suite baseline" for the README to be checked against')
      .toBeGreaterThan(-1);
    const current = /(\d+) passed[^\d]{0,12}(\d+) skipped/.exec(roadmap.slice(anchor, anchor + 400));
    expect(current, 'the baseline line must state a passed/skipped count').toBeTruthy();
    expect(`${quoted![1]} passed, ${quoted![2]} skipped`)
      .toBe(`${current![1]} passed, ${current![2]} skipped`);
  });

  it('tells a reviewer the Node version the headline command actually needs', () => {
    // `node scripts/reconcile.mts` runs on a bare clone with no install, which is its whole value to a judge --
    // and it is TypeScript loaded by Node's own type stripping plus `module.registerHooks()` from
    // scripts/omega-alias.mjs. Type stripping is unflagged from Node v22.18.0 and registerHooks landed in
    // v22.15.0, so on Node 20 -- still everywhere -- the first command a reviewer types dies with
    // ERR_UNKNOWN_FILE_EXTENSION, which reads as broken project rather than wrong runtime. Proven here: no
    // `engines` field in studio/package.json, no version anywhere in the run block, and only v22.23.3 installed
    // on this laptop, so the older-Node failure could not be reproduced locally (the two version numbers are
    // Tier B from the Node release index). The fix is a sentence, so the sentence is now enforced.
    const body = section();
    expect(body, 'the submission section must name a minimum Node version').toMatch(/Node\.?js? ?(v|>=|≥)? ?22\.\d+/);
    expect(body).toContain('scripts/omega-alias.mjs');
    // Only `studio/package.json` is asserted, because the repository root has no package.json at all -- which is
    // what makes the zero-install CLI run possible. Adding a root manifest to satisfy a check would change how
    // every tool reads the repo root, three days out; the README sentence is the fix, and this is its record.
    const studioPkg = JSON.parse(readFileSync(join(REPO, 'studio', 'package.json'), 'utf8'));
    expect(studioPkg.engines?.node, 'studio/package.json must declare engines.node').toBeTruthy();
  });

  it('tells a reviewer how to reach the page, on the port the dev script actually binds', () => {
    // The section says `/omega/check` is viewable "locally with no account", and that is the one sentence a judge
    // could act on -- but it never said *how*, so the page half of the submission had no runnable instruction at
    // all. This guard pins the command and, deliberately, pins the port against `studio/package.json`'s own `dev`
    // script rather than a number typed into the test: the repo's older docs say 3000 in places and 5173 in others,
    // and a README that guesses is how a demo loses four minutes in front of a judge.
    const studioPkg = JSON.parse(readFileSync(join(REPO, 'studio', 'package.json'), 'utf8'));
    const port = /-p\s+(\d+)/.exec(studioPkg.scripts?.dev ?? '')?.[1];
    expect(port, 'the dev script must bind an explicit port for this guard to have anything to check').toBeTruthy();
    const body = section();
    expect(body, 'the submission section must give the command that starts the page').toContain('npm run dev');
    expect(body, `the submission section must name the port the dev script binds (${port})`).toContain(`:${port}`);
    // No reviewer should be sent to 3000 for this app; that port belongs to an unrelated local backend.
    expect(body).not.toMatch(/localhost:3000\/omega|localhost:3000\/teacher/);
  });
});

describe('the headline command is proven against a clean checkout, not against this working tree', () => {
  // Why this block exists at all: commit `1db6334` moved the scripts into `developer_tools/` and recorded them as
  // pure renames, because the owner's edits *inside* those files were still unstaged. The suite passed, the README
  // guard passed, and every one of them was reading a working tree that held fixes the commit did not. A judge
  // cloning it got: `reconcile: cannot read the draft at <root>/developer_tools/studio/public/omega/drafts/…`.
  // Nothing that reads `process.cwd()` or `existsSync(REPO, …)` can see that class of bug, so this block reads
  // HEAD instead.
  afterAll(() => {
    for (const dir of checkouts.values()) rmSync(dir, { recursive: true, force: true });
    checkouts.clear();
  });

  function runHeadline(dir: string, relative: string) {
    return spawnSync(process.execPath, [join(dir, relative)], { cwd: dir, encoding: 'utf8' });
  }

  it('carries the real path in a fresh extraction, with no .git and no node_modules', () => {
    const dir = checkoutOf('HEAD');
    expect(existsSync(join(dir, 'developer_tools', 'scripts', 'reconcile.mts'))).toBe(true);
    expect(existsSync(join(dir, '.git'))).toBe(false);
    expect(existsSync(join(dir, 'studio', 'node_modules'))).toBe(false);
  });

  it('runs the command the section tells a judge to type, from that extraction, and gets the verdict', () => {
    const dir = checkoutOf('HEAD');
    const run = runHeadline(dir, join('developer_tools', 'scripts', 'reconcile.mts'));
    expect(run.stdout, `stderr was: ${run.stderr}`).toContain('2 clean · 2 blocking · 0 advisory · 4 rows');
    expect(run.status, `stderr was: ${run.stderr}`).toBe(0);
  });

  it('keeps the scripts/ compatibility symlink working in that extraction, which is what its row in the README promises', () => {
    const dir = checkoutOf('HEAD');
    expect(readlinkSync(join(dir, 'scripts'))).toBe('developer_tools/scripts');
    const run = runHeadline(dir, join('scripts', 'reconcile.mts'));
    expect(run.status, `stderr was: ${run.stderr}`).toBe(0);
    expect(run.stdout).toContain('∴ not certified');
  });

  it('cites no path a clean checkout would not have', () => {
    // The worktree version of this check above can pass on a file that exists only because somebody moved it by
    // hand. This one asks the only question a reviewer can answer: is it in the thing they clone?
    const dir = checkoutOf('HEAD');
    const cited = [...section().matchAll(/`((?:studio|scripts|developer_tools|docs|supabase)\/[^`\s]+)`/g)]
      .map((m) => m[1]);
    expect(cited.length).toBeGreaterThan(5);
    for (const path of cited) {
      expect(existsSync(join(dir, path)), `${path} is cited but is not in HEAD`).toBe(true);
    }
  });

  it.skipIf(!refExists(BROKEN_COMMIT))(
    'detects the regression it was written for, by running the same probe against the commit that had it',
    () => {
      // Proving the probe is not vacuous: `1db6334` is the real tree object where the headline command failed, so
      // a guard that cannot reproduce that failure is not guarding anything. Skipped, not deleted, if the history
      // is ever rewritten and the commit stops existing.
      const dir = checkoutOf(BROKEN_COMMIT);
      const run = runHeadline(dir, join('scripts', 'reconcile.mts'));
      expect(run.status).not.toBe(0);
      expect(run.stderr).toContain('cannot read the draft at');
      expect(run.stderr).toContain('developer_tools/studio/public');
    },
  );
});

describe('the sentences the north star bans stay banned', () => {
  it('never claims the project is built on the upstream Omega', () => {
    expect(README).not.toMatch(/built on Omega/i);
  });

  it('never claims the submitted feature needs no connection to a browser it is served from', () => {
    expect(section()).not.toMatch(/fully offline|works without (an )?internet|no internet required/i);
  });

  it('keeps the on-chain sentence in the future tense it belongs to', () => {
    // The ledger's SHA-256 chain is Tier A: the CLI recomputes it and rejects a tampered file. *Publishing* that
    // head hash on-chain is a different action, needs a wallet and a testnet decision, and has not happened.
    // Left unmarked, "on-chain" reads as the second claim borrowing the first one's evidence.
    const body = section();
    const line = body.split('\n').find((l) => /on-chain/i.test(l));
    expect(line).toBeDefined();
    expect(line).toMatch(/not started|has not|we'd build|next/i);
    expect(body).not.toMatch(/is recorded on-chain|已上链|anchored on (the )?(Polygon|Ethereum)/i);
  });
});
