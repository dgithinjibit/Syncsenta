import { NextRequest, NextResponse } from 'next/server';
import { multiAIClient } from '@/lib/multi-ai-client';
import { personalizedLearning } from '@/lib/personalized-learning';
import { runMwalimuTurn, runMwalimuTurnStream } from '@/lib/mwalimu-pipeline';
import type { MwalimuAiTutorInput } from '@/ai/flows/mwalimu-ai-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type MwalimuApiInput = MwalimuAiTutorInput & {
  userId?: string;
  sessionId?: string;
  responseTime?: number;
  messageType?: 'question' | 'explanation' | 'encouragement' | 'correction' | 'hint';
  studentUnderstood?: boolean;
  /** Latest mastery estimate in [0,1] for the active strand. Optional. */
  masteryScore?: number;
};

export async function POST(req: NextRequest) {
  try {
    const wantsStream =
      req.headers.get('accept')?.includes('text/event-stream') ||
      new URL(req.url).searchParams.get('stream') === '1';

    const input = (await req.json()) as MwalimuApiInput;
    const userId = input.userId || 'user1';
    const subject = input.subject || 'General';
    const grade = input.grade || 'Grade 4';

    const profile = await personalizedLearning.getStudentProfile(userId);

    if (wantsStream) {
      return streamMwalimu(input, { userId, subject, grade, profile });
    }

    // Run the consolidated pipeline (CBC + MeTTa + multi-provider generation).
    const turn = await runMwalimuTurn({
      userId,
      studentName: profile.name,
      teacherId: input.teacherId,
      grade,
      subject,
      currentMessage: input.currentMessage || '',
      history: input.history,
      masteryScore: input.masteryScore,
    });

    // Start or continue learning session.
    let sessionId = input.sessionId;
    if (!sessionId) {
      const session = await personalizedLearning.startSession(
        userId,
        subject,
        input.currentMessage ? extractTopicFromMessage(input.currentMessage) : 'General Discussion',
      );
      sessionId = session.id;
    }

    // Analyze message type and difficulty for analytics.
    const messageType = input.messageType || detectMessageType(input.currentMessage || '');
    const difficultyLevel = calculateDifficultyLevel(input.currentMessage || '', turn.response);

    if (sessionId) {
      await personalizedLearning.addInteraction(userId, sessionId, {
        userMessage: input.currentMessage || '',
        aiResponse: turn.response,
        messageType,
        topicCovered: subject,
        difficultyLevel,
        studentUnderstood: input.studentUnderstood ?? null,
        responseTime: input.responseTime || 0,
      });
    }

    await updateProfileFromInteraction(userId, input, turn.response);

    const progress = await personalizedLearning.getLearningProgress(userId, subject);

    return NextResponse.json({
      response: turn.response,
      conversationId: (input as any).conversationId || 'default',
      sessionId,
      timestamp: new Date().toISOString(),
      provider: turn.provider,
      model: turn.model,
      tokensUsed: turn.tokensUsed,
      personalization: {
        studentName: profile.name,
        learningStyle: profile.learningStyle,
        preferredLanguage: profile.preferredLanguage,
        culturalContext: profile.culturalContext.region,
        interests: profile.interests,
        strengths: profile.strengths,
        challenges: profile.challenges,
      },
      learningAnalytics: {
        overallProgress: progress.overallProgress,
        streakDays: progress.streakDays,
        totalSessions: progress.totalSessions,
        averageSessionTime: progress.averageSessionTime,
        messageType,
        difficultyLevel,
        adaptiveRecommendations: generateAdaptiveRecommendations(profile, progress),
      },
      mettaSignals: {
        validation: turn.mettaValidation,
        pedagogy: turn.pedagogy,
        cbcCitationsAttached: turn.cbcCitationsAttached,
      },
      metadata: {
        grade,
        subject,
        userId,
        providerStatus: multiAIClient.getProviderStatus(),
      },
    });
  } catch (error) {
    console.error('mwalimu route error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: message,
      providerStatus: multiAIClient.getProviderStatus(),
    }, { status: 500 });
  }
}

function streamMwalimu(
  input: MwalimuApiInput,
  ctx: { userId: string; subject: string; grade: string; profile: any },
): Response {
  const { userId, subject, grade, profile } = ctx;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      try {
        let sessionId = input.sessionId;
        if (!sessionId) {
          const session = await personalizedLearning.startSession(
            userId,
            subject,
            input.currentMessage ? extractTopicFromMessage(input.currentMessage) : 'General Discussion',
          );
          sessionId = session.id;
        }
        send('session', { sessionId });

        let finalText = '';
        let finalMeta: any = null;

        for await (const evt of runMwalimuTurnStream({
          userId,
          studentName: profile.name,
          teacherId: input.teacherId,
          grade,
          subject,
          currentMessage: input.currentMessage || '',
          history: input.history,
          masteryScore: input.masteryScore,
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

        const messageType = input.messageType || detectMessageType(input.currentMessage || '');
        const difficultyLevel = calculateDifficultyLevel(input.currentMessage || '', finalText);
        if (sessionId) {
          await personalizedLearning.addInteraction(userId, sessionId, {
            userMessage: input.currentMessage || '',
            aiResponse: finalText,
            messageType,
            topicCovered: subject,
            difficultyLevel,
            studentUnderstood: input.studentUnderstood ?? null,
            responseTime: input.responseTime || 0,
          });
        }
        await updateProfileFromInteraction(userId, input, finalText);
        const progress = await personalizedLearning.getLearningProgress(userId, subject);

        send('done', {
          ...finalMeta,
          sessionId,
          timestamp: new Date().toISOString(),
          personalization: {
            studentName: profile.name,
            learningStyle: profile.learningStyle,
            preferredLanguage: profile.preferredLanguage,
            culturalContext: profile.culturalContext.region,
            interests: profile.interests,
            strengths: profile.strengths,
            challenges: profile.challenges,
          },
          learningAnalytics: {
            overallProgress: progress.overallProgress,
            streakDays: progress.streakDays,
            totalSessions: progress.totalSessions,
            averageSessionTime: progress.averageSessionTime,
            messageType,
            difficultyLevel,
            adaptiveRecommendations: generateAdaptiveRecommendations(profile, progress),
          },
          metadata: { grade, subject, userId },
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

function extractTopicFromMessage(message: string): string {
  const lowerMessage = message.toLowerCase();
  const subjectKeywords = {
    mathematics: ['math', 'number', 'add', 'subtract', 'multiply', 'divide', 'fraction', 'decimal'],
    english: ['read', 'write', 'story', 'sentence', 'word', 'grammar', 'verb', 'noun'],
    science: ['experiment', 'plant', 'animal', 'water', 'air', 'earth', 'body'],
    'social studies': ['community', 'family', 'culture', 'history', 'geography', 'map'],
    kiswahili: ['lugha', 'maneno', 'sentensi', 'hadithi', 'mazungumzo'],
  };
  for (const [subject, keywords] of Object.entries(subjectKeywords)) {
    if (keywords.some((k) => lowerMessage.includes(k))) return subject;
  }
  return 'General Discussion';
}

function detectMessageType(message: string): 'question' | 'explanation' | 'encouragement' | 'correction' | 'hint' {
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

async function updateProfileFromInteraction(
  userId: string,
  input: MwalimuApiInput,
  _aiResponse: string,
): Promise<void> {
  const updates: any = { lastActive: new Date().toISOString() };
  const message = input.currentMessage?.toLowerCase() || '';

  if (
    message.includes('show me') ||
    message.includes('picture') ||
    message.includes('diagram')
  ) {
    updates.learningStyle = 'visual';
  }

  const interests: string[] = [];
  if (message.includes('animal') || message.includes('lion') || message.includes('elephant')) interests.push('animals');
  if (message.includes('sport') || message.includes('football') || message.includes('running')) interests.push('sports');
  if (message.includes('music') || message.includes('song') || message.includes('dance')) interests.push('music');
  if (message.includes('story') || message.includes('book') || message.includes('read')) interests.push('stories');
  if (interests.length > 0) {
    const profile = await personalizedLearning.getStudentProfile(userId);
    updates.interests = [...new Set([...profile.interests, ...interests])];
  }

  if (input.grade) {
    updates.grade = `Grade ${input.grade.replace('g', '')}`;
  }
  await personalizedLearning.updateProfile(userId, updates);
}

function generateAdaptiveRecommendations(profile: any, progress: any): string[] {
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
