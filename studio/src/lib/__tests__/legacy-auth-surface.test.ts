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

/** Same as readSource(), for paths outside src/app (components, hooks, lib). */
function readRepoSource(...segments: string[]): string {
  const file = join(process.cwd(), ...segments);
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

  it('does not bounce a signed-in visitor back to sign-in', () => {
    // getRoleHome() answers '/login' for a missing profile row or an unmapped
    // role, and '/login' is now an alias for '/auth/signin' — so following it
    // for someone already authenticated would cycle them through the form they
    // just left. Profile completion is the only useful destination there.
    expect(source).toContain('/auth/onboarding');
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

describe('client components do not read the legacy cookie session', () => {
  /**
   * `getServerUser()` is a 'use server' action that reconstructs an identity
   * from the `userEmail`/`userRole`/`userName` cookies. Under Supabase those
   * cookies are never written, so calling it always yields null — which in
   * `app-sidebar.tsx` collapsed the role switch to `default: return []` (a
   * dashboard shell with no navigation at all) and in `/dashboard/reports`
   * pinned every visitor to the teacher view.
   *
   * A client component must take its role from `useAuth()`, i.e. the Supabase
   * session plus the `profiles` row, like the rest of the app.
   */
  it('no "use client" module still calls getServerUser()', () => {
    const offenders = allSourceFiles()
      .filter((file) => {
        const source = stripComments(readFileSync(file, 'utf8'));
        return /^\s*['"]use client['"]/m.test(source) && /\bgetServerUser\b/.test(source);
      })
      .map((file) => relative(process.cwd(), file));
    expect(offenders).toEqual([]);
  });

  it('sidebar nav comes from the Supabase profile', () => {
    const source = readRepoSource('src', 'components', 'layout', 'app-sidebar.tsx');
    expect(source).toContain('useAuth');
    expect(source).toContain('profile');
  });

  it('reports picks its view from the Supabase profile', () => {
    const source = readSource('(main)', 'dashboard', 'reports', 'page.tsx');
    expect(source).toContain('useAuth');
    expect(source).toContain('school_head');
  });
});

describe('trust endpoints authenticate against Supabase, not dead cookies', () => {
  const trustSource = readRepoSource('src', 'lib', 'backend', 'trust-backend.ts');

  it('reads the calling user from the Supabase session', () => {
    expect(trustSource).toContain('createSupabaseRouteHandlerClient');
    expect(trustSource).toContain('auth.getUser');
  });

  it('does not use the service-role client, which reports a null user and bypasses RLS', () => {
    expect(trustSource).not.toContain('getSupabaseServerClient');
    expect(trustSource).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('takes its role from the profiles row instead of the userRole cookie', () => {
    expect(trustSource).toContain("'profiles'");
    expect(trustSource).not.toMatch(/\bcookieStore\.get\(\s*['"]user(Role|Email|Name)['"]/);
    expect(trustSource).not.toContain('getServerUser');
  });

  it('never claims a trust record was stored', () => {
    // The Firestore branch was unreachable (TRUST_BACKEND_ENABLED is set
    // nowhere) and would have written consent data into a retired database.
    expect(trustSource).not.toMatch(/from\s+['"]firebase/);
    expect(trustSource).not.toMatch(/persisted:\s*true/);
    expect(trustSource).toContain("mode: 'demo'");
  });

  it('every consumer awaits the now-asynchronous actor lookup', () => {
    const consumers = allSourceFiles()
      .filter((file) => /\bgetBackendActor\b/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(process.cwd(), file));

    // The four trust endpoints, plus the module that declares the lookup.
    expect(consumers).toContain('src/lib/backend/trust-backend.ts');
    expect(consumers.length).toBeGreaterThanOrEqual(5);

    // The declaration itself reads `getBackendActor(): Promise<...>`, which
    // matches the call pattern without being one, so it is skipped explicitly
    // rather than with a cleverer regex.
    const unawaited = consumers
      .filter((rel) => rel !== 'src/lib/backend/trust-backend.ts')
      .filter((rel) => {
        const source = stripComments(readFileSync(join(process.cwd(), rel), 'utf8'));
        return /getBackendActor\(\)/.test(source) && !/await getBackendActor\(\)/.test(source);
      });
    expect(unawaited).toEqual([]);
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
