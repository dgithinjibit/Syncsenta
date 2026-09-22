import { NextRequest, NextResponse } from 'next/server';

const backendBaseUrl = () =>
  (process.env.SYNCSENTA_BACKEND_URL || 'http://127.0.0.1:8080/api/v1').replace(/\/$/, '');

export async function proxyOmegaClaw(
  request: NextRequest,
  path: string,
  init: RequestInit = {},
) {
  try {
    const authorization = request.headers.get('authorization');
    const response = await fetch(`${backendBaseUrl()}/omega-claw/${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(authorization ? { Authorization: authorization } : {}),
        ...(init.headers || {}),
      },
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({ error: 'Invalid backend response' }));
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        error: 'Omega Claw backend is unavailable',
        backend: backendBaseUrl(),
      },
      { status: 503 },
    );
  }
}
