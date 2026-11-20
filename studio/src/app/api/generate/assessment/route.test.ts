import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({
  routeClient: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
  role: 'teacher' as string,
  profileError: null as { message: string } | null,
  apiUrlError: null as Error | null,
  fetch: vi.fn(),
}));

vi.mock('@/lib/supabase/route-handler', () => ({
  createSupabaseRouteHandlerClient: deps.routeClient,
}));

vi.mock('@/lib/api-config', () => ({
  buildApiUrl: () => {
    if (deps.apiUrlError) throw deps.apiUrlError;
    return 'https://agents.test/agents/chat';
  },
  getAiAgentsServiceHeaders: (headers: Record<string, string>) => headers,
}));

import { POST } from './route';

function request(body: unknown) {
  return new NextRequest('http://localhost/api/generate/assessment', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/generate/assessment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.role = 'teacher';
    deps.profileError = null;
    deps.apiUrlError = null;
    deps.getUser.mockResolvedValue({
      data: { user: { id: 'authenticated-teacher-id' } },
      error: null,
    });

    const profileQuery = {
      select: () => profileQuery,
      eq: () => profileQuery,
      maybeSingle: async () => ({
        data: deps.profileError ? null : { role: deps.role },
        error: deps.profileError,
      }),
    };
    deps.from.mockReturnValue(profileQuery);
    deps.routeClient.mockResolvedValue({
      auth: { getUser: deps.getUser },
      from: deps.from,
    });
    deps.fetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true, response: 'Generated assessment' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', deps.fetch);
  });

  it('rejects anonymous requests before contacting the AI service', async () => {
    deps.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await POST(request({ message: 'Create a quiz' }));

    expect(response.status).toBe(401);
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it('does not return an assessment template to anonymous callers when the AI service is unconfigured', async () => {
    deps.apiUrlError = new Error('Backend API is not configured.');
    deps.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await POST(request({ message: 'Create a quiz' }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Sign in as a teacher to generate an assessment.',
    });
  });

  it('rejects non-teacher profiles before contacting the AI service', async () => {
    deps.role = 'student';

    const response = await POST(request({ message: 'Create a quiz' }));

    expect(response.status).toBe(403);
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it('surfaces profile lookup failures instead of contacting the AI service', async () => {
    deps.profileError = { message: 'database unavailable' };

    const response = await POST(request({ message: 'Create a quiz' }));

    expect(response.status).toBe(500);
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it('forwards the authenticated teacher identity instead of client-supplied identity', async () => {
    const response = await POST(request({
      message: 'Create a quiz',
      user_id: 'teacher_001',
      role: 'student',
    }));

    expect(response.status).toBe(200);
    const [, init] = deps.fetch.mock.calls[0];
    expect(JSON.parse(String(init.body))).toMatchObject({
      user_id: 'authenticated-teacher-id',
      role: 'teacher',
      message: 'Create a quiz',
    });
    expect(init.headers).toMatchObject({
      'X-Forwarded-User': 'authenticated-teacher-id',
    });
  });
});
