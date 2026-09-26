import { NextResponse } from 'next/server';
import { getBackendActor, persistTrustRecord, trustRequestSchema } from '@/lib/backend/trust-backend';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = trustRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', issues: parsed.error.flatten() }, { status: 400 });
    }

    const actor = await getBackendActor();
    const result = await persistTrustRecord('trustRequests', {
      ...parsed.data,
      actorId: actor?.id || null,
      actorRole: actor?.role || null,
      source: 'frontend',
      status: 'received',
    });

    return NextResponse.json({ ok: true, requestId: result.id, ...result }, { status: 202 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    console.error('trust request failed', error);
    return NextResponse.json({ error: 'Unable to receive request' }, { status: 500 });
  }
}
