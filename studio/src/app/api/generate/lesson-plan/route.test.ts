import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({
  routeClient: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
  fetch: vi.fn(),
  profileRole: 'teacher' as string,
  apiUrlError: null as Error | null,
}));

vi.mock('@/lib/supabase/route-handler', () => ({
  createSupabaseRouteHandlerClient: deps.routeClient,
}));

vi.mock('@/lib/api-config', () => ({
  buildApiUrl: () => {
    if (deps.apiUrlError) throw deps.apiUrlError;
    return 'https://agents.test/lesson-architect/generate-lesson-plan';
  },
  getAiAgentsServiceHeaders: (headers: Record<string, string>) => headers,
}));

import { POST } from './route';

function request(body: unknown) {
  return new NextRequest('http://localhost/api/generate/lesson-plan', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/generate/lesson-plan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.profileRole = 'teacher';
    deps.apiUrlError = null;
    deps.getUser.mockResolvedValue({
      data: { user: { id: 'authenticated-teacher-id' } },
      error: null,
    });

    const profileQuery = {
      select: () => profileQuery,
      eq: () => profileQuery,
      maybeSingle: async () => ({ data: { role: deps.profileRole }, error: null }),
    };
    deps.from.mockReturnValue(profileQuery);
    deps.routeClient.mockResolvedValue({
      auth: { getUser: deps.getUser },
      from: deps.from,
    });
    deps.fetch.mockResolvedValue(new Response(JSON.stringify({ success: true, lesson_plan: {} }), { status: 200 }));
    vi.stubGlobal('fetch', deps.fetch);
  });

  it('rejects anonymous callers', async () => {
    deps.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await POST(request({ week: 1, lesson: 1 }));

    expect(response.status).toBe(401);
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it('rejects non-teacher profiles', async () => {
    deps.profileRole = 'student';

    const response = await POST(request({ week: 1, lesson: 1 }));

    expect(response.status).toBe(403);
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it('uses the authenticated teacher ID instead of teacher_id from the body', async () => {
    const response = await POST(request({
      teacher_id: 'spoofed-teacher',
      week: 2,
      lesson: 1,
      row: { strand: 'Number', subStrand: 'Fractions' },
    }));

    expect(response.status).toBe(200);
    const [, init] = deps.fetch.mock.calls[0];
    expect(JSON.parse(String(init.body))).toMatchObject({
      teacher_id: 'authenticated-teacher-id',
      week: 2,
      lesson: 1,
    });
  });
});
