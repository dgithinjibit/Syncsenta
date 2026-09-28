#!/usr/bin/env node
/**
 * Measure the schema gap three ways: what production has (the live baseline),
 * what the repo's migration folders claim, and what shipped code queries.
 *
 * `/^create table/gim` — statement-position only. An unanchored regex also
 * matches the `'CREATE TABLE AS'` string literal inside the
 * `rls_auto_enable()` event trigger in the baseline, which invents a 27th
 * production table called `as`.
 *
 * Run from studio/ or the repo root: node supabase/live_schema_export/gap_report.js
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const BASELINE = path.join(REPO, 'supabase/migrations_live/20260928000000_live_baseline.sql');
const SQL_DIRS = [
  path.join(REPO, 'supabase/migrations'),
  path.join(REPO, 'backend/syncsenta-backend/migrations'),
];
const CODE_DIRS = [path.join(REPO, 'studio/src'), path.join(REPO, 'ai-agents')];

const CREATE_TABLE = /^CREATE TABLE (?:IF NOT EXISTS )?(?:[a-zA-Z0-9_]+\.)?"?([a-zA-Z0-9_]+)"?/gim;
const isTestFile = (name) => /\.(test|spec)\.(ts|tsx|py)$/i.test(name);

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function walk(dir, match, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
    const full = path.join(dir, entry);
    const st = fs.lstatSync(full);
    if (st.isSymbolicLink() && !fs.existsSync(full)) continue;
    if (st.isDirectory()) walk(full, match, out);
    else if (match(entry)) out.push(full);
  }
  return out;
}

function createTablesIn(text) {
  const names = new Set();
  for (const m of text.matchAll(CREATE_TABLE)) names.add(m[1].toLowerCase());
  return names;
}

const live = createTablesIn(read(BASELINE));

const repo = new Set();
for (const dir of SQL_DIRS) {
  for (const file of walk(dir, (n) => /\.sql$/i.test(n))) {
    for (const t of createTablesIn(read(file))) repo.add(t);
  }
}

const queried = new Map();
const QUERY = /\.from_?\(\s*['"`]([a-z_][a-z0-9_]*)['"`]/g;
for (const dir of CODE_DIRS) {
  for (const file of walk(dir, (n) => /\.(ts|tsx|py)$/.test(n) && !isTestFile(n))) {
    for (const m of read(file).matchAll(QUERY)) {
      const t = m[1].toLowerCase();
      if (!queried.has(t)) queried.set(t, new Set());
      queried.get(t).add(path.relative(REPO, file));
    }
  }
}

const gaps = [...queried.keys()].filter((t) => !live.has(t)).sort();
const nowhere = gaps.filter((t) => !repo.has(t));
const inRepoOnly = gaps.filter((t) => repo.has(t));
const neverApplied = [...repo].filter((t) => !live.has(t)).sort();
const liveOnly = [...live].filter((t) => !repo.has(t)).sort();

console.log(`live ${live.size} | repo ${repo.size} | queried ${queried.size}`);
console.log(`\ngaps (${gaps.length}) = code queries a table production does not have`);
console.log(`\n  A. exists in no SQL file anywhere (${nowhere.length}):`);
console.log(nowhere.map((t) => `    ${t}\n${[...queried.get(t)].map((f) => `        ${f}`).join('\n')}`).join('\n'));
console.log(`\n  B. defined in repo DDL, never applied to production (${inRepoOnly.length}):`);
console.log(inRepoOnly.map((t) => `    ${t}\n${[...queried.get(t)].map((f) => `        ${f}`).join('\n')}`).join('\n'));
console.log(`\nrepo defines but production never had: ${neverApplied.length}`);
console.log(`production has, repo never described (${liveOnly.length}): ${liveOnly.join(', ')}`);
