/**
 * POST /api/mwalimu — the Mwalimu tutor endpoint.
 *
 * Two things were wrong here before 2026-09-29, and they were related.
 *
 * 1. Identity came from the request body: `input.userId || 'user1'`. Anyone who
 *    could reach the endpoint could name any learner and get that learner's
 *    profile, personalisation and progress back, plus write into their session
 *    history; and every caller who omitted the field shared one bucket. The
 *    learner is now taken from the session cookie via `auth.getUser()`, the same
 *    way `/api/chat` does it, and an anonymous call is a 401.
 * 2. State came from `lib/personalized-learning.ts`, which kept profiles,
 *    sessions and progress in `Map`s and persisted them with `localStorage`
 *    inside a Node handler. That is a no-op, so every request started from zero
 *    and the session id it minted matched nothing. State now comes from the
 *    tables the rest of the app writes — see `lib/chat/learner-state.ts` — and
 *    the turn is stored in `chat_messages` through the existing helper, so a
 *    teacher or parent reading the transcript sees the same conversation the
 *    learner had.
 *
 * `sessionId` is no longer read from the body either: a client-supplied id can
 * point at another learner's session, and `getOrCreateChatSession()` already
 * finds the learner's own active session for the subject.
 *
 * The request fields `studentUnderstood` and `responseTime` used to be written
 * into the phantom interaction record. Nothing read them back, and a real
 * equivalent already exists — `chat_messages.helpful`, set through
 * `updateChatMessage()` — so they are not accepted here.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { multiAIClient } from '@/lib/multi-ai-client';
import { runMwalimuTurn, runMwalimuTurnStream } from '@/lib/mwalimu-pipeline';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler';
import { getOrCreateChatSession } from '@/lib/chat/subject-session';
import { readLearnerState, recordTutorTurn } from '@/lib/chat/learner-state';
import type { LearnerState, TutorProfile, TutorProgress } from '@/lib/chat/learner-state';
import type { Database } from '@/lib/supabase/types';
import type { MwalimuAiTutorInput } from '@/ai/flows/mwalimu-ai-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type MwalimuApiInput = MwalimuAiTutorInput & {
  messageType?: MessageType;
  /** Latest mastery estimate in [0,1] for the active strand. Optional. */
  masteryScore?: number;
};

type MessageType = 'question' | 'explanation' | 'encouragement' | 'correction' | 'hint';

type TutorClient = SupabaseClient<Database>;

interface TurnContext {
  userId: string;
  subject: string;
  grade: string;
  learner: LearnerState;
  sessionId: string;
}

export async function POST(req: NextRequest) {
  const wantsStream =
    req.headers.get('accept')?.includes('text/event-stream') ||
    new URL(req.url).searchParams.get('stream') === '1';

  let input: MwalimuApiInput;
  try {
    input = (await req.json()) as MwalimuApiInput;
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
  }

  const supabase = await createSupabaseRouteHandlerClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', detail: 'Sign in to talk to Mwalimu' },
      { status: 401 },
    );
  }

  const subject = input.subject || 'General';
  const grade = input.grade || 'Grade 4';

  try {
    const ctx = await openTurn(supabase, user.id, subject, grade);

    if (wantsStream) {
      return streamMwalimu(input, ctx, supabase);
    }

    const turn = await runMwalimuTurn({
      userId: ctx.userId,
      studentName: ctx.learner.profile.name ?? undefined,
      teacherId: input.teacherId,
      grade: ctx.grade,
      subject: ctx.subject,
      currentMessage: input.currentMessage || '',
      history: input.history,
      masteryScore: input.masteryScore,
      learner: ctx.learner,
    });

    await recordTutorTurn(supabase, {
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      userMessage: input.currentMessage || '',
      aiResponse: turn.response,
      provider: turn.provider,
      model: turn.model,
      tokensUsed: turn.tokensUsed,
    });

    const messageType: MessageType = input.messageType || detectMessageType(input.currentMessage || '');
    const difficultyLevel = calculateDifficultyLevel(input.currentMessage || '', turn.response);

    return NextResponse.json({
      response: turn.response,
      sessionId: ctx.sessionId,
      timestamp: new Date().toISOString(),
      provider: turn.provider,
      model: turn.model,
      tokensUsed: turn.tokensUsed,
      personalization: personalizationBlock(ctx.learner.profile),
      learningAnalytics: learningAnalyticsBlock(ctx.learner.progress, messageType, difficultyLevel, ctx.learner.profile),
      mettaSignals: {
        validation: turn.mettaValidation,
        pedagogy: turn.pedagogy,
        cbcCitationsAttached: turn.cbcCitationsAttached,
      },
      metadata: {
        grade: ctx.grade,
        subject: ctx.subject,
        userId: ctx.userId,
        providerStatus: multiAIClient.getProviderStatus(),
      },
    });
  } catch (error) {
    console.error('mwalimu route error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message, providerStatus: multiAIClient.getProviderStatus() },
      { status: 500 },
    );
  }
}

/**
 * Read the learner's state and make sure this turn has a session row to live in.
 *
 * Both happen before generation so the prompt is built from real data, and so a
 * storage failure surfaces before the model is paid for.
 */
async function openTurn(
  supabase: TutorClient,
  userId: string,
  subject: string,
  grade: string,
): Promise<TurnContext> {
  const learner = await readLearnerState(supabase, {
    userId,
    subject,
    gradeFallback: grade,
  });

  const { sessionId } = await getOrCreateChatSession(supabase, userId, subject, learner.profile.grade);

  return { userId, subject, grade, learner, sessionId };
}

function streamMwalimu(
  input: MwalimuApiInput,
  ctx: TurnContext,
  supabase: TutorClient,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      try {
        send('session', { sessionId: ctx.sessionId });

        let finalText = '';
        let finalMeta: {
          provider: string;
          model: string;
          tokensUsed?: number;
          mettaSignals: {
            validation: unknown;
            pedagogy: unknown;
            cbcCitationsAttached: boolean;
          };
        } | null = null;

        for await (const evt of runMwalimuTurnStream({
          userId: ctx.userId,
          studentName: ctx.learner.profile.name ?? undefined,
          teacherId: input.teacherId,
          grade: ctx.grade,
          subject: ctx.subject,
          currentMessage: input.currentMessage || '',
          history: input.history,
          masteryScore: input.masteryScore,
          learner: ctx.learner,
        })) {
          if (evt.type === 'meta') {
            send('meta', { cbc: evt.cbc, pedagogy: evt.pedagogy });
          } else if (evt.type === 'chunk') {
            finalText += evt.content;
            send('chunk', { content: evt.content });
          } else if (evt.type === 'error') {
            send('error', { message: evt.message });
          } else if (evt.type === 'done') {
            // If MeTTa validation replaced the answer, tell the client to swap.
            if (evt.replaced) {
              send('replace', { content: evt.final.response });
            } else if (evt.final.cbcCitationsAttached) {
              const tail = evt.final.response.slice(finalText.length);
              if (tail) send('chunk', { content: tail });
            }
            finalText = evt.final.response;
            finalMeta = {
              provider: evt.final.provider,
              model: evt.final.model,
              tokensUsed: evt.final.tokensUsed,
              mettaSignals: {
                validation: evt.final.mettaValidation,
                pedagogy: evt.final.pedagogy,
                cbcCitationsAttached: evt.final.cbcCitationsAttached,
              },
            };
          }
        }

        await recordTutorTurn(supabase, {
          userId: ctx.userId,
          sessionId: ctx.sessionId,
          userMessage: input.currentMessage || '',
          aiResponse: finalText,
          provider: finalMeta?.provider,
          model: finalMeta?.model,
          tokensUsed: finalMeta?.tokensUsed,
        });

        const messageType: MessageType = input.messageType || detectMessageType(input.currentMessage || '');
        const difficultyLevel = calculateDifficultyLevel(input.currentMessage || '', finalText);

        send('done', {
          ...finalMeta,
          sessionId: ctx.sessionId,
          timestamp: new Date().toISOString(),
          personalization: personalizationBlock(ctx.learner.profile),
          learningAnalytics: learningAnalyticsBlock(ctx.learner.progress, messageType, difficultyLevel, ctx.learner.profile),
          metadata: { grade: ctx.grade, subject: ctx.subject, userId: ctx.userId },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        const payload = `event: error\ndata: ${JSON.stringify({ message })}\n\n`;
        controller.enqueue(encoder.encode(payload));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

function personalizationBlock(profile: TutorProfile) {
  return {
    studentName: profile.name,
    hasRecordedName: profile.name !== null,
    learningStyle: profile.learningStyle,
    preferredLanguage: profile.preferredLanguage,
    culturalContext: profile.region,
    interests: profile.interests,
    strengths: profile.strengths,
    challenges: profile.challenges,
  };
}

function learningAnalyticsBlock(
  progress: TutorProgress,
  messageType: MessageType,
  difficultyLevel: number,
  profile: TutorProfile,
) {
  return {
    overallProgress: progress.overallProgress,
    streakDays: progress.streakDays,
    totalSessions: progress.totalSessions,
    totalMessages: progress.totalMessages,
    averageSessionTime: progress.averageSessionTime,
    messageType,
    difficultyLevel,
    adaptiveRecommendations: generateAdaptiveRecommendations(profile, progress),
  };
}

/**
 * Heuristics that describe the message being answered, not stored state.
 *
 * They are response hints for the caller's UI. They used to be written into the
 * phantom interaction record and reported back as analytics; nothing stored them
 * now, so nothing here claims to be a measurement of history.
 */
function detectMessageType(message: string): MessageType {
  const m = message.toLowerCase();
  if (m.includes('?') || /^(what|how|why|when|where)/.test(m)) return 'question';
  if (m.includes('help') || m.includes('stuck') || m.includes('confused')) return 'hint';
  if (m.includes('wrong') || m.includes('mistake') || m.includes('correct')) return 'correction';
  return 'explanation';
}

function calculateDifficultyLevel(userMessage: string, aiResponse: string): number {
  let difficulty = 5;
  if (userMessage.length > 100) difficulty += 1;
  if (userMessage.split(' ').length > 20) difficulty += 1;
  if (aiResponse.length > 200) difficulty += 1;
  if (aiResponse.includes('complex') || aiResponse.includes('advanced')) difficulty += 2;
  if (aiResponse.includes('simple') || aiResponse.includes('basic')) difficulty -= 1;
  return Math.max(1, Math.min(10, difficulty));
}

function generateAdaptiveRecommendations(profile: TutorProfile, progress: TutorProgress): string[] {
  const recs: string[] = [];
  if (progress.overallProgress < 30) recs.push('Focus on building foundational concepts');
  else if (progress.overallProgress > 80) recs.push('Ready for more challenging topics');

  if (progress.streakDays > 7) recs.push('Excellent consistency! Keep up the great work');
  else if (progress.streakDays === 0) recs.push('Try to practice a little bit each day');

  if (profile.learningStyle === 'visual') recs.push('Try drawing diagrams to understand concepts better');
  else if (profile.learningStyle === 'kinesthetic') recs.push('Use hands-on activities and real objects when learning');

  if (profile.interests.includes('animals')) recs.push('Connect math problems to animal examples');
  if (profile.interests.includes('sports')) recs.push('Use sports scenarios for word problems');

  return recs.slice(0, 3);
}
