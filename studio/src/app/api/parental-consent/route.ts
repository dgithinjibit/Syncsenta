import { NextResponse } from 'next/server';
import { canManageConsent, consentSchema, getBackendActor, persistTrustRecord } from '@/lib/backend/trust-backend';

export async function POST(request: Request) {
  try {
    const actor = getBackendActor();
    if (!actor) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    if (!canManageConsent(actor)) return NextResponse.json({ error: 'Insufficient role for consent management' }, { status: 403 });

    const parsed = consentSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid consent record', issues: parsed.error.flatten() }, { status: 400 });

    const result = await persistTrustRecord('parentalConsents', {
      ...parsed.data,
      guardianId: actor.id,
      guardianRole: actor.role,
      status: parsed.data.granted ? 'active' : 'withdrawn',
    });

    return NextResponse.json({ ok: true, consentId: result.id, ...result }, { status: 202 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    console.error('parental consent failed', error);
    return NextResponse.json({ error: 'Unable to record consent' }, { status: 500 });
  }
}
