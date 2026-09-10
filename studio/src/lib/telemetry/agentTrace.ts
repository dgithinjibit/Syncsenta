import * as crypto from 'crypto';
import { getSupabaseServerClient } from '../supabase/server';

export type AgentTracePayload = {
  trace_id: string;
  agent_id: string;
  session_id?: string | null;
  user_id?: string | null;
  input: Record<string, unknown>;
  prompt: string;
  model: string;
  output: Record<string, unknown>;
  confidence?: number | null;
  metadata?: Record<string, unknown> | null;
};

export function createCanonicalTracePayload(trace: AgentTracePayload) {
  const canonical = {
    trace_id: trace.trace_id,
    agent_id: trace.agent_id,
    session_id: trace.session_id || null,
    user_id: trace.user_id || null,
    input: trace.input,
    prompt: trace.prompt,
    model: trace.model,
    output: trace.output,
    confidence: trace.confidence ?? null,
    metadata: trace.metadata ?? null,
  };

  const ordered: Record<string, unknown> = {};
  Object.keys(canonical)
    .sort()
    .forEach(key => {
      ordered[key] = (canonical as any)[key];
    });

  return JSON.stringify(ordered);
}

export function computeSignedHash(canonicalPayload: string) {
  return crypto.createHash('sha256').update(canonicalPayload).digest('hex');
}

export async function insertAgentTrace(trace: AgentTracePayload, signature: string, signedHash: string) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('agent_traces')
    .insert({
      trace_id: trace.trace_id,
      agent_id: trace.agent_id,
      session_id: trace.session_id || null,
      user_id: trace.user_id || null,
      input: trace.input,
      prompt: trace.prompt,
      model: trace.model,
      output: trace.output,
      confidence: trace.confidence ?? null,
      signed_hash: signedHash,
      signature,
      metadata: trace.metadata ?? null,
    } as any)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getTraceById(traceId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('agent_traces')
    .select('*')
    .eq('trace_id', traceId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function verifyAgentSignature(agentId: string, payload: string, signature: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('agent_keys')
    .select('public_key')
    .eq('agent_id', agentId)
    .eq('is_active', true)
    .single<{ public_key: string | null }>();

  if (error || !data || !data.public_key) {
    return false;
  }

  const publicKey = data.public_key;
  const verify = crypto.createVerify('SHA256');
  verify.update(payload);
  verify.end();
  return verify.verify(publicKey, signature, 'base64');
}

export default {
  createCanonicalTracePayload,
  computeSignedHash,
  insertAgentTrace,
  getTraceById,
  verifyAgentSignature,
};
