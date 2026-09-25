import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DEMO_DESTINATIONS, type DemoRole } from '../auth/demo-destinations';

/**
 * Hermetic role-route smoke for CI.
 *
 * The dashboard-access P0 had two failure classes:
 *  1. a demo destination drifting away from the canonical role route —
 *     locked by the string assertions in demo-destinations.test.ts;
 *  2. a destination pointing at a route that no longer exists on disk —
 *     locked here, so deleting or renaming a role dashboard fails the
 *     test suite instead of failing a user's login at runtime.
 */
function appRoutePageFor(destination: string): string {
  // App Router source groups like `(main)` are not part of the URL, so the
  // route lives under a directory whose name keeps the parentheses.
  const segments = destination.split('/').filter(Boolean);
  return join(process.cwd(), 'src', 'app', ...segments, 'page.tsx');
}

describe('role dashboards exist as real routes', () => {
  const roles: DemoRole[] = ['student', 'teacher', 'head', 'parent'];

  for (const role of roles) {
    it(`demo role '${role}' resolves to a page-backed route`, () => {
      const destination = DEMO_DESTINATIONS[role];
      expect(destination, `destination for ${role}`).toBeTruthy();
      expect(
        existsSync(appRoutePageFor(destination)),
        `${destination} must have src/app${destination}/page.tsx`,
      ).toBe(true);
    });
  }
});
