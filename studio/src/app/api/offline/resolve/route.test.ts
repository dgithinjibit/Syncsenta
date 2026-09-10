import { describe, expect, it } from 'vitest';
import { POST } from './route';

async function post(body: unknown) {
  return POST(new Request('http://localhost/api/offline/resolve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

describe('POST /api/offline/resolve', () => {
  it('records a supported same-origin resolution choice', async () => {
    const response = await post({
      requestId: 'queue-123',
      originalUrl: '/api/session/sync',
      resolutionData: { action: 'merge' },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      requestId: 'queue-123',
      action: 'merge',
    });
  });

  it('rejects unsupported actions', async () => {
    const response = await post({
      requestId: 'queue-123',
      originalUrl: '/api/session/sync',
      resolutionData: { action: 'forward-to-external-host' },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Unsupported resolution action',
    });
  });

  it('rejects cross-origin replay targets', async () => {
    const response = await post({
      requestId: 'queue-123',
      originalUrl: 'https://example.com/collect',
      resolutionData: { action: 'keep-server' },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Invalid originalUrl',
    });
  });

  it('rejects malformed JSON without exposing parser details', async () => {
    const response = await POST(new Request('http://localhost/api/offline/resolve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Invalid JSON request',
    });
  });
});
