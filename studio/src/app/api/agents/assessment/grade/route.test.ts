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
    return 'https://agents.test/agents/assessment/grade';
  },
  getAiAgentsServiceHeaders: (headers: Record<string, string>) => headers,
}));

import { POST } from './route';

function request(body: unknown) {
  return new NextRequest('http://localhost/api/agents/assessment/grade', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/agents/assessment/grade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.apiUrlError = null;
    deps.getUser.mockResolvedValue({
      data: { user: { id: 'authenticated-user-id' } },
      error: null,
    });
    deps.routeClient.mockResolvedValue({ auth: { getUser: deps.getUser } });
    deps.fetch.mockResolvedValue(new Response(JSON.stringify({ score: 4 }), { status: 200 }));
    vi.stubGlobal('fetch', deps.fetch);
  });

  it('rejects anonymous grading requests', async () => {
    deps.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await POST(request({ quiz: {}, submission: {} }));

    expect(response.status).toBe(401);
  });

  it('rejects malformed submissions', async () => {
    const response = await POST(request({ quiz: {}, submission: {} }));

    expect(response.status).toBe(400);
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it('overrides client student identity and forwards the canonical quiz', async () => {
    const quiz = { quiz_id: 'quiz-1', questions: [] };
    const response = await POST(request({
      quiz,
      submission: {
        submission_id: 'submission-1',
        quiz_id: 'quiz-1',
        student_id: 'spoofed-student',
        answers: [],
      },
    }));

    expect(response.status).toBe(200);
    const [, init] = deps.fetch.mock.calls[0];
    const body = JSON.parse(String(init.body));
    expect(body.quiz).toEqual(quiz);
    expect(body.submission).toMatchObject({
      submission_id: 'submission-1',
      quiz_id: 'quiz-1',
      student_id: 'authenticated-user-id',
      answers: [],
    });
  });
});
