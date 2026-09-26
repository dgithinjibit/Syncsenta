import { NextResponse } from 'next/server';
import { canManageSchool, getBackendActor, persistTrustRecord } from '@/lib/backend/trust-backend';
import { z } from 'zod';

const schoolActionSchema = z.object({
  action: z.enum(['invite_staff', 'assign_role', 'manage_class', 'review_consent', 'export_records', 'request_deletion', 'suspend_account']),
  schoolId: z.string().trim().min(1).max(120),
  subjectId: z.string().trim().max(120).optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const actor = await getBackendActor();
    if (!actor) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    if (!canManageSchool(actor)) return NextResponse.json({ error: 'School-admin role required' }, { status: 403 });

    const parsed = schoolActionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid school action', issues: parsed.error.flatten() }, { status: 400 });

    const result = await persistTrustRecord('schoolControlActions', {
      ...parsed.data,
      actorId: actor.id,
      actorRole: actor.role,
      status: 'received',
    });
    return NextResponse.json({ ok: true, actionId: result.id, ...result }, { status: 202 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    console.error('school control action failed', error);
    return NextResponse.json({ error: 'Unable to receive school action' }, { status: 500 });
  }
}
