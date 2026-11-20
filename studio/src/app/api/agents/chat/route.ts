import { NextRequest, NextResponse } from 'next/server';
import { buildApiUrl, getAiAgentsServiceHeaders } from '@/lib/api-config';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServerClient();
  const authResult = await supabase.auth.getUser().catch(() => null);
  const user = authResult?.data?.user ?? null;
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const response = await fetch(buildApiUrl('/agents/chat'), {
      method: 'POST',
      headers: getAiAgentsServiceHeaders({
        'Content-Type': 'application/json',
        'X-Forwarded-User': user.id,
      }),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    });
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('[api/agents/chat] upstream AI service failed', error);
    return NextResponse.json(
      { error: 'AI service could not be reached' },
      { status: 503 },
    );
  }
}
