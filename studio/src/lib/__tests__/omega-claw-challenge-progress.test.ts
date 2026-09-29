/**
 * O-5 — the challenge path has to survive a refresh.
 *
 * `interactive-challenge-path.tsx` kept the learner's progress in
 * `useState<string[]>([])`. Nothing else in the app knows a node was completed: no table is written,
 * no route is called, so a refresh — or a second device, or the school Chromebook signing back in
 * tomorrow — starts every learner at zero. The 50-point mastery award Stage 1 shipped can therefore
 * never be earned from the path: it follows `updateLearningProgress()`'s mastery transition, and a
 * state array does not call it.
 *
 * These tests drive the replacement with the same in-memory fake used by
 * `mwalimu-learner-state.test.ts`: rows are plain objects and writes land in the arrays the next read
 * scans, which is what makes "a second mount reads back what the first one wrote" an assertion rather
 * than a demo. Deliberate, because `vitest.config.ts` is `environment: 'node'`, this machine has
 * 3.7 GB of RAM, and CI has no Supabase credentials.
 *
 * Two properties the tests insist on:
 *   - the server grades the answer. A client that posts `correct: true` for a wrong option must not
 *     be able to hand itself the ledger award;
 *   - the award goes through the service client while the progress row goes through the caller's own
 *     client, because `award_points()` is revoked for `anon` and `authenticated` on purpose.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  OMEGA_CLAW_CHALLENGE_NODES,
  OmegaClawUnknownChallengeNode,
  omegaClawChallengeCompetencyCode,
  readCompletedOmegaClawNodes,
  recordOmegaClawNodeAttempt,
} from '../omega-agent/omega-claw-challenge';

// ─────────────────────────────────────────────────────────────────────────────
// In-memory fake of the subset of `SupabaseClient` these two functions use.
// Supports `from(t).select().eq()` awaited as a list, `.single()`, `.maybeSingle()`,
// `insert(row)`, `update(patch).eq()` and `rpc(name, args)`; `rpcError` makes the
// ledger fail the way PostgREST fails a permission denial: a resolved error, not a throw.
// ─────────────────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

interface FakeDb {
  tables: Record<string, Row[]>;
  rpcs: Array<{ name: string; args: Record<string, unknown> }>;
  client: any;
}

function fakeDb(
  seed: Record<string, Row[]> = {},
  options: { rpcError?: { message: string } } = {},
): FakeDb {
  const tables: Record<string, Row[]> = {
    learning_progress: [],
    achievements: [],
    ...seed,
  };
  const rpcs: FakeDb['rpcs'] = [];

  function build(table: string): any {
    const state = {
      filters: [] as Array<[string, unknown]>,
      updatePatch: null as Row | null,
    };

    function matched(): Row[] {
      return tables[table].filter((row) =>
        state.filters.every(([column, value]) => row[column] === value),
      );
    }

    function settle(): { data: unknown; error: null } {
      if (state.updatePatch) {
        // PostgREST hands back JSON: a row already read stays as it was. Mutating the very object a
        // previous select returned would let `updateLearningProgress()` compare the level it just
        // wrote against itself and never see a transition.
        tables[table] = tables[table].map((row) =>
          state.filters!.every(([column, value]) => row[column] === value)
            ? { ...row, ...state.updatePatch }
            : row,
        );
        return { data: null, error: null };
      }
      return { data: matched(), error: null };
    }

    const builder: any = {
      select() {
        return builder;
      },
      eq(column: string, value: unknown) {
        state.filters.push([column, value]);
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
        return Promise.resolve({ data: created, error: null });
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

  return {
    tables,
    rpcs,
    client: {
      from(table: string) {
        if (!tables[table]) tables[table] = [];
        return build(table);
      },
      async rpc(name: string, args: Record<string, unknown>) {
        rpcs.push({ name, args });
        if (options.rpcError) return { data: null, error: options.rpcError };
        return { data: 50, error: null };
      },
    },
  };
}

/** The row shape `updateLearningProgress()` reads back for an existing competency. */
function progressRow(nodeId: string, overrides: Row = {}): Row {
  return {
    user_id: 'learner-1',
    competency_code: omegaClawChallengeCompetencyCode(nodeId),
    competency_name: nodeId,
    subject: 'Omega Claw',
    grade: 'Grade 6',
    mastery_level: 'emerging',
    mastered_at: null,
    progress_percentage: 100,
    questions_asked: 1,
    questions_answered: 1,
    correct_answers: 1,
    time_spent_minutes: 0,
    hints_used: 0,
    consecutive_wrong: 0,
    ...overrides,
  };
}

const FIRST_NODE = OMEGA_CLAW_CHALLENGE_NODES[0];
const SECOND_NODE = OMEGA_CLAW_CHALLENGE_NODES[1];

// ─────────────────────────────────────────────────────────────────────────────

describe('readCompletedOmegaClawNodes', () => {
  it('returns nothing for a learner who has not answered yet', async () => {
    const db = fakeDb();

    await expect(readCompletedOmegaClawNodes(db.client, 'learner-1')).resolves.toEqual([]);
  });

  it('returns the nodes that have a correct answer, in pack order', async () => {
    const db = fakeDb({
      learning_progress: [
        progressRow(SECOND_NODE.id),
        progressRow(FIRST_NODE.id),
      ],
    });

    await expect(readCompletedOmegaClawNodes(db.client, 'learner-1')).resolves.toEqual([
      FIRST_NODE.id,
      SECOND_NODE.id,
    ]);
  });

  it('does not report a node that was attempted and missed', async () => {
    const db = fakeDb({
      learning_progress: [progressRow(FIRST_NODE.id, { correct_answers: 0, questions_answered: 1 })],
    });

    await expect(readCompletedOmegaClawNodes(db.client, 'learner-1')).resolves.toEqual([]);
  });

  it('ignores competencies the chat tutor writes and rows belonging to another learner', async () => {
    const db = fakeDb({
      learning_progress: [
        { ...progressRow(FIRST_NODE.id), user_id: 'learner-2' },
        { ...progressRow('untouched'), competency_code: 'M8-ALG.1' },
      ],
    });

    await expect(readCompletedOmegaClawNodes(db.client, 'learner-1')).resolves.toEqual([]);
  });
});

describe('recordOmegaClawNodeAttempt', () => {
  it('leaves a node completed for the next read — the refresh test the scoreboard asks for', async () => {
    const db = fakeDb();

    const attempt = await recordOmegaClawNodeAttempt({
      client: db.client,
      serviceClient: db.client,
      userId: 'learner-1',
      grade: 'Grade 6',
      nodeId: FIRST_NODE.id,
      answer: FIRST_NODE.answer,
    });

    expect(attempt.correct).toBe(true);

    await expect(readCompletedOmegaClawNodes(db.client, 'learner-1')).resolves.toEqual([
      FIRST_NODE.id,
    ]);
    expect(attempt.completed).toEqual([FIRST_NODE.id]);
  });

  it('grades the answer itself, so a client cannot claim a node it missed', async () => {
    const db = fakeDb();
    const missed = FIRST_NODE.options.find((option) => option !== FIRST_NODE.answer)!;

    const attempt = await recordOmegaClawNodeAttempt({
      client: db.client,
      serviceClient: db.client,
      userId: 'learner-1',
      grade: 'Grade 6',
      nodeId: FIRST_NODE.id,
      answer: missed,
    });

    expect(attempt.correct).toBe(false);
    await expect(readCompletedOmegaClawNodes(db.client, 'learner-1')).resolves.toEqual([]);
    expect(db.tables.learning_progress).toHaveLength(1);
    expect(db.tables.learning_progress[0]).toMatchObject({
      competency_code: omegaClawChallengeCompetencyCode(FIRST_NODE.id),
      questions_answered: 1,
      correct_answers: 0,
    });
  });

  it('keeps one row per node, because (user_id, competency_code) is unique in production', async () => {
    const db = fakeDb();
    const call = (answer: string) =>
      recordOmegaClawNodeAttempt({
        client: db.client,
        serviceClient: db.client,
        userId: 'learner-1',
        grade: 'Grade 6',
        nodeId: FIRST_NODE.id,
        answer,
      });

    await call(FIRST_NODE.options.find((option) => option !== FIRST_NODE.answer)!);
    await call(FIRST_NODE.answer);

    expect(db.tables.learning_progress).toHaveLength(1);
    await expect(readCompletedOmegaClawNodes(db.client, 'learner-1')).resolves.toEqual([
      FIRST_NODE.id,
    ]);
  });

  it('refuses a node id the path does not have, before touching the database', async () => {
    const db = fakeDb();

    await expect(
      recordOmegaClawNodeAttempt({
        client: db.client,
        serviceClient: db.client,
        userId: 'learner-1',
        grade: 'Grade 6',
        nodeId: '../../etc/passwd',
        answer: 'anything',
      }),
    ).rejects.toBeInstanceOf(OmegaClawUnknownChallengeNode);
    expect(db.tables.learning_progress).toHaveLength(0);
  });

  it('appends to the ledger through the service client when the competency is mastered', async () => {
    // The transition needs 20 answered questions at >= 90%, so the row starts there; the point of
    // this fixture is the wiring, and the roadmap records that a 3-node path cannot reach it yet.
    const user = fakeDb({
      learning_progress: [
        progressRow(FIRST_NODE.id, {
          questions_asked: 40,
          questions_answered: 20,
          correct_answers: 19,
          progress_percentage: 85,
          mastery_level: 'proficient',
        }),
      ],
    });
    const service = fakeDb();

    const attempt = await recordOmegaClawNodeAttempt({
      client: user.client,
      serviceClient: service.client,
      userId: 'learner-1',
      grade: 'Grade 6',
      nodeId: FIRST_NODE.id,
      answer: FIRST_NODE.answer,
    });

    expect(attempt.masteryJustAchieved).toBe(true);
    expect(service.rpcs).toHaveLength(1);
    expect(service.rpcs[0].name).toBe('award_points');
    expect(service.rpcs[0].args).toMatchObject({
      p_user_id: 'learner-1',
      p_competency_code: omegaClawChallengeCompetencyCode(FIRST_NODE.id),
      p_transaction_type: 'competency_mastered',
    });
    expect(attempt.pointsAwarded).toBe(50);
  });

  it('does not open the ledger for an ordinary answer', async () => {
    const user = fakeDb();
    const service = fakeDb();

    const attempt = await recordOmegaClawNodeAttempt({
      client: user.client,
      serviceClient: service.client,
      userId: 'learner-1',
      grade: 'Grade 6',
      nodeId: FIRST_NODE.id,
      answer: FIRST_NODE.answer,
    });

    expect(attempt.masteryJustAchieved).toBe(false);
    expect(attempt.pointsAwarded).toBeNull();
    expect(service.rpcs).toHaveLength(0);
  });

  it('keeps the completion when the ledger refuses the award', async () => {
    const user = fakeDb({
      learning_progress: [
        progressRow(FIRST_NODE.id, {
          questions_asked: 40,
          questions_answered: 20,
          correct_answers: 19,
          progress_percentage: 85,
          mastery_level: 'proficient',
        }),
      ],
    });
    const service = fakeDb({}, { rpcError: { message: 'permission denied for function award_points' } });

    const attempt = await recordOmegaClawNodeAttempt({
      client: user.client,
      serviceClient: service.client,
      userId: 'learner-1',
      grade: 'Grade 6',
      nodeId: FIRST_NODE.id,
      answer: FIRST_NODE.answer,
    });

    expect(attempt.masteryJustAchieved).toBe(true);
    expect(attempt.pointsAwarded).toBeNull();
    await expect(readCompletedOmegaClawNodes(user.client, 'learner-1')).resolves.toEqual([
      FIRST_NODE.id,
    ]);
  });
});

describe('the card and the route read one node list', () => {
  it('takes the nodes from this module instead of declaring its own', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/student/interactive-challenge-path.tsx'),
      'utf8',
    );

    expect(source).toContain('OMEGA_CLAW_CHALLENGE_NODES');
    for (const node of OMEGA_CLAW_CHALLENGE_NODES) {
      expect(source).not.toContain(`id: '${node.id}'`);
    }
  });
});
