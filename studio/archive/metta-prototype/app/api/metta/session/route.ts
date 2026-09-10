/**
 * /api/metta/session
 *
 * Server-side persistence layer for MeTTa sessions.
 * The client-side MeTTaSession is in-memory only. This route
 * saves and restores session state to Supabase so state survives
 * page reloads and cross-device sessions.
 *
 * Uses agent_traces table which already exists in the schema.
 *
 * POST /api/metta/session  - persist session facts + last interaction result
 * GET  /api/metta/session  - restore latest session state for the user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// ------------------------------------------------------------------ types ---

interface SessionPersistPayload {
  sessionFacts: string[];              // raw MeTTa fact strings from getSessionState()
  lastInteraction: {
    type: string;
    input: Record<string, unknown>;
    result: unknown;
    timestamp: number;
  } | null;
  competencyLevels: Record<string, number>;
  grade: string;
}

// --------------------------------------------------------------- POST -------

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = getSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: SessionPersistPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { sessionFacts, lastInteraction, competencyLevels, grade } = body;

  if (!Array.isArray(sessionFacts)) {
    return NextResponse.json({ error: 'sessionFacts must be an array' }, { status: 400 });
  }

  // Reuse agent_traces table: agent_id = 'metta-session', trace_id = userId+timestamp
  const traceId = `metta-${user.id}-${Date.now()}`;

  const { error } = await supabase.from('agent_traces').insert({
    trace_id: traceId,
    agent_id: 'metta-session',
    user_id: user.id,
    input: { sessionFacts, grade } as any,
    prompt: 'metta-session-persistence',
    model: 'metta-core-ts',
    output: {
      competencyLevels,
      lastInteraction,
      savedAt: Date.now(),
    } as any,
    confidence: null,
    signed_hash: traceId,   // lightweight — not cryptographic here
    signature: traceId,
    metadata: { type: 'metta-session' } as any,
  });

  if (error) {
    console.error('[metta/session POST] Supabase insert error:', error.message);
    return NextResponse.json({ error: 'Failed to persist session' }, { status: 500 });
  }

  return NextResponse.json({ success: true, traceId });
}

// --------------------------------------------------------------- GET --------

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = getSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch the most recent MeTTa session trace for this user
  const { data, error } = await supabase
    .from('agent_traces')
    .select('input, output, created_at')
    .eq('user_id', user.id)
    .eq('agent_id', 'metta-session')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    // No prior session — return empty state, not an error
    return NextResponse.json({
      found: false,
      sessionFacts: [],
      competencyLevels: {},
      grade: 'grade2',
    });
  }

  const input = data.input as any;
  const output = data.output as any;

  return NextResponse.json({
    found: true,
    sessionFacts: input?.sessionFacts ?? [],
    grade: input?.grade ?? 'grade2',
    competencyLevels: output?.competencyLevels ?? {},
    lastInteraction: output?.lastInteraction ?? null,
    savedAt: output?.savedAt ?? null,
  });
}
