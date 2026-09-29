import { NextRequest } from 'next/server';
import { handleChallengeGet, handleChallengePost } from '@/lib/omega-claw-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleChallengeGet(request);
}

export async function POST(request: NextRequest) {
  return handleChallengePost(request);
}
