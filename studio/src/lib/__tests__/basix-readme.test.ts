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
