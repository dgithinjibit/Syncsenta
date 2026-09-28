import { NextRequest } from 'next/server';
import { handleHint } from '@/lib/omega-claw-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  return handleHint(request);
}
