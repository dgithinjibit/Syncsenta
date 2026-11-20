import { createHmac } from 'node:crypto';

const ISSUER = 'syncsenta-studio';
const AUDIENCE = 'syncsenta-omega-claw';
const TOKEN_TTL_SECONDS = 60;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type OmegaProxyProfileRole =
  | 'student'
  | 'teacher'
  | 'parent'
  | 'admin'
  | 'head';

export type OmegaProxyAuthorizationResult =
  | { ok: true; authorization: string }
  | { ok: false; status: 400 | 403 | 503; error: string };

export function createOmegaProxyAuthorization(
  userId: string,
  profileRole: OmegaProxyProfileRole,
): OmegaProxyAuthorizationResult {
  if (profileRole !== 'student') {
    return {
      ok: false,
      status: 403,
      error: 'Omega Claw is only available to student accounts',
    };
  }
  if (!UUID_PATTERN.test(userId)) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid authenticated user identifier',
    };
  }

  const secret = process.env.SYNCSENTA_OMEGA_PROXY_JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    return {
      ok: false,
      status: 503,
      error: 'Omega proxy authentication is not configured',
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
    'base64url',
  );
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      role: 'student',
      iss: ISSUER,
      aud: AUDIENCE,
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
    }),
  ).toString('base64url');
  const unsignedToken = `${header}.${payload}`;
  const signature = createHmac('sha256', secret)
    .update(unsignedToken)
    .digest('base64url');

  return { ok: true, authorization: `Bearer ${unsignedToken}.${signature}` };
}
