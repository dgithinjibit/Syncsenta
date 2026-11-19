import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/route-handler', () => ({
  createSupabaseRouteHandlerClient: vi.fn(),
}));

import { handleHint, handleProgression } from '@/lib/omega-claw-api';

function request(path: string, body: unknown) {
  return new NextRequest(`http://localhost/api/omega-claw/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Hyperon Omega authority', () => {
  beforeEach(() => {
    delete process.env.SYNCSENTA_BACKEND_URL;
  });

  it('does not evaluate Omega progression in TypeScript when Rust is absent', async () => {
    const response = await handleProgression(request('progression', {
      outcome: 'incorrect',
      correct: false,
      explained: false,
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Omega Claw Hyperon backend is not configured',
    });
  });

  it('does not evaluate Omega hints in TypeScript when Rust is absent', async () => {
    const response = await handleHint(request('hint', { hint_level: 2 }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Omega Claw Hyperon backend is not configured',
    });
  });
});
