import { describe, expect, it } from 'vitest';
import {
  isLocalDemoEnabled,
  isProtectedWorkspace,
  shouldEnforceAuthWall,
} from '../auth/route-policy';

describe('role route authentication policy', () => {
  it('protects production routes when no override is configured', () => {
    expect(shouldEnforceAuthWall('production', undefined)).toBe(true);
  });

  it('allows an explicit non-production auth-wall opt-out', () => {
    expect(shouldEnforceAuthWall('development', undefined)).toBe(false);
    expect(shouldEnforceAuthWall('development', 'true')).toBe(true);
  });

  it('does not enable demo mode in production', () => {
    expect(isLocalDemoEnabled('production', 'true')).toBe(false);
    expect(isLocalDemoEnabled('development', 'true')).toBe(true);
  });

  // The legacy /dashboard surface was reachable anonymously and rendered an
  // unresolved loading skeleton for every role, because its identity came from
  // a `userEmail` cookie that the Supabase migration never writes. It is now a
  // protected workspace so anonymous traffic hits sign-in instead of a blank page.
  describe('isProtectedWorkspace', () => {
    it('protects every role workspace', () => {
      for (const path of ['/student', '/teacher', '/parent', '/head']) {
        expect(isProtectedWorkspace(path), path).toBe(true);
      }
    });

    it('protects nested workspace routes', () => {
      expect(isProtectedWorkspace('/student/chat/mathematics')).toBe(true);
      expect(isProtectedWorkspace('/teacher/scheme-wizard')).toBe(true);
    });

    it('protects the legacy /dashboard workspace', () => {
      expect(isProtectedWorkspace('/dashboard')).toBe(true);
      expect(isProtectedWorkspace('/dashboard/tools')).toBe(true);
    });

    it('does not protect public routes', () => {
      for (const path of ['/', '/login', '/auth/signin', '/signup', '/terms']) {
        expect(isProtectedWorkspace(path), path).toBe(false);
      }
    });

    it('does not treat a prefix-looking public path as a workspace', () => {
      // '/studentlife' must not be caught by the '/student' prefix rule.
      expect(isProtectedWorkspace('/studentlife')).toBe(false);
      expect(isProtectedWorkspace('/dashboards')).toBe(false);
    });
  });
});
