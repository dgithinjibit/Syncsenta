import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';
import {
  createOmegaProxyAuthorization,
  type OmegaProxyAuthorizationResult,
} from '@/lib/omega-proxy-auth';
import {
  OmegaClawUnknownChallengeNode,
  isOmegaClawChallengeNode,
  readCompletedOmegaClawNodes,
  recordOmegaClawNodeAttempt,
} from '@/lib/omega-agent/omega-claw-challenge';

/**
 * The `/api/omega-claw/*` endpoints.
 *
 * Policy requests are forwarded to Rust/Hyperon only when the backend URL is
 * configured. Supabase-authenticated student callers are exchanged for a
 * short-lived, audience-bound Studio assertion before reaching Rust. Challenge
 * progress persistence remains in Studio because it writes the app-owned
 * `learning_progress` records.
 */

const backendBaseUrl = () => (process.env.SYNCSENTA_BACKEND_URL || '').trim().replace(/\/$/, '');

/** True when someone has pointed the app at a deployed Rust backend. */
export function omegaClawBackendConfigured(): boolean {
  return backendBaseUrl().length > 0;
}

export async function evaluateHyperonTutoring(
  request: NextRequest,
): Promise<NextResponse> {
  if (!omegaClawBackendConfigured()) {
    return NextResponse.json(
      {
        error: 'Omega Claw Hyperon backend is not configured',
        detail: 'Set SYNCSENTA_BACKEND_URL to the deployed Rust/Hyperon service.',
      },
      { status: 503 },
    );
  }

  const identity = await authenticatedAuthorization(request);
  if (!identity.ok) {
    return NextResponse.json({ error: identity.error }, { status: identity.status });
  }
  const raw = await request.text();
  const result = await forward('tutoring', raw, identity.authorization);
  return NextResponse.json(result.body, { status: result.status });
}

export async function fetchHyperonTutoringDecision(
  body: Record<string, unknown>,
  authorization: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!omegaClawBackendConfigured()) {
    return {
      status: 503,
      body: {
        error: 'Omega Claw Hyperon backend is not configured',
        detail: 'Set SYNCSENTA_BACKEND_URL to the deployed Rust/Hyperon service.',
      },
    };
  }

  try {
    const response = await fetch(`${backendBaseUrl()}/omega-claw/tutoring`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({ error: 'Invalid backend response' }));
    return { status: response.status, body: payload as Record<string, unknown> };
  } catch {
    return {
      status: 502,
      body: {
        error: 'Omega Claw backend is unreachable',
        backend: backendBaseUrl(),
      },
    };
  }
}

type OmegaClawResult = { status: number; body: Record<string, unknown> };

type OmegaIdentityResult =
  | { ok: true; authorization: string }
  | { ok: false; status: number; error: string };

async function authorizeOmegaUser(
  supabase: Pick<SupabaseClient<Database>, 'from'>,
  userId: string,
): Promise<OmegaIdentityResult> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (error || !profile) {
    if (error) console.error('Omega caller profile lookup failed:', error.message);
    return {
      ok: false,
      status: error ? 500 : 403,
      error: error ? 'Unable to verify Omega caller role' : 'Profile not found',
    };
  }

  const result: OmegaProxyAuthorizationResult = createOmegaProxyAuthorization(
    userId,
    profile.role,
  );
  return result.ok
    ? result
    : { ok: false, status: result.status, error: result.error };
}

async function authenticatedAuthorization(
  request: NextRequest,
): Promise<OmegaIdentityResult> {
  const authorizationHeader = request.headers.get('authorization');
  if (authorizationHeader) {
    const match = /^Bearer ([^\s]+)$/.exec(authorizationHeader);
    if (!match) return { ok: false, status: 401, error: 'Unauthorized' };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        ok: false,
        status: 503,
        error: 'Supabase authentication is not configured',
      };
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: authorizationHeader } },
    });
    const { data: { user }, error } = await supabase.auth.getUser(match[1]);
    if (error || !user) return { ok: false, status: 401, error: 'Unauthorized' };
    return authorizeOmegaUser(supabase, user.id);
  }

  const supabase = await createSupabaseRouteHandlerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { ok: false, status: 401, error: 'Unauthorized' };
  return authorizeOmegaUser(supabase, user.id);
}

/**
 * Studio verifies the caller and their student role, then creates the scoped
 * assertion the Rust Omega middleware accepts. Raw Supabase JWTs never cross
 * this service boundary.
 */
async function forward(
  path: string,
  raw: string,
  authorization: string,
): Promise<OmegaClawResult> {
  try {
    const response = await fetch(`${backendBaseUrl()}/omega-claw/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: raw,
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({ error: 'Invalid backend response' }));
    return { status: response.status, body: payload as Record<string, unknown> };
  } catch {
    // Named rather than swallowed: a mis-set SYNCSENTA_BACKEND_URL otherwise
    // looks to a teacher exactly like a learner who answered wrongly.
    return {
      status: 502,
      body: { error: 'Omega Claw backend is unreachable', backend: backendBaseUrl() },
    };
  }
}

async function forwardAuthenticated(
  request: NextRequest,
  path: string,
): Promise<NextResponse> {
  if (!omegaClawBackendConfigured()) {
    return NextResponse.json(
      {
        error: 'Omega Claw Hyperon backend is not configured',
        detail: 'Set SYNCSENTA_BACKEND_URL to the deployed Rust/Hyperon service.',
      },
      { status: 503 },
    );
  }

  const identity = await authenticatedAuthorization(request);
  if (!identity.ok) {
    return NextResponse.json({ error: identity.error }, { status: identity.status });
  }

  const raw = await request.text();
  const result = await forward(path, raw, identity.authorization);
  return NextResponse.json(result.body, { status: result.status });
}

/**
 * `request.json()` after the body was already drained by `request.text()`.
 *
 * A `NextRequest` body stream can only be read once, and the backend branch
 * needs the exact bytes to forward, so both handlers read text first and parse
 * this shared copy.
 */
function parseRawJson(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * `POST /api/omega-claw/progression`
 * `{ outcome: 'correct' | 'incorrect' | 'explained' | 'mastered', correct, explained }`
 */
export async function handleProgression(request: NextRequest): Promise<NextResponse> {
  return forwardAuthenticated(request, 'progression');
}

/** `POST /api/omega-claw/hint` — `{ hint_level: 1..4 }`, clamped like the Rust handler. */
export async function handleHint(request: NextRequest): Promise<NextResponse> {
  return forwardAuthenticated(request, 'hint');
}

/**
 * The challenge routes always check the session, even when `SYNCSENTA_BACKEND_URL` is set. The two
 * rule endpoints hand their whole call to the Rust service — including its `AuthUser` middleware —
 * but these write `learning_progress` rows, which is the app's table and stays the app's job until
 * the service grows the same persistence.
 */
function unauthorizedChallenge(): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized', detail: 'Please sign in to continue' },
    { status: 401 },
  );
}

/** `GET /api/omega-claw/challenge` — the nodes this learner has already earned. */
export async function handleChallengeGet(_request: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseRouteHandlerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorizedChallenge();

  const completed = await readCompletedOmegaClawNodes(supabase, user.id);
  return NextResponse.json({ completed });
}

/**
 * `POST /api/omega-claw/challenge` — `{ nodeId, answer }`
 *
 * Three things this route refuses to take on trust, all of which the card used to decide locally:
 *
 *   - who the learner is: the session cookie, so a refresh on a different device reads the same path;
 *   - whether the answer was right: graded against `OMEGA_CLAW_CHALLENGE_NODES`, because this write
 *     is the one that can reach the points ledger;
 *   - which grade the rows land under: `profiles.grade`, so a body claiming `Grade 12` cannot file a
 *     Grade 6 learner's progress where nobody who looks for them will find it. The body's `grade` is
 *     only a fallback for a profile with none, which is the same compromise `/api/chat` makes.
 *
 * The progress row is written with the caller's own client so `learning_progress` owner policies
 * apply; only `award_points()` runs on the service client.
 */
export async function handleChallengePost(request: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseRouteHandlerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorizedChallenge();

  const body = parseRawJson(await request.text());
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const nodeId = typeof body.nodeId === 'string' ? body.nodeId.trim() : '';
  const answer = typeof body.answer === 'string' ? body.answer.trim() : '';
  if (!nodeId) return NextResponse.json({ error: 'nodeId must be a non-empty string' }, { status: 400 });
  if (!answer) return NextResponse.json({ error: 'answer must be a non-empty string' }, { status: 400 });
  if (!isOmegaClawChallengeNode(nodeId)) {
    return NextResponse.json({ error: `Unknown Omega Claw challenge node: ${nodeId}` }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('grade')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) {
    return NextResponse.json(
      { error: 'Could not read this learner’s profile', detail: profileError.message },
      { status: 500 },
    );
  }

  const grade = profile?.grade || (typeof body.grade === 'string' ? body.grade.trim() : '');
  if (!grade) {
    return NextResponse.json(
      {
        error: 'No grade on this profile',
        detail: 'Ask your teacher to set your class before saving challenge progress.',
      },
      { status: 409 },
    );
  }

  try {
    const attempt = await recordOmegaClawNodeAttempt({
      client: supabase,
      serviceClient: getSupabaseServerClient(),
      userId: user.id,
      grade,
      nodeId,
      answer,
    });
    return NextResponse.json(attempt);
  } catch (error) {
    if (error instanceof OmegaClawUnknownChallengeNode) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      {
        error: 'Could not save that answer',
        detail: error instanceof Error ? error.message : 'Unknown storage failure',
      },
      { status: 500 },
    );
  }
}
