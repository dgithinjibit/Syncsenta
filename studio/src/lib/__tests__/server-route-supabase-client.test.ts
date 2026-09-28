/**
 * Which Supabase client the server-side callers use.
 *
 * `src/lib/supabase/client.ts` exports a singleton built with
 * `createBrowserClient()` from `@supabase/ssr`. Read in that package (0.12.7),
 * `createBrowserClient` on a machine where `isBrowser()` is false creates a
 * fresh client whose storage is not the browser's: no cookie jar, therefore no
 * session, therefore every request it makes carries only the anon key.
 * PostgREST runs it as the `anon` role.
 *
 * That is invisible while the tables do not exist — the query 404s either way.
 * It becomes decisive once they do. The memory layer applied to production on
 * 2026-09-28 (`supabase/migrations_live/20260928000100_omega_memory_layer.sql`)
 * protects each table with `for all to authenticated using (auth.uid() = user_id)`,
 * so an `anon` INSERT is rejected by policy. `/api/chat` calls
 * `addChatMessage()`, `updateDailyActivity()` and `updateLearningProgress()`
 * from inside a route handler, so `chat_messages`, `daily_activity` and
 * `learning_progress` stayed empty for every real learner while `chat_sessions`
 * and `api_usage` — written through the route's own cookie-based client — filled.
 *
 * The fix is dependency injection: these functions take the caller's client.
 * A browser component still gets the singleton by default; a route handler must
 * pass the request-scoped one. These tests fail if a write silently reverts to
 * the singleton.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { browserCalls, browserClient } = vi.hoisted(() => {
  const calls: string[] = [];
  const builder: any = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    single: async () => ({ data: null, error: null }),
    then: (resolve: (v: any) => void) =>
      Promise.resolve({ data: null, error: null }).then(resolve),
  };
  const client = {
    from: (table: string) => {
      calls.push(`from:${table}`);
      return builder;
    },
  };
  return { browserCalls: calls, browserClient: client };
});

vi.mock('../supabase/client', () => ({
  supabase: browserClient,
  getSupabaseClient: () => browserClient,
}));

import { updateDailyActivity, updateLearningProgress } from '../progress/progress-tracking';
import { addChatMessage } from '../chat/chat-history-supabase';

interface FakeLog {
  calls: string[];
  rows: Record<string, any>;
}

/**
 * A stand-in for a SupabaseClient that records what it was asked to do instead
 * of going to the network. `singleResult` is what a `.single()` read answers
 * with, so a test can choose the "row already exists" or "no row yet" branch.
 */
function fakeClient(singleResult: unknown = null): FakeLog & { client: any } {
  const log: FakeLog = { calls: [], rows: {} };

  const builder: any = {
    select(columns?: string) {
      log.calls.push(`select${columns ? `(${columns})` : ''}`);
      return builder;
    },
    insert(row: any) {
      log.calls.push('insert');
      log.rows.insert = row;
      return builder;
    },
    update(row: any) {
      log.calls.push('update');
      log.rows.update = row;
      return builder;
    },
    eq(key: string) {
      log.calls.push(`eq:${key}`);
      return builder;
    },
    order() {
      log.calls.push('order');
      return builder;
    },
    limit() {
      log.calls.push('limit');
      return builder;
    },
    single: async () => ({ data: singleResult, error: null }),
    maybeSingle: async () => ({ data: singleResult, error: null }),
    // Awaiting the builder directly is what `update()` / `insert()` with no
    // `.select()` compiles to; PostgREST answers with { data, error }.
    then: (resolve: (v: any) => void) =>
      Promise.resolve({ data: singleResult, error: null }).then(resolve),
  };

  return { ...log, client: { from: (table: string) => { log.calls.push(`from:${table}`); return builder; } } };
}

beforeEach(() => {
  browserCalls.length = 0;
});

describe('progress writes honour an injected client', () => {
  it('updateLearningProgress inserts through the caller, not the browser singleton', async () => {
    const fake = fakeClient();

    await updateLearningProgress(
      ' learner-uuid'.trim(),
      'M8-ALG.1',
      {
        competencyName: 'Algebraic expressions',
        subject: 'Mathematics',
        grade: 'Grade 8',
        questionsAsked: 1,
        questionsAnswered: 1,
        correctAnswers: 1,
        timeSpentMinutes: 1,
      },
      fake.client
    );

    expect(fake.calls).toContain('from:learning_progress');
    expect(fake.calls).toContain('insert');
    expect(fake.rows.insert.competency_code).toBe('M8-ALG.1');
    expect(browserCalls).toEqual([]);
  });

  it('updateDailyActivity inserts through the caller, not the browser singleton', async () => {
    const fake = fakeClient();

    await updateDailyActivity(
      'learner-uuid',
      { messagesSent: 1, sessionsStarted: 1, subjectsPracticed: ['Mathematics'] },
      fake.client
    );

    expect(fake.calls).toContain('from:daily_activity');
    expect(fake.calls).toContain('insert');
    expect(browserCalls).toEqual([]);
  });

  it('addChatMessage inserts through the caller, not the browser singleton', async () => {
    const fake = fakeClient({ id: 'message-uuid' });

    await addChatMessage(
      'session-uuid',
      'learner-uuid',
      'assistant',
      'What do you notice about the two sides?',
      undefined,
      fake.client
    );

    expect(fake.calls).toContain('from:chat_messages');
    expect(fake.calls).toContain('insert');
    expect(fake.calls).toContain('from:chat_sessions');
    expect(browserCalls).toEqual([]);
  });
});
