import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SchemeRow } from '@/types/curriculum';
import { verifyLedger, type Ledger } from '@/lib/scheme/ledger';

/**
 * Spoon 5c-4b — the terminal path that changes things, writes the record, and reads its own output back.
 *
 * 5c-1 … 5c-4a are four modules with no caller: the suite proves they work when a test hands them objects. This
 * file is the seam where the demo becomes a story a judge can re-type, because `scripts/reconcile.mts` is now
 * the thing that calls consent, override, the ledger and the handoff gate in one run and puts the results on
 * disk:
 *
 *   node scripts/reconcile.mts --accept 3 --waive assessmentMethods \
 *     --actor teacher:kibera_mama_joy --note 'Lesson 2 is oral.' --at 2026-10-02T09:04:15+03:00 --out /tmp/run1
 *
 * …writes `policy.metta`, `ledger.json`, `diff.json`, prints the record and the gate's decision — and then the
 * loop closes: a *later* run pointed at the written policy reproduces the waiver as an advisory, with the waiver
 * flag nowhere in its command line. A waiver that only lives in the memory of the process that made it is a
 * mood, not a policy.
 *
 * Three invariants hold this together, and each is a test rather than a sentence: a mutation with nowhere to
 * write its record is refused outright; the transcript the mutating run prints is byte-identical to what
 * `reconcileScheme` produces in-process for the same rows and the same waived policy (the one-engine claim from
 * 5d, extended to the path that changes things); and `--at` makes the artifacts reproducible, which is the only
 * way a hash chain printed in a video means anything to someone watching it.
 */

const STUDIO = process.cwd();
const REPO = join(STUDIO, '..');
const SCRIPT = join(REPO, 'scripts', 'reconcile.mts');
const POLICY_LABEL = 'studio/public/omega/scheme_check.metta';
const REPO_POLICY = join(STUDIO, 'public', 'omega', 'scheme_check.metta');
const ACTOR = 'teacher:kibera_mama_joy';
const AT = '2026-10-02T09:04:15+03:00';
const NOTE = 'Lesson 2 is assessed orally, so the column stays empty on purpose.';

const { reconcileScheme } = await import('@/lib/scheme/reconcile');
const { acceptProposal } = await import('@/lib/scheme/consent');
const { applyOverride } = await import('@/lib/scheme/override');

const design = {
  file: 'studio/public/omega/ai_g8_design.metta',
  text: readFileSync(join(STUDIO, 'public', 'omega', 'ai_g8_design.metta'), 'utf8'),
};
const repoPolicy = { file: POLICY_LABEL, text: readFileSync(REPO_POLICY, 'utf8') };
const draft = JSON.parse(
  readFileSync(join(STUDIO, 'public', 'omega', 'drafts', 'kibera_g8_week14.json'), 'utf8'),
) as { grade: string; rows: SchemeRow[] };

function run(...args: string[]) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: REPO, encoding: 'utf8' });
}

function outDir(): string {
  return mkdtempSync(join(tmpdir(), 'omega-cli-'));
}

function read(dir: string, name: string): string {
  return readFileSync(join(dir, name), 'utf8');
}

/** The full Monday-morning session: she accepts the substitution and waives the column, both on record. */
function certify(dir = outDir()) {
  const result = run(
    '--accept', '3',
    '--waive', 'assessmentMethods',
    '--actor', ACTOR,
    '--note', NOTE,
    '--at', AT,
    '--out', dir,
  );
  return { dir, result, policy: join(dir, 'policy.metta') };
}

describe('the run that changes things writes a record nobody has to trust', () => {
  it('accepts, waives, certifies, and hands off — in one command', () => {
    const { result } = certify();
    expect(result.stderr).not.toMatch(/Error|cannot|Traceback/);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('0 blocking');
    expect(result.stdout).toMatch(/∴ certified/);
    expect(result.stdout).toContain('handoff · allowed');
  });

  it('writes the three artifacts it promises, and nothing else', () => {
    const { dir } = certify();
    expect(readdirSync(dir).sort()).toEqual(['diff.json', 'ledger.json', 'policy.metta']);
  });

  it('writes the policy as the pack with exactly one line changed, at the same line number', () => {
    const { dir } = certify();
    const before = repoPolicy.text.split('\n');
    const after = read(dir, 'policy.metta').split('\n');
    expect(after.length).toBe(before.length);
    const changed = before.map((line, i) => (line === after[i] ? [] : [i + 1])).flat();
    expect(changed).toHaveLength(1);
    expect(after[changed[0] - 1]).toBe('(= (scheme-field-obligation g8 assessmentMethods) waived)');
    expect(before[changed[0] - 1]).toContain('mandatory');
  });

  it('writes a ledger whose chain verifies from the file alone, with no help from the run that made it', async () => {
    const { dir } = certify();
    const ledger = JSON.parse(read(dir, 'ledger.json')) as Ledger;
    expect(ledger.entries).toHaveLength(4);
    expect(await verifyLedger(ledger)).toEqual({ ok: true, invalid: [] });
    expect(ledger.entries.map((e) => e.basis)).toEqual([
      'proposal-accepted',
      'proposal-accepted',
      'proposal-accepted',
      'override-granted',
    ]);
  });

  it('writes a diff of the cells consent actually wrote, with what each one said before', () => {
    const { dir } = certify();
    const diff = JSON.parse(read(dir, 'diff.json')) as {
      cells: { row: number; field: string; before: string; after: string }[];
      rowsChanged: number;
      rowsTotal: number;
    };
    expect(diff.cells.map((c) => c.field)).toEqual(['subStrand', 'strand', 'keyInquiryQuestion']);
    expect(diff.cells.every((c) => c.row === 3)).toBe(true);
    expect(diff.cells[0].before).toBe('2.7 Neural network training');
    expect(diff.cells[0].after).toContain('3.3');
    expect({ rowsChanged: diff.rowsChanged, rowsTotal: diff.rowsTotal }).toEqual({
      rowsChanged: 1,
      rowsTotal: 4,
    });
  });

  it('prints every record with its citation, including the pack line the override wrote', () => {
    const { result } = certify();
    const record = result.stdout.slice(result.stdout.indexOf('── record'));
    expect(record).toContain('4 entries');
    expect(record).toContain(ACTOR);
    expect(record).toContain(`${AT} · row pack · assessmentMethods · override-granted`);
    const waivedLine = repoPolicy.text
      .split('\n')
      .findIndex((text) => text.includes('(scheme-field-obligation g8 assessmentMethods) mandatory'));
    expect(waivedLine).toBeGreaterThanOrEqual(0);
    expect(record).toContain(`${POLICY_LABEL}:${waivedLine + 1}`);
  });

  it('repeats itself exactly: the same flags and the same instant give byte-identical artifacts', () => {
    // One directory, two runs: the record must not depend on anything the machine made up. A chain that only
    // reproduces when nothing about the run is random is not a chain a reviewer can recompute.
    const dir = outDir();
    const a = certify(dir);
    const b = certify(dir);
    for (const name of ['ledger.json', 'policy.metta', 'diff.json']) {
      expect(read(b.dir, name)).toBe(read(a.dir, name));
    }
    expect(b.result.stdout).toBe(a.result.stdout);
  });

  it('prints the same transcript a fresh in-process run prints for the same rows and waived policy', () => {
    const { result } = certify();
    const waiver = applyOverride({
      policy: repoPolicy,
      grade: draft.grade,
      target: { kind: 'field-obligation', field: 'assessmentMethods', to: 'waived' },
    });
    const accepted = acceptProposal({
      rows: draft.rows,
      finding: reconcileScheme({ grade: draft.grade, rows: draft.rows, design, policy: repoPolicy }).findings.find(
        (f) => f.row === 3,
      ) !,
      actor: ACTOR,
      timestamp: AT,
    });
    const expected = reconcileScheme({
      grade: draft.grade,
      rows: accepted.rows,
      design,
      policy: { file: POLICY_LABEL, text: waiver.text },
    }).transcript;
    // Added around the transcript, never rewritten into it: the record section starts where this ends.
    expect(result.stdout).toContain(`${expected}\n\n── record`);
  });
});

describe('the loop closes: a later run reads what the earlier run wrote', () => {
  it('reproduces the waiver as an advisory with no waiver flag in the command line', () => {
    const { dir } = certify();
    const rerun = run('--policy', join(dir, 'policy.metta'));
    expect(rerun.status).toBe(0);
    // Her invented sub-strand is still there in this run, so one blocking gap survives. The point is the
    // waived column: raised again, uncalled-for, and cited at the line the earlier run wrote.
    expect(rerun.stdout).toContain('1 blocking · 1 advisory');
    expect(rerun.stdout).toContain('field-obligation-waived-by-teacher');
    // The line the run answered from, re-derived from the written file rather than trusted from the earlier
    // run's memory: the advisory is cited at the severity row of *this* pack.
    const severity = read(dir, 'policy.metta')
      .split('\n')
      .findIndex((text) => text.includes('(scheme-gap-severity g8 field-obligation-waived-by-teacher)'));
    expect(severity).toBeGreaterThanOrEqual(0);
    expect(rerun.stdout).toContain(`policy.metta:${severity + 1}`);
    expect(rerun.stdout).toContain('your waiver rather than the checker');
  });

  it('certifies from the written policy alone once she accepts the substitution', () => {
    const { dir } = certify();
    const rerun = run('--policy', join(dir, 'policy.metta'), '--accept', '3', '--actor', ACTOR, '--at', AT, '--out', outDir());
    expect(rerun.status).toBe(0);
    expect(rerun.stdout).toMatch(/∴ certified/);
    expect(rerun.stdout).toContain('handoff · allowed');
  });

  it('refuses to pretend a second waiver changed anything', () => {
    const { policy, dir } = certify();
    const again = run(
      '--policy', policy, '--waive', 'assessmentMethods',
      '--actor', ACTOR, '--note', NOTE, '--out', dir,
    );
    expect(again.status).not.toBe(0);
    expect(`${again.stderr}${again.stdout}`).toMatch(/already says waived/);
  });

  it('refuses a waiver with no reason attached, because that is the unaccountable act itself', () => {
    const noNote = run('--waive', 'assessmentMethods', '--actor', ACTOR, '--out', outDir());
    expect(noNote.status).not.toBe(0);
    expect(`${noNote.stderr}${noNote.stdout}`).toMatch(/--note/);
  });

  it('refuses to record a change with no name attached to it', () => {
    const noActor = run('--waive', 'assessmentMethods', '--note', NOTE, '--out', outDir());
    expect(noActor.status).not.toBe(0);
    expect(`${noActor.stderr}${noActor.stdout}`).toMatch(/--actor/);
  });

  it('refuses a change with nowhere to write its record', () => {
    const nowhere = run('--accept', '3', '--actor', ACTOR, '--at', AT);
    expect(nowhere.status).not.toBe(0);
    expect(`${nowhere.stderr}${nowhere.stdout}`).toMatch(/--out/);
  });

  it('refuses to accept a finding that carries a refusal rather than a proposal', () => {
    // Row 2's empty assessment column is the one thing the design pack states no value for.
    const attempt = run('--accept', '2', '--actor', ACTOR, '--at', AT, '--out', outDir());
    expect(attempt.status).not.toBe(0);
    expect(`${attempt.stderr}${attempt.stdout}`).toMatch(/refusal/);
  });
});

describe('the gate is the exit code of the run, not a line in a report', () => {
  it('exits 0 on a refused handoff by default, because a check that ran has answered its question', () => {
    const plain = run('--out', outDir());
    expect(plain.status).toBe(0);
    expect(plain.stdout).toContain('handoff · refused · gate certification');
  });

  it('exits 2 when the caller asked to be stopped rather than told', () => {
    const stopped = run('--require-handoff', '--out', outDir());
    expect(stopped.status).toBe(2);
    expect(stopped.stdout).toContain('handoff · refused · gate certification');
  });

  it('exits 0 under --require-handoff once the scheme certifies and the record holds', () => {
    const strict = run(
      '--accept', '3', '--waive', 'assessmentMethods', '--actor', ACTOR, '--note', NOTE,
      '--at', AT, '--require-handoff', '--out', outDir(),
    );
    expect(strict.stderr).not.toMatch(/Error|cannot|Traceback/);
    expect(strict.status).toBe(0);
    expect(strict.stdout).toContain('handoff · allowed');
  });

  it('refuses to write artifacts somewhere it cannot', () => {
    const bad = run('--accept', '3', '--actor', ACTOR, '--at', AT, '--out', '/nope/nowhere/here');
    expect(bad.status).not.toBe(0);
    expect(`${bad.stderr}${bad.stdout}`).toMatch(/cannot write|--out/);
  });
});
