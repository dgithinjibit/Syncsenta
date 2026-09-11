import { NextRequest, NextResponse } from 'next/server';
import { AgentTracePayload, createCanonicalTracePayload, computeSignedHash, verifyAgentSignature, insertAgentTrace, getTraceById } from '../../../../lib/agentTrace';

const VALID_METHODS = ['POST', 'GET'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      trace_id,
      agent_id,
      session_id,
      user_id,
      input,
      prompt,
      model,
      output,
      confidence,
      metadata,
      signature,
    } = body as AgentTracePayload & { signature?: string };

    if (!trace_id || !agent_id || !input || !prompt || !model || !output || !signature) {
      return NextResponse.json({ error: 'Missing required trace fields' }, { status: 400 });
    }

    const canonicalPayload = createCanonicalTracePayload({
      trace_id,
      agent_id,
      session_id,
      user_id,
      input,
      prompt,
      model,
      output,
      confidence,
      metadata,
    });
    const signedHash = computeSignedHash(canonicalPayload);

    const signatureValid = await verifyAgentSignature(agent_id, canonicalPayload, signature);
    if (!signatureValid) {
      return NextResponse.json({ error: 'Invalid agent signature' }, { status: 401 });
    }

    const inserted = await insertAgentTrace(
      {
        trace_id,
        agent_id,
        session_id,
        user_id,
        input,
        prompt,
        model,
        output,
        confidence,
        metadata,
      },
      signature,
      signedHash
    );

    return NextResponse.json({ success: true, data: inserted });
  } catch (error) {
    console.error('Error in /api/agent/trace POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const trace_id = url.searchParams.get('trace_id');

    if (!trace_id) {
      return NextResponse.json({ error: 'Missing trace_id query parameter' }, { status: 400 });
    }

    const trace = await getTraceById(trace_id);
    return NextResponse.json({ success: true, data: trace });
  } catch (error) {
    console.error('Error in /api/agent/trace GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
