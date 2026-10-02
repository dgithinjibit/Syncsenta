import { describe, expect, it } from 'vitest';
import { touchLastSeen } from '../touch-presence';

/**
 * Spoon 15 addendum (submission night): the teacher roster derives
 * online/idle/offline from `profiles.last_seen_at`, but nothing in the
 * deployed studio ever wrote that column — it holds the value it was seeded
 * with, so every learner reads "offline" forever. `deriveStatus`'s 5-minute
 * window can only mean something if a session actually stamps it.
 *
 * These tests pin the two facts that make it real and safe:
 * the learner can only stamp their OWN row (id comes from the caller-supplied
 * auth uid, RLS `profiles_update_own` is the second defense), and the stamp
 * is a fresh ISO timestamp, not a stale client-supplied value.
 */

interface Recorded {
  table?: string;
  payload?: Record<string, unknown>;
  filters: Array<[string, string]>;
}

function fakeClient(opts: { error?: { message: string } | null } = {}) {
  const record: Recorded = { filters: [] };
  const client = {
    from(table: string) {
      record.table = table;
      return {
        update(payload: Record<string, unknown>) {
          record.payload = payload;
          return {
            eq(column: string, value: string) {
              record.filters.push([column, value]);
              return Promise.resolve({ data: null, error: opts.error ?? null });
            },
          };
        },
      };
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: client as any, record };
}

describe('touchLastSeen', () => {
  it('stamps profiles.last_seen_at with a fresh now for the given user id only', async () => {
    const fixed = new Date('2026-10-03T00:00:42Z');
    const { client, record } = fakeClient();

    const result = await touchLastSeen(client, 'user-77', fixed);

    expect(result.ok).toBe(true);
    expect(record.table).toBe('profiles');
    expect(record.payload).toEqual({ last_seen_at: fixed.toISOString() });
    expect(record.filters).toEqual([['id', 'user-77']]);
  });

  it('reports ok:false instead of throwing when the update fails', async () => {
    const { client } = fakeClient({ error: { message: 'row-level security' } });

    const result = await touchLastSeen(client, 'user-77');

    expect(result).toEqual({ ok: false, message: 'row-level security' });
  });

  it('refuses to stamp without a user id rather than writing an unscoped update', async () => {
    const { client, record } = fakeClient();

    const result = await touchLastSeen(client, '');

    expect(result.ok).toBe(false);
    expect(record.table).toBeUndefined();
  });
});
