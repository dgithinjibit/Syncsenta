import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  feedbackId: vi.fn(),
  insert: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    setAll: () => {},
  })),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: deps.getUser },
    from: () => ({
      select: () => ({ eq: () => ({ single: deps.profile }) }),
    }),
  })),
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        deps.insert(row);
        return { select: () => ({ single: deps.feedbackId }) };
      },
    }),
  }),
}));

vi.mock('@/lib/api-config', () => ({
  buildApiUrl: () => 'https://agents.test/teacher/feedback-analysis',
  getAiAgentsServiceHeaders: () => ({ 'Content-Type': 'application/json' }),
}));

import { POST } from '@/app/api/teacher/feedback/route';

function request(body: unknown) {
  return new NextRequest('http://localhost/api/teacher/feedback', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/teacher/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    deps.getUser.mockResolvedValue({
      data: { user: { id: 'teacher-1' } },
      error: null,
    });
    deps.profile.mockResolvedValue({ data: { role: 'teacher' }, error: null });
    deps.feedbackId.mockResolvedValue({ data: { id: 'feedback-1' }, error: null });
  });

  it('stores Omega policy feedback for review without asking FastAPI for a patch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ summary: 'reviewed feedback' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(request({
      type: 'omega_threshold',
      competencyCode: 'MATH.G6.FRACTIONS',
      issueDescription: 'The current scaffolding did not fit this learner.',
      correctionDetails: 'Offer a smaller worked example before the next question.',
      reasoning: 'The learner needed more steps to explain the concept.',
    }));

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      feedbackId: 'feedback-1',
      status: 'pending_review',
      policyUpdated: false,
    });
    expect(deps.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        feedback_type: 'omega_threshold',
        patch_status: 'pending',
      }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
