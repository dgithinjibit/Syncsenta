import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  assignments: vi.fn(),
  students: vi.fn(),
  getLearningSessionReadResult: vi.fn(),
}));

vi.mock('@/lib/supabase/route-handler', () => ({
  createSupabaseRouteHandlerClient: async () => ({
    auth: { getUser: deps.getUser },
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        in: () => query,
        single: deps.profile,
        limit: () => table === 'teacher_student_assignments'
          ? deps.assignments()
          : deps.students(),
      };
      return query;
    },
  }),
}));

vi.mock('@/lib/session/session-persistence', () => ({
  getLearningSessionReadResult: deps.getLearningSessionReadResult,
}));

import { GET } from '@/app/api/teacher/students-scaffolding/route';

function request() {
  return new NextRequest(
    'http://localhost/api/teacher/students-scaffolding?studentIds=student-row-id',
  );
}

describe('GET /api/teacher/students-scaffolding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.getUser.mockResolvedValue({
      data: { user: { id: 'teacher-user-id' } },
      error: null,
    });
    deps.profile.mockResolvedValue({
      data: { role: 'teacher' },
      error: null,
    });
    deps.assignments.mockResolvedValue({
      data: [{ student_id: 'student-row-id' }],
      error: null,
    });
    deps.students.mockResolvedValue({
      data: [{ id: 'student-row-id', user_id: 'learner-auth-id' }],
      error: null,
    });
    deps.getLearningSessionReadResult.mockResolvedValue({
      status: 'found',
      session: {
        preferences: {
          scaffoldingDecision: {
            level: 'Guided',
            capturedAt: '2026-11-19T09:00:00.000Z',
            decidedAt: '2026-11-19T08:59:59.000Z',
            nextAction: 'ask-guiding-question',
            hint: 'isolate-step',
            rulesetVersion: 'omega-rules-v1',
            evidence: ['repeated-errors'],
          },
        },
      },
    });
  });

  it('returns the last recorded decision for each assigned learner by auth user id', async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      'student-row-id': {
        level: 'Guided',
        capturedAt: '2026-11-19T09:00:00.000Z',
        decidedAt: '2026-11-19T08:59:59.000Z',
        nextAction: 'ask-guiding-question',
        hint: 'isolate-step',
        rulesetVersion: 'omega-rules-v1',
        evidence: ['repeated-errors'],
      },
    });
    expect(deps.getLearningSessionReadResult).toHaveBeenCalledWith('learner-auth-id');
  });

  it('keeps legacy levels but does not infer a capture timestamp', async () => {
    deps.getLearningSessionReadResult.mockResolvedValue({
      status: 'found',
      session: { preferences: { scaffoldingLevel: 'Intensive' } },
    });

    const response = await GET(request());

    await expect(response.json()).resolves.toEqual({
      'student-row-id': { level: 'Intensive', capturedAt: null },
    });
  });

  it('returns a distinct empty snapshot for a missing Redis record', async () => {
    deps.getLearningSessionReadResult.mockResolvedValue({ status: 'missing' });

    const response = await GET(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ 'student-row-id': null });
  });

  it('does not present a failed Redis read as a missing decision', async () => {
    deps.getLearningSessionReadResult.mockResolvedValue({
      status: 'unavailable',
      reason: 'read_failed',
    });

    const response = await GET(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'Teacher decision snapshots are temporarily unavailable',
    });
  });
});
