/**
 * S-4 — the Mwalimu tutor's memory has to be a real store.
 *
 * `lib/personalized-learning.ts` kept profiles, sessions and progress in `Map`s
 * on the request-handling process and then tried to persist them with
 * `localStorage.setItem(...)`. Node route handlers have no `localStorage`, so
 * the write was a silent no-op and the constructor's load was one too. On
 * Vercel, where every invocation can be a fresh process, that meant:
 *
 *   - `startSession()` returned an id that protected nothing — the next request
 *     had no record of the session it belonged to;
 *   - `getLearningProgress()` returned the zeros it was constructed with, so
 *     every learner's "overallProgress / streakDays / totalSessions" in the
 *     tutor response was 0 for the lifetime of the deployment;
 *   - `getStudentProfile()` invented a name with `generateFriendlyName()`, a
 *     random pick from a list of Kenyan first names, so the tutor addressed a
 *     real child by a name that was never theirs.
 *
 * The replacement reads the tables the rest of the app already writes
 * (`profiles`, `chat_sessions`, `chat_messages`, `learning_progress`,
 * `daily_activity`) through the caller's request-scoped Supabase client, and
 * writes the transcript with the existing `addChatMessage()` helper.
 *
 * These tests drive the module with an in-memory fake of that client —
 * deliberately, for two reasons: `vitest.config.ts` is `environment: 'node'`
 * and this machine has 3.7 GB of RAM, and because the assertion that matters
 * here is "state written by one request is visible to the next", which a fake
 * holding real rows proves as well as a database while staying runnable in CI
 * without credentials.
 */

import { describe, expect, it } from 'vitest';
import {
  deriveLearningSignals,
  readLearnerState,
  recordTutorTurn,
} from '../chat/learner-state';

// ─────────────────────────────────────────────────────────────────────────────
// In-memory fake of the subset of `SupabaseClient` this module uses.
//
// It supports exactly the chains that get built: `from(t).select().eq().order()
// .limit()`, `.maybeSingle()`, `.single()`, `insert().select().single()` and
// `update().eq()`. Rows are plain objects and writes land in the same arrays the
// next read scans, so a persisted turn is observable — which is the point.
// ─────────────────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

interface FakeDb {
  tables: Record<string, Row[]>;
  queries: string[];
  // The fake speaks in untyped builders; production code is what gets checked.
  client: any;
}

function fakeDb(seed: Record<string, Row[]>): FakeDb {
  const tables: Record<string, Row[]> = {
    profiles: [],
    chat_sessions: [],
    chat_messages: [],
    learning_progress: [],
    daily_activity: [],
    ...seed,
  };
  const queries: string[] = [];

  function build(table: string): any {
    const state = {
      filters: [] as Array<[string, unknown]>,
      orderColumn: null as string | null,
      ascending: true,
      limitCount: Infinity,
      wantsCount: false,
      updatePatch: null as Row | null,
    };

    function matched(): Row[] {
      let found = tables[table].filter((row) =>
        state.filters.every(([column, value]) => row[column] === value),
      );
      const key = state.orderColumn;
      if (key) {
        found = [...found].sort((a, b) => {
          const left = a[key] ?? '';
          const right = b[key] ?? '';
          if (left === right) return 0;
          const greater = left > right;
          return state.ascending ? (greater ? 1 : -1) : (greater ? -1 : 1);
        });
      }
      return found.slice(0, state.limitCount);
    }

    function settle(): { data: unknown; error: null; count: number | null } {
      if (state.updatePatch) {
        for (const row of matched()) Object.assign(row, state.updatePatch);
        return { data: null, error: null, count: null };
      }
      const found = matched();
      return {
        data: found,
        error: null,
        count: state.wantsCount ? found.length : null,
      };
    }

    const builder: any = {
      select(_columns?: string, options?: { count?: string; head?: boolean }) {
        if (options?.count === 'exact') state.wantsCount = true;
        return builder;
      },
      eq(column: string, value: unknown) {
        state.filters.push([column, value]);
        return builder;
      },
      order(column: string, options?: { ascending?: boolean }) {
        state.orderColumn = column;
        state.ascending = options?.ascending !== false;
        return builder;
      },
      limit(count: number) {
        state.limitCount = count;
        return builder;
      },
      single() {
        const found = matched();
        return Promise.resolve(
          found.length === 0
            ? { data: null, error: { message: `no ${table} rows matched` } }
            : { data: found[0], error: null },
        );
      },
      maybeSingle() {
        const found = matched();
        return Promise.resolve({ data: found[0] ?? null, error: null });
      },
      insert(row: Row) {
        const created: Row = { id: `${table}-${tables[table].length + 1}`, ...row };
        tables[table].push(created);
        const afterInsert: any = {
          select: () => afterInsert,
          single: () => Promise.resolve({ data: created, error: null }),
          then: (resolve: (value: unknown) => unknown) =>
            Promise.resolve({ data: created, error: null }).then(resolve),
        };
        return afterInsert;
      },
      update(patch: Row) {
        state.updatePatch = patch;
        return builder;
      },
      then(resolve: (value: unknown) => unknown, reject?: (err: unknown) => unknown) {
        return Promise.resolve(settle()).then(resolve, reject);
      },
    };

    return builder;
  }

  const client = {
    from(table: string) {
      queries.push(table);
      return build(table);
    },
  };

  return { tables, queries, client };
}

const GRADE6_LEARNER: Row = {
  id: 'learner-1',
  full_name: 'Wanjiru Kamau',
  grade: 'Grade 6',
  language_preference: 'mixed',
  region: 'Central',
  timezone: 'Africa/Nairobi',
};

const MATH_SESSION: Row = {
  id: 's1',
  user_id: 'learner-1',
  subject: 'Mathematics',
  status: 'active',
  message_count: 0,
  started_at: '2026-09-29T08:00:00Z',
  last_message_at: '2026-09-29T08:00:00Z',
};

// ─────────────────────────────────────────────────────────────────────────────

describe('readLearnerState', () => {
  it('reads the learner name and grade from the profiles row', async () => {
    const db = fakeDb({ profiles: [GRADE6_LEARNER] });

    const state = await readLearnerState(db.client, {
      userId: 'learner-1',
      subject: 'Mathematics',
      gradeFallback: 'Grade 4',
    });

    expect(state.profile.name).toBe('Wanjiru Kamau');
    expect(state.profile.grade).toBe('Grade 6');
    expect(state.profile.region).toBe('Central');
    expect(state.profile.hasProfileRow).toBe(true);
  });

  it('reports no name instead of inventing one when there is no profile row', async () => {
    const db = fakeDb({});

    const state = await readLearnerState(db.client, {
      userId: 'learner-2',
      subject: 'Mathematics',
      gradeFallback: 'Grade 5',
    });

    expect(state.profile.name).toBeNull();
    expect(state.profile.hasProfileRow).toBe(false);
    // The caller supplied the grade because no profile could answer for it.
    expect(state.profile.grade).toBe('Grade 5');
  });

  it('averages only this subjects progress rows into overallProgress', async () => {
    const db = fakeDb({
      learning_progress: [
        { user_id: 'learner-1', subject: 'Mathematics', competency_name: 'Number', progress_percentage: 40, mastery_level: 'developing', questions_asked: 5, time_spent_minutes: 12 },
        { user_id: 'learner-1', subject: 'Mathematics', competency_name: 'Shapes', progress_percentage: 80, mastery_level: 'proficient', questions_asked: 9, time_spent_minutes: 18 },
        { user_id: 'learner-1', subject: 'English', competency_name: 'Reading', progress_percentage: 10, mastery_level: 'emerging', questions_asked: 2, time_spent_minutes: 4 },
      ],
    });

    const state = await readLearnerState(db.client, {
      userId: 'learner-1',
      subject: 'Mathematics',
      gradeFallback: 'Grade 6',
    });

    expect(state.progress.overallProgress).toBe(60);
    expect(state.profile.strengths).toEqual(['Shapes']);
    expect(state.profile.challenges).toEqual(['Number']);
  });

  it('counts this learners sessions in the subject and reads the stored streak', async () => {
    const db = fakeDb({
      chat_sessions: [
        { user_id: 'learner-1', subject: 'Mathematics', status: 'active', message_count: 4, started_at: '2026-09-27T08:00:00Z', last_message_at: '2026-09-27T08:20:00Z' },
        { user_id: 'learner-1', subject: 'Mathematics', status: 'active', message_count: 2, started_at: '2026-09-28T08:00:00Z', last_message_at: '2026-09-28T08:05:00Z' },
        { user_id: 'learner-1', subject: 'Kiswahili', status: 'active', message_count: 6, started_at: '2026-09-28T09:00:00Z', last_message_at: '2026-09-28T09:30:00Z' },
        { user_id: 'learner-2', subject: 'Mathematics', status: 'active', message_count: 8, started_at: '2026-09-28T09:00:00Z', last_message_at: '2026-09-28T09:30:00Z' },
      ],
      daily_activity: [
        { user_id: 'learner-1', activity_date: '2026-09-27', daily_streak: 2, time_spent_minutes: 30 },
        { user_id: 'learner-1', activity_date: '2026-09-28', daily_streak: 3, time_spent_minutes: 25 },
      ],
    });

    const state = await readLearnerState(db.client, {
      userId: 'learner-1',
      subject: 'Mathematics',
      gradeFallback: 'Grade 6',
    });

    expect(state.progress.totalSessions).toBe(2);
    expect(state.progress.streakDays).toBe(3);
    // 55 recorded minutes over 2 sessions, reported as whole minutes.
    expect(state.progress.averageSessionTime).toBe(28);
  });

  it('returns the transcript oldest first so the prompt reads in order', async () => {
    const db = fakeDb({
      chat_messages: [
        { user_id: 'learner-1', session_id: 's1', role: 'user', content: 'How do I divide fractions?', created_at: '2026-09-28T08:00:00Z' },
        { user_id: 'learner-1', session_id: 's1', role: 'assistant', content: 'What does dividing mean here?', created_at: '2026-09-28T08:00:05Z' },
      ],
    });

    const state = await readLearnerState(db.client, {
      userId: 'learner-1',
      subject: 'Mathematics',
      gradeFallback: 'Grade 6',
    });

    expect(state.transcript.map((message) => message.role)).toEqual(['user', 'assistant']);
    expect(db.queries).toContain('chat_messages');
  });
});

describe('recordTutorTurn', () => {
  it('persists both halves of the turn to chat_messages', async () => {
    const db = fakeDb({ chat_sessions: [MATH_SESSION] });

    await recordTutorTurn(db.client, {
      userId: 'learner-1',
      sessionId: 's1',
      userMessage: 'Show me a diagram of a fraction',
      aiResponse: 'Karibu! Imagine a matatu divided into 4 seats...',
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      tokensUsed: 512,
      latencyMs: 900,
    });

    const written = db.tables.chat_messages;
    expect(written.map((row) => row.role)).toEqual(['user', 'assistant']);
    expect(written[1].model).toBe('llama-3.3-70b-versatile');
    expect(written[1].tokens_used).toBe(512);
    expect(written[1].latency_ms).toBe(900);
  });

  it('keeps a turn recorded in one request visible to the next', async () => {
    // This is the defect S-4 is about: the old engine handed out a session id
    // and then forgot it. Two sequential reads of one store must agree.
    const db = fakeDb({ profiles: [GRADE6_LEARNER], chat_sessions: [MATH_SESSION] });

    const before = await readLearnerState(db.client, {
      userId: 'learner-1',
      subject: 'Mathematics',
      gradeFallback: 'Grade 6',
    });
    expect(before.transcript).toHaveLength(0);
    expect(before.profile.learningStyle).toBe('mixed');

    await recordTutorTurn(db.client, {
      userId: 'learner-1',
      sessionId: 's1',
      userMessage: 'Can you show me a picture of the fractions?',
      aiResponse: 'Hongera for asking — here is how to picture it.',
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
    });

    const after = await readLearnerState(db.client, {
      userId: 'learner-1',
      subject: 'Mathematics',
      gradeFallback: 'Grade 6',
    });

    expect(after.transcript).toHaveLength(2);
    expect(after.progress.totalMessages).toBe(2);
    expect(after.profile.learningStyle).toBe('visual');
  });
});

describe('deriveLearningSignals', () => {
  it('reads a visual preference from the learners own words', () => {
    expect(deriveLearningSignals(['draw it for me', 'show me a diagram']).learningStyle).toBe('visual');
  });

  it('reads a hands-on preference from activity words', () => {
    expect(deriveLearningSignals(['can I use counters to solve it?']).learningStyle).toBe('kinesthetic');
  });

  it('stays mixed when the transcript says nothing about style', () => {
    expect(deriveLearningSignals(['what is a numerator?']).learningStyle).toBe('mixed');
    expect(deriveLearningSignals([]).interests).toEqual([]);
  });

  it('collects the interests a learner mentions', () => {
    const signals = deriveLearningSignals(['I like football', 'tell me a story about lions']);
    expect(signals.interests).toEqual(expect.arrayContaining(['sports', 'animals', 'stories']));
  });
});
