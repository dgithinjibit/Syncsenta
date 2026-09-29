/**
 * The same race, one table over.
 *
 * `updateDailyActivity()` was, until `9110da3`, the same read-modify-write `c71aa18` fixed for
 * `learning_progress`: it selected today's row, added to the counters in JavaScript, and wrote the
 * totals back with no condition on the `UPDATE`. Its only production caller is
 * `/api/chat/route.ts:658`, so the race is two tutor requests from one learner — a double-send, a retry
 * over a slow stream, or the same child on two tabs — both reading `messages_sent: 4` and both writing 5,
 * which leaves the teacher's dashboard reporting one message fewer than the learner actually sent.
 * `docs/ROADMAP.md` §2's whole point is that every number a teacher sees traces to a real learner action,
 * so a quietly lost action is a defect in that promise rather than a rounding error.
 *
 * Red-green record: 4 of these 5 failed against the code before `9110da3`. The one that passed is the
 * uncontested day — the shape this guard must not disturb.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../supabase/client', () => {
  const builder: any = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    eq: () => builder,
    single: async () => ({ data: null, error: null }),
    then: (resolve: (v: any) => void) => Promise.resolve({ data: null, error: null }).then(resolve),
  };
  const client = { from: () => builder };
  return { supabase: client, getSupabaseClient: () => client };
});

import { updateDailyActivity } from '../progress/progress-tracking';
import { activityDateInTimeZone } from '../time/activity-date';

type Row = Record<string, unknown>;

interface Store {
  client: any;
  stored: () => Row;
  attempts: Array<{ predicates: Array<[string, unknown]>; landed: boolean }>;
}

/**
 * A `daily_activity` row plus one other writer that commits in the gap between this request's read
 * and its write.
 */
function dailyStore(initial: Row, competitor: (current: Row) => Row): Store {
  let current: Row = { ...initial };
  let competitorRuns = 1;
  const attempts: Store['attempts'] = [];
  let predicates: Array<[string, unknown]> = [];
  let mode: 'read' | 'write' = 'read';
  let currentPatch: Row | null = null;

  const builder: any = {
    select: () => builder,
    eq: (column: string, value: unknown) => {
      predicates.push([column, value]);
      return builder;
    },
    update: (patch: Row) => {
      mode = 'write';
      currentPatch = patch;
      return builder;
    },
    insert: (values: Row) => {
      current = { ...values };
      return builder;
    },
    single: async () => {
      const read = { ...current };
      if (competitorRuns > 0) {
        competitorRuns -= 1;
        current = { ...competitor(current) };
      }
      return { data: read, error: null };
    },
    then: async (resolve: (v: any) => void) => {
      if (mode === 'write' && currentPatch) {
        const landed = predicates.every(([column, value]) => current[column] === value);
        attempts.push({ predicates: [...predicates], landed });
        if (landed) current = { ...current, ...currentPatch };
        return Promise.resolve({ data: landed ? [{ ...current }] : [], error: null }).then(resolve);
      }
      return Promise.resolve({ data: null, error: null }).then(resolve);
    },
  };

  return {
    // A fresh chain per call, because PostgREST clients are per-request.
    client: {
      from: () => {
        predicates = [];
        mode = 'read';
        currentPatch = null;
        return builder;
      },
    },
    stored: () => ({ ...current }),
    attempts,
  };
}

const today = activityDateInTimeZone(undefined);

const MORNING_ROW: Row = {
  user_id: 'learner-1',
  activity_date: today,
  messages_sent: 4,
  sessions_started: 1,
  time_spent_minutes: 12,
  subjects_practiced: ['Mathematics'],
  daily_streak: 3,
};

/** The other request: it sends two messages and spends nine more minutes. */
function theOtherTurn(row: Row): Row {
  return {
    ...row,
    messages_sent: 6,
    sessions_started: 2,
    time_spent_minutes: 21,
    subjects_practiced: ['Mathematics', 'English'],
  };
}

describe('two turns on the same day', () => {
  it('both count, instead of the later one overwriting the earlier one', async () => {
    const store = dailyStore(MORNING_ROW, theOtherTurn);

    await updateDailyActivity('learner-1', { messagesSent: 1, timeSpentMinutes: 3 }, store.client);

    const saved = store.stored();
    expect(saved.messages_sent).toBe(7);
    expect(saved.time_spent_minutes).toBe(24);
    expect(saved.sessions_started).toBe(2);
  });

  it('the losing write is guarded on the numbers it added to', async () => {
    const store = dailyStore(MORNING_ROW, theOtherTurn);

    await updateDailyActivity('learner-1', { messagesSent: 1, timeSpentMinutes: 3 }, store.client);

    expect(Object.fromEntries(store.attempts[0].predicates)).toMatchObject({
      user_id: 'learner-1',
      activity_date: today,
      messages_sent: 4,
      sessions_started: 1,
      time_spent_minutes: 12,
    });
    expect(store.attempts[0].landed).toBe(false);
    expect(store.attempts[1].landed).toBe(true);
  });

  it('merges subjects from the row that exists now, not the one it read', async () => {
    const store = dailyStore(MORNING_ROW, theOtherTurn);

    await updateDailyActivity(
      'learner-1',
      { messagesSent: 1, subjectsPracticed: ['Agriculture'] },
      store.client,
    );

    expect(store.stored().subjects_practiced).toEqual(['Mathematics', 'English', 'Agriculture']);
  });
});

describe('a day with no requests competing', () => {
  it('writes once', async () => {
    const store = dailyStore(MORNING_ROW, (row) => row);

    await updateDailyActivity('learner-1', { messagesSent: 1 }, store.client);

    expect(store.attempts).toHaveLength(1);
    expect(store.attempts[0].landed).toBe(true);
    expect(store.stored().messages_sent).toBe(5);
  });
});

describe('the guard exists on the write, not just in a comment', () => {
  it('is a source check so a later edit cannot drop it silently', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/lib/progress/progress-tracking.ts'),
      'utf8',
    );
    const functionBody = source.slice(
      source.indexOf('export async function updateDailyActivity'),
      source.indexOf('/**\n * Calculate current streak'),
    );

    expect(functionBody).toContain(".eq('messages_sent'");
    expect(functionBody).toContain('.select()');
  });
});
