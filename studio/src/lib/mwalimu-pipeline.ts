/**
 * Mwalimu AI pipeline — single source of truth.
 *
 * Consolidates what used to be split between:
 *   - `studio/src/ai/flows/mwalimu-ai-flow.ts` (Genkit, CBC + MeTTa + summary)
 *   - `studio/src/app/api/mwalimu/route.ts` (multi-provider, personalization)
 *
 * Anything that needs a Mwalimu response now goes through `runMwalimuTurn`.
 * The Genkit flow is kept as a thin wrapper for orchestrator-agent.ts; the
 * Next.js API route calls this module directly.
 */
import { multiAIClient } from './multi-ai-client';
import { personalizedLearning } from './personalized-learning';
import {
  queryCBCAgent,
  formatCBCContextForPrompt,
  formatCitationsForDisplay,
  type CBCQueryResponse,
} from './cbc-agent-client';
import {
  getActiveSchemeContext,
  formatSchemeContextForPrompt,
  getCurrentWeekNumber,
  type SchemeContext,
} from './scheme-context-client';
import {
  analyzeEmotionalState,
  enhancePromptWithEmotionalIntelligence,
  type EmotionalState,
} from './emotional-intelligence';
import { buildSocraticGuidancePrompt } from './socratic-guidance';

export interface MwalimuTurnInput {
  userId: string;
  studentName?: string;
  teacherId?: string;
  grade: string;
  subject: string;
  currentMessage: string;
  history?: Array<{ role: 'user' | 'model'; content: string }>;
  /** Optional running mastery score in [0,1] used to query MeTTa pedagogy. */
  masteryScore?: number;
}

export interface MwalimuTurnOutput {
  response: string;
  provider: string;
  model: string;
  tokensUsed?: number;
  cbcCitationsAttached: boolean;
  schemeContextUsed: boolean;
  mettaValidation: MettaValidation | null;
  pedagogy: MettaPedagogy | null;
  emotionalState?: EmotionalState;
}

export interface MettaValidation {
  is_valid: boolean;
  curriculum_alignment: string;
  reasoning_steps: string[];
  suggested_correction?: string;
}

export interface MettaPedagogy {
  band: string;
  feedback_tag: string;
  next_action: string;
  practice_minutes_per_day: number;
  questions_per_session: number;
  cycle_days: number;
}

const METTA_BASE = process.env.METTA_BASE_URL || 'http://localhost:8080';

/** Run one Mwalimu chat turn end-to-end. */
export async function runMwalimuTurn(input: MwalimuTurnInput): Promise<MwalimuTurnOutput> {
  // 0. Analyze student emotional state
  const emotionalState = analyzeEmotionalState(input.currentMessage, input.history);
  
  // 1. CBC curriculum enrichment (non-blocking on failure).
  const cbc = await safeQueryCBC(input.currentMessage, input.subject, input.grade);
  const cbcContext = cbc ? formatCBCContextForPrompt(cbc) : '';

  // 2. Scheme of Work context (grounds tutoring in teacher's current lesson plan)
  const scheme = await safeQueryScheme(input.userId, input.subject);
  const schemeContext = scheme ? formatSchemeContextForPrompt(scheme) : '';

  // 3. MeTTa pedagogy lookup (drives next-turn constraint, demoable).
  const pedagogy = await safeQueryPedagogy(input.masteryScore);

  // 4. Build personalized system prompt and append CBC + scheme + pedagogy constraints.
  let personalizedPrompt = await personalizedLearning.generatePersonalizedPrompt(
    input.userId,
    input.subject || 'General',
    input.currentMessage || ''
  );
  
  // 4.5. Enhance prompt with emotional intelligence
  personalizedPrompt = enhancePromptWithEmotionalIntelligence(
    personalizedPrompt,
    emotionalState,
    input.studentName,
    input.subject
  );
  
  const socraticGuidance = buildSocraticGuidancePrompt({
    currentMessage: input.currentMessage,
    history: input.history,
  });
  const systemPrompt = composeSystemPrompt(personalizedPrompt, cbcContext, schemeContext, pedagogy, socraticGuidance);

  // 5. Generate via the multi-provider client (Groq → AISA → fallback).
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...((input.history ?? []).map((m) => ({
      role: (m.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: m.content,
    }))),
    { role: 'user' as const, content: input.currentMessage },
  ];
  const ai = await multiAIClient.generateResponse(messages, {
    temperature: 0.3,
    maxTokens: 1500,
    preferredProvider: 'groq',
  });

  let responseText = ai.content;

  // 6. MeTTa curriculum validation (post-hoc).
  const validation = await safeValidate({
    subject: input.subject,
    grade: input.grade,
    question: input.currentMessage,
    response: responseText,
  });
  if (validation && !validation.is_valid && validation.suggested_correction) {
    responseText = validation.suggested_correction;
  }

  // 7. Append CBC citations if we have them.
  let cbcCitationsAttached = false;
  if (cbc && cbc.citations.length > 0) {
    responseText += formatCitationsForDisplay(cbc.citations);
    cbcCitationsAttached = true;
  }

  return {
    response: responseText,
    provider: ai.provider,
    model: ai.model,
    tokensUsed: ai.tokensUsed,
    cbcCitationsAttached,
    schemeContextUsed: !!scheme,
    mettaValidation: validation,
    pedagogy,
    emotionalState,
  };
}

export type MwalimuStreamEvent =
  | { type: 'meta'; cbc: boolean; pedagogy: MettaPedagogy | null }
  | { type: 'chunk'; content: string }
  | {
      type: 'done';
      final: MwalimuTurnOutput;
      replaced: boolean; // true if MeTTa validation swapped the response
    }
  | { type: 'error'; message: string };

/** Streaming variant of runMwalimuTurn. Yields token chunks then a final event. */
export async function* runMwalimuTurnStream(
  input: MwalimuTurnInput,
): AsyncGenerator<MwalimuStreamEvent, void, unknown> {
  // 0. Analyze student emotional state
  const emotionalState = analyzeEmotionalState(input.currentMessage, input.history);
  
  const cbc = await safeQueryCBC(input.currentMessage, input.subject, input.grade);
  const cbcContext = cbc ? formatCBCContextForPrompt(cbc) : '';
  
  const scheme = await safeQueryScheme(input.userId, input.subject);
  const schemeContext = scheme ? formatSchemeContextForPrompt(scheme) : '';
  
  const pedagogy = await safeQueryPedagogy(input.masteryScore);

  yield { type: 'meta', cbc: !!cbc, pedagogy };

  let personalizedPrompt = await personalizedLearning.generatePersonalizedPrompt(
    input.userId,
    input.subject || 'General',
    input.currentMessage || '',
  );
  
  // Enhance prompt with emotional intelligence
  personalizedPrompt = enhancePromptWithEmotionalIntelligence(
    personalizedPrompt,
    emotionalState,
    input.studentName,
    input.subject
  );
  
  const socraticGuidance = buildSocraticGuidancePrompt({
    currentMessage: input.currentMessage,
    history: input.history,
  });
  const systemPrompt = composeSystemPrompt(personalizedPrompt, cbcContext, schemeContext, pedagogy, socraticGuidance);

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...((input.history ?? []).map((m) => ({
      role: (m.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: m.content,
    }))),
    { role: 'user' as const, content: input.currentMessage },
  ];

  let aggregated = '';
  let provider = '';
  let model = '';
  let tokensUsed: number | undefined;

  try {
    for await (const evt of multiAIClient.generateResponseStream(messages, {
      temperature: 0.3,
      maxTokens: 1500,
      preferredProvider: 'groq',
    })) {
      if (evt.type === 'chunk') {
        aggregated += evt.content;
        yield { type: 'chunk', content: evt.content };
      } else {
        provider = evt.final.provider;
        model = evt.final.model;
        tokensUsed = evt.final.tokensUsed;
      }
    }
  } catch (e) {
    yield { type: 'error', message: e instanceof Error ? e.message : 'stream failed' };
    return;
  }

  let responseText = aggregated;
  let replaced = false;
  const validation = await safeValidate({
    subject: input.subject,
    grade: input.grade,
    question: input.currentMessage,
    response: responseText,
  });
  if (validation && !validation.is_valid && validation.suggested_correction) {
    responseText = validation.suggested_correction;
    replaced = true;
  }

  let cbcCitationsAttached = false;
  if (cbc && cbc.citations.length > 0) {
    responseText += formatCitationsForDisplay(cbc.citations);
    cbcCitationsAttached = true;
  }

  yield {
    type: 'done',
    replaced,
    final: {
      response: responseText,
      provider,
      model,
      tokensUsed,
      cbcCitationsAttached,
      schemeContextUsed: !!scheme,
      mettaValidation: validation,
      pedagogy,
      emotionalState,
    },
  };
}

function composeSystemPrompt(
  base: string,
  cbcContext: string,
  schemeContext: string,
  pedagogy: MettaPedagogy | null,
  socraticGuidance: string,
): string {
  const parts: string[] = [base, socraticGuidance];
  if (schemeContext) parts.push(schemeContext); // Scheme context first (most specific)
  if (cbcContext) parts.push(cbcContext); // CBC context second (general curriculum)
  if (pedagogy) parts.push(formatPedagogyConstraint(pedagogy));
  return parts.join('\n\n');
}

function formatPedagogyConstraint(p: MettaPedagogy): string {
  return `# PEDAGOGY CONSTRAINT (from MeTTa Suzuki/Kumon rules)
Student is currently in mastery band: ${p.band} (${p.feedback_tag}).
Next action mandated by symbolic reasoning: ${p.next_action}.
Suggested practice cadence: ${p.practice_minutes_per_day} min/day, ${p.questions_per_session} questions/session, ${p.cycle_days}-day cycle.
Shape your reply to follow this next-action rather than free-styling difficulty.`;
}

async function safeQueryCBC(
  message: string,
  subject: string,
  grade: string,
): Promise<CBCQueryResponse | null> {
  try {
    return await queryCBCAgent(message, subject, grade);
  } catch (e) {
    console.warn('CBC enrichment failed (non-blocking):', e);
    return null;
  }
}

async function safeQueryScheme(
  userId: string,
  subject: string,
): Promise<any | null> {
  try {
    const weekNumber = getCurrentWeekNumber();
    return await getActiveSchemeContext(userId, subject, weekNumber);
  } catch (e) {
    console.warn('Scheme context fetch failed (non-blocking):', e);
    return null;
  }
}

async function safeQueryPedagogy(score?: number): Promise<MettaPedagogy | null> {
  if (typeof score !== 'number') return null;
  const clamped = Math.max(0, Math.min(1, score));
  try {
    const res = await fetch(`${METTA_BASE}/api/v1/metta/pedagogy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: clamped }),
      // 1.5s budget — pedagogy must never block the chat reply.
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return null;
    return (await res.json()) as MettaPedagogy;
  } catch {
    return null;
  }
}

async function safeValidate(payload: {
  subject: string;
  grade: string;
  question: string;
  response: string;
}): Promise<MettaValidation | null> {
  try {
    const res = await fetch(`${METTA_BASE}/api/v1/metta/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return null;
    return (await res.json()) as MettaValidation;
  } catch {
    return null;
  }
}
