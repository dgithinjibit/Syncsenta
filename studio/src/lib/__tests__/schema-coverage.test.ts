import { describe, expect, it } from 'vitest';
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Schema coverage tripwire.
 *
 * Measured against the live database, not against the repo's own claims. On 2026-09-28 the
 * production project was exported (see `supabase/live_schema_export/` and the baseline it
 * builds) and the result overturned what this file used to assert:
 *
 *   - production had 26 public tables, all with row level security enabled;
 *   - `supabase/migrations/` plus `backend/syncsenta-backend/migrations/` define 93, so most
 *     tables in the repo have never been applied anywhere real;
 *   - `_sqlx_migrations` does not exist in production at all — the Rust backend's sqlx history
 *     was never run against this project;
 *   - and a list of tables which shipped code queries exist neither in the repo nor in
 *     production. Every one of those call sites is a runtime PostgREST "Could not find the
 *     table" error waiting for a user to hit it.
 *
 * RE-BASELINED 2026-09-29, which is why the numbers here are not the ones in the commit that
 * first wrote this file. Production had moved and this gate was still reading the 2026-09-28
 * snapshot, so it reported gaps that had already been closed under it (`chat_sessions`,
 * `learning_progress`, `chat_messages`, `daily_activity`, `achievements`, `api_usage`,
 * `omega_scaffolding_events`, `point_transactions`) while its own live count said 27 for a
 * 26-table database.
 *
 * "Live" is now the capture **plus** every migration in `supabase/migrations_live/` that has
 * actually been applied, listed explicitly in `APPLIED_LIVE_MIGRATIONS`. Explicit rather than
 * a directory glob on purpose: a draft nobody has run must not be able to widen the definition
 * of production by being saved into that folder. The reason to trust the list is independent of
 * it — `information_schema` was read on 2026-09-29 and returned **35 public tables**, and the
 * union below reaches 35 from a different source. The `live.size` assertion is where those two
 * measurements meet.
 *
 * The gap list may only shrink: when a migration is applied, delete the name; when code stops
 * reaching for a table, delete the name. Adding one is the failure this file exists to catch.
 */

const ROOT = process.cwd();                    // studio/
const REPO = join(ROOT, '..');
const LIVE_DIR = join(REPO, 'supabase/migrations_live');
const BASELINE = join(LIVE_DIR, '20260928000000_live_baseline.sql');

/**
 * Migrations applied to `tumikgwhrbvirpjswlzh` after the capture, in apply order. Each one is
 * dated and evidenced in `docs/ROADMAP.md` §3 and §5, and the gamification file carries its
 * own V1–V7 read-back.
 */
const APPLIED_LIVE_MIGRATIONS = [
  // 2026-09-28 — chat_sessions, chat_messages, learning_progress, daily_activity,
  // daily_quotas, achievements, api_usage, omega_scaffolding_events.
  '20260928000100_omega_memory_layer.sql',
  // 2026-09-29 — point_transactions, plus profiles.total_points / school_id / classroom_id.
  '20260929000000_gamification_and_school_scope.sql',
];

const SQL_DIRS = [
  join(REPO, 'supabase/migrations'),
  join(REPO, 'backend/syncsenta-backend/migrations'),
];
const CODE_DIRS = [join(ROOT, 'src'), join(REPO, 'ai-agents')];

/**
 * Queried by shipped code, absent from production. Re-measured 2026-09-29 against the 35-table
 * live set: shipped code reaches 49 tables, 19 of them exist, these 30 do not. Eight names
 * came off the previous list by being applied, which is the only sanctioned way off it.
 */
const CODE_QUERIES_A_TABLE_THAT_DOES_NOT_EXIST = [
  'activity_submissions',
  'agent_keys',
  'agent_traces',
  'ai_personalization_queue',
  'ai_recommendations',
  'batch_submissions',
  'camera_frames',
  'lms_cohorts',
  'lms_enrollments',
  'lms_organisation_members',
  'lms_organisations',
  'lms_programmes',
  'omega_decisions',
  'payment_transactions',
  'referrals',
  'sandbox_artifacts',
  'student_alerts',
  'teacher_assessments',
  'teacher_feedback',
  'teacher_grade_assignments',
  'teacher_interventions',
  'teacher_notifications',
  'teacher_student_feedback',
  'teacher_students',
  'teacher_subject_assignments',
  'user_profiles',
  'vision_submissions',
  'voice_conversations',
  'voice_messages',
  'wellbeing_checkins',
];

/**
 * Upper bound on tables the repo defines that production has never had. May only go down — by
 * applying them or by deleting the fiction. 93 are defined across the two repo histories and
 * 72 of those are not live; it was 73 until the gamification migration made one of them real.
 */
const REPO_TABLES_NOT_IN_PRODUCTION = 72;

/** Read from `information_schema` on 2026-09-29; see docs/ROADMAP.md §1. */
const LIVE_PUBLIC_TABLE_COUNT = 35;

const DANGLING_SQL_SYMLINKS: string[] = [];

function walk(dir: string, match: (name: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
    const link = lstatSync(full);
    if (link.isSymbolicLink() && !existsSync(full)) {
      // A committed symlink whose target is another engineer's home directory.
      // Reading it throws ENOENT, so record it and keep walking.
      if (match(entry)) DANGLING_SQL_SYMLINKS.push(full.replace(`${REPO}/`, ''));
      continue;
    }
    if (statSync(full).isDirectory()) found.push(...walk(full, match));
    else if (match(entry)) found.push(full);
  }
  return found;
}

/**
 * `.from('…')` inside a test is a fixture name, not a call site. Half of the apparent "gaps" in
 * the first version of this file came from tests asserting that *other* tests had deleted a
 * legacy table (`legacy-auth-surface.test.ts` reaches for `user_profiles` and
 * `payment_transactions` as strings), which made the allowlist a lie about the production
 * surface.
 */
const isTestFile = (name: string) => /\.(test|spec)\.(ts|tsx|py)$/i.test(name);

function read(file: string): string {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

/**
 * `CREATE TABLE` also occurs *inside* SQL string literals. `20260928000000_live_baseline.sql:670`
 * carries `WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')` from a
 * captured event trigger, and the naive match read `AS` as a table name — which is how this
 * file spent weeks claiming a 26-table database had 27. Keywords are excluded rather than
 * tightening the pattern to require a `(`, because `CREATE TABLE … AS SELECT` is legitimate DDL
 * that a parenthesis requirement would silently drop.
 */
const NOT_A_TABLE_NAME = new Set([
  'as', 'if', 'not', 'exists', 'public', 'temp', 'temporary', 'unlogged', 'select', 'into', 'table',
]);

function createTablesIn(text: string): Set<string> {
  const names = new Set<string>();
  for (const m of text.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?"?([a-zA-Z0-9_]+)"?/gi)) {
    const name = m[1].toLowerCase();
    if (NOT_A_TABLE_NAME.has(name)) continue;
    names.add(name);
  }
  return names;
}

/**
 * What production actually holds: the 2026-09-28 capture, plus the tables named by every
 * migration applied since. See `APPLIED_LIVE_MIGRATIONS` for why that list is explicit.
 */
function tablesInProduction(): Set<string> {
  const text = read(BASELINE);
  if (!text) throw new Error(`${BASELINE} is missing — regenerate it with supabase/live_schema_export/build_baseline.js`);
  const live = createTablesIn(text);
  for (const file of APPLIED_LIVE_MIGRATIONS) {
    const applied = read(join(LIVE_DIR, file));
    if (!applied) throw new Error(`${file} is listed as applied but cannot be read — the live set would be understated`);
    for (const table of createTablesIn(applied)) live.add(table);
  }
  return live;
}

/** What the two migration directories claim should exist. */
function tablesDefinedInRepo(): Set<string> {
  const names = new Set<string>();
  for (const dir of SQL_DIRS) {
    for (const file of walk(dir, (n) => /\.sql$/i.test(n))) {
      for (const t of createTablesIn(read(file))) names.add(t);
    }
  }
  return names;
}

function tablesQueriedByCode(): Map<string, string[]> {
  const hits = new Map<string, Set<string>>();
  const pattern = /\.from_?\(\s*['"`]([a-z_][a-z0-9_]*)['"`]/g;
  for (const dir of CODE_DIRS) {
    for (const file of walk(dir, (n) => /\.(ts|tsx|py)$/.test(n) && !isTestFile(n))) {
      for (const m of read(file).matchAll(pattern)) {
        const table = m[1].toLowerCase();
        if (!hits.has(table)) hits.set(table, new Set());
        hits.get(table)!.add(file.replace(`${REPO}/`, ''));
      }
    }
  }
  return new Map([...hits].map(([t, f]) => [t, [...f].sort()]));
}

describe('code, repo and production agree about which tables exist', () => {
  const live = tablesInProduction();
  const repo = tablesDefinedInRepo();
  const queried = tablesQueriedByCode();

  it('finds the baseline, the migration folders and the call sites, so it is not vacuous', () => {
    expect(live.size).toBe(LIVE_PUBLIC_TABLE_COUNT);
    expect(repo.size).toBeGreaterThan(80);
    expect(queried.size).toBeGreaterThan(20);
  });

  it('shipped code only reaches for tables production actually has, or for the documented gap', () => {
    const gaps = [...queried.keys()].filter((t) => !live.has(t)).sort();
    expect(gaps).toEqual([...CODE_QUERIES_A_TABLE_THAT_DOES_NOT_EXIST].sort());
  });

  it('prints which code reaches each gap, for whoever closes it', () => {
    const gaps = [...queried.keys()]
      .filter((t) => !live.has(t))
      .sort()
      .map((t) => `${t} <- ${queried.get(t)!.join(', ')}`);
    expect(gaps).toHaveLength(CODE_QUERIES_A_TABLE_THAT_DOES_NOT_EXIST.length);
  });

  it('the repo does not define far more than production has, without saying so', () => {
    const neverApplied = [...repo].filter((t) => !live.has(t));
    expect(neverApplied.length).toBeLessThanOrEqual(REPO_TABLES_NOT_IN_PRODUCTION);
  });

  it('the six tables production has that the repo never described are in the baseline', () => {
    // These were only reachable by reading the live project: the repo file that claimed to
    // hold them, ai-agents/.../supabase_production_schema.sql, is a dangling symlink into
    // /home/web4ke.
    for (const t of [
      'ai_decisions',
      'cultural_patterns',
      'learned_rules',
      'rule_ab_tests',
      'rule_votes',
      'teacher_rule_proposals',
    ]) {
      expect(live.has(t)).toBe(true);
    }
  });

  it('the tables this file used to call a gap are live now, and came off the allowlist', () => {
    // The re-baseline has to be able to tell a closed gap from a typo in the list. Both move a
    // name out of the allowlist; only one of them is true.
    for (const t of [
      'point_transactions',
      'chat_sessions',
      'learning_progress',
      'chat_messages',
      'daily_activity',
      'achievements',
      'api_usage',
      'omega_scaffolding_events',
    ]) {
      expect(live.has(t)).toBe(true);
      expect(CODE_QUERIES_A_TABLE_THAT_DOES_NOT_EXIST).not.toContain(t);
    }
  });

  it('the dangling symlinks are called out, not silently skipped', () => {
    // Six .sql files are committed as absolute symlinks into /home/web4ke/… and resolve on no
    // machine anyone here has — including one named `supabase_production_schema.sql`, which is
    // the production schema that nobody can read. `supabase/live_schema_export/` is how they get
    // replaced with real SQL; this pins the list so a seventh cannot creep in, and so the
    // moment they are fixed the test fails until the list is deleted.
    const found = new Set<string>();
    for (const dir of ['supabase', 'backend', 'ai-agents', 'studio/src']) {
      walk(join(REPO, dir), (n) => /\.sql$/i.test(n));
      for (const file of DANGLING_SQL_SYMLINKS) found.add(file);
    }
    DANGLING_SQL_SYMLINKS.length = 0;
    expect([...found].sort()).toEqual([
      'ai-agents/src/syncsenta_agents/db/supabase_production_schema.sql',
      'supabase/migrations/001_core_schema.sql',
      'supabase/migrations/002_teacher_dashboard.sql',
      'supabase/migrations/003_teacher_grade_assignments.sql',
      'supabase/migrations/004_agent_traces.sql',
      'supabase/migrations/005_camera_frames.sql',
    ]);
  });
});
