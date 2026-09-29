/**
 * Identity-bearing ids must come from the CSPRNG, not from Math.random.
 *
 * The pattern this replaces was all over the studio app:
 *
 *   id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
 *
 * `Math.random()` is a predictable xorshift seeded per tab: 53 bits of output
 * from an internal state that can be reconstructed from a couple of observed
 * values, and the visible part here was nine characters of it. Where that id is
 * a session id, a device id, or a shareable join code, predictability is the
 * vulnerability rather than a code smell — the session id `/api/mwalimu` used
 * came from a store that is now `lib/chat/learner-state.ts` (its ids are database
 * rows), `hooks/use-session-sync.ts` persists its
 * device id in localStorage and sends it with every sync, and the Learning Lab
 * join code was seven `Math.random()` characters that anyone could enumerate.
 *
 * `crypto.randomUUID()` would be the obvious call, but it is a secure-context
 * API: on a plain-HTTP school LAN it is `undefined`, which is exactly why two
 * files here fell back to Math.random in the first place. `getRandomValues` is
 * available in insecure contexts too, so everything in this module is built on
 * it and nothing silently degrades.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { newId, newJoinCode, newUuid, randomHex } from '@/lib/secure-id';

describe('secure ids', () => {
  it('does not depend on Math.random at all', () => {
    const original = Math.random;
    Math.random = () => {
      throw new Error('Math.random() called while generating an id');
    };
    try {
      expect(newId('session')).toContain('session_');
      expect(newUuid()).toMatch(/^[0-9a-f-]{36}$/);
      expect(newJoinCode()).toHaveLength(7);
      expect(randomHex(8)).toHaveLength(16);
    } finally {
      Math.random = original;
    }
  });

  it('produces ids that differ even within the same millisecond', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 500; i += 1) ids.add(newId('device'));
    expect(ids.size).toBe(500);
  });

  it('emits a v4 UUID shape, so existing format validators still pass', () => {
    const uuid = newUuid();
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('gives join codes that are uppercase alphanumerics and unguessable in shape', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(newJoinCode()).toMatch(/^[A-Z0-9]{7}$/);
    }
  });

  it('fails loudly instead of degrading to Math.random when no CSPRNG exists', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    try {
      Object.defineProperty(globalThis, 'crypto', {
        value: undefined,
        configurable: true,
      });
      expect(() => randomHex(8)).toThrow(/SecureRandomUnavailable/);
    } finally {
      if (original) Object.defineProperty(globalThis, 'crypto', original);
    }
    expect(() => randomHex(8)).not.toThrow();
  });
});

describe('the weak id recipe stays deleted', () => {
  /** Every .ts/.tsx under src, except the tests that document the old shape. */
  function sourcesUnder(dir: string): string[] {
    const found: string[] = [];
    for (const entry of readdirSync(dir)) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        found.push(...sourcesUnder(full));
      } else if (/\.tsx?$/.test(entry)) {
        found.push(full);
      }
    }
    return found;
  }

  const offenders = (pattern: RegExp): string[] =>
    sourcesUnder(join(process.cwd(), 'src'))
      .filter((file) => !file.endsWith(join('lib', 'secure-id.ts')))
      .filter((file) => pattern.test(readFileSync(file, 'utf8')))
      .map((file) => relative(process.cwd(), file));

  it('no source turns Math.random into a base36/base16 id fragment', () => {
    expect(offenders(/Math\.random\(\)\.toString\(/)).toEqual([]);
  });

  it('the two files that used to hand-roll a UUID have no Math.random left', () => {
    for (const file of [
      join('src', 'lib', 'session', 'session-manager.ts'),
      join('src', 'lib', 'offline-queue.ts'),
    ]) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');
      expect(`${file}: ${source.match(/Math\.random/g) ?? []}`).toBe(`${file}: `);
    }
  });
});
