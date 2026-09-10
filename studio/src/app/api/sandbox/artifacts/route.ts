import { NextResponse } from 'next/server';
import { buildSandboxArtifactInsert, type SandboxArtifactType } from '@/lib/sandbox/sandbox-artifact-queue';
import { selectSandboxProvider } from '@/lib/sandbox/sandbox-provider';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler';

export const runtime = 'nodejs';

function stringField(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export async function GET() {
  const supabase = await createSupabaseRouteHandlerClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: 'authentication_required' }, { status: 401 });

  const { data, error } = await supabase
    .from('sandbox_artifacts')
    .select('id, artifact_type, prompt, grade, subject, competency, moderation_status, status, provider, storage_path, error_code, cancel_requested_at, expires_at, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: 'artifact_list_failed' }, { status: 500 });
  return NextResponse.json({ artifacts: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseRouteHandlerClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: 'authentication_required' }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });

  try {
    const insert = buildSandboxArtifactInsert({
      artifactType: body.artifactType as SandboxArtifactType,
      prompt: stringField(body.prompt) ?? '',
      grade: stringField(body.grade) ?? '',
      subject: stringField(body.subject) ?? '',
      competency: stringField(body.competency),
      consentVersion: stringField(body.consentVersion) ?? '',
      consentVerified: body.consentVerified === true,
      studentProfileId: typeof body.studentProfileId === 'string' ? body.studentProfileId : undefined,
    });

    const { data, error } = await supabase
      .from('sandbox_artifacts')
      .insert({ requester_id: auth.user.id, ...insert })
      .select('id, artifact_type, status, moderation_status, provider, expires_at, created_at')
      .single();

    if (error) return NextResponse.json({ error: 'artifact_enqueue_failed' }, { status: 403 });
    return NextResponse.json({
      artifact: data,
      providerPlan: selectSandboxProvider(insert.artifact_type),
    }, { status: 202 });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'invalid_artifact_request';
    return NextResponse.json({ error: code }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseRouteHandlerClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: 'authentication_required' }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'invalid_artifact_id' }, { status: 400 });

  const { data, error } = await supabase
    .from('sandbox_artifacts')
    .update({ status: 'cancelled', cancel_requested_at: new Date().toISOString() })
    .eq('id', id)
    .eq('requester_id', auth.user.id)
    .eq('status', 'queued')
    .select('id, status, cancel_requested_at')
    .single();

  if (error || !data) return NextResponse.json({ error: 'artifact_not_cancellable' }, { status: 409 });
  return NextResponse.json({ artifact: data });
}
