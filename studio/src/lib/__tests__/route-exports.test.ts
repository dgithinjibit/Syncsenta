import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * The route-export contract gate.
 *
 * A Next.js App Router `route.ts` may export HTTP method handlers and a fixed
 * set of route config fields. Anything else — even a pure helper — fails
 * `next build`:
 *
 *   Type error: Route "src/app/api/generate/exam/route.ts" does not match the
 *   required types of a Next.js Route. "toLessonArchitectAllocation" is not a
 *   valid Route export field.
 *
 * That cost a Vercel deployment on 2026-09-28 because `tsc --noEmit` and vitest
 * both accept the file: the check only exists inside Next's own build, and we
 * deploy once a day at most. This test puts the check where it can run locally.
 */

const APP = join(process.cwd(), 'src', 'app');

/**
 * Next's allowlist for non-handler exports in a route module. The HTTP methods
 * themselves are in here too, which keeps the assertion a single membership
 * test.
 */
const ALLOWED_EXPORTS = new Set([
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS',
  'dynamic',
  'dynamicParams',
  'revalidate',
  'revalidatePath',
  'revalidateTag',
  'runtime',
  'maxDuration',
  'minDuration',
  'preferredRegion',
  'region',
  'fetchCache',
  'responseCookies',
]);

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*\/?)/.test(line))
    .join('\n');
}

function routeFiles(dir = APP): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...routeFiles(full));
    } else if (/^route\.(ts|tsx|js)$/i.test(entry)) {
      found.push(full);
    }
  }
  return found.sort();
}

/** Every name a module puts on its public surface, minus types. */
function exportedNames(source: string): string[] {
  const names: string[] = [];

  for (const match of source.matchAll(
    /^\s*export\s+(?:declare\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z0-9_$]+)/gm,
  )) {
    names.push(match[1]);
  }

  // `export { a, b as c } [from '…']` — the exported name is the alias.
  for (const match of source.matchAll(/^\s*export\s*\{([^}]*)\}(?:\s*from\s*[^;]+)?;?/gm)) {
    for (const clause of match[1].split(',')) {
      const parts = clause.trim().split(/\s+as\s+/);
      const name = (parts.length > 1 ? parts[1] : parts[0]).trim();
      if (name && name !== 'type') names.push(name);
    }
  }

  return names;
}

describe('route modules only export what Next.js allows', () => {
  const files = routeFiles();

  it('actually found the route files, so this gate is not vacuous', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('every export in every route.ts is a handler or a config field', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const source = stripComments(readFileSync(file, 'utf8'));

      // `export type` / `export interface` are erased at build time and legal;
      // `export enum` and `export default` are values and are not.
      if (/^\s*export\s+default\b/m.test(source) || /^\s*export\s+enum\b/m.test(source)) {
        offenders.push(`${relative(process.cwd(), file)}: default/enum export`);
      }
      if (/^\s*export\s*\*\s*(?!\{)/m.test(source)) {
        offenders.push(`${relative(process.cwd(), file)}: export * hides unlisted exports`);
      }

      for (const name of exportedNames(source)) {
        if (!ALLOWED_EXPORTS.has(name)) {
          offenders.push(`${relative(process.cwd(), file)}: "${name}" is not a valid Route export field`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('the exam helper moved out of its route module', () => {
    // Regression anchor for the specific failure: the helper must be reachable
    // from src/lib, and the route must only import it.
    const route = readFileSync(join(APP, 'api/generate/exam/route.ts'), 'utf8');
    expect(route).not.toMatch(/export function toLessonArchitectAllocation/);
    expect(route).toMatch(/from '@\/lib\/exam-allocation'/);
    expect(exportedNames(stripComments(route)).sort()).toEqual(['POST', 'maxDuration', 'runtime']);
  });
});
