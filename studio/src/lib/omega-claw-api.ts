import { NextRequest, NextResponse } from 'next/server';
import {
  OMEGA_CLAW_ACTION_COPY,
  OMEGA_CLAW_HINT_COPY,
  clampOmegaClawHintLevel,
  omegaClawCanUnlockTransfer,
  omegaClawHintFor,
  omegaClawNextActionForOutcome,
  OmegaClawUnknownOutcome,
} from '@/lib/omega-agent/omega-claw-rules';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler';

/**
 * The `/api/omega-claw/*` endpoints.
 *
 * These used to be a pure proxy onto
 * `${SYNCSENTA_BACKEND_URL || 'http://127.0.0.1:8080/api/v1'}/omega-claw/…`,
 * i.e. the Rust MVP service — which is deployed nowhere. On Vercel the default
 * resolves to the serverless function's own loopback address, the fetch throws,
 * and every learner request got
 * `503 {"error":"Omega Claw backend is unavailable"}`. Measured on
 * sentastudio.vercel.app on 2026-09-28 for both `progression` and `hint`.
 *
 * Now the rules are evaluated here, from `lib/omega-agent/omega-claw-rules.ts`,
 * unless `SYNCSENTA_BACKEND_URL` is explicitly set — in which case the Rust
 * service answers, because that is where authorisation against real roles,
 * persistence and teacher approval live. Both paths return the same JSON shape;
 * this module only adds the learner-facing wording on top of the symbol the
 * rule engine answers with.
 */

const backendBaseUrl = () => (process.env.SYNCSENTA_BACKEND_URL || '').trim().replace(/\/$/, '');

/** True when someone has pointed the app at a deployed Rust backend. */
export function omegaClawBackendConfigured(): boolean {
  return backendBaseUrl().length > 0;
}

type OmegaClawResult = { status: number; body: Record<string, unknown> };

/**
 * The Rust handlers sit behind `AuthUser` and refuse anything that is not a
 * learner, teacher, parent, head or admin. Without that service in the loop the
 * app has to answer for itself, so an anonymous caller gets the same 401 every
 * other student endpoint returns rather than a free read of the rule engine.
 */
async function unauthorized(): Promise<OmegaClawResult | null> {
  if (omegaClawBackendConfigured()) return null;

  const supabase = await createSupabaseRouteHandlerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return null;
  return { status: 401, body: { error: 'Unauthorized', detail: 'Please sign in to continue' } };
}

async function forward(
  request: NextRequest,
  path: string,
  raw: string,
): Promise<OmegaClawResult> {
  try {
    const authorization = request.headers.get('authorization');
    const response = await fetch(`${backendBaseUrl()}/omega-claw/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authorization ? { Authorization: authorization } : {}),
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
  const denied = await unauthorized();
  if (denied) return NextResponse.json(denied.body, { status: denied.status });

  const raw = await request.text();

  if (omegaClawBackendConfigured()) {
    const result = await forward(request, 'progression', raw);
    return NextResponse.json(result.body, { status: result.status });
  }

  const body = parseRawJson(raw);
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const outcome = body.outcome;
  if (typeof outcome !== 'string' || outcome.trim() === '') {
    return NextResponse.json({ error: 'outcome must be a non-empty string' }, { status: 400 });
  }

  try {
    const nextAction = omegaClawNextActionForOutcome(outcome);
    return NextResponse.json({
      outcome: outcome.trim().toLowerCase().replace(/[\s_]+/g, '-'),
      nextAction,
      nextActionMessage: OMEGA_CLAW_ACTION_COPY[nextAction],
      unlocksTransfer: omegaClawCanUnlockTransfer(body.correct === true, body.explained === true),
    });
  } catch (error) {
    if (error instanceof OmegaClawUnknownOutcome) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

/** `POST /api/omega-claw/hint` — `{ hint_level: 1..4 }`, clamped like the Rust handler. */
export async function handleHint(request: NextRequest): Promise<NextResponse> {
  const denied = await unauthorized();
  if (denied) return NextResponse.json(denied.body, { status: denied.status });

  const raw = await request.text();

  if (omegaClawBackendConfigured()) {
    const result = await forward(request, 'hint', raw);
    return NextResponse.json(result.body, { status: result.status });
  }

  const body = parseRawJson(raw);
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const requested = Number(body.hint_level ?? body.hintLevel);
  if (!Number.isFinite(requested)) {
    return NextResponse.json({ error: 'hint_level must be a number' }, { status: 400 });
  }

  const hintLevel = clampOmegaClawHintLevel(requested);
  const hint = omegaClawHintFor(hintLevel);
  return NextResponse.json({ hintLevel, hint, hintMessage: OMEGA_CLAW_HINT_COPY[hint] });
}
