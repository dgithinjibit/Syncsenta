import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Spoon 8 — the sample audit trail BASIX asks for, held to the run that produced it.
 *
 * `docs/BASIX-SUBMISSION-*` and the challenge brief both list "a sample audit trail" as a deliverable, and
 * until today the only audit trail this feature ever made was written to `/tmp/run1` on whoever's laptop ran
 * the demo. A judge cannot read /tmp. So the artefacts are committed, and a committed artefact is worth
 * exactly one thing: that it is what the code still produces. Everything the video will show is reproducible
 * from the command in the sample's own README, and this file is the guard that says so.
 *
 * What is asserted, in order:
 *
 * 1. Re-running the recorded command into a fresh directory writes `policy.metta`, `ledger.json` and
 *    `diff.json` byte-for-byte identical to the committed ones. This is why `--at` exists: the caller owns the
 *    clock, so a consent record does not move every time someone reads it. Note the three artefacts carry no
 *    `--out` path in them — only repo-relative source labels — which is what makes a temp-directory rerun
 *    comparable at all.
 * 2. The record names a person, a timestamp, and the rule line each entry cites. An audit trail with no actor
 *     is a log; the actor is the deliverable.
 * 3. The waiver survives as a fact on disk: pointing a *later* run at the committed `policy.metta`, with no
 *    waiver flag anywhere in the command, prints the waiver rule. That is the whole claim of the override
 *    model, checked against the file a reviewer would actually open.
 * 4. Paths cited in the sample's README exist. A citation to a missing file is the most expensive error a
 *    submission can carry, and it is the reason `basix-readme.test.ts` exists for the top-level README.
 */

const STUDIO = process.cwd();
const REPO = join(STUDIO, '..');
const SAMPLE = join(REPO, 'docs', 'basix-sample-audit');
const SCRIPT = join(REPO, 'developer_tools', 'scripts', 'reconcile.mts');

/** The command line the sample documents, as data rather than as a second copy in prose. */
const RECORD_ARGS = [
  SCRIPT,
  '--accept', '3',
  '--waive', 'assessmentMethods',
  '--actor', 'teacher:kibera_mama_joy',
  '--note', 'Lesson 2 is oral.',
  '--at', '2026-10-02T09:04:15+03:00',
];

function run(args: string[], cwd = REPO) {
  return spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });
}

function inSample(name: string): string {
  return readFileSync(join(SAMPLE, name), 'utf8');
}

describe('the committed sample audit trail is the current output, not a screenshot of it', () => {
  it('reproduces all three artefacts byte for byte from a rerun in a fresh directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'basix-audit-'));
    try {
      const again = run([...RECORD_ARGS, '--out', dir]);
      expect(again.status, `rerun failed: ${again.stderr}`).toBe(0);
      for (const name of ['policy.metta', 'ledger.json', 'diff.json']) {
        expect(existsSync(join(SAMPLE, name)), `${name} is not committed`).toBe(true);
        expect(readFileSync(join(dir, name), 'utf8'), `${name} changed since the sample was written`)
          .toBe(inSample(name));
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('records a named actor, the clock the caller supplied, and a cited rule line per entry', () => {
    const ledger = JSON.parse(inSample('ledger.json'));
    const text = JSON.stringify(ledger);
    expect(text).toContain('teacher:kibera_mama_joy');
    expect(text).toContain('2026-10-02T09:04:15+03:00');
    expect(text).toContain('Lesson 2 is oral.');
    const entries = ledger.entries ?? [];
    expect(entries.length).toBeGreaterThan(1);
    for (const entry of entries) {
      expect(entry.citations, `entry ${entry.index} cites nothing`).toBeTruthy();
      expect(entry.citations.length).toBeGreaterThan(0);
    }
    // The chain is what makes it an audit trail rather than a list: an entry knows its predecessor.
    expect(text).toMatch(/prevHash|parentHash|hash/);
  });

  it('still waives when a later run only reads the file, with no waiver flag in the command', () => {
    const readBack = run([SCRIPT, `--policy`, join(SAMPLE, 'policy.metta')]);
    expect(readBack.status, readBack.stderr).toBe(0);
    expect(readBack.stdout).toContain('field-obligation-waived-by-teacher');
    expect(readBack.stdout).toContain('policy.metta');
  });

  it('documents itself with a command, and cites no file that is not in the repository', () => {
    const readme = inSample('README.md');
    expect(readme).toContain('developer_tools/scripts/reconcile.mts');
    expect(readme).toContain('--actor teacher:kibera_mama_joy');
    const cited = [...readme.matchAll(/`((?:studio|scripts|developer_tools|docs|metta-logic)\/[^`\s]+)`/g)]
      .map((m) => m[1].replace(/:\d+(?:–\s*:\d+)?$/, '')); // `file.metta:58` cites a line in a file that must exist
    expect(cited.length).toBeGreaterThan(2);
    for (const path of cited) {
      expect(existsSync(join(REPO, path)), `${path} is cited but not in the tree`).toBe(true);
    }
  });
});
