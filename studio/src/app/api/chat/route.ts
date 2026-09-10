/**
 * POST /api/chat
 *
 * Streams a Socratic Mentor response via Groq or Gemini with:
 * - Supabase authentication + profile lookup
 * - Distributed rate limiting via Upstash Redis
 * - Chat history persistence
 * - Omega tutoring decision (evaluateTutoringDecision) on every request
 * - Live hints_used + consecutive_wrong tracking fed to the Omega engine
 * - questions_asked / questions_answered / correct_answers incremented
 *   post-stream so mastery data is real for the next decision cycle
 * - Redis scaffolding level write (fire-and-forget) for teacher visibility
 * - Usage logging
 *
 * Omega wiring changes (Sept 2, 2026):
 *   - Removed duplicate second Supabase query; reuse masteryRows from the
 *     learner-context fetch (Task 5)
 *   - Removed `as any` on preferences write; use typed updateScaffoldingLevel
 *     helper that deep-patches only the scaffoldingLevel field (Task 4)
 *   - Extended SELECT to include hints_used + consecutive_wrong so
 *     buildLearningState receives live values (Task 2/4)
 *   - Increment questions_asked (every turn) + questions_answered /
 *     correct_answers post-stream when answer quality is detectable (Task 7)
 *   - Accept hintsUsed + competencyCode from client body (Tasks 6/8)
 *
 * Omega wiring changes (Sept 7, 2026):
 *   - Replace "ends with ?" heuristic with classifyAnswerQuality() multi-signal
 *     classifier so correct_answers is actually incremented when earned (#1, #2)
 *   - Wire server-side Omega enrichment: cultural examples in Intensive prompts
 *     and teacher alerts surfaced in the SSE [DONE] metadata packet (#3)
 *   - Write one omega_scaffolding_events row per turn for outcome telemetry (#4)
 */

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import {
  buildCompassSystemPrompt,
  type LearnerLearningContext,
} from '@/lib/chat/socratic-prompts';
import { evaluateTutoringDecision } from '@/lib/omega-agent/metta-core';
import { classifyAnswerQuality } from '@/lib/omega-agent/answer-quality';
import { buildOmegaEnrichment, enrichSystemPrompt } from '@/lib/omega-agent/server-enrichment';
import {
  buildScaffoldingEventPayload,
  payloadToDbRow,
} from '@/lib/omega-agent/scaffolding-telemetry';
import { buildDynamicSystemPrompt, buildLearningState, masteryPercent } from '@/lib/chat/subject-session';
import { getLearningSession, updateLearningSession } from '@/lib/session/session-persistence';
import type { LearningSession } from '@/lib/session/session-persistence';
import { checkChatRateLimit } from '@/lib/session/rate-limit-upstash';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { addChatMessage, createChatSession } from '@/lib/chat/chat-history-supabase';
import { updateDailyActivity, updateLearningProgress } from '@/lib/progress/progress-tracking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Tunables
// ─────────────────────────────────────────────────────────────────────────────

const MODEL_TIMEOUT_MS = 30_000;
const MAX_HISTORY_TURNS = 40;

// ─────────────────────────────────────────────────────────────────────────────
// Request schema
// ─────────────────────────────────────────────────────────────────────────────

const HistoryEntry = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
});

const ChatRequest = z.object({
  message:        z.string().min(1).max(2000),
  history:        z.array(HistoryEntry).max(MAX_HISTORY_TURNS * 2).default([]),
  grade:          z.string().min(1).max(40),
  subject:        z.string().min(1).max(80),
  language:       z.enum(['english', 'kiswahili', 'mixed']).default('mixed'),
  studentName:    z.string().max(80).optional(),
  mode:           z.enum(['socratic', 'compass']).default('socratic'),
  teacherContext: z.string().max(20000).optional(),
  sessionId:      z.string().uuid().optional(),
  // Omega inputs sent by client ↓
  competencyCode: z.string().max(120).optional(),  // e.g. "MATH.fractions.grade4"
  competencyName: z.string().max(200).optional(),  // human label for the competency
  hintsUsed:      z.number().int().min(0).max(20).optional(), // hint button presses this session
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function sseError(message: string, detail?: string): string {
  const payload = detail ? { error: message, detail } : { error: message };
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function cbcStageForGrade(grade: string): string {
  const n = grade.toLowerCase();
  if (/grade\s?[1-3]|g[1-3]|pp[1-2]|pre-primary/.test(n)) return 'Early Years / Lower Primary foundation';
  if (/grade\s?[4-6]|g[4-6]/.test(n)) return 'Upper Primary';
  if (/grade\s?[7-9]|g[7-9]/.test(n)) return 'Junior Secondary';
  return 'CBC stage to be confirmed';
}

function ageBandFromDateOfBirth(dob: string | null | undefined): string | undefined {
  if (!dob) return undefined;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return undefined;
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const m = now.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1;
  if (age <= 5) return '5 and under';
  if (age <= 8) return '6–8';
  if (age <= 11) return '9–11';
  if (age <= 14) return '12–14';
  if (age <= 17) return '15–17';
  return '18+';
}

/**
 * Deep-patches only `preferences.scaffoldingLevel` without clobbering the
 * rest of the LearningSession (achievements, competencyProgress, etc.).
 * Replaces the old `preferences: { ... } as any` cast.
 */
async function updateScaffoldingLevel(
  userId: string,
  level: 'Independent' | 'Guided' | 'Intensive',
  language: 'english' | 'kiswahili' | 'mixed',
): Promise<void> {
  // Fetch current session so we can merge, not overwrite.
  const current = await getLearningSession(userId).catch(() => null);
  const prev = current?.preferences;
  const merged: LearningSession['preferences'] = {
    language:        prev?.language        ?? language,
    difficultyLevel: prev?.difficultyLevel ?? 3,
    learningStyle:   prev?.learningStyle   ?? 'mixed',
    scaffoldingLevel: level,
  };
  await updateLearningSession(userId, { preferences: merged });
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // ── Auth ────────────────────────────────────────────────────────────────────
  // Create cookie-based Supabase client to read authenticated session
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json({ 
      error: 'Server configuration error', 
      detail: 'Supabase credentials not configured' 
    }, { status: 500 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { data: { user: authenticatedUser }, error: authError } =
    await supabase.auth.getUser();

  const allowDevChat =
    process.env.NODE_ENV !== 'production' &&
    process.env.SYNCSENTA_ALLOW_DEV_CHAT === 'true';
  const isDevChat = !authenticatedUser && allowDevChat;
  const user = authenticatedUser ?? (isDevChat ? { id: 'dev-local-student' } : null);

  if ((authError || !user) && !isDevChat) {
    return Response.json({ error: 'Unauthorized', detail: 'Please sign in to continue' }, { status: 401 });
  }
  if (!user) {
    return Response.json({ error: 'Unauthorized', detail: 'Please sign in to continue' }, { status: 401 });
  }

  // For database operations that need service role (like RPC calls), create a separate client
  const supabaseAdmin = getSupabaseServerClient();

  // ── Profile ─────────────────────────────────────────────────────────────────
  const profile = authenticatedUser
    ? (await supabase
        .from('profiles')
        .select('subscription_tier, grade, full_name, date_of_birth, language_preference')
        .eq('id', authenticatedUser.id)
        .single()).data
    : { subscription_tier: 'free', grade: null, full_name: 'Development learner', date_of_birth: null, language_preference: 'mixed' as const };

  if (!profile) {
    return Response.json({ error: 'Profile not found', detail: 'Please complete your profile' }, { status: 400 });
  }

  // ── Rate limiting ───────────────────────────────────────────────────────────
  const rateLimit = isDevChat
    ? { success: true, remaining: 1, limit: 1, reset: 0 }
    : await checkChatRateLimit(user.id, profile.subscription_tier as 'free' | 'premium' | 'school');

  if (!rateLimit.success) {
    return Response.json(
      {
        error: 'Rate limit exceeded',
        detail: profile.subscription_tier === 'free'
          ? "You've reached your daily limit. Upgrade to Premium for unlimited messages."
          : `Try again in ${rateLimit.reset} seconds.`,
        remaining: rateLimit.remaining,
        limit: rateLimit.limit,
        reset: rateLimit.reset,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.reset),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Limit': String(rateLimit.limit),
        },
      },
    );
  }

  // ── Parse + validate ────────────────────────────────────────────────────────
  let body: z.infer<typeof ChatRequest>;
  try {
    body = ChatRequest.parse(await req.json());
  } catch (err) {
    return Response.json({ error: 'Invalid request body', detail: err instanceof Error ? err.message : 'Invalid JSON' }, { status: 400 });
  }

  const verifiedGrade = profile.grade || body.grade;

  if (body.mode === 'compass' && !body.teacherContext) {
    return Response.json({ error: 'Compass mode requires teacherContext' }, { status: 400 });
  }

  // ── Single learning_progress fetch (used for BOTH learnerContext AND Omega) ─
  // Task 5: was two identical queries — now one, reused for both purposes.
  // Extended columns: +hints_used +consecutive_wrong for live Omega signals.
  type MasteryRow = {
    competency_name: string;
    competency_code: string | null;
    mastery_level: string | null;
    progress_percentage: number | null;
    last_practiced_at: string | null;
    questions_answered: number | null;
    correct_answers: number | null;
    hints_used: number | null;
    consecutive_wrong: number | null;
  };

  let masteryRows: MasteryRow[] | null = null;

  if (authenticatedUser) {
    const { data } = await supabase
      .from('learning_progress')
      .select(
        'competency_name, competency_code, mastery_level, progress_percentage, ' +
        'last_practiced_at, questions_answered, correct_answers, ' +
        'hints_used, consecutive_wrong',
      )
      .eq('user_id', authenticatedUser.id)
      .eq('subject', body.subject)
      .eq('grade', verifiedGrade)
      .order('last_practiced_at', { ascending: false })
      .limit(5);
    masteryRows = (data as MasteryRow[] | null) ?? null;
  }

  // Build learner context for the system prompt
  const learnerContext: LearnerLearningContext = {
    ageBand:  ageBandFromDateOfBirth(profile.date_of_birth),
    cbcStage: cbcStageForGrade(verifiedGrade),
  };

  // Pick the row that matches competencyCode if provided, else use most-recent
  const contextRow = body.competencyCode
    ? masteryRows?.find((r) => r.competency_code === body.competencyCode || r.competency_name === body.competencyCode)
    : masteryRows?.[0];

  if (contextRow) {
    learnerContext.currentCompetency  = contextRow.competency_name;
    learnerContext.masteryLevel       = contextRow.mastery_level ?? undefined;
    learnerContext.progressPercentage = contextRow.progress_percentage ?? undefined;
    learnerContext.recentPractice     = contextRow.last_practiced_at ?? undefined;
  }

  // ── LLM provider env ────────────────────────────────────────────────────────
  const provider = (process.env.LLM_PROVIDER || 'groq').trim().toLowerCase();
  const isGemini = provider === 'gemini';
  const apiKey = isGemini ? process.env.GEMINI_API_KEY : process.env.GROQ_API_KEY;
  if (!apiKey) {
    const key = isGemini ? 'GEMINI_API_KEY' : 'GROQ_API_KEY';
    return Response.json({ error: `Server is missing ${key}`, detail: `Set ${key} in your server environment.` }, { status: 500 });
  }
  const model = isGemini
    ? process.env.GEMINI_MODEL || 'gemini-3.6-flash'
    : process.env.GROQ_MODEL  || 'llama-3.3-70b-versatile';

  // ── Session ─────────────────────────────────────────────────────────────────
  let sessionId = isDevChat ? undefined : body.sessionId;
  if (!isDevChat && !sessionId) {
    try {
      sessionId = await createChatSession(user.id, body.subject, body.grade, body.mode, body.teacherContext);
    } catch (err) {
      console.error('[/api/chat] Failed to create chat session:', err);
    }
  }

  // Save user message
  if (sessionId && !isDevChat) {
    try { await addChatMessage(sessionId, user.id, 'user', body.message); }
    catch (err) { console.error('[/api/chat] Failed to save user message:', err); }
  }

  // ── Build system prompt ─────────────────────────────────────────────────────
  let systemPrompt: string;

  if (body.mode === 'compass') {
    systemPrompt = buildCompassSystemPrompt({
      teacherContext: body.teacherContext!,
      language: body.language,
      studentName: body.studentName || profile.full_name || undefined,
      learnerContext,
    });
  } else {
    // Reuse contextRow from the single fetch above.
    // Client-sent hintsUsed overrides DB value when present — client is more
    // up-to-date within the session before the DB has been updated.
    const dbHintsUsed = contextRow?.hints_used ?? 0;
    const clientHintsUsed = body.hintsUsed ?? 0;

    const learningState = buildLearningState({
      questions_answered: contextRow?.questions_answered ?? null,
      correct_answers:    contextRow?.correct_answers    ?? null,
      mastery_level:      contextRow?.mastery_level      ?? null,
      hints_used:         Math.max(dbHintsUsed, clientHintsUsed),
      consecutive_wrong:  contextRow?.consecutive_wrong  ?? null,
    });

    const decision = evaluateTutoringDecision(learningState);

    // Fire-and-forget Redis scaffolding level write for teacher visibility.
    if (authenticatedUser) {
      updateScaffoldingLevel(authenticatedUser.id, decision.scaffolding, body.language)
        .catch((err) => console.error('[/api/chat] Redis scaffolding write failed:', err));
    }

    const effectiveLanguage =
      body.language === 'mixed' && profile.language_preference
        ? (profile.language_preference as 'english' | 'kiswahili' | 'mixed')
        : body.language;

    // ── Omega server enrichment (#3) ─────────────────────────────────────────
    // Derives cultural examples + teacher alerts server-side using the same
    // signals the Omega engine has. No extra I/O — pure function.
    const currentMasteryPct = masteryPercent(
      contextRow?.questions_answered ?? 0,
      contextRow?.correct_answers    ?? 0,
    );
    const omegaEnrichment = buildOmegaEnrichment({
      decision,
      subject:         body.subject,
      consecutiveWrong: contextRow?.consecutive_wrong ?? 0,
      masteryPct:      currentMasteryPct,
      competencyName:  contextRow?.competency_name ?? body.competencyCode ?? body.subject,
      studentName:     body.studentName || profile.full_name || undefined,
    });

    // Base prompt + cultural examples injected when Intensive.
    const basePrompt = buildDynamicSystemPrompt({
      decision,
      subject: body.subject,
      grade: verifiedGrade,
      language: effectiveLanguage,
      studentName: body.studentName || profile.full_name || undefined,
      learnerContext,
    });
    systemPrompt = enrichSystemPrompt(basePrompt, omegaEnrichment, decision.scaffolding);

    // Attach enrichment to request scope so the post-stream block can use it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).__omegaEnrichment = omegaEnrichment;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).__omegaDecision   = decision;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).__learningState   = learningState;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).__currentMasteryPct = currentMasteryPct;
  }

  // ── Build message array ─────────────────────────────────────────────────────
  const trimmedHistory = body.history.slice(-MAX_HISTORY_TURNS * 2);
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    ...trimmedHistory,
    { role: 'user', content: body.message },
  ];

  // ── LLM call ────────────────────────────────────────────────────────────────
  const timeoutSignal = AbortSignal.timeout(MODEL_TIMEOUT_MS);
  let modelStream: AsyncIterable<string>;

  try {
    if (isGemini) {
      const gemini = new GoogleGenerativeAI(apiKey);
      const gModel = gemini.getGenerativeModel({ model, systemInstruction: systemPrompt });
      const geminiHistory = trimmedHistory.map((e) => ({
        role: e.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: e.content }],
      }));
      const geminiResult = await gModel.generateContentStream({
        contents: [...geminiHistory, { role: 'user', parts: [{ text: body.message }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 600, topP: 1 },
      });
      modelStream = (async function* () {
        for await (const chunk of geminiResult.stream) {
          const t = chunk.text();
          if (t) yield t;
        }
      })();
    } else {
      const groq = new Groq({ apiKey });
      const stream = await groq.chat.completions.create(
        { model, messages, temperature: 0.7, max_tokens: 600, top_p: 1, stream: true },
        { signal: timeoutSignal },
      );
      modelStream = (async function* () {
        for await (const chunk of stream) {
          const t = chunk?.choices?.[0]?.delta?.content;
          if (t) yield t;
        }
      })();
    }
  } catch (err) {
    const aborted = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    const detail  = err instanceof Error ? err.message : `Unknown ${provider} error`;
    console.error(`[/api/chat] ${provider} request failed:`, detail);
    if (!isDevChat) {
      await supabaseAdmin.from('api_usage').insert({
        user_id: user.id, endpoint: '/api/chat', method: 'POST',
        status_code: aborted ? 504 : 502, latency_ms: Date.now() - startTime,
      });
    }
    return Response.json(
      { error: aborted ? 'Upstream timeout' : 'Upstream model error', detail },
      { status: aborted ? 504 : 502 },
    );
  }

  // ── SSE stream ──────────────────────────────────────────────────────────────
  const encoder = new TextEncoder();
  let fullResponse = '';
  let tokensUsed   = 0;

  const sse = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const delta of modelStream) {
          if (timeoutSignal.aborted) {
            controller.enqueue(encoder.encode(sseError('stream_timeout', 'Upstream timed out mid-stream.')));
            controller.close();
            return;
          }
          fullResponse += delta;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));

        // ── Post-stream persistence ──────────────────────────────────────────
        const latencyMs = Date.now() - startTime;

        if (sessionId && !isDevChat) {
          try { await addChatMessage(sessionId, user.id, 'assistant', fullResponse, { tokensUsed, model, latencyMs }); }
          catch (e) { console.error('[/api/chat] Failed to save assistant message:', e); }
        }

        if (!isDevChat) {
          try {
            await updateDailyActivity(user.id, {
              messagesSent: 1,
              sessionsStarted: body.sessionId ? 0 : 1,
              timeSpentMinutes: Math.ceil(latencyMs / 60000),
              subjectsPracticed: [body.subject],
            });
          } catch (e) { console.error('[/api/chat] Failed to update daily activity:', e); }
        }

        // ── Omega post-stream: answer quality + correct_answers grading (#1, #2) ─
        // classifyAnswerQuality() replaces the old "ends with ?" heuristic.
        // It looks at BOTH the student message and the assistant response to
        // determine whether the student actually got the answer right.
        if (body.competencyCode && !isDevChat && authenticatedUser) {
          try {
            // Retrieve the Omega state attached before the stream.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const omegaDecision   = (req as any).__omegaDecision;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const learningState   = (req as any).__learningState;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const omegaEnrichment = (req as any).__omegaEnrichment;

            // Multi-signal answer classification (#1 + #2)
            const classification = classifyAnswerQuality(
              body.message,
              fullResponse,
              omegaDecision?.scaffolding ?? 'Guided',
            );

            const newHintsUsed = Math.max(body.hintsUsed ?? 0, contextRow?.hints_used ?? 0);
            const newConsecutiveWrong = classification.shouldResetConsecutiveWrong
              ? 0
              : Math.min((contextRow?.consecutive_wrong ?? 0) + classification.consecutiveWrongDelta, 10);

            // Write progress counters — correct_answers now actually increments
            // when classification.shouldIncrementCorrect is true (#1).
            await updateLearningProgress(user.id, body.competencyCode, {
              competencyName:    body.competencyName || body.competencyCode,
              subject:           body.subject,
              grade:             verifiedGrade,
              questionsAsked:    1,
              questionsAnswered: classification.quality !== 'unanswered' ? 1 : 0,
              correctAnswers:    classification.shouldIncrementCorrect ? 1 : 0,
              timeSpentMinutes:  Math.ceil(latencyMs / 60000),
            });

            // Persist live hints_used + consecutive_wrong so the next Omega
            // decision cycle reads real values.
            await supabase
              .from('learning_progress')
              .update({
                hints_used:        newHintsUsed,
                consecutive_wrong: newConsecutiveWrong,
              })
              .eq('user_id', user.id)
              .eq('competency_code', body.competencyCode);

            // ── Scaffolding outcome telemetry (#4) ───────────────────────────
            // Fire-and-forget — analytics data, not critical path.
            if (omegaDecision && learningState) {
              const eventPayload = buildScaffoldingEventPayload({
                userId:           user.id,
                competencyCode:   body.competencyCode,
                sessionId:        sessionId,
                decision:         omegaDecision,
                attempts:         learningState.attempts,
                correctAttempts:  learningState.correctAttempts,
                hintsUsed:        newHintsUsed,
                consecutiveWrong: contextRow?.consecutive_wrong ?? 0,
                frustrationSignal: learningState.frustrationSignal,
                answerQuality:    classification.quality,
              });
              supabaseAdmin
                .from('omega_scaffolding_events')
                .insert(payloadToDbRow(eventPayload))
                .then(({ error }) => {
                  if (error) console.error('[/api/chat] Telemetry write failed:', error.message);
                });
            }

            // ── Teacher alert: SSE metadata event before close (#3) ──────────
            // Sent BEFORE controller.close() so the client receives it.
            // Clients should handle { type: 'omega_teacher_alert' } separately
            // from delta chunks and forward to the teacher dashboard.
            if (omegaEnrichment?.teacherAlert) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type:    'omega_teacher_alert',
                    alert:   omegaEnrichment.teacherAlert,
                    urgency: omegaEnrichment.alertUrgency,
                    nextActivityType: omegaEnrichment.nextActivityType,
                    competencyCode:   body.competencyCode,
                  })}\n\n`,
                ),
              );
            }
          } catch (e) { console.error('[/api/chat] Failed to update learning progress:', e); }
        }

        if (!isDevChat) {
          await supabaseAdmin.from('api_usage').insert({
            user_id: user.id, endpoint: '/api/chat', method: 'POST',
            tokens_used: tokensUsed, status_code: 200, latency_ms: latencyMs,
          });
          await supabaseAdmin.rpc('increment_daily_quota', { p_user_id: user.id });
        }

        controller.close();
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'Stream interrupted';
        console.error('[/api/chat] Stream error:', detail);
        controller.enqueue(encoder.encode(sseError('stream_interrupted', detail)));
        controller.close();
      }
    },
    cancel() { /* client disconnected */ },
  });

  return new Response(sse, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-RateLimit-Remaining': String(rateLimit.remaining),
      'X-RateLimit-Limit': String(rateLimit.limit),
      'X-Session-Id': sessionId || '',
    },
  });
}
