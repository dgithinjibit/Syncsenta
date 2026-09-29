/**
 * One learner, two requests, one row.
 *
 * `updateLearningProgress()` reads a row, adds to its counters in JavaScript, and writes the totals
 * back. Two requests for the same competency — a learner who double-taps, a tutor turn and a
 * challenge answer in the same second, a retry after a timeout — interleave inside that window:
 * both read `proficient` at 19, both compute 20, both write, and both conclude they were the one
 * that crossed into `mastered`. The learner is paid twice for one achievement, which is the exact
 * failure the points ledger exists to prevent, and one of the two answers is silently lost because
 * the second write overwrites the first one's totals with numbers derived from a stale row.
 *
 * The fix is an optimistic lock: the UPDATE carries the values the arithmetic was computed from, so
 * PostgREST lands it only if nothing moved underneath (`data: []` means zero rows matched), and the
 * writer re-reads and recomputes instead of asserting its stale totals. The badge and the points
 * follow the same boolean, so a request that loses the race stops being able to award either.
 *
 * These fail against the code as it is: there is no guard on the UPDATE, so the loser reports
 * `masteryJustAchieved: true`, awards a second badge, and files counters built from a row that no
 * longer exists.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// `progress-tracking.ts` defaults its client to the browser singleton, which needs
// NEXT_PUBLIC_SUPABASE_URL at import time. Every case here injects a fake instead.
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

import { updateLearningProgress } from '../progress/progress-tracking';

type Row = Record<string, unknown>;

interface RaceDb {
  client: any;
  /** A fresh copy each call, because that is what a read from PostgREST hands back. */
  stored: () => Row;
  /** Every UPDATE this call sent, including the ones the row's guard rejected. */
  attempts: Array<{ patch: Row; predicates: Array<[string, unknown]>; landed: boolean }>;
  /** The ones that actually landed. */
  updates: Array<{ patch: Row; predicates: Array<[string, unknown]> }>;
  badges: Row[];
}

/**
 * A store that behaves like PostgREST on the one point that matters: an `UPDATE … WHERE` that
 * matches nothing reports zero rows rather than failing.
 *
 * `competitor` runs immediately before a read is answered, which is where the other request's
 * commit actually lands — after this one has read the row and before it writes.
 */
function raceDb(initial: Row, options: { competitor?: (current: Row) => Row; onEveryRead?: boolean } = {}): RaceDb {
  let current: Row = { ...initial };
  const attempts: Array<{ patch: Row; predicates: Array<[string, unknown]>; landed: boolean }> = [];
  const updates: RaceDb['updates'] = [];
  const badges: Row[] = [];
  let competitorRuns = options.competitor ? (options.onEveryRead ? Infinity : 1) : 0;

  const table = (name: string) => {
    const predicates: Array<[string, unknown]> = [];
    let patch: Row | null = null;
    let mode: 'read' | 'write' = 'read';

    const matches = () => predicates.every(([column, value]) => current[column] === value);

    const settle = async () => {
      if (mode === 'write' && patch) {
        const landed = matches();
        attempts.push({ patch, predicates: [...predicates], landed });
        if (landed) {
          current = { ...current, ...patch };
          updates.push({ patch, predicates: [...predicates] });
        }
        return { data: landed ? [{ ...current }] : [], error: null };
      }
      return { data: null, error: null };
    };

    const builder: any = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        predicates.push([column, value]);
        return builder;
      },
      insert: (values: Row) => {
        if (name === 'achievements') badges.push(values);
        return builder;
      },
      update: (next: Row) => {
        mode = 'write';
        patch = next;
        return builder;
      },
      single: async () => {
        if (!matches()) return { data: null, error: { message: 'no rows matched' }, code: 'PGRST116' };
        const read = { ...current };
        // The other request commits *after* this one has its answer in hand, which is the window
        // the guard has to notice.
        if (competitorRuns > 0 && options.competitor) {
          competitorRuns -= 1;
          current = { ...options.competitor(current) };
        }
        return { data: read, error: null };
      },
      maybeSingle: async () => builder.single(),
      then: (resolve: (v: any) => void, reject: (e: unknown) => void) => settle().then(resolve, reject),
    };
    return builder;
  };

  return {
    client: { from: (name: string) => table(name) },
    stored: () => ({ ...current }),
    attempts,
    updates,
    badges,
  };
}

/** Algebra one question short of the 20 answers that carry a competency into `mastered`. */
const ALMOST_MASTERED: Row = {
  user_id: 'learner-1',
  competency_code: 'M8-ALG.1',
  mastery_level: 'proficient',
  mastered_at: null,
  questions_asked: 40,
  questions_answered: 19,
  correct_answers: 19,
  time_spent_minutes: 30,
  progress_percentage: 88,
};

const oneMoreCorrect = {
  competencyName: 'Algebraic expressions',
  subject: 'Mathematics',
  grade: 'Grade 8',
  questionsAsked: 1,
  questionsAnswered: 1,
  correctAnswers: 1,
  timeSpentMinutes: 1,
};

/** The other request: it reaches 20 answers first and crosses into `mastered`. */
function theOtherRequestWins(row: Row): Row {
  return {
    ...row,
    questions_asked: Number(row.questions_asked) + 1,
    questions_answered: 20,
    correct_answers: 20,
    progress_percentage: 95,
    mastery_level: 'mastered',
    mastered_at: '2026-09-29T09:00:00.000Z',
  };
}

describe('the request that loses the race', () => {
  let db: RaceDb;

  beforeEach(async () => {
    db = raceDb(ALMOST_MASTERED, { competitor: theOtherRequestWins });
  });

  it('does not report a mastery transition the database already recorded', async () => {
    const result = await updateLearningProgress('learner-1', 'M8-ALG.1', oneMoreCorrect, db.client);

    expect(result.masteryJustAchieved).toBe(false);
  });

  it('awards no second badge, because the badge and the points read the same boolean', async () => {
    await updateLearningProgress('learner-1', 'M8-ALG.1', oneMoreCorrect, db.client);

    expect(db.badges).toHaveLength(0);
  });

  it('adds its answer to the row that exists now, not to the one it read', async () => {
    await updateLearningProgress('learner-1', 'M8-ALG.1', oneMoreCorrect, db.client);

    const saved = db.stored();
    expect(saved.questions_answered).toBe(21);
    expect(saved.correct_answers).toBe(21);
    expect(saved.questions_asked).toBe(42);
  });

  it('refuses to land its write unless the row still carries the numbers it computed from', async () => {
    await updateLearningProgress('learner-1', 'M8-ALG.1', oneMoreCorrect, db.client);

    const guard = Object.fromEntries(db.attempts[0].predicates);
    expect(guard).toMatchObject({
      user_id: 'learner-1',
      competency_code: 'M8-ALG.1',
      questions_asked: 40,
      questions_answered: 19,
      correct_answers: 19,
      mastery_level: 'proficient',
    });
    // The guard is the whole point: that write was rejected, and the retry is what saved the answer.
    expect(db.attempts[0].landed).toBe(false);
    expect(db.attempts[1].landed).toBe(true);
  });
});

describe('the request that is alone', () => {
  it('writes once, reports the transition, and awards the badge', async () => {
    const db = raceDb(ALMOST_MASTERED);

    const result = await updateLearningProgress('learner-1', 'M8-ALG.1', oneMoreCorrect, db.client);

    expect(result.masteryJustAchieved).toBe(true);
    expect(db.updates).toHaveLength(1);
    expect(db.badges).toHaveLength(1);
    expect(db.stored().questions_answered).toBe(20);
    expect(db.stored().mastery_level).toBe('mastered');
  });

  it('leaves a competency that was already mastered exactly as quiet as it was', async () => {
    const db = raceDb({ ...ALMOST_MASTERED, mastery_level: 'mastered', mastered_at: '2026-09-01T08:00:00Z' });

    const result = await updateLearningProgress('learner-1', 'M8-ALG.1', oneMoreCorrect, db.client);

    expect(result.masteryJustAchieved).toBe(false);
    expect(db.badges).toHaveLength(0);
  });
});

describe('a row that will not stay still', () => {
  it('gives up with a named error rather than writing stale totals or looping forever', async () => {
    const db = raceDb(ALMOST_MASTERED, { competitor: theOtherRequestWins, onEveryRead: true });

    await expect(
      updateLearningProgress('learner-1', 'M8-ALG.1', oneMoreCorrect, db.client),
    ).rejects.toThrow(/M8-ALG\.1/);
    expect(db.updates.length).toBeLessThanOrEqual(3);
  });
});

describe('the first write for a competency', () => {
  it('is unchanged: there is no row to lose a race against', async () => {
    const inserts: Row[] = [];
    const client: any = {
      from: () => {
        const builder: any = {
          select: () => builder,
          eq: () => builder,
          update: () => builder,
          insert: (values: Row) => {
            inserts.push(values);
            return builder;
          },
          single: async () => ({ data: null, error: { code: 'PGRST116', message: 'no rows' } }),
          maybeSingle: async () => ({ data: null, error: { code: 'PGRST116', message: 'no rows' } }),
          then: (resolve: (v: any) => void) => Promise.resolve({ data: null, error: null }).then(resolve),
        };
        return builder;
      },
    };

    const result = await updateLearningProgress('learner-2', 'M8-ALG.1', oneMoreCorrect, client);

    expect(result.masteryJustAchieved).toBe(false);
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ questions_answered: 1, correct_answers: 1 });
  });
});
