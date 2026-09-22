import { NextRequest } from 'next/server';
import { proxyOmegaClaw } from '@/lib/omega-claw-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyOmegaClaw(request, 'progression', {
    method: 'POST',
    body,
  });
}
