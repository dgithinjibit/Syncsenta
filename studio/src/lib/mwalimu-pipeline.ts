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
import {
  learnerStateWithoutHistory,
  readLearnerState,
  type LearnerState,
} from './chat/learner-state';
import { buildPersonalizedPrompt } from './chat/personalized-prompt';
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
import { formatPedagogyConstraintBlock } from '../curriculum/pedagogy';
import { formatPlanePostureLine } from '../curriculum/learning-planes';

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
  /**
   * The learner's state, read from the database by the caller.
   *
   * Optional because the Genkit dev flow has no request context to read with.
   * When it is absent the pipeline reads it itself if a session cookie is
   * available, and falls back to an explicitly barren state if not — never to
   * invented facts about a child.
   */
  learner?: LearnerState;
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

/**
 * State for one turn: what the caller read, or a read of our own, or nothing.
 *
 * A route handler can always read. Outside a request context — the Genkit dev
 * flow, a test — `cookies()` throws, and the answer is an honestly empty state
 * rather than the fabricated profile the deleted engine used to hand out.
 */
async function resolveLearnerState(input: MwalimuTurnInput): Promise<LearnerState> {
  if (input.learner) return input.learner;

  try {
    const { createSupabaseRouteHandlerClient } = await import('./supabase/route-handler');
    const client = await createSupabaseRouteHandlerClient();
    return await readLearnerState(client, {
      userId: input.userId,
      subject: input.subject || 'General',
      gradeFallback: input.grade || 'Grade 4',
    });
  } catch (error) {
    console.warn('[mwalimu] no request context to read learner state from:', error);
    return learnerStateWithoutHistory(input.userId, input.grade || 'Grade 4', input.subject || 'General');
  }
}

/** The personalized half of the system prompt, from real state. */
async function personalizedPromptFor(input: MwalimuTurnInput): Promise<string> {
  const state = await resolveLearnerState(input);
  // A caller that knows the learner's name (a teacher-assigned display name)
  // outranks a profile row that has none; it never overrides a recorded name.
  const profile =
    input.studentName && !state.profile.name
      ? { ...state.profile, name: input.studentName }
      : state.profile;

  return buildPersonalizedPrompt({
    state: { ...state, profile },
    subject: input.subject || 'General',
    currentMessage: input.currentMessage || '',
  });
}

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
  let personalizedPrompt = await personalizedPromptFor(input);
  
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
  const systemPrompt = composeSystemPrompt(personalizedPrompt, cbcContext, schemeContext, pedagogy, socraticGuidance, input.grade);

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

  let personalizedPrompt = await personalizedPromptFor(input);
  
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
  const systemPrompt = composeSystemPrompt(personalizedPrompt, cbcContext, schemeContext, pedagogy, socraticGuidance, input.grade);

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
  grade: string,
): string {
  const parts: string[] = [base, socraticGuidance];
  if (schemeContext) parts.push(schemeContext); // Scheme context first (most specific)
  if (cbcContext) parts.push(cbcContext); // CBC context second (general curriculum)
  // Registry and stage posture come before MeTTa and regardless of whether MeTTa
  // is reachable: they are the platform's own commitments, and the mastery band
  // only tunes difficulty inside them.
  parts.push(formatPedagogyConstraintBlock());
  parts.push(formatPlanePostureLine(grade));
  if (pedagogy) parts.push(formatPedagogyConstraint(pedagogy));
  return parts.join('\n\n');
}

function formatPedagogyConstraint(p: MettaPedagogy): string {
  return `# MASTERY BAND CONSTRAINT (from MeTTa rules)
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
