/**
 * S-4 (guard half) — the server path must not pretend to remember.
 *
 * The behavioural half lives in `mwalimu-learner-state.test.ts`. This file keeps
 * the three properties that a behaviour test on a route handler cannot cheaply
 * assert, because `/api/mwalimu` streams and calls four upstream services:
 *
 *   1. `lib/personalized-learning.ts` is gone, and nothing imports it. Its
 *      `Map`s + `localStorage` pair was the phantom memory: unreadable in Node,
 *      so every request started from zeros and a random name.
 *   2. `/api/mwalimu` gets its learner from the session cookie, not the request
 *      body. It used to do `input.userId || 'user1'`, which let any caller read
 *      and write another child's profile, transcript and progress simply by
 *      naming them — and made every anonymous visitor share one bucket.
 *   3. The prompt builder is a pure function over already-read state, so it
 *      cannot reintroduce a hidden store.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(process.cwd(), 'src');

function readSource(...segments: string[]): string {
  const file = join(SRC, ...segments);
  expect(existsSync(file), `${relative(process.cwd(), file)} should exist`).toBe(true);
  return readFileSync(file, 'utf8');
}

/**
 * Strip comments so these assertions describe executable code, not prose.
 *
 * The route header explains the `input.userId || 'user1'` bug it replaced, and a
 * guard that matched that string anywhere would fail on its own documentation —
 * the same trap `legacy-auth-surface.test.ts` had to work around.
 */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, ' ');
}

function readCode(...segments: string[]): string {
  return codeOnly(readSource(...segments));
}

function tsFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      found.push(...tsFiles(full));
    } else if (/\.tsx?$/.test(entry)) {
      found.push(full);
    }
  }
  return found;
}

describe('the phantom-memory engine is deleted', () => {
  it('removes lib/personalized-learning.ts from the tree', () => {
    expect(
      existsSync(join(SRC, 'lib', 'personalized-learning.ts')),
      'personalized-learning.ts persisted server state in localStorage, which does not exist in Node',
    ).toBe(false);
  });

  it('leaves no importer of it anywhere in src', () => {
    const importers = tsFiles(SRC)
      .filter((file) => /from '[^']*personalized-learning'/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC, file));
    expect(importers).toEqual([]);
  });
});

describe('/api/mwalimu identity', () => {
  const route = readCode('app', 'api', 'mwalimu', 'route.ts');

  it('takes the learner from the session, not the body', () => {
    expect(route).toMatch(/auth\.getUser\(\)/);
    expect(route).not.toMatch(/input\.userId\s*\|\|/);
    expect(route).not.toMatch(/const userId = input\.userId/);
  });

  it('rejects an anonymous caller instead of defaulting to a shared account', () => {
    expect(route).toMatch(/status:\s*401/);
  });

  it('reads and writes state through the Supabase client for the request', () => {
    expect(route).toMatch(/createSupabaseRouteHandlerClient|createServerClient/);
    expect(route).toMatch(/readLearnerState\(/);
    expect(route).toMatch(/recordTutorTurn\(/);
    expect(route).toMatch(/getOrCreateChatSession\(/);
  });

  it('does not touch browser storage or the ad-hoc userId type', () => {
    expect(route).not.toMatch(/localStorage/);
    // AGENTS.md: no `any` in TypeScript. This route had four.
    expect(route).not.toMatch(/:\s*any\b/);
    expect(route).not.toMatch(/as any\b/);
  });
});

describe('the personalization prompt builder is pure', () => {
  const promptModule = readCode('lib', 'chat', 'personalized-prompt.ts');

  it('has no store of its own', () => {
    expect(promptModule).not.toMatch(/localStorage/);
    expect(promptModule).not.toMatch(/new Map\(/);
    expect(promptModule).not.toMatch(/Math\.random\(/);
    expect(promptModule).not.toMatch(/supabase/);
  });

  it('is fed the learner state it describes', () => {
    expect(promptModule).toMatch(/profile/);
    expect(promptModule).toMatch(/progress/);
  });
});

describe('the tutor pipeline takes state as an argument', () => {
  const pipeline = readCode('lib', 'mwalimu-pipeline.ts');

  it('no longer reaches for the deleted engine', () => {
    expect(pipeline).not.toMatch(/personalizedLearning/);
  });

  it('builds its prompt from the learner state it was handed or read', () => {
    expect(pipeline).toMatch(/buildPersonalizedPrompt|readLearnerState/);
  });
});
