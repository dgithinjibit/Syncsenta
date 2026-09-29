import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROLE_HOME, getRoleHome } from '../auth/role-home';
import { safeRedirectTarget } from '../auth/redirect-target';

/**
 * Stage 0 (auth gate) lock.
 *
 * The owner's framing: "handle auth first since its the gateway to all other
 * features — if one can't pass through the gate, how will they know how good a
 * compound is?" Every one of these assertions corresponds to a way a signed-in
 * person used to get handed back the thing they had just done.
 *
 * Two halves, matching how this repo tests:
 *   - pure functions for the two decisions that can be made without a request
 *     (`role-home`, `redirect-target`);
 *   - source contracts for anything that needs Next's request scope, because
 *     vitest runs with `environment: 'node'` and no jsdom, so a page component
 *     cannot be rendered here — only read.
 */

/** Strip comments so assertions describe executable code, not prose about the bug. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')
    .replace(/\/\/[^\n'"]*$/g, ' ');
}

function readSource(...segments: string[]): string {
  const file = join(process.cwd(), 'src', ...segments);
  expect(existsSync(file), `${relative(process.cwd(), file)} should exist`).toBe(true);
  return stripComments(readFileSync(file, 'utf8'));
}

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

// ---------------------------------------------------------------------------
// The one role -> home map
// ---------------------------------------------------------------------------

describe('getRoleHome', () => {
  it('places the four live workspaces', () => {
    expect(getRoleHome('student')).toBe('/student');
    expect(getRoleHome('teacher')).toBe('/teacher');
    expect(getRoleHome('parent')).toBe('/parent');
    expect(getRoleHome('head')).toBe('/head');
  });

  /**
   * `profiles.role` is a text column, not an enum, and the legacy shell spells
   * a school head `admin`, `head`, `school_head`, `school_admin` and
   * `national_admin` in different places. An unmapped spelling is not a
   * theoretical concern — it is the exact shape of the bug that stranded a
   * county officer on `/login`.
   */
  it.each([
    'admin',
    'school_head',
    'school_admin',
    'national_admin',
  ])('routes the %s spelling to the head workspace', (role) => {
    expect(getRoleHome(role)).toBe('/head');
  });

  it('routes county_officer to the closest real surface, not a dead route', () => {
    // There is no /county workspace; /teacher is the nearest live surface and
    // the role keeps its own sidebar nav. Locking this because the old
    // RoleGate map omitted it and sent the officer to /login.
    expect(getRoleHome('county_officer')).toBe('/teacher');
    expect(ROLE_HOME.county_officer).toBe('/teacher');
  });

  it('defaults an unplaced visitor to the sign-in page', () => {
    expect(getRoleHome(undefined)).toBe('/login');
    expect(getRoleHome(null)).toBe('/login');
    expect(getRoleHome('')).toBe('/login');
    expect(getRoleHome('sideways')).toBe('/login');
  });

  /**
   * The fallback is a parameter rather than a constant on purpose: '/login' is
   * right for nobody-signed-in and actively wrong for someone whose session is
   * fine but whose profile row is not, because '/login' now forwards anyone who
   * is already authenticated. Callers in that position pass '/auth/onboarding'.
   */
  it('lets the caller choose the fallback for a role it cannot place', () => {
    expect(getRoleHome('sideways', '/auth/onboarding')).toBe('/auth/onboarding');
    expect(getRoleHome(null, '/auth/onboarding')).toBe('/auth/onboarding');
    // A mapped role still wins over the fallback.
    expect(getRoleHome('student', '/auth/onboarding')).toBe('/student');
  });

  it('never answers with a route that has no page behind it', () => {
    for (const destination of Object.values(ROLE_HOME)) {
      const segments = destination.split('/').filter(Boolean);
      const file = join(process.cwd(), 'src', 'app', ...segments, 'page.tsx');
      expect(existsSync(file), `${destination} is in ROLE_HOME but has no page`).toBe(true);
    }
  });

  it('answers /login for nobody and never a role home for a null role', () => {
    expect(getRoleHome(undefined)).toBe(getRoleHome(null));
    expect(Object.values(ROLE_HOME)).not.toContain('/login');
  });
});

// ---------------------------------------------------------------------------
// The one ?next validator
// ---------------------------------------------------------------------------

describe('safeRedirectTarget', () => {
  it('keeps an in-app path', () => {
    expect(safeRedirectTarget('/student/mathematics')).toBe('/student/mathematics');
    expect(safeRedirectTarget('/dashboard')).toBe('/dashboard');
  });

  it('rejects a protocol-relative URL', () => {
    // router.push('//evil.example') navigates off-site. This is the open
    // redirect that `?next` would otherwise allow on every sign-in.
    expect(safeRedirectTarget('//evil.example')).toBeNull();
    expect(safeRedirectTarget('//evil.example/student')).toBeNull();
  });

  it('rejects the backslash variant browsers treat as //', () => {
    expect(safeRedirectTarget('/\\evil.example')).toBeNull();
  });

  it('rejects an absolute URL and any non-path', () => {
    expect(safeRedirectTarget('https://evil.example')).toBeNull();
    expect(safeRedirectTarget('javascript:alert(1)')).toBeNull();
    expect(safeRedirectTarget('student')).toBeNull();
  });

  it('rejects empty and absent values', () => {
    expect(safeRedirectTarget(null)).toBeNull();
    expect(safeRedirectTarget(undefined)).toBeNull();
    expect(safeRedirectTarget('')).toBeNull();
  });

  it('takes the first value of a repeated query parameter', () => {
    // Next types searchParams values as `string | string[] | undefined`.
    expect(safeRedirectTarget(['/student', '//evil.example'])).toBe('/student');
    expect(safeRedirectTarget([])).toBeNull();
  });

  it('does not let an array hide a protocol-relative first value', () => {
    expect(safeRedirectTarget(['//evil.example', '/student'])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Source contracts: the pages that must stop asking a signed-in visitor to
// sign in, and the gate that must read the shared map.
// ---------------------------------------------------------------------------

describe('/ sends a signed-in visitor to their workspace', () => {
  const source = readSource('app', 'page.tsx');

  it('resolves the session on the server and redirects', () => {
    expect(source).toContain('getSignedInDestination');
    expect(source).toMatch(/redirect\(/);
  });

  it('is dynamic, so the landing page cannot be cached across sessions', () => {
    // A static `/` would serve one visitor's redirect target to everyone.
    expect(source).toContain('force-dynamic');
  });

  it('keeps the marketing content in a separate client component', () => {
    // The page had to become async; the interactive landing content could not.
    expect(source).toContain('LandingContent');
    const content = readSource('components', 'landing', 'landing-content.tsx');
    expect(content).toContain("'use client'");
  });

  it('honours ?next so a bookmarked deep link survives the bounce', () => {
    expect(source).toMatch(/searchParams\?\.next/);
  });
});

describe('the sign-in pages forward a visitor who is already signed in', () => {
  it.each([
    ['login', 'app', 'login', 'page.tsx'],
    ['signin', 'app', 'signin', 'page.tsx'],
    ['auth/signin', 'app', 'auth', 'signin', 'page.tsx'],
  ])('%s resolves the destination before rendering the form', (_label, ...segments) => {
    const source = readSource(...segments);
    expect(source).toContain('getSignedInDestination');
    expect(source).toMatch(/redirect\(/);
  });

  it('auth/signin passes the validated ?next down to the form', () => {
    // `safeRedirectTarget` runs server-side, so the client receives either a
    // same-origin path or null — never a raw query parameter.
    const source = readSource('app', 'auth', 'signin', 'page.tsx');
    expect(source).toContain('safeRedirectTarget');
    expect(source).toMatch(/<SignInForm[^>]*next=/);
  });
});

describe('getSignedInDestination is the single answer for a visitor who is in', () => {
  /**
   * Cannot be unit-run here: it reads request cookies, and vitest has no jsdom
   * or Next request scope. Contract-tested from source instead.
   */
  const source = readSource('lib', 'auth', 'signed-in-destination.ts');

  it('validates the caller-supplied ?next before trusting it', () => {
    expect(source).toContain('safeRedirectTarget');
  });

  it('answers null, not a redirect, when nobody is signed in', () => {
    expect(source).toMatch(/if \(!user\) return null/);
  });

  it('falls back to onboarding rather than /login for someone already signed in', () => {
    expect(source).toContain('getRoleHome');
    expect(source).toContain('/auth/onboarding');
    expect(source).not.toMatch(/getRoleHome\([^)]*['"]\/login['"]/);
  });

  it('degrades to showing the page when cookies or the auth server are unreadable', () => {
    // A missing NEXT_PUBLIC_* value leaves the placeholder client, which throws
    // on any call; a 500 on `/` would strand everyone, not just the broken role.
    expect(source.match(/catch/g)).toHaveLength(2);
  });
});

describe('the form lands the visitor where they were going', () => {
  const source = readSource('components', 'auth', 'sign-in-form.tsx');

  it('accepts and uses the next prop', () => {
    expect(source).toMatch(/type SignInFormProps\s*=\s*\{[^}]*next\?/);
    expect(source).toMatch(/router\.push\(\s*next \?\?/);
  });

  it('falls back to the role home, and to onboarding rather than /login', () => {
    expect(source).toContain('getRoleHome');
    expect(source).toContain('/auth/onboarding');
    // Signing in and landing on the sign-in form is the loop this removes.
    expect(source).not.toMatch(/router\.push\(\s*['"]\/login['"]\s*\)/);
  });

  /**
   * The demo entry used to render four cards carrying `student01@syncsenta.dev`
   * and their passwords, i.e. real credentials in a publicly-served JS bundle.
   * The buttons now hand off to `/api/auth/demo-login`, where the password
   * lives in server env.
   */
  it('ships no demo credentials in the client bundle', () => {
    expect(source).not.toContain('syncsenta.dev');
    expect(source).not.toMatch(/password\s*:\s*['"]/);
    expect(source).toContain('/api/auth/demo-login');
  });
});

describe('RoleGate reads the shared map instead of keeping its own', () => {
  const source = readSource('components', 'auth', 'role-gate.tsx');

  it('has no second role -> home table', () => {
    expect(source).not.toContain('HOME_BY_ROLE');
    expect(source).not.toMatch(/Record<[^>]*string[^>]*>\s*=\s*\{/);
  });

  it('sends an unauthenticated visitor to the real sign-in page with ?next', () => {
    expect(source).toMatch(/\/auth\/signin\?next=/);
    expect(source).toContain('encodeURIComponent');
  });

  it('sends a session with no profile row to onboarding, not to the form', () => {
    expect(source).toContain('/auth/onboarding');
    expect(source).not.toMatch(/router\.replace\(\s*['"]\/login['"]\s*\)/);
  });

  it('waits for the profile fetch before deciding', () => {
    // `loading` flips false before the profiles row resolves; acting on that
    // gap bounced every authenticated user to /login on first render.
    expect(source).toContain('profileLoading');
  });
});

describe('the legacy sign-up surface stays deleted', () => {
  /**
   * Retired 2026-09-29 by the owner: "we dont need any signups just the four
   * roles demo accounts". Self-serve creation let a stranger pick a role in a
   * form; real accounts are provisioned by whoever owns the school, so
   * placement is a decision the school makes.
   */
  it.each([
    join('src', 'app', 'auth', 'signup', 'page.tsx'),
    join('src', 'app', 'login', 'student', 'page.tsx'),
    join('src', 'components', 'auth', 'sign-up-form.tsx'),
    join('src', 'components', 'auth', 'wallet-auth-button.tsx'),
    join('src', 'components', 'auth', 'test-account-quick-login.tsx'),
  ])('%s does not grow back', (rel) => {
    expect(existsSync(join(process.cwd(), rel)), `${rel} grew back`).toBe(false);
  });

  it('nothing navigates or links to a retired auth route', () => {
    const pattern = /['"`]\/(auth\/signup|login\/student)\b/;
    const offenders = allSourceFiles()
      .filter((file) => pattern.test(stripComments(readFileSync(file, 'utf8'))))
      .map((file) => relative(process.cwd(), file));
    expect(offenders).toEqual([]);
  });

  it('useAuth exposes no self-serve account creation', () => {
    const source = readSource('hooks', 'use-auth.ts');
    expect(source).not.toMatch(/\bsignUp\s*[:(]/);
    expect(source).toContain('signIn');
    expect(source).toContain('signOut');
  });

  it('/signup is a role picker, not a registration form', () => {
    const source = readSource('app', 'signup', 'page.tsx');
    expect(source).not.toMatch(/\bsignUp\s*\(/);
    expect(source).toContain('/api/auth/demo-login');
  });

  it('a signed-in visitor to /signup is offered their own workspace', () => {
    // The picker signs a *demo* account in over an existing session, so it has
    // to say so and offer the way back out.
    const source = readSource('app', 'signup', 'page.tsx');
    expect(source).toContain('getRoleHome');
  });
});

describe('the dashboard redirect cannot strand anyone', () => {
  const source = readSource('app', '(main)', 'dashboard', 'page.tsx');

  it('follows the shared map', () => {
    expect(source).toContain('getRoleHome');
  });

  it('has no branch that lands a signed-in visitor on /login', () => {
    expect(source).not.toMatch(/redirect\(\s*['"]\/login['"]\s*\)/);
    expect(source).not.toMatch(/home === ['"]\/login['"]/);
  });
});
