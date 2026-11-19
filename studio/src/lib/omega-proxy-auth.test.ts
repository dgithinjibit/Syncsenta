import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { createOmegaProxyAuthorization } from './omega-proxy-auth';

const TEST_SECRET = 'synthetic-only-omega-proxy-secret-32-bytes';

function decodePayload(authorization: string): Record<string, unknown> {
  const token = authorization.replace(/^Bearer /, '');
  const [, payload] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

describe('createOmegaProxyAuthorization', () => {
  afterEach(() => {
    delete process.env.SYNCSENTA_OMEGA_PROXY_JWT_SECRET;
  });

  it('signs a short-lived identity assertion only for an authenticated student', () => {
    process.env.SYNCSENTA_OMEGA_PROXY_JWT_SECRET = TEST_SECRET;

    const result = createOmegaProxyAuthorization(
      'f58c2e07-a71c-444e-9402-2926caf40b61',
      'student',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected a signed proxy authorization');

    const token = result.authorization.slice('Bearer '.length);
    const [header, payload, signature] = token.split('.');
    expect(JSON.parse(Buffer.from(header, 'base64url').toString('utf8'))).toEqual({
      alg: 'HS256',
      typ: 'JWT',
    });
    expect(signature).toBe(
      createHmac('sha256', TEST_SECRET)
        .update(`${header}.${payload}`)
        .digest('base64url'),
    );
    expect(decodePayload(result.authorization)).toMatchObject({
      sub: 'f58c2e07-a71c-444e-9402-2926caf40b61',
      role: 'student',
      iss: 'syncsenta-studio',
      aud: 'syncsenta-omega-claw',
    });
    expect(decodePayload(result.authorization).exp).toBeGreaterThan(
      decodePayload(result.authorization).iat as number,
    );
  });

  it('fails closed for non-student roles', () => {
    process.env.SYNCSENTA_OMEGA_PROXY_JWT_SECRET = TEST_SECRET;

    expect(createOmegaProxyAuthorization('teacher-id', 'teacher')).toEqual({
      ok: false,
      status: 403,
      error: 'Omega Claw is only available to student accounts',
    });
  });

  it('reports missing or weak signing configuration instead of forwarding Supabase tokens', () => {
    const userId = 'f58c2e07-a71c-444e-9402-2926caf40b61';
    expect(createOmegaProxyAuthorization(userId, 'student')).toEqual({
      ok: false,
      status: 503,
      error: 'Omega proxy authentication is not configured',
    });

    process.env.SYNCSENTA_OMEGA_PROXY_JWT_SECRET = 'short';
    expect(createOmegaProxyAuthorization(userId, 'student')).toEqual({
      ok: false,
      status: 503,
      error: 'Omega proxy authentication is not configured',
    });
  });
});
