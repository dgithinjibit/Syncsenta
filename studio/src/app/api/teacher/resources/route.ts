import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler';
import { parseCreateTeacherResourceInput } from '@/lib/teacher/resource-contract';

function resourceStorageUnavailable(error: { code?: string }) {
  return error.code === '42P01' || error.code === 'PGRST205';
}

function storageUnavailableResponse() {
  return NextResponse.json({
    error: 'Teacher resource storage is not enabled. Apply the teacher_resources migration before saving resources.',
  }, { status: 503 });
}

async function currentTeacher() {
  const supabase = await createSupabaseRouteHandlerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return {
      supabase,
      authorized: false as const,
      user: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Unable to verify teacher role for resource request:', profileError);
    return {
      supabase,
      authorized: false as const,
      user: null,
      response: NextResponse.json({ error: 'Unable to verify teacher access' }, { status: 500 }),
    };
  }

  if (profile?.role !== 'teacher') {
    return {
      supabase,
      authorized: false as const,
      user: null,
      response: NextResponse.json({ error: 'Teacher access required' }, { status: 403 }),
    };
  }

  return { supabase, authorized: true as const, user, response: null };
}

export async function GET(request: NextRequest) {
  try {
    const access = await currentTeacher();
    if (!access.authorized) return access.response;
    const { supabase, user } = access;
    const joinCode = request.nextUrl.searchParams.get('joinCode');

    if (joinCode !== null) {
      if (!joinCode.trim() || joinCode.length > 100) {
        return NextResponse.json({ error: 'Invalid room code' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('teacher_resources')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('join_code', joinCode)
        .maybeSingle();

      if (error) {
        console.error('Unable to load teacher learning lab:', error);
        if (resourceStorageUnavailable(error)) return storageUnavailableResponse();
        return NextResponse.json({ error: 'Unable to load learning lab' }, { status: 500 });
      }
      if (!data) return NextResponse.json({ error: 'Learning lab not found' }, { status: 404 });

      return NextResponse.json({
        resource: {
          id: data.id,
          title: data.title,
          content: data.content,
          type: data.resource_type,
          joinCode: data.join_code ?? '',
          creatorId: data.teacher_id,
          createdAt: data.created_at,
          grade: data.grade ?? undefined,
          subject: data.subject ?? undefined,
        },
      });
    }

    const { data, error } = await supabase
      .from('teacher_resources')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Unable to list teacher resources:', error);
      if (resourceStorageUnavailable(error)) return storageUnavailableResponse();
      return NextResponse.json({ error: 'Unable to load your resources' }, { status: 500 });
    }

    return NextResponse.json({
      resources: (data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        type: row.resource_type,
        joinCode: row.join_code ?? '',
        creatorId: row.teacher_id,
        createdAt: row.created_at,
        grade: row.grade ?? undefined,
        subject: row.subject ?? undefined,
      })),
    });
  } catch (error) {
    console.error('Error in GET /api/teacher/resources:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await currentTeacher();
    if (!access.authorized) return access.response;
    const { supabase, user } = access;

    const body = await request.json().catch(() => null);
    const input = parseCreateTeacherResourceInput(body);
    if (!input) {
      return NextResponse.json({ error: 'Invalid teacher resource' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('teacher_resources')
      .insert({
        teacher_id: user.id,
        title: input.title,
        resource_type: input.type,
        content: input.content,
        grade: input.grade ?? null,
        subject: input.subject ?? null,
        join_code: input.joinCode ?? null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Unable to save teacher resource:', error);
      if (resourceStorageUnavailable(error)) return storageUnavailableResponse();
      return NextResponse.json({ error: 'Unable to save resource' }, { status: 500 });
    }

    return NextResponse.json({
      resource: {
        id: data.id,
        title: data.title,
        content: data.content,
        type: data.resource_type,
        joinCode: data.join_code ?? '',
        creatorId: data.teacher_id,
        createdAt: data.created_at,
        grade: data.grade ?? undefined,
        subject: data.subject ?? undefined,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/teacher/resources:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const access = await currentTeacher();
    if (!access.authorized) return access.response;
    const { supabase, user } = access;

    const id = request.nextUrl.searchParams.get('id');
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'A valid resource id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('teacher_resources')
      .delete()
      .eq('id', id)
      .eq('teacher_id', user.id)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Unable to delete teacher resource:', error);
      if (resourceStorageUnavailable(error)) return storageUnavailableResponse();
      return NextResponse.json({ error: 'Unable to delete resource' }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Resource not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/teacher/resources:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
