import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({ routeClient: vi.fn(), bearerClient: vi.fn() }));

vi.mock('@/lib/supabase/route-handler', () => ({
  createSupabaseRouteHandlerClient: deps.routeClient,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: deps.bearerClient,
}));

import {
  fetchHyperonTutoringDecision,
  handleHint,
  handleProgression,
} from '@/lib/omega-claw-api';

function request(path: string, body: unknown) {
  return new NextRequest(`http://localhost/api/omega-claw/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Hyperon Omega authority', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    delete process.env.SYNCSENTA_BACKEND_URL;
    delete process.env.SYNCSENTA_OMEGA_PROXY_JWT_SECRET;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    deps.routeClient.mockReset();
    deps.bearerClient.mockReset();
  });

  function mockCallerClient(
    userId = 'f58c2e07-a71c-444e-9402-2926caf40b61',
    role = 'student',
  ) {
    const profileQuery = {
      select: () => profileQuery,
      eq: () => profileQuery,
      single: vi.fn().mockResolvedValue({ data: { role }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: { role }, error: null }),
    };
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: userId } },
          error: null,
        }),
      },
      from: vi.fn(() => profileQuery),
    };
  }

  it('does not evaluate Omega progression in TypeScript when Rust is absent', async () => {
    const response = await handleProgression(request('progression', {
      outcome: 'incorrect',
      correct: false,
      explained: false,
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Omega Claw Hyperon backend is not configured',
    });
  });

  it('does not evaluate Omega hints in TypeScript when Rust is absent', async () => {
    const response = await handleHint(request('hint', { hint_level: 2 }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Omega Claw Hyperon backend is not configured',
    });
  });

  it('forwards a synthetic tutoring request and caller token to the Rust boundary', async () => {
    process.env.SYNCSENTA_BACKEND_URL = 'https://omega.test/api/v1/';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        scaffolding: 'Guided',
        nextAction: 'ask-guiding-question',
        hint: 'isolate-step',
        rulesetVersion: 'omega-tutoring-v1',
        evidence: ['below-mastery-target'],
        decidedAt: '2026-11-19T09:00:00.000Z',
      }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const input = {
      questions_answered: 4,
      correct_answers: 2,
      mastery_percent: 50,
      hints_used: 1,
      consecutive_wrong: 0,
    };

    const result = await fetchHyperonTutoringDecision(input, 'Bearer signed-proxy-token');

    expect(result).toEqual({
      status: 200,
      body: {
        scaffolding: 'Guided',
        nextAction: 'ask-guiding-question',
        hint: 'isolate-step',
        rulesetVersion: 'omega-tutoring-v1',
        evidence: ['below-mastery-target'],
        decidedAt: '2026-11-19T09:00:00.000Z',
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://omega.test/api/v1/omega-claw/tutoring',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer signed-proxy-token',
        },
        body: JSON.stringify(input),
        cache: 'no-store',
      }),
    );
  });

  it('forwards the authenticated cookie session to the Rust progression boundary', async () => {
    process.env.SYNCSENTA_BACKEND_URL = 'https://omega.test/api/v1';
    process.env.SYNCSENTA_OMEGA_PROXY_JWT_SECRET =
      'synthetic-only-omega-proxy-secret-32-bytes';
    const callerClient = mockCallerClient();
    deps.routeClient.mockResolvedValue(callerClient);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ nextAction: 'scaffold-retry' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await handleProgression(request('progression', {
      outcome: 'incorrect',
      correct: false,
      explained: false,
    }));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://omega.test/api/v1/omega-claw/progression',
      expect.objectContaining({ headers: expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: expect.stringMatching(/^Bearer [^.]+\.[^.]+\.[^.]+$/),
      }) }),
    );
    expect(callerClient.auth.getUser).toHaveBeenCalledOnce();
    expect(callerClient.from).toHaveBeenCalledWith('profiles');
  });

  it('validates explicit Supabase bearer tokens and exchanges them for scoped Rust identity', async () => {
    process.env.SYNCSENTA_BACKEND_URL = 'https://omega.test/api/v1';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://syncsenta.test';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'synthetic-anon-key';
    process.env.SYNCSENTA_OMEGA_PROXY_JWT_SECRET =
      'synthetic-only-omega-proxy-secret-32-bytes';
    const callerClient = mockCallerClient('9d0bff13-5d38-4898-86c6-11c71385cf88');
    deps.bearerClient.mockReturnValue(callerClient);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ nextAction: 'scaffold-retry' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const incoming = new NextRequest('http://localhost/api/omega-claw/progression', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer supabase-access-token',
      },
      body: JSON.stringify({ outcome: 'incorrect', correct: false, explained: false }),
    });

    const response = await handleProgression(incoming);

    expect(response.status).toBe(200);
    expect(callerClient.auth.getUser).toHaveBeenCalledWith('supabase-access-token');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://omega.test/api/v1/omega-claw/progression',
      expect.objectContaining({ headers: expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: expect.stringMatching(/^Bearer [^.]+\.[^.]+\.[^.]+$/),
      }) }),
    );
  });

  it('does not call Rust when the cookie session is unauthenticated', async () => {
    process.env.SYNCSENTA_BACKEND_URL = 'https://omega.test/api/v1';
    deps.routeClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await handleProgression(request('progression', {
      outcome: 'correct',
      correct: true,
      explained: true,
    }));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects non-student Supabase profiles before calling Rust', async () => {
    process.env.SYNCSENTA_BACKEND_URL = 'https://omega.test/api/v1';
    process.env.SYNCSENTA_OMEGA_PROXY_JWT_SECRET =
      'synthetic-only-omega-proxy-secret-32-bytes';
    deps.routeClient.mockResolvedValue(mockCallerClient(
      'f58c2e07-a71c-444e-9402-2926caf40b61',
      'teacher',
    ));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await handleProgression(request('progression', {
      outcome: 'incorrect',
      correct: false,
      explained: false,
    }));

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails with 503 when the shared proxy secret is not configured', async () => {
    process.env.SYNCSENTA_BACKEND_URL = 'https://omega.test/api/v1';
    deps.routeClient.mockResolvedValue(mockCallerClient());
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await handleProgression(request('progression', {
      outcome: 'incorrect',
      correct: false,
      explained: false,
    }));

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns an explicit 502 when the Hyperon boundary is unreachable', async () => {
    process.env.SYNCSENTA_BACKEND_URL = 'https://omega.test/api/v1';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await expect(fetchHyperonTutoringDecision({}, 'test-access-token')).resolves.toMatchObject({
      status: 502,
      body: {
        error: 'Omega Claw backend is unreachable',
        backend: 'https://omega.test/api/v1',
      },
    });
  });
});
