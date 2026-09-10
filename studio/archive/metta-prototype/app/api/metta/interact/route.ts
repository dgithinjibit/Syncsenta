/**
 * /api/metta/interact
 *
 * Server-side MeTTa interaction endpoint.
 * Runs the MeTTaEducationSystem on the server where the Supabase
 * service-role key is available. Returns the interaction result
 * and persists it in one round-trip.
 *
 * POST body:
 *   { interaction: { type, ...fields }, grade?: string }
 *
 * The client calls this instead of running processInteraction()
 * client-side when it needs the result to be persisted.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { MeTTaEducationSystem } from '@/lib/omega-agent/metta-core';
import { METTA_MAX_SESSION_FACTS, METTA_INTERACTION_TIMEOUT_MS } from '@/lib/omega-agent/metta-config';

// One shared education system instance per server process.
// Next.js module-level singletons persist across requests in the same worker.
const educationSystem = new MeTTaEducationSystem();

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = getSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { interaction: Record<string, unknown>; grade?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.interaction || typeof body.interaction !== 'object') {
    return NextResponse.json({ error: 'interaction field is required' }, { status: 400 });
  }

  const grade = body.grade ?? 'grade2';

  // Ensure a session exists for this user with the right grade
  let session = educationSystem.getSession(user.id);
  if (!session) {
    session = educationSystem.createSession(user.id, grade);

    // Restore persisted facts from the last saved session if available
    const { data: saved } = await supabase
      .from('agent_traces')
      .select('input')
      .eq('user_id', user.id)
      .eq('agent_id', 'metta-session')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const facts: string[] = (saved?.input as any)?.sessionFacts ?? [];
    // Cap restored facts to METTA_MAX_SESSION_FACTS to prevent atomspace bloat
    const cappedFacts = facts.slice(-METTA_MAX_SESSION_FACTS);
    for (const fact of cappedFacts) {
      try { session.addSessionFact(fact); } catch { /* ignore parse errors */ }
    }
  }

  // Run interaction through the MeTTa interpreter with a timeout guard
  const startMs = Date.now();
  let result: unknown;
  try {
    const interactionPromise = session.processInteraction(body.interaction);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('MeTTa interaction timed out')), METTA_INTERACTION_TIMEOUT_MS)
    );
    result = await Promise.race([interactionPromise, timeoutPromise]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown interpreter error';
    console.error('[metta/interact] Interpreter error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  const durationMs = Date.now() - startMs;

  // Persist this interaction to agent_traces
  const traceId = `metta-interact-${user.id}-${Date.now()}`;
  await supabase.from('agent_traces').insert({
    trace_id: traceId,
    agent_id: 'metta-interact',
    user_id: user.id,
    input: body.interaction as any,
    prompt: JSON.stringify(body.interaction).slice(0, 500),
    model: 'metta-core-ts',
    output: { result, durationMs } as any,
    confidence: null,
    signed_hash: traceId,
    signature: traceId,
    metadata: { grade, type: body.interaction.type } as any,
  }).then(({ error }) => {
    if (error) console.error('[metta/interact] Trace save error:', error.message);
  });

  return NextResponse.json({
    result,
    durationMs,
    sessionId: user.id,
    grade,
  });
}
