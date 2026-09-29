import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `GET`/`POST /api/omega-claw/challenge` — the persistence half of O-5.
 *
 * The card used to keep completed nodes in React state, so there was nothing to authenticate and
 * nothing to validate. Both routes now have to behave like the rest of the app's writes:
 *
 *   - the learner comes from the session cookie, never from the body (an anonymous call is a 401);
 *   - the grade comes from `profiles`, never from the body, so a learner cannot file their challenge
 *     rows under a grade they are not in;
 *   - the progress row is written with the caller's own client, because RLS owner policies are what
 *     keep one learner out of another's `learning_progress`;
 *   - only `award_points()` runs on the service client, because that function is revoked for
 *     `anon`/`authenticated` on purpose (see the gamification migration's defect 4).
 *
 * The user client's `rpc` throws here: if a route ever opens the ledger as the calling user, the test
 * fails loudly instead of returning a 42501 a learner would read as "I did not earn anything".
 */

const deps = vi.hoisted(() => ({
  routeClient: vi.fn(),
  serviceClient: vi.fn(),
}));

vi.mock('@/lib/supabase/route-handler', () => ({
  createSupabaseRouteHandlerClient: deps.routeClient,
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: deps.serviceClient,
}));

import { GET as challengeGET, POST as challengePOST } from '@/app/api/omega-claw/challenge/route';
import {
  OMEGA_CLAW_CHALLENGE_NODES,
  omegaClawChallengeCompetencyCode,
} from '@/lib/omega-agent/omega-claw-challenge';

type Row = Record<string, unknown>;

function fakeDb(tables: Record<string, Row[]>) {
  const rpcs: Array<{ name: string; args: Record<string, unknown> }> = [];

  function build(table: string): any {
    const state = { filters: [] as Array<[string, unknown]>, updatePatch: null as Row | null };
    const matched = () =>
      (tables[table] ?? []).filter((row) =>
        state.filters.every(([column, value]) => row[column] === value),
      );

    const builder: any = {
      select: () => builder,
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
        return Promise.resolve({ data: matched()[0] ?? null, error: null });
      },
      insert(row: Row) {
        const created: Row = { id: `${table}-${(tables[table] ?? []).length + 1}`, ...row };
        tables[table] = [...(tables[table] ?? []), created];
        return Promise.resolve({ data: created, error: null });
      },
      update(patch: Row) {
        state.updatePatch = patch;
        return builder;
      },
      then(resolve: (value: unknown) => unknown) {
        if (state.updatePatch) {
          // A row already handed to the reader stays as it was, the way PostgREST JSON does; an
          // in-place mutation here would hide the mastery transition the route is meant to report.
          tables[table] = (tables[table] ?? []).map((row) =>
            state.filters!.every(([column, v]) => row[column] === v)
              ? { ...row, ...state.updatePatch }
              : row,
          );
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
        return Promise.resolve({ data: matched(), error: null }).then(resolve);
      },
    };
    return builder;
  }

  return {
    tables,
    rpcs,
    client: {
      from: (table: string) => build(table),
      rpc: async () => {
        throw new Error('the ledger is not reachable as the calling user');
      },
    },
    service: {
      from: (table: string) => build(table),
      rpc: async (name: string, args: Record<string, unknown>) => {
        rpcs.push({ name, args });
        return { data: 50, error: null };
      },
    },
  };
}

function post(body: unknown) {
  return new NextRequest('http://localhost/api/omega-claw/challenge', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function get() {
  return new NextRequest('http://localhost/api/omega-claw/challenge', { method: 'GET' });
}

const FIRST_NODE = OMEGA_CLAW_CHALLENGE_NODES[0];

function signedInAs(db: ReturnType<typeof fakeDb>, profile: Row | null = { id: 'learner-1', grade: 'Grade 6' }) {
  deps.routeClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: profile ? { id: 'learner-1' } : null },
        error: null,
      }),
    },
    ...db.client,
  });
  deps.serviceClient.mockReturnValue(db.service);
  if (profile) db.client.from('profiles').insert(profile);
}

describe('GET /api/omega-claw/challenge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads back the nodes this learner completed', async () => {
    const db = fakeDb({ learning_progress: [] });
    db.tables.learning_progress.push({
      user_id: 'learner-1',
      competency_code: omegaClawChallengeCompetencyCode(FIRST_NODE.id),
      correct_answers: 1,
      questions_answered: 1,
      mastery_level: 'emerging',
      mastered_at: null,
    });
    signedInAs(db);

    const body = await challengeGET(get()).then((r) => r.json());

    expect(body).toMatchObject({ completed: [FIRST_NODE.id] });
  });

  it('requires a session', async () => {
    const db = fakeDb({});
    deps.routeClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      ...db.client,
    });

    const response = await challengeGET(get());
    expect(response.status).toBe(401);
  });
});

describe('POST /api/omega-claw/challenge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('records a correct answer under the learner profile grade', async () => {
    const db = fakeDb({ learning_progress: [], profiles: [] });
    signedInAs(db);

    const response = await challengePOST(
      post({ nodeId: FIRST_NODE.id, answer: FIRST_NODE.answer, grade: 'Grade 12' }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ correct: true, completed: [FIRST_NODE.id], pointsAwarded: null });
    expect(db.tables.learning_progress).toHaveLength(1);
    expect(db.tables.learning_progress[0]).toMatchObject({
      user_id: 'learner-1',
      competency_code: omegaClawChallengeCompetencyCode(FIRST_NODE.id),
      grade: 'Grade 6',
      correct_answers: 1,
    });
  });

  it('grades the answer on the server, so a missed one never completes a node', async () => {
    const db = fakeDb({ learning_progress: [], profiles: [] });
    signedInAs(db);
    const missed = FIRST_NODE.options.find((option) => option !== FIRST_NODE.answer)!;

    const body = await challengePOST(
      post({ nodeId: FIRST_NODE.id, answer: missed, correct: true }),
    ).then((r) => r.json());

    expect(body).toMatchObject({ correct: false, completed: [] });
  });

  it('refuses a node the path does not have', async () => {
    const db = fakeDb({ learning_progress: [], profiles: [] });
    signedInAs(db);

    const response = await challengePOST(post({ nodeId: 'not-a-node', answer: 'x' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('not-a-node'),
    });
    expect(db.tables.learning_progress).toHaveLength(0);
  });

  it('refuses an unparseable or empty body instead of defaulting it', async () => {
    const db = fakeDb({ learning_progress: [], profiles: [] });
    signedInAs(db);

    const malformed = await challengePOST(
      new NextRequest('http://localhost/api/omega-claw/challenge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not json',
      }),
    );
    expect(malformed.status).toBe(400);

    const missingAnswer = await challengePOST(post({ nodeId: FIRST_NODE.id }));
    expect(missingAnswer.status).toBe(400);
  });

  it('requires a session, and writes nothing without one', async () => {
    const db = fakeDb({ learning_progress: [], profiles: [] });
    deps.routeClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      ...db.client,
    });
    deps.serviceClient.mockReturnValue(db.service);

    const response = await challengePOST(post({ nodeId: FIRST_NODE.id, answer: FIRST_NODE.answer }));

    expect(response.status).toBe(401);
    expect(db.tables.learning_progress).toHaveLength(0);
  });

  it('opens the ledger on the service client only when the node is mastered', async () => {
    const db = fakeDb({
      profiles: [],
      learning_progress: [
        {
          user_id: 'learner-1',
          competency_code: omegaClawChallengeCompetencyCode(FIRST_NODE.id),
          competency_name: FIRST_NODE.title,
          subject: 'Omega Claw',
          grade: 'Grade 6',
          mastery_level: 'proficient',
          mastered_at: null,
          progress_percentage: 85,
          questions_asked: 40,
          questions_answered: 20,
          correct_answers: 19,
          time_spent_minutes: 10,
          hints_used: 0,
          consecutive_wrong: 0,
        },
      ],
    });
    signedInAs(db);

    const body = await challengePOST(
      post({ nodeId: FIRST_NODE.id, answer: FIRST_NODE.answer }),
    ).then((r) => r.json());

    expect(body).toMatchObject({ masteryJustAchieved: true, pointsAwarded: 50 });
    expect(db.rpcs).toHaveLength(1);
    expect(db.rpcs[0].name).toBe('award_points');
  });
});
