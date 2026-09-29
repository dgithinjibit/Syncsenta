/**
 * Learner activity plumbing — the four defects found by watching a real learner
 * use the deployed tutor on 2026-09-28.
 *
 * The memory layer (`chat_sessions`, `chat_messages`, `daily_activity`,
 * `learning_progress`, `omega_scaffolding_events`) is applied to production and
 * the tutor writes to it, so the failures were not exceptions. They were empty
 * columns and empty tables, which is worse: the dashboards looked healthy and
 * simply reported that nobody had done any work.
 *
 *   1. `chat_sessions.message_count` stayed 0 while `chat_messages` filled up,
 *      because `addChatMessage()` only touched `last_message_at`. The student
 *      home, the teacher report export and `getChatStatistics()` all read that
 *      column.
 *   2. `learning_progress` and `omega_scaffolding_events` stayed empty for every
 *      free question, because `/api/chat` gated its post-stream writes on
 *      `body.competencyCode` and the free-question tutor only sends a subject
 *      label.
 *   3. Streaks and daily counters rolled over on the server's UTC day, three
 *      hours behind the learners.
 *
 * Each test below fails against the code as it was, for the reason named in the
 * defect.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Both modules under test default their `client` argument to the Supabase
// browser singleton, which needs `NEXT_PUBLIC_SUPABASE_URL` at import time.
// Every case here injects a fake, so the singleton only has to exist.
vi.mock('../supabase/client', () => {
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
  const client = { from: () => builder };
  return { supabase: client, getSupabaseClient: () => client };
});

import {
  generalCompetencyForSubjectLabel,
  defaultCompetencyForSubject,
} from '../chat/subject-session';
import { activityDateInTimeZone, activityDateOffset, PLATFORM_TIME_ZONE } from '../time/activity-date';

/**
 * A minimal `SupabaseClient` stand-in that understands the two shapes the
 * counter code uses: an insert that returns the new row, and a head count read
 * that answers `{ count }`.
 */
function counterClient(responses: {
  count?: number | null;
  insertId?: string;
}): {
  client: any;
  calls: string[];
  updates: Record<string, unknown>[];
  inserts: Record<string, unknown>[];
} {
  const calls: string[] = [];
  const updates: Record<string, unknown>[] = [];
  const inserts: Record<string, unknown>[] = [];

  const makeBuilder = (table: string) => {
    const builder: any = {
      select: (columns?: string, options?: { head?: boolean; count?: string }) => {
        calls.push(`select:${table}:${columns ?? '*'}${options?.head ? ':head' : ''}`);
        return builder;
      },
      insert: (row: any) => {
        calls.push(`insert:${table}`);
        inserts.push(row);
        return builder;
      },
      update: (row: any) => {
        calls.push(`update:${table}`);
        updates.push(row);
        return builder;
      },
      eq: (key: string) => {
        calls.push(`eq:${table}:${key}`);
        return builder;
      },
      single: async () =>
        responses.insertId
          ? { data: { id: responses.insertId }, error: null }
          : { data: null, error: null },
      then: (resolve: (v: any) => void) =>
        Promise.resolve({ data: null, error: null }).then(resolve),
    };
    // `select('*', { count: 'exact', head: true })` resolves to `{ count }`.
    if (table === 'chat_messages') {
      builder.then = (resolve: (v: any) => void) =>
        Promise.resolve({ data: null, count: responses.count ?? null, error: null }).then(resolve);
    }
    return builder;
  };

  return {
    calls,
    updates,
    inserts,
    client: { from: (table: string) => { calls.push(`from:${table}`); return makeBuilder(table); } },
  };
}

describe('defect 1 — session message_count tracks the transcript', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('writes the real message count alongside last_message_at', async () => {
    const { addChatMessage } = await import('../chat/chat-history-supabase');
    const fake = counterClient({ count: 7, insertId: 'message-uuid' });

    await addChatMessage(
      'session-uuid',
      'learner-uuid',
      'assistant',
      'What do you notice about the two sides?',
      undefined,
      fake.client,
    );

    expect(fake.updates).toHaveLength(1);
    expect(fake.updates[0]).toMatchObject({ message_count: 7 });
    expect(typeof fake.updates[0].last_message_at).toBe('string');
  });

  it('counts from chat_messages rather than adding one to the stored number', async () => {
    // Two turns landing together used to be able to write the same
    // `message_count + 1`. Counting the rows makes the write self-correcting,
    // and it repairs the sessions already sitting at 0 in production.
    const { addChatMessage } = await import('../chat/chat-history-supabase');
    const fake = counterClient({ count: 3, insertId: 'message-uuid' });

    await addChatMessage('session-uuid', 'learner-uuid', 'user', 'Why?', undefined, fake.client);

    expect(fake.calls).toContain('select:chat_messages:*:head');
    expect(fake.updates[0]).toMatchObject({ message_count: 3 });
  });

  it('leaves the stored count alone when the count read fails', async () => {
    const { addChatMessage } = await import('../chat/chat-history-supabase');
    const fake = counterClient({ count: null, insertId: 'message-uuid' });

    await addChatMessage('session-uuid', 'learner-uuid', 'user', 'Why?', undefined, fake.client);

    expect(fake.updates[0]).toHaveProperty('last_message_at');
    expect(fake.updates[0]).not.toHaveProperty('message_count');
  });

  it('still returns the message id when the counter update throws', async () => {
    // The transcript row is already persisted by then; a counter failure must
    // not turn a delivered answer into an error the learner sees.
    const { addChatMessage } = await import('../chat/chat-history-supabase');
    const client = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: { id: 'message-uuid' }, error: null }) }),
        }),
        insert: () => ({
          select: () => ({ single: async () => ({ data: { id: 'message-uuid' }, error: null }) }),
        }),
        update: () => {
          if (table === 'chat_sessions') throw new Error('policy rejected');
          return { eq: async () => ({ error: null }) };
        },
      }),
    };

    await expect(
      addChatMessage('session-uuid', 'learner-uuid', 'assistant', 'Hi', undefined, client as any),
    ).resolves.toBe('message-uuid');
  });
});

describe('defect 2 — a free question still has a competency', () => {
  it('maps a curriculum subject name to that subject\'s general row', () => {
    expect(generalCompetencyForSubjectLabel('Mathematics')).toEqual(
      defaultCompetencyForSubject('mathematics'),
    );
    expect(generalCompetencyForSubjectLabel('Environmental Activities')).toEqual({
      competencyCode: 'ENV.general',
      competencyName: 'Environmental — General',
    });
    expect(generalCompetencyForSubjectLabel('English Language Activities').competencyCode).toBe(
      'ENG.general',
    );
  });

  it('is case and punctuation insensitive', () => {
    expect(generalCompetencyForSubjectLabel('  SOCIAL STUDIES ').competencyCode).toBe('SOC.general');
    expect(generalCompetencyForSubjectLabel('Creative Arts').competencyCode).toBe('CRE.general');
  });

  it('gives an unknown subject its own code instead of inventing a subject', () => {
    // Folding "Debating" into Mathematics would attribute evidence to the wrong
    // CBC strand; a distinct code is visible and correct.
    expect(generalCompetencyForSubjectLabel('Debating')).toEqual({
      competencyCode: 'tutor.debating.general',
      competencyName: 'Debating — General',
    });
  });

  it('survives an empty label', () => {
    expect(generalCompetencyForSubjectLabel('   ').competencyCode).toBe('tutor.general.general');
  });

  it('keeps /api/chat writing progress for a turn with no competency code', () => {
    // The route is a streaming handler, so the behavioural half is covered by
    // the helper above. This guards the wiring that used to drop the writes:
    // a single derived `competency` value, and no gate on the raw body field.
    const route = readFileSync(
      join(process.cwd(), 'src/app/api/chat/route.ts'),
      'utf8',
    );

    expect(route).toContain('generalCompetencyForSubjectLabel(body.subject)');
    expect(route).not.toMatch(/if \(body\.competencyCode && /);
    expect(route).toContain('updateLearningProgress(user.id, competency.competencyCode');
    expect(route).toContain(".eq('competency_code', competency.competencyCode)");
  });
});

describe('defect 3 — the activity day is the learner\'s day', () => {
  // 2026-09-27T22:30Z is 2026-09-28 01:30 in Nairobi: the UTC date and the
  // Kenyan school day disagree, which is exactly the window where streaks were
  // recorded against the wrong day.
  const LATE_EVENING_UTC = new Date('2026-09-27T22:30:00.000Z');

  it('uses the platform zone, not UTC', () => {
    expect(PLATFORM_TIME_ZONE).toBe('Africa/Nairobi');
    expect(LATE_EVENING_UTC.toISOString().slice(0, 10)).toBe('2026-09-27');
    expect(activityDateInTimeZone(PLATFORM_TIME_ZONE, LATE_EVENING_UTC)).toBe('2026-09-28');
  });

  it('treats its own default as the platform zone', () => {
    expect(activityDateInTimeZone(undefined, LATE_EVENING_UTC)).toBe('2026-09-28');
    expect(activityDateInTimeZone(null, LATE_EVENING_UTC)).toBe('2026-09-28');
  });

  it('steps whole calendar days back', () => {
    expect(activityDateOffset(1, 'UTC', LATE_EVENING_UTC)).toBe('2026-09-26');
    expect(activityDateOffset(0, 'UTC', LATE_EVENING_UTC)).toBe('2026-09-27');
    expect(activityDateOffset(1, PLATFORM_TIME_ZONE, LATE_EVENING_UTC)).toBe('2026-09-27');
  });

  it('falls back to the UTC date for a nonsense zone', () => {
    expect(activityDateInTimeZone('Mars/Olympus_Mons', LATE_EVENING_UTC)).toBe('2026-09-27');
  });

  /**
   * A `daily_activity` stand-in: no row for today yet (so the insert branch
   * runs), and whatever rows the streak check should find. Every insert is
   * captured so the test can read the date the write landed on.
   */
  function dailyActivityClient(
    priorRows: { activity_date: string; daily_streak: number }[],
    captured: Record<string, any>[]
  ) {
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: async () => ({ data: priorRows, error: null }),
      single: async () => ({ data: null, error: null }),
      insert: (row: any) => {
        captured.push(row);
        return builder;
      },
      then: (resolve: (v: any) => void) =>
        Promise.resolve({ data: null, error: null }).then(resolve),
    };
    return { from: () => builder };
  }

  it('updateDailyActivity writes the learner-day date', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(LATE_EVENING_UTC);

    const { updateDailyActivity } = await import('../progress/progress-tracking');
    const captured: Record<string, any>[] = [];

    await updateDailyActivity(
      'learner-uuid',
      { messagesSent: 1, sessionsStarted: 1, subjectsPracticed: ['Mathematics'] },
      dailyActivityClient([], captured) as any,
      { timeZone: 'Africa/Nairobi' },
    );

    // The UTC date would have been 2026-09-27; the learner was already on the
    // 28th.
    expect(captured[0]).toMatchObject({
      activity_date: '2026-09-28',
      messages_sent: 1,
    });

    vi.useRealTimers();
  });

  it('keeps the streak alive across the UTC rollover', async () => {
    // Yesterday in Nairobi terms is 2026-09-27; a UTC-based streak check would
    // compare against 2026-09-26, find no match, and start the learner over at 1.
    vi.useFakeTimers();
    vi.setSystemTime(LATE_EVENING_UTC);

    const { updateDailyActivity } = await import('../progress/progress-tracking');
    const captured: Record<string, any>[] = [];

    await updateDailyActivity(
      'learner-uuid',
      { messagesSent: 1 },
      dailyActivityClient([{ activity_date: '2026-09-27', daily_streak: 4 }], captured) as any,
      { timeZone: 'Africa/Nairobi' },
    );

    expect(captured[0]).toMatchObject({ activity_date: '2026-09-28', daily_streak: 5 });

    vi.useRealTimers();
  });

  it('defaults to the platform zone when the caller names none', async () => {
    // Reads from a teacher or parent surface do not carry a learner profile, so
    // the default has to be the same day boundary the writes used.
    vi.useFakeTimers();
    vi.setSystemTime(LATE_EVENING_UTC);

    const { updateDailyActivity } = await import('../progress/progress-tracking');
    const captured: Record<string, any>[] = [];

    await updateDailyActivity(
      'learner-uuid',
      { messagesSent: 1 },
      dailyActivityClient([], captured) as any,
    );

    expect(captured[0]).toMatchObject({ activity_date: '2026-09-28' });

    vi.useRealTimers();
  });
});
