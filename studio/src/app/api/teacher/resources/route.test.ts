import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({
  routeClient: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  role: 'teacher' as string,
  inserted: null as Record<string, unknown> | null,
}));

vi.mock('@/lib/supabase/route-handler', () => ({
  createSupabaseRouteHandlerClient: deps.routeClient,
}));

import { GET, POST } from './route';

function post(body: unknown) {
  return new NextRequest('http://localhost/api/teacher/resources', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/teacher/resources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.role = 'teacher';
    deps.inserted = null;
    deps.getUser.mockResolvedValue({
      data: { user: { id: 'demo-teacher-id' } },
      error: null,
    });

    const profileQuery = {
      select: () => profileQuery,
      eq: () => profileQuery,
      maybeSingle: async () => ({ data: { role: deps.role }, error: null }),
    };
    const insertQuery = {
      insert: (row: Record<string, unknown>) => {
        deps.inserted = row;
        return insertQuery;
      },
      select: () => insertQuery,
      single: async () => ({
        data: {
          id: '00000000-0000-4000-8000-000000000001',
          created_at: '2026-11-20T10:00:00.000Z',
          ...deps.inserted,
        },
        error: null,
      }),
    };

    deps.from.mockImplementation((table: string) => (
      table === 'profiles' ? profileQuery : insertQuery
    ));
    deps.routeClient.mockResolvedValue({
      auth: { getUser: deps.getUser },
      from: deps.from,
    });
  });

  it('rejects anonymous resource requests before querying profiles', async () => {
    deps.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(deps.from).not.toHaveBeenCalled();
  });

  it('rejects authenticated non-teachers', async () => {
    deps.role = 'student';

    const response = await POST(post({
      title: 'Private worksheet',
      type: 'Worksheet',
      content: 'Lesson content',
    }));

    expect(response.status).toBe(403);
    expect(deps.from).toHaveBeenCalledTimes(1);
    expect(deps.from).toHaveBeenCalledWith('profiles');
  });

  it('stores the resource under the signed-in teacher, not a caller-supplied owner', async () => {
    const response = await POST(post({
      title: 'Grade 6 worksheet',
      type: 'Worksheet',
      content: '# Fractions',
      teacher_id: 'another-user-id',
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(deps.inserted).toMatchObject({
      teacher_id: 'demo-teacher-id',
      title: 'Grade 6 worksheet',
      resource_type: 'Worksheet',
      content: '# Fractions',
    });
    expect(deps.inserted).not.toHaveProperty('teacherId');
    expect(body.resource.creatorId).toBe('demo-teacher-id');
  });
});
