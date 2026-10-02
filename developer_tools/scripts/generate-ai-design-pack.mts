/**
 * Write the MeTTa design packs the browser reconciler reads, from the curriculum modules that are the authority.
 *
 * Run from `studio/`: `npm run generate:design-pack`. The committed output lives under `studio/public/omega/`
 * because the reconciler has to fetch it with no network, which means it has to be a static asset inside the
 * deployed `studio/` bundle — see `docs/ROADMAP.md` §10 item 10.
 *
 * Node runs this file directly (type stripping, no build step) and imports `emit.ts` by path, so the parsing and
 * the row format exist in exactly one place: `studio/src/data/curriculum/design-pack/emit.ts`, which the vitest
 * suite exercises as a module. This file only decides which grades get a pack and where the bytes land.
 */

import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { emitDesignPack } from '../../studio/src/data/curriculum/design-pack/emit.ts';

const REPO_ROOT = join(realpathSync(import.meta.dirname), '../..');
const CURRICULUM_FILE = join(REPO_ROOT, 'studio', 'src', 'data', 'curriculum', 'senior-school', 'ai.ts');
const CURRICULUM_LABEL = 'studio/src/data/curriculum/senior-school/ai.ts';

/** Every grade the reconciler is allowed to reason about, keyed by the pack's canonical grade token. */
const TARGETS = [{ gradeKey: 'g8', exportName: 'grade8AI', file: 'ai_g8_design.metta' }] as const;

const sourceText = readFileSync(CURRICULUM_FILE, 'utf8');

for (const target of TARGETS) {
  const text = emitDesignPack({ sourceText, sourceLabel: CURRICULUM_LABEL, ...target });
  const out = join(REPO_ROOT, 'studio', 'public', 'omega', target.file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, text, 'utf8');
  const rows = text.split('\n').filter((line) => line.startsWith('(=')).length;
  console.log(`wrote ${out.replace(`${REPO_ROOT}/`, '')} — ${rows} statements`);
}
