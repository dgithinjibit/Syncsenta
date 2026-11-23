import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({
  routeClient: vi.fn(),
  getUser: vi.fn(),
  fetch: vi.fn(),
  apiUrlError: null as Error | null,
}));

vi.mock('@/lib/supabase/route-handler', () => ({
  createSupabaseRouteHandlerClient: deps.routeClient,
}));

vi.mock('@/lib/api-config', () => ({
  buildApiUrl: () => {
    if (deps.apiUrlError) throw deps.apiUrlError;
    return 'https://agents.test/agents/assessment/quiz';
  },
  getAiAgentsServiceHeaders: (headers: Record<string, string>) => headers,
}));

import { POST } from './route';

function request(body: unknown) {
  return new NextRequest('http://localhost/api/agents/assessment/quiz', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/agents/assessment/quiz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.apiUrlError = null;
    deps.getUser.mockResolvedValue({
      data: { user: { id: 'authenticated-user-id' } },
      error: null,
    });
    deps.routeClient.mockResolvedValue({ auth: { getUser: deps.getUser } });
    deps.fetch.mockResolvedValue(new Response(JSON.stringify({ quiz_id: 'quiz-1', questions: [] }), { status: 200 }));
    vi.stubGlobal('fetch', deps.fetch);
  });

  it('rejects anonymous quiz requests', async () => {
    deps.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await POST(request({ competency: 'fractions' }));

    expect(response.status).toBe(401);
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it('forwards a service credential and never a client identity', async () => {
    const response = await POST(request({
      competency: 'fractions',
      user_id: 'spoofed-user',
      role: 'admin',
    }));

    expect(response.status).toBe(200);
    const [, init] = deps.fetch.mock.calls[0];
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ competency: 'fractions' });
    expect(body).not.toHaveProperty('user_id');
    expect(body).not.toHaveProperty('role');
    expect(init.headers).toMatchObject({ 'X-Forwarded-User': 'authenticated-user-id' });
  });

  it('reports missing AI configuration', async () => {
    deps.apiUrlError = new Error('Backend API is not configured.');

    const response = await POST(request({ competency: 'fractions' }));

    expect(response.status).toBe(503);
    expect(deps.fetch).not.toHaveBeenCalled();
  });
});
