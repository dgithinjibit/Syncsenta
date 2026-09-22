import { NextResponse } from 'next/server';
import { canManageSubjectData, dataRequestSchema, getBackendActor, persistTrustRecord } from '@/lib/backend/trust-backend';

export async function POST(request: Request) {
  try {
    const actor = getBackendActor();
    if (!actor) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const parsed = dataRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid data request', issues: parsed.error.flatten() }, { status: 400 });
    if (!canManageSubjectData(actor, parsed.data.subjectId)) return NextResponse.json({ error: 'Not authorised for this subject' }, { status: 403 });

    const result = await persistTrustRecord('dataRequests', {
      ...parsed.data,
      requesterId: actor.id,
      requesterRole: actor.role,
      status: 'received',
    });

    return NextResponse.json({ ok: true, dataRequestId: result.id, ...result }, { status: 202 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    console.error('data request failed', error);
    return NextResponse.json({ error: 'Unable to receive data request' }, { status: 500 });
  }
}
