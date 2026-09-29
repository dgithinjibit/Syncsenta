/**
 * Points come from the ledger, and only the server can open it.
 *
 * `profiles.total_points` exists in production since the gamification migration was applied on
 * 2026-09-29, and a `BEFORE UPDATE` trigger now reverts any write to it that is not the ledger's own
 * recompute. So the previous module — `points-system.ts` — is not merely unused, it is refused: it
 * read `total_points`, added a number in JavaScript, and wrote it back from the browser. That exact
 * shape is what the trigger was added to stop.
 *
 * What replaced it is `award_points()`, a `SECURITY DEFINER` function granted to `service_role` and
 * revoked from `anon` and `authenticated` (the anon grant survived the first revoke because Supabase
 * hands EXECUTE to anon by default — see the migration file's defect 4). It appends one row and the
 * cache is recomputed from the sum, so a retry cannot double a bonus and two answers in the same
 * second cannot lose one.
 *
 * The mount point is the thing the server already knows and a browser cannot claim: the moment a
 * competency crosses into `mastered`. `/api/chat` classifies every reply, writes progress, and
 * `updateLearningProgress()` already detects the transition — it awards the `competency_mastered`
 * badge on exactly that branch. Points follow the badge.
 *
 * These tests fail against the code as it is: `updateLearningProgress()` returns nothing to report
 * the transition with, `awardCompetencyMastery` does not exist, and the old writer is still in the
 * module.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The modules under test default their client argument to the browser singleton, which needs
// NEXT_PUBLIC_SUPABASE_URL at import time. Every case here injects a fake.
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
import { awardCompetencyMastery, COMPETENCY_MASTERY_POINTS } from '../gamification/points-system';

interface Recorded {
  tables: string[];
  rpcs: Array<{ name: string; args: Record<string, unknown> }>;
}

/**
 * A client stand-in that answers reads from `tables` and records RPC calls. `rpcError` makes the
 * award fail the way PostgREST fails a permission-denied or a CHECK violation: a resolved result with
 * an `error` field, not a thrown exception.
 */
function fakeDb(options: {
  progressRow?: Record<string, unknown> | null;
  rpcError?: { message: string };
  rpcReturns?: unknown;
} = {}): Recorded & { client: any } {
  const rec: Recorded = { tables: [], rpcs: [] };

  const builder: any = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    eq: () => builder,
    neq: () => builder,
    order: () => builder,
    limit: () => builder,
    single: async () => ({ data: options.progressRow ?? null, error: null }),
    maybeSingle: async () => ({ data: options.progressRow ?? null, error: null }),
    then: (resolve: (v: any) => void) =>
      Promise.resolve({ data: null, error: null }).then(resolve),
  };

  return {
    ...rec,
    client: {
      from(table: string) {
        rec.tables.push(table);
        return builder;
      },
      async rpc(name: string, args: Record<string, unknown>) {
        rec.rpcs.push({ name, args });
        if (options.rpcError) return { data: null, error: options.rpcError };
        return { data: options.rpcReturns ?? COMPETENCY_MASTERY_POINTS, error: null };
      },
    },
  };
}

const PROFICIENT_ALGEBRA = {
  user_id: 'learner-1',
  competency_code: 'M8-ALG.1',
  mastery_level: 'proficient',
  mastered_at: null,
  questions_asked: 60,
  questions_answered: 24,
  correct_answers: 23,
  time_spent_minutes: 30,
  progress_percentage: 82,
};

const ALREADY_MASTERED = { ...PROFICIENT_ALGEBRA, mastery_level: 'mastered', mastered_at: '2026-09-01T08:00:00Z', progress_percentage: 95 };

const oneMoreCorrect = {
  competencyName: 'Algebraic expressions',
  subject: 'Mathematics',
  grade: 'Grade 8',
  questionsAsked: 1,
  questionsAnswered: 1,
  correctAnswers: 1,
  timeSpentMinutes: 1,
};

describe('updateLearningProgress reports the mastery transition', () => {
  it('says the competency was just mastered when it crosses from proficient', async () => {
    const db = fakeDb({ progressRow: PROFICIENT_ALGEBRA });

    const result = await updateLearningProgress('learner-1', 'M8-ALG.1', oneMoreCorrect, db.client);

    expect(result?.masteryJustAchieved).toBe(true);
    expect(result?.competencyCode).toBe('M8-ALG.1');
  });

  it('does not report a transition for a competency that was already mastered', async () => {
    const db = fakeDb({ progressRow: ALREADY_MASTERED });

    const result = await updateLearningProgress('learner-1', 'M8-ALG.1', oneMoreCorrect, db.client);

    expect(result?.masteryJustAchieved).toBe(false);
  });

  it('does not report a transition while the competency is still short of mastered', async () => {
    const db = fakeDb({
      progressRow: { ...PROFICIENT_ALGEBRA, questions_answered: 4, correct_answers: 3, progress_percentage: 40 },
    });

    const result = await updateLearningProgress('learner-1', 'M8-ALG.1', oneMoreCorrect, db.client);

    expect(result?.masteryJustAchieved).toBe(false);
  });
});

describe('the mastery award appends to the ledger', () => {
  it('calls award_points with the competency_mastered type and the mastery component only', async () => {
    const db = fakeDb();

    await awardCompetencyMastery('learner-1', 'M8-ALG.1', db.client);

    expect(db.rpcs).toHaveLength(1);
    expect(db.rpcs[0].name).toBe('award_points');
    expect(db.rpcs[0].args).toMatchObject({
      p_user_id: 'learner-1',
      p_competency_code: 'M8-ALG.1',
      p_transaction_type: 'competency_mastered',
      p_mastery_bonus: COMPETENCY_MASTERY_POINTS,
    });
  });

  it('never writes profiles.total_points, which is what the ledger replaced', async () => {
    const db = fakeDb();

    await awardCompetencyMastery('learner-1', 'M8-ALG.1', db.client);

    expect(db.tables).not.toContain('profiles');
    expect(db.tables).not.toContain('point_transactions');
  });

  it('returns the points the ledger actually granted', async () => {
    const db = fakeDb({ rpcReturns: 50 });

    const awarded = await awardCompetencyMastery('learner-1', 'M8-ALG.1', db.client);

    expect(awarded).toBe(50);
  });

  it('reports an award the database refused instead of swallowing it', async () => {
    const db = fakeDb({ rpcError: { message: 'permission denied for function award_points' } });

    await expect(awardCompetencyMastery('learner-1', 'M8-ALG.1', db.client)).rejects.toThrow(
      /permission denied for function award_points/,
    );
  });

  it('refuses to award nothing, because an empty row would still recompute the cache', async () => {
    const db = fakeDb();

    await expect(
      awardCompetencyMastery('learner-1', 'M8-ALG.1', db.client, { points: 0 }),
    ).rejects.toThrow(/points/i);
    expect(db.rpcs).toHaveLength(0);
  });
});

describe('the dead client-side writer stays dead', () => {
  const source = readFileSync(
    join(process.cwd(), 'src', 'lib', 'gamification', 'points-system.ts'),
    'utf8',
  );

  it('no longer reads total_points, adds a number, and writes it back', () => {
    expect(source).not.toMatch(/update\(\s*\{[\s\S]{0,80}total_points/);
    expect(source).not.toMatch(/\.select\(\s*['"]total_points['"]/);
  });

  it('no longer counts other learners profiles to guess a rank', () => {
    // RLS returns zero rows for that count, which is the reason get_leaderboard() exists.
    expect(source).not.toMatch(/\.gt\(\s*['"]total_points['"]/);
  });

  it('awards through an RPC rather than an insert into the ledger', () => {
    expect(source).not.toMatch(/from\(\s*['"]point_transactions['"]\s*\)\s*\.insert/);
  });
});

describe('/api/chat is the one that opens the ledger', () => {
  const route = readFileSync(join(process.cwd(), 'src', 'app', 'api', 'chat', 'route.ts'), 'utf8');

  it('awards on the reported transition', () => {
    expect(route).toMatch(/masteryJustAchieved/);
    expect(route).toMatch(/awardCompetencyMastery\(/);
  });

  it('awards with the service-role client, not the anon-session one', () => {
    // award_points is granted to service_role only; the route's `supabase` runs as the calling user
    // and would be refused with 42501.
    const call = route.match(/awardCompetencyMastery\(([\s\S]{0,220}?)\);/);
    expect(call, 'awardCompetencyMastery call not found').toBeTruthy();
    expect(call![1]).toMatch(/supabaseAdmin/);
    expect(call![1]).not.toMatch(/,\s*supabase\s*\)/);
  });
});
