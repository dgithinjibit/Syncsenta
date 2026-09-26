import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Legacy Firebase-era auth surface lock.
 *
 * Two auth systems used to coexist in this app:
 *
 *   A. Current — Supabase password/demo login → `profiles.role` →
 *      `getRoleHome()` → /student, /teacher, /parent, /head.
 *   B. Legacy  — /login bounced to an anonymous /signup role picker, which
 *      POSTed /api/set-auth-cookie to mint `userRole`/`userName` cookies, then
 *      navigated to /dashboard. /dashboard read its identity through
 *      `getServerUser()`, which requires a `userEmail` cookie written only by
 *      the orphaned Firebase `signupUser()` server action.
 *
 * Because nothing in system A ever wrote `userEmail`, `getServerUser()` always
 * returned null on /dashboard, the role switch fell through to its `default:`
 * branch, and that branch rendered `<DashboardSkeleton />` while `loading` was
 * already false — a permanently blank page. Verified live on
 * sentastudio.vercel.app on 2026-09-26: 12 characters of body text, no <main>,
 * skeletons still animating.
 *
 * These assertions fail if any part of system B grows back.
 */

const APP = join(process.cwd(), 'src', 'app');

/**
 * Strip comments so these assertions describe executable code, not prose.
 *
 * Without this, a docstring explaining the old `DashboardSkeleton` bug would
 * itself fail the test that forbids the bug.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')
    .replace(/\/\/[^\n'"]*$/g, ' ');
}

function readSource(...segments: string[]): string {
  const file = join(APP, ...segments);
  expect(existsSync(file), `${relative(process.cwd(), file)} should exist`).toBe(true);
  return stripComments(readFileSync(file, 'utf8'));
}

/** Every .ts/.tsx file under src/, for repo-wide "this pattern is gone" checks. */
function allSourceFiles(dir = join(process.cwd(), 'src')): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === 'node_modules' || entry === '.next') continue;
    if (statSync(full).isDirectory()) {
      found.push(...allSourceFiles(full));
    } else if (/\.tsx?$/.test(entry) && !entry.includes('.test.')) {
      found.push(full);
    }
  }
  return found;
}

describe('/login reaches the real sign-in form', () => {
  const source = readSource('login', 'page.tsx');

  it('sends visitors to /auth/signin, where Supabase sign-in lives', () => {
    expect(source).toContain('/auth/signin');
  });

  it('no longer redirects to the anonymous role picker', () => {
    expect(source).not.toContain(`'/signup'`);
    expect(source).not.toContain(`"/signup"`);
  });
});

describe('/dashboard cannot render a blank shell', () => {
  const source = readSource('(main)', 'dashboard', 'page.tsx');

  it('resolves identity from the Supabase session, not legacy cookies', () => {
    expect(source).toContain('createSupabaseRouteHandlerClient');
    expect(source).not.toContain('getServerUser');
  });

  it('redirects to the visitor role home', () => {
    expect(source).toContain('getRoleHome');
    expect(source).toMatch(/redirect\(/);
  });

  it('has no unresolved-skeleton fallback path', () => {
    // The bug was a default branch that rendered a skeleton forever. A blank
    // surface must be replaced by a redirect, not by a placeholder.
    expect(source).not.toContain('DashboardSkeleton');
  });
});

describe('no handler navigates to the bare legacy /dashboard', () => {
  const pattern = /\brouter\.(push|replace)\(\s*['"`]\/dashboard['"`]\s*\)/g;

  it('finds zero programmatic navigations to /dashboard', () => {
    const offenders = allSourceFiles()
      .filter((file) => pattern.test(stripComments(readFileSync(file, 'utf8'))))
      .map((file) => relative(process.cwd(), file));
    expect(offenders).toEqual([]);
  });
});

describe('/api/set-auth-cookie cannot mint a role anonymously', () => {
  it('either no longer exists, or requires a session and ignores the claimed role', () => {
    const file = join(APP, 'api', 'set-auth-cookie', 'route.ts');
    if (!existsSync(file)) return; // deleted — exactly what the audit may conclude

    const source = readFileSync(file, 'utf8');
    expect(source, 'must verify the Supabase session').toContain('auth.getUser');
    expect(
      source,
      'must not trust a role supplied by the browser',
    ).not.toMatch(/cookieStore\.set\(\s*'userRole'\s*,\s*role/);
  });
});

describe('branding', () => {
  it('has no leftover "3D" footer copyright in source', () => {
    const offenders = allSourceFiles()
      .filter((file) => /©\s*20\d\d\s+3D\b/.test(stripComments(readFileSync(file, 'utf8'))))
      .map((file) => relative(process.cwd(), file));
    expect(offenders).toEqual([]);
  });
});
