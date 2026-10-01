/**
 * Print the Omega scheme check from a terminal.
 *
 * Run from anywhere: `node scripts/reconcile.mts` — it reads the sample draft, or `--draft <path>` for
 * another one. The output is the transcript, and nothing else: the header, one block per finding with the
 * sentence the policy pack states and the line it comes from, the footer counts, and the verdict.
 *
 * Why this exists when there is already a page for it: `studio/src/components/omega/scheme-check.tsx` and
 * this file call the same `reconcileScheme` in `studio/src/lib/scheme/reconcile.ts`. A judge can watch the
 * decision in a browser and then clone the repo and watch the identical bytes in a terminal, and the suite in
 * `studio/src/lib/__tests__/scheme-reconcile-cli.test.ts` compares the two strings, so "same engine" is a
 * checked claim rather than a slide. A second implementation would show up as a diff on stdout.
 *
 * Exit codes: 0 when a check ran, whatever it concluded — 1 when it could not read something it was pointed
 * at. Not certified is an answer, not a crash; the certification gate belongs to the ledger slice, where it
 * stands in front of the lesson-plan handoff.
 *
 * The `@/` imports inside `studio/src` are answered by `scripts/omega-alias.mjs`, imported below for its
 * side effect. Everything under `@/` therefore has to arrive through a dynamic import, because a static one
 * would be resolved before the hook is registered.
 */

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
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

function read(path, label) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    process.stderr.write(`reconcile: cannot read the ${label} at ${path}\n`);
    process.exit(1);
  }
}

const draftPath = resolve(process.cwd(), flag('--draft', DEFAULT_DRAFT));
const draft = JSON.parse(read(draftPath, 'draft'));

const { reconcileScheme } = await import('../studio/src/lib/scheme/reconcile.ts');

const result = reconcileScheme({
  grade: draft.grade,
  rows: draft.rows,
  design: { file: DESIGN.file, text: read(DESIGN.path, 'design pack') },
  policy: { file: POLICY.file, text: read(POLICY.path, 'policy pack') },
});

process.stdout.write(`${result.transcript}\n`);
