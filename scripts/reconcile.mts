/**
 * Print the Omega scheme check from a terminal — and, when asked, change things and record it.
 *
 * Run from anywhere: `node scripts/reconcile.mts` — it reads the sample draft, or `--draft <path>` for another
 * one. With no flags the output is the transcript and nothing else: the header, one block per finding with the
 * sentence the policy pack states and the line it comes from, the footer counts, and the verdict.
 *
 * Why this exists when there is already a page for it: `studio/src/components/omega/scheme-check.tsx` and this
 * file call the same `reconcileScheme` in `studio/src/lib/scheme/reconcile.ts`. A judge can watch the decision in
 * a browser and then clone the repo and watch the identical bytes in a terminal, and
 * `studio/src/lib/__tests__/scheme-reconcile-cli.test.ts` compares the two strings, so "same engine" is a checked
 * claim rather than a slide. A second implementation would show up as a diff on stdout.
 *
 * The mutating path is the same argument one level up. `--accept <row>` and `--waive <field>` put this script in
 * charge of the four modules 5c built — consent, the ledger, override, the handoff gate — and make it *the only*
 * caller that has to hold them in the right order:
 *
 *   node scripts/reconcile.mts --accept 3 --waive assessmentMethods \
 *     --actor teacher:kibera_mama_joy --note 'Lesson 2 is oral.' --at 2026-10-02T09:04:15+03:00 --out /tmp/run1
 *
 * writes `/tmp/run1/policy.metta` (the pack with her waiver on one line of it), `/tmp/run1/ledger.json` (every
 * record, hash-chained, verifiable from the file alone) and `/tmp/run1/diff.json` (the cells consent actually
 * wrote), prints the record and the gate's decision, and then the loop closes:
 *
 *   node scripts/reconcile.mts --policy /tmp/run1/policy.metta
 *
 * reproduces the waiver as an advisory in a run that never mentions waiving anything. That is the difference
 * between a policy and a mood, and it is why the waiver is written to disk rather than kept in the process.
 *
 * Three refusals, because a CLI is where discipline goes to die:
 *
 * - **A change with no `--out` is refused.** Consent without somewhere to write the record is exactly the
 *   unaccountable write 5c-2 was built to prevent, so it dies before any work happens rather than half-running.
 * - **A waiver with no `--note` is refused**, and any change with no `--actor` is refused. An anonymous change
 *   and an unexplained one are the same hole in the audit.
 * - **`--at` makes a run reproducible.** Without it the timestamp is now — the caller owns the clock, the
 *   reconciler never sees one — but with it the same flags produce byte-identical artifacts, so a hash chain
 *   printed in a video is something a viewer can rebuild.
 *
 * Exit codes: 0 when a check ran, whatever it concluded — 1 when it could not read or write something it was
 * pointed at, or when a refusal was raised — 2 **only** under `--require-handoff`, when the handoff gate says no.
 * Not certified is an answer, not a crash; a caller that must be stopped asks for the gate in its exit code.
 *
 * The `@/` imports inside `studio/src` are answered by `scripts/omega-alias.mjs`, imported below for its side
 * effect. Everything under `@/` therefore has to arrive through a dynamic import, because a static one would be
 * resolved before the hook is registered.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import './omega-alias.mjs';

const REPO_ROOT = join(import.meta.dirname, '..');

/** Labels are repo-relative, so a citation printed here is a path that exists in the repository. */
const DESIGN = {
  path: join(REPO_ROOT, 'studio', 'public', 'omega', 'ai_g8_design.metta'),
  file: 'studio/public/omega/ai_g8_design.metta',
};
const POLICY = {
  path: join(REPO_ROOT, 'studio', 'public', 'omega', 'scheme_check.metta'),
  file: 'studio/public/omega/scheme_check.metta',
};
const DEFAULT_DRAFT = join(REPO_ROOT, 'studio', 'public', 'omega', 'drafts', 'kibera_g8_week14.json');

function flag(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 || index === process.argv.length - 1 ? fallback : process.argv[index + 1];
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function read(path, label) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    process.stderr.write(`reconcile: cannot read the ${label} at ${path}\n`);
    process.exit(1);
  }
}

/** A path inside the repository is cited repo-relative; one outside it is cited as it was given. */
function labelFor(path) {
  const rel = relative(REPO_ROOT, path);
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel) ? rel.split(sep).join('/') : path;
}

function die(message) {
  process.stderr.write(`reconcile: ${message}\n`);
  process.exit(1);
}

const draftPath = resolve(process.cwd(), flag('--draft', DEFAULT_DRAFT));
const policyPath = resolve(process.cwd(), flag('--policy', POLICY.path));
const draft = JSON.parse(read(draftPath, 'draft'));

const acceptArg = flag('--accept', undefined);
const waiveArg = flag('--waive', undefined);
const actorArg = flag('--actor', undefined);
const noteArg = flag('--note', undefined);
const outArg = flag('--out', undefined);
const timestamp = flag('--at', new Date().toISOString());
const mutating = acceptArg !== undefined || waiveArg !== undefined;

// Refused before anything is read or written: a change with nowhere to record itself is not a small offence.
if (mutating && outArg === undefined) {
  die(
    'a change needs --out <dir> to write its record in. Consent without a ledger is the unaccountable ' +
      'decision this agent refuses to make.',
  );
}
if (mutating && actorArg === undefined) {
  die('a change needs --actor <id>. A record with no name on it is not an audit trail.');
}
if (waiveArg !== undefined && noteArg === undefined) {
  die(
    `--waive ${waiveArg} needs --note <why>. The rule is yours to argue with; the reason is the part that ` +
      'has to survive in the record, not in your head.',
  );
}

const outPath = outArg === undefined ? undefined : resolve(process.cwd(), outArg);
if (outPath !== undefined) {
  try {
    mkdirSync(outPath, { recursive: true });
  } catch (error) {
    die(`cannot write --out ${outPath}: ${error.message}`);
  }
}

const { reconcileScheme } = await import('../studio/src/lib/scheme/reconcile.ts');
const { acceptProposal } = await import('../studio/src/lib/scheme/consent.ts');
const { applyOverride, overrideEntry } = await import('../studio/src/lib/scheme/override.ts');
const { emptyLedger, appendToLedger, verifyLedger } = await import('../studio/src/lib/scheme/ledger.ts');
const { authorizeHandoff } = await import('../studio/src/lib/scheme/handoff.ts');

const design = { file: DESIGN.file, text: read(DESIGN.path, 'design pack') };
const policyLabel = policyPath === POLICY.path ? POLICY.file : labelFor(policyPath);
const policy = { file: policyLabel, text: read(policyPath, 'policy pack') };

let rows = draft.rows;
let policyText = policy.text;
const entries = [];

if (mutating) {
  // The finding she is accepting comes from the run *before* the change: consent acts on what the checker said.
  const before = reconcileScheme({ grade: draft.grade, rows, design, policy });

  if (acceptArg !== undefined) {
    const row = Number(acceptArg);
    if (!Number.isInteger(row) || row < 1) die(`--accept wants a row number, got "${acceptArg}"`);
    const atRow = before.findings.filter((finding) => finding.row === row);
    if (atRow.length === 0) die(`row ${row} has no finding — there is nothing there to accept`);
    // A row whose only finding is a refusal still goes through `acceptProposal`, because that module is the one
    // that says why the agent will not write the cell — in its own words, not this script's.
    const target = atRow.find((finding) => finding.proposal !== undefined) ?? atRow[0];
    try {
      const outcome = acceptProposal({ rows, finding: target, actor: actorArg, timestamp });
      rows = outcome.rows;
      entries.push(...outcome.entries);
    } catch (error) {
      die(error.message);
    }
  }

  if (waiveArg !== undefined) {
    try {
      const waiver = applyOverride({
        policy,
        grade: draft.grade,
        target: { kind: 'field-obligation', field: waiveArg, to: 'waived' },
      });
      policyText = waiver.text;
      entries.push(overrideEntry({ outcome: waiver, actor: actorArg, timestamp, note: noteArg }));
    } catch (error) {
      die(error.message);
    }
  }
}

const result = reconcileScheme({
  grade: draft.grade,
  rows,
  design,
  policy: { file: policyLabel, text: policyText },
});

let output = `${result.transcript}\n`;

if (outPath !== undefined) {
  const ledger = await ledgerFor(entries);
  const verdict = await verifyLedger(ledger);
  const decision = await authorizeHandoff({ certification: result.certification, ledger });
  writeFileSync(join(outPath, 'policy.metta'), policyText);
  writeFileSync(join(outPath, 'ledger.json'), `${JSON.stringify(ledger, null, 2)}\n`);
  writeFileSync(join(outPath, 'diff.json'), `${JSON.stringify(diffFor(entries, rows.length), null, 2)}\n`);

  // The transcript keeps its own bytes and the record is added *after* it: 5d's claim that the terminal and the
  // page print one engine has to survive the path that changes things, not just the read-only one.
  output = `${result.transcript}\n${recordSection(entries, decision, verdict, outPath)}\n`;
  process.stdout.write(output);
  if (hasFlag('--require-handoff') && !decision.allowed) process.exit(2);
} else {
  process.stdout.write(output);
}

/** The records this run wrote, chained in the order they happened. */
async function ledgerFor(drafts) {
  let ledger = emptyLedger({
    grade: draft.grade,
    draftFile: labelFor(draftPath),
    designFile: design.file,
    policyFile: policyLabel,
  });
  for (const draftEntry of drafts) ledger = await appendToLedger(ledger, draftEntry);
  return ledger;
}

/** The cells consent wrote, with what each said before — the part a reviewer reads first. */
function diffFor(drafts, rowsTotal) {
  const cells = drafts
    .filter((entry) => typeof entry.row === 'number')
    .map((entry) => ({ row: entry.row, field: entry.field, before: entry.before, after: entry.after }));
  const rowsChanged = new Set(cells.map((cell) => cell.row)).size;
  return { draft: labelFor(draftPath), cells, rowsChanged, rowsTotal };
}

function recordSection(drafts, decision, verdict, dir) {
  const lines = ['', `── record · ${drafts.length} entries · ${actorArg ?? 'no changes this run'} ──`];
  for (const entry of drafts) {
    lines.push(
      `  ${entry.timestamp} · row ${entry.row} · ${entry.field} · ${entry.basis} · cited ${entry.citations.join(', ')}`,
    );
  }
  lines.push('', `── written to ${labelFor(dir)} ──`);
  lines.push('  policy.metta · the policy this run decided on, waiver included');
  lines.push(
    `  ledger.json  · ${drafts.length} records · chain ${
      verdict.ok ? 'verifies' : `BROKEN: ${verdict.invalid.map((b) => `entry ${b.index} (${b.reason})`).join(', ')}`
    }`,
  );
  lines.push('  diff.json    · the cells consent wrote, before and after');
  lines.push('', '── handoff ──');
  lines.push(
    decision.allowed
      ? `handoff · allowed · ${decision.reason}`
      : `handoff · refused · gate ${decision.gate} · ${decision.reason}`,
  );
  if (decision.citations.length > 0) lines.push(`  cited ${decision.citations.join(', ')}`);
  return lines.join('\n');
}
