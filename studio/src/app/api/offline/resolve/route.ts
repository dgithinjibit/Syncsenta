import { NextResponse } from 'next/server';

const ALLOWED_ACTIONS = new Set(['keep-server', 'keep-client', 'merge']);
const MAX_REQUEST_ID_LENGTH = 160;
const MAX_URL_LENGTH = 2048;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const requestId = typeof body?.requestId === 'string' ? body.requestId.trim() : '';
    const originalUrl = typeof body?.originalUrl === 'string' ? body.originalUrl : '';
    const action = typeof body?.resolutionData?.action === 'string'
      ? body.resolutionData.action
      : 'keep-server';

    if (!requestId || requestId.length > MAX_REQUEST_ID_LENGTH) {
      return NextResponse.json({ ok: false, error: 'Invalid requestId' }, { status: 400 });
    }

    if (!ALLOWED_ACTIONS.has(action)) {
      return NextResponse.json({ ok: false, error: 'Unsupported resolution action' }, { status: 400 });
    }

    // Conflict resolution must only target an internal application route. Do
    // not accept an arbitrary URL that could turn this endpoint into a replay
    // or server-side request forwarding primitive.
    if (!originalUrl || originalUrl.length > MAX_URL_LENGTH || !originalUrl.startsWith('/') || originalUrl.startsWith('//')) {
      return NextResponse.json({ ok: false, error: 'Invalid originalUrl' }, { status: 400 });
    }

    if (!body?.resolutionData || typeof body.resolutionData !== 'object' || Array.isArray(body.resolutionData)) {
      return NextResponse.json({ ok: false, error: 'Invalid resolutionData' }, { status: 400 });
    }

    // The current MVP records the user's explicit resolution choice. The
    // domain-specific merge remains intentionally separate until each queued
    // resource has a server-side idempotency contract.
    return NextResponse.json({
      ok: true,
      requestId,
      action,
      resolvedAt: new Date().toISOString(),
      message: `Conflict resolution recorded via ${action}`,
    }, { status: 200 });
  } catch (err) {
    console.error('Error handling offline resolution:', err);
    return NextResponse.json({ ok: false, error: 'Invalid JSON request' }, { status: 400 });
  }
}

export const runtime = 'edge';
