import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The `/api/omega-claw/*` handlers.
 *
 * Both routes used to be a two-line proxy onto the Rust MVP service, which is
 * deployed nowhere, so in production every learner request answered
 * `503 {"error":"Omega Claw backend is unavailable","backend":"http://127.0.0.1:8080/api/v1"}`
 * (re-measured on sentastudio.vercel.app on 2026-09-28). The handlers now
 * evaluate the rule pack in-process unless `SYNCSENTA_BACKEND_URL` is set.
 *
 * These assertions cover the parts the rule tests cannot: the status codes, the
 * auth wall that replaces the Rust `AuthUser` middleware, and the promise that a
 * learner is handed wording rather than a MeTTa symbol.
 */

const deps = vi.hoisted(() => ({
  routeClient: vi.fn(),
}));

vi.mock('@/lib/supabase/route-handler', () => ({
  createSupabaseRouteHandlerClient: deps.routeClient,
}));

import { handleHint, handleProgression } from '@/lib/omega-claw-api';
import { POST as progressionPOST } from '@/app/api/omega-claw/progression/route';
import { POST as hintPOST } from '@/app/api/omega-claw/hint/route';

function request(path: string, body: unknown) {
  return new NextRequest(`http://localhost/api/omega-claw/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function signedIn() {
  deps.routeClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'learner-1', email: 'student01@syncsenta.dev' } },
        error: null,
      }),
    },
  });
}

function anonymous() {
  deps.routeClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  });
}

describe('progression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SYNCSENTA_BACKEND_URL;
    signedIn();
  });

  it('answers without a backend, which is the whole point', async () => {
    const response = await handleProgression(request('progression', {
      outcome: 'incorrect',
      correct: false,
      explained: false,
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      outcome: 'incorrect',
      nextAction: 'scaffold-retry',
      unlocksTransfer: false,
    });
  });

  it('gives the learner wording, not a rule symbol', async () => {
    const body = await handleProgression(request('progression', {
      outcome: 'correct',
      correct: true,
      explained: false,
    })).then((r) => r.json());

    expect(body.nextAction).toBe('celebrate-transfer');
    expect(typeof body.nextActionMessage).toBe('string');
    expect(body.nextActionMessage).not.toContain('celebrate-transfer');
  });

  it('will not advance a correct answer nobody can explain', async () => {
    const body = await handleProgression(request('progression', {
      outcome: 'correct',
      correct: true,
      explained: false,
    })).then((r) => r.json());

    expect(body.unlocksTransfer).toBe(false);
  });

  it('rejects an outcome the rule pack has no row for', async () => {
    const response = await handleProgression(request('progression', { outcome: 'guessed' }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('unknown Omega Claw progression outcome'),
    });
  });

  it('rejects a malformed body instead of defaulting it', async () => {
    const response = await handleProgression(
      new NextRequest('http://localhost/api/omega-claw/progression', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not json',
      }),
    );
    expect(response.status).toBe(400);
  });

  it('requires a session, because the Rust AuthUser middleware is not here', async () => {
    anonymous();
    const response = await handleProgression(request('progression', { outcome: 'correct' }));
    expect(response.status).toBe(401);
  });
});

describe('hint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SYNCSENTA_BACKEND_URL;
    signedIn();
  });

  it('walks the four-rung ladder and clamps past the end', async () => {
    for (const [requested, expected] of [[1, 'notice'], [4, 'worked-example'], [9, 'worked-example']] as const) {
      const body = await handleHint(request('hint', { hint_level: requested })).then((r) => r.json());
      expect(body.hint).toBe(expected);
      expect(typeof body.hintMessage).toBe('string');
      expect(body.hintMessage.length).toBeGreaterThan(20);
    }
  });

  it('needs a number and says so', async () => {
    const response = await handleHint(request('hint', { hint_level: 'lots' }));
    expect(response.status).toBe(400);
  });

  it('requires a session', async () => {
    anonymous();
    const response = await handleHint(request('hint', { hint_level: 1 }));
    expect(response.status).toBe(401);
  });
});

describe('the deployed routes stay thin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SYNCSENTA_BACKEND_URL;
    signedIn();
  });

  it('expose POST only, and reuse the handlers unchanged', async () => {
    const progression = await progressionPOST(request('progression', { outcome: 'mastered' }));
    expect(progression.status).toBe(200);
    await expect(progression.json()).resolves.toMatchObject({ nextAction: 'unlock-next-node' });

    const hint = await hintPOST(request('hint', { hint_level: 2 }));
    expect(hint.status).toBe(200);
    await expect(hint.json()).resolves.toMatchObject({ hint: 'isolate-step', hintLevel: 2 });
  });
});

describe('a configured backend still wins', () => {
  beforeEach(() => vi.clearAllMocks());

  it('forwards instead of answering locally, so roles and persistence stay authoritative', async () => {
    process.env.SYNCSENTA_BACKEND_URL = 'http://127.0.0.1:8080/api/v1';
    const fetched = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ hintLevel: 3, hint: 'representation' }),
    });
    const previous = globalThis.fetch;
    globalThis.fetch = fetched;

    try {
      const response = await handleHint(request('hint', { hint_level: 3 }));
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ hint: 'representation' });
      expect(fetched).toHaveBeenCalledTimes(1);
      expect(fetched.mock.calls[0][0]).toBe('http://127.0.0.1:8080/api/v1/omega-claw/hint');
      // No Supabase round trip: the Rust service authorises its own callers.
      expect(deps.routeClient).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = previous;
      delete process.env.SYNCSENTA_BACKEND_URL;
    }
  });

  it('names an unreachable backend rather than reporting a wrong answer', async () => {
    process.env.SYNCSENTA_BACKEND_URL = 'http://127.0.0.1:9/api/v1';
    const previous = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    try {
      const response = await handleProgression(request('progression', { outcome: 'correct' }));
      expect(response.status).toBe(502);
      await expect(response.json()).resolves.toMatchObject({
        error: 'Omega Claw backend is unreachable',
        backend: 'http://127.0.0.1:9/api/v1',
      });
    } finally {
      globalThis.fetch = previous;
      delete process.env.SYNCSENTA_BACKEND_URL;
    }
  });
});
