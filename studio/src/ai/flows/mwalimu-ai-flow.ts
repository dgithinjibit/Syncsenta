'use server';

/**
 * Thin shim: delegates Mwalimu turn generation to the consolidated pipeline
 * in `@/lib/mwalimu-pipeline`. This file exists so existing callers
 * (`orchestrator-agent.ts`, tests) keep working without divergence.
 *
 * Genkit-specific concerns retained here:
 *   - Gemini TTS for `audioResponse`
 *   - Async Firestore writeback of teacher-facing learning summaries
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import wav from 'wav';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import {
  MwalimuAiTutorInput,
  MwalimuAiTutorOutput,
} from './mwalimu-ai-types';
import { summarizeStudentInteractionFlow } from './summarize-student-interaction';
import type { LearningSummary } from '@/lib/types';
import { runMwalimuTurn } from '@/lib/mwalimu-pipeline';

export async function mwalimuAiTutor(
  input: MwalimuAiTutorInput,
): Promise<MwalimuAiTutorOutput> {
  const turn = await runMwalimuTurn({
    userId: input.studentId || 'anonymous',
    studentName: input.studentName,
    teacherId: input.teacherId,
    grade: input.grade,
    subject: input.subject,
    currentMessage: input.currentMessage || '',
    history: input.history,
  });

  if (input.history && input.history.length > 2 && input.studentId) {
    summarizeAndStoreInteraction(input);
  }

  const audioResponse = await generateTts(turn.response);

  return {
    response: turn.response,
    audioResponse,
  };
}

async function generateTts(text: string): Promise<string | undefined> {
  try {
    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' },
          },
        },
      },
      prompt: text,
    });
    if (!media) return undefined;
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64',
    );
    return 'data:audio/wav;base64,' + (await toWav(audioBuffer));
  } catch (error) {
    console.warn('TTS generation failed:', error);
    return undefined;
  }
}

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });
    const bufs: any[] = [];
    writer.on('error', reject);
    writer.on('data', (d) => bufs.push(d));
    writer.on('end', () => resolve(Buffer.concat(bufs).toString('base64')));
    writer.write(pcmData);
    writer.end();
  });
}

async function summarizeAndStoreInteraction(input: MwalimuAiTutorInput) {
  try {
    const summary = await summarizeStudentInteractionFlow({
      studentName: input.studentName || 'Student',
      subject: input.subject,
      grade: input.grade,
      chatHistory: input.history || [],
    });

    const learningSummary: Omit<LearningSummary, 'id'> = {
      studentId: input.studentId!,
      studentName: input.studentName || 'Student',
      teacherId: input.teacherId || 'teacher_placeholder_id',
      subject: input.subject,
      ...summary,
      chatHistory: input.history || [],
      createdAt: new Date().toISOString(),
    };

    await addDoc(collection(db, 'learningSummaries'), learningSummary);
  } catch (error) {
    console.error('Failed to generate or store learning summary:', error);
  }
}
