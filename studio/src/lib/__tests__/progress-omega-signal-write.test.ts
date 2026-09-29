/**
 * The Omega signals ride the guarded write, or they do not ride at all.
 *
 * `c71aa18` guarded the counters and `9110da3` guarded the daily row, and reading the call site for the
 * second one turned up the third instance of the same shape: `/api/chat` computed `hints_used` and
 * `consecutive_wrong` from a row read before the answer was generated, then wrote them in a second,
 * unconditioned `UPDATE` immediately after the guarded one (`src/app/api/chat/route.ts:726-733` as it
 * stands). Two concurrent turns therefore settled by arrival order — one turn's increment could be
 * replaced by the other's reset — and the scaffolding decision on the next request was made from
 * whichever number landed last.
 *
 * The fix is not a second retry loop bolted onto a route handler. The signal a writer means to write is
 * an *intent* (at least this many hints; this much streak, or reset it), so the arithmetic belongs where
 * the fresh row is, inside the attempt that is about to land. These tests fail against the code as it
 * is: `updateLearningProgress()` ignores the `signals` field entirely and the route still carries its
 * own write.
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

import { updateLearningProgress } from '../progress/progress-tracking';

type Row = Record<string, unknown>;

interface Db {
  client: any;
  attempts: Array<{ patch: Row; predicates: Array<[string, unknown]>; landed: boolean }>;
  inserts: Row[];
  stored: () => Row | null;
}

/**
 * One `learning_progress` row, optionally with a second writer that commits in the gap between this
 * request's read and its write.
 *
 * The competitor runs *after* the snapshot is handed back — before it, the read would already carry the
 * other request's numbers and the race the test exists to prove would never happen.
 */
function signalDb(initial: Row | null, competitor?: (row: Row) => Row): Db {
  let current: Row | null = initial ? { ...initial } : null;
  let competitorRuns = competitor ? 1 : 0;
  const attempts: Db['attempts'] = [];
  const inserts: Row[] = [];
  let predicates: Array<[string, unknown]> = [];
  let mode: 'read' | 'update' | 'insert' = 'read';
  let currentPatch: Row | null = null;

  const builder: any = {
    select: () => builder,
    eq: (column: string, value: unknown) => {
      predicates.push([column, value]);
      return builder;
    },
    update: (patch: Row) => {
      mode = 'update';
      currentPatch = patch;
      return builder;
    },
    insert: (values: Row) => {
      mode = 'insert';
      currentPatch = values;
      return builder;
    },
    single: async () => {
      const read = current ? { ...current } : null;
      if (competitor && competitorRuns > 0 && current) {
        competitorRuns -= 1;
        current = { ...competitor(current) };
      }
      return { data: read, error: read ? null : { code: 'PGRST116', message: 'no rows' } };
    },
    then: async (resolve: (v: any) => void) => {
      if (mode === 'update' && currentPatch && current) {
        const landed = predicates.every(([column, value]) => current![column] === value);
        attempts.push({ patch: { ...currentPatch }, predicates: [...predicates], landed });
        if (landed) current = { ...current, ...currentPatch };
        return Promise.resolve({ data: landed ? [{ ...current }] : [], error: null }).then(resolve);
      }
      if (mode === 'insert' && currentPatch) {
        inserts.push({ ...currentPatch });
        current = { ...currentPatch };
        return Promise.resolve({ data: [{ ...current }], error: null }).then(resolve);
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
    attempts,
    inserts,
    stored: () => (current ? { ...current } : null),
  };
}

const ROW: Row = {
  user_id: 'learner-1',
  competency_code: 'M8-ALG.1',
  questions_asked: 10,
  questions_answered: 8,
  correct_answers: 6,
  time_spent_minutes: 4,
  progress_percentage: 61,
  mastery_level: 'developing',
  mastered_at: null,
  hints_used: 1,
  consecutive_wrong: 1,
};

const TURN = {
  competencyName: 'Algebraic expressions',
  subject: 'Mathematics',
  grade: 'Grade 8',
  questionsAsked: 1,
  questionsAnswered: 1,
  correctAnswers: 1,
  timeSpentMinutes: 1,
};

describe('the signals and the counters are one write', () => {
  it('carries hints_used and consecutive_wrong in the guarded UPDATE', async () => {
    const db = signalDb(ROW);

    await updateLearningProgress('learner-1', 'M8-ALG.1', {
      ...TURN,
      signals: { hintsUsedAtLeast: 2, consecutiveWrongDelta: 1 },
    }, db.client);

    expect(db.attempts).toHaveLength(1);
    expect(db.attempts[0].patch.questions_answered).toBe(9);
    expect(db.attempts[0].patch.hints_used).toBe(2);
    expect(db.attempts[0].patch.consecutive_wrong).toBe(2);
  });

  it('never lowers hints_used, because the claim is a floor and not a total', async () => {
    const db = signalDb(ROW);

    await updateLearningProgress('learner-1', 'M8-ALG.1', {
      ...TURN,
      signals: { hintsUsedAtLeast: 0 },
    }, db.client);

    expect(db.attempts[0].patch.hints_used).toBe(1);
  });

  it('resets the wrong-answer streak when the answer was right', async () => {
    const db = signalDb(ROW);

    await updateLearningProgress('learner-1', 'M8-ALG.1', {
      ...TURN,
      signals: { resetConsecutiveWrong: true },
    }, db.client);

    expect(db.attempts[0].patch.consecutive_wrong).toBe(0);
  });

  it('writes neither column when a caller has no signals to report', async () => {
    const db = signalDb(ROW);

    await updateLearningProgress('learner-1', 'M8-ALG.1', TURN, db.client);

    expect(db.attempts[0].patch).not.toHaveProperty('hints_used');
    expect(db.attempts[0].patch).not.toHaveProperty('consecutive_wrong');
  });

  it('caps the streak at ten, which is what the route clamped before this moved', async () => {
    const db = signalDb({ ...ROW, consecutive_wrong: 9 });

    await updateLearningProgress('learner-1', 'M8-ALG.1', {
      ...TURN,
      correctAnswers: 0,
      signals: { consecutiveWrongDelta: 3 },
    }, db.client);

    expect(db.attempts[0].patch.consecutive_wrong).toBe(10);
  });
});

describe('the writer that lost the row', () => {
  it('adds the delta to the streak that exists now, not the one it read', async () => {
    const competingTurn = (row: Row): Row => ({
      ...row,
      questions_answered: 9,
      correct_answers: 7,
      hints_used: 4,
      consecutive_wrong: 3,
    });
    const db = signalDb(ROW, competingTurn);

    await updateLearningProgress('learner-1', 'M8-ALG.1', {
      ...TURN,
      signals: { hintsUsedAtLeast: 2, consecutiveWrongDelta: 1 },
    }, db.client);

    expect(db.attempts).toHaveLength(2);
    expect(db.attempts[0].landed).toBe(false);
    expect(db.attempts[1].landed).toBe(true);
    // 3 from the competing turn, +1 here — not the 2 this request's stale read would have written.
    expect(db.stored()!.consecutive_wrong).toBe(4);
    expect(db.stored()!.hints_used).toBe(4);
  });
});

describe('the first write for a competency', () => {
  it('carries the signals into the insert, so the row is not born at zero', async () => {
    const db = signalDb(null);

    await updateLearningProgress('learner-1', 'M8-ALG.1', {
      ...TURN,
      questionsAnswered: 1,
      correctAnswers: 0,
      signals: { hintsUsedAtLeast: 2, consecutiveWrongDelta: 1 },
    }, db.client);

    expect(db.inserts).toHaveLength(1);
    expect(db.inserts[0].hints_used).toBe(2);
    expect(db.inserts[0].consecutive_wrong).toBe(1);
  });
});

describe('the route stops writing the signals itself', () => {
  it('touches learning_progress once, on the read, because the guarded write owns the columns', () => {
    const source = readFileSync(join(process.cwd(), 'src/app/api/chat/route.ts'), 'utf8');

    expect(source.match(/from\('learning_progress'\)/g)).toHaveLength(1);
  });

  it('reports the stored pair to the scaffolding telemetry, not its own arithmetic', () => {
    const source = readFileSync(join(process.cwd(), 'src/app/api/chat/route.ts'), 'utf8');

    expect(source).toMatch(/hintsUsed:\s*progressResult\.hintsUsed/);
    expect(source).toMatch(/consecutiveWrong:\s*progressResult\.consecutiveWrong/);
    // The turn's intent is no longer evidence of what the row holds.
    expect(source).not.toMatch(/hintsUsed:\s*newHintsUsed/);
  });
});

describe('what the write returns', () => {
  it('is the pair the row holds, so a claim cannot report itself as fact', async () => {
    const db = signalDb(ROW);

    const result = await updateLearningProgress('learner-1', 'M8-ALG.1', {
      ...TURN,
      signals: { hintsUsedAtLeast: 0, consecutiveWrongDelta: 2 },
    }, db.client);

    expect(result.hintsUsed).toBe(1);
    expect(result.consecutiveWrong).toBe(3);
  });

  it('carries the stored pair through a retry, not the stale one it started with', async () => {
    const competingTurn = (row: Row): Row => ({
      ...row,
      questions_answered: 9,
      correct_answers: 7,
      hints_used: 4,
      consecutive_wrong: 3,
    });
    const db = signalDb(ROW, competingTurn);

    const result = await updateLearningProgress('learner-1', 'M8-ALG.1', {
      ...TURN,
      signals: { hintsUsedAtLeast: 2, consecutiveWrongDelta: 1 },
    }, db.client);

    expect(result.hintsUsed).toBe(4);
    expect(result.consecutiveWrong).toBe(4);
  });

  it('still reports the row to a caller that sent no signals', async () => {
    const db = signalDb(ROW);

    const result = await updateLearningProgress('learner-1', 'M8-ALG.1', TURN, db.client);

    expect(result.hintsUsed).toBe(1);
    expect(result.consecutiveWrong).toBe(1);
  });

  it('reports the pair a first write created', async () => {
    const db = signalDb(null);

    const result = await updateLearningProgress('learner-1', 'M8-ALG.1', {
      ...TURN,
      correctAnswers: 0,
      signals: { hintsUsedAtLeast: 3, consecutiveWrongDelta: 1 },
    }, db.client);

    expect(result.hintsUsed).toBe(3);
    expect(result.consecutiveWrong).toBe(1);
  });
});
