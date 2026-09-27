/**
 * POST /api/exams/mark
 *
 * Marks the short- and long-answer items of a generated exam. Replaces the
 * `/api/v1/exams/mark` call the runner used to make: `/api/v1/*` is rewritten to
 * the Rust MVP backend, which is deployed nowhere, so on Vercel every submit
 * failed and the learner was told "AI marking failed" with no reason.
 *
 * Marking runs on the studio's own provider chain (`resolveLlmTargets`), not on
 * Render, so it works today and inherits the multi-provider fallback that was
 * added after the 2026-09-26 tutor outage.
 *
 * It deliberately has no template fallback. A scheme of work degraded to
 * prescribed rows is a teacher editing a draft; an exam answer scored against a
 * fabricated mark is a pupil's recorded result. If no provider answers, this
 * returns 502 and says so.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  LlmUnavailableError,
  completeWithFallback,
  extractJson,
  type CompletionResult,
} from '@/lib/llm/complete-with-fallback';

export const runtime = 'nodejs';
export const maxDuration = 30;

const markItemSchema = z.object({
  index: z.number().int().min(0).max(200),
  type: z.enum(['short', 'long']),
  question: z.string().min(1).max(4000),
  expectedAnswer: z.string().max(4000).optional().default(''),
  acceptableKeywords: z.array(z.string().max(200)).max(40).optional().default([]),
  rubric: z.string().max(4000).optional().default(''),
  marks: z.number().int().min(1).max(50),
  studentAnswer: z.string().max(8000).optional().default(''),
});

const requestSchema = z.object({
  items: z.array(markItemSchema).min(1).max(60),
  grade: z.string().max(60).optional(),
  subject: z.string().max(60).optional(),
});

type MarkResult = { index: number; awarded: number; feedback: string };

function markingPrompt(items: z.infer<typeof markItemSchema>[], grade?: string, subject?: string) {
  const roster = items
    .map((item, position) => {
      const lines = [
        `#${position + 1} (index ${item.index}, ${item.type} answer, ${item.marks} mark${item.marks === 1 ? '' : 's'})`,
        `Question: ${item.question}`,
        item.expectedAnswer ? `Expected answer: ${item.expectedAnswer}` : '',
        item.acceptableKeywords.length ? `Acceptable keywords: ${item.acceptableKeywords.join('; ')}` : '',
        item.rubric ? `Rubric: ${item.rubric}` : '',
        `Pupil's answer: ${item.studentAnswer.trim() || '(blank)'}`,
      ];
      return lines.filter(Boolean).join('\n');
    })
    .join('\n\n');

  return {
    system: [
      'You mark Kenyan CBC school assessments for teachers. You are precise, consistent,',
      `and brief.${grade ? ` The class is ${grade}.` : ''}${subject ? ` The subject is ${subject}.` : ''}`,
      '',
      'Rules:',
      '- Award whole marks from 0 up to the marks shown for that question.',
      '- Award full marks when the answer is correct in substance even if worded differently.',
      '- Award partial marks for partially correct work, and 0 for a blank answer.',
      '- Do not invent an expected answer the teacher did not supply; judge the pupil against',
      '  the question itself when no expected answer is given.',
      '- Feedback is one short sentence, written for the pupil, in plain English. Never shame',
      '  a blank or wrong answer; say what to revise.',
      '- Reply with JSON only: {"results":[{"index":<index>,"awarded":<number>,"feedback":"<text>"}]}',
      '  with exactly one entry per question, using the index values as given.',
    ].join('\n'),
    user: `Mark these ${items.length} question${items.length === 1 ? '' : 's'}.\n\n${roster}`,
  };
}

export async function POST(req: NextRequest) {
  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid marking request', detail: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized', detail: 'Sign in to mark assessments.' },
      { status: 401 },
    );
  }

  const { items, grade, subject } = parsed.data;
  const { system, user: userPrompt } = markingPrompt(items, grade, subject);

  let completion: CompletionResult;
  try {
    completion = await completeWithFallback({
      system,
      user: userPrompt,
      temperature: 0,
      // Roughly 40 tokens of mark + feedback per item, with headroom.
      maxTokens: Math.min(4000, 400 + items.length * 80),
    });
  } catch (error) {
    if (error instanceof LlmUnavailableError) {
      return NextResponse.json(
        {
          error: 'Marking is unavailable',
          detail: error.message,
          providers_tried: error.providersTried,
        },
        { status: error.noProviderConfigured ? 500 : 502 },
      );
    }
    throw error;
  }

  let parsedJson: unknown;
  try {
    parsedJson = extractJson(completion.text);
  } catch (error) {
    console.error('[/api/exams/mark] unparseable completion:', error);
    return NextResponse.json(
      {
        error: 'Marking response could not be read',
        detail: 'The model did not return parseable JSON.',
        provider: completion.provider,
        model: completion.model,
      },
      { status: 502 },
    );
  }

  const rawResults = Array.isArray((parsedJson as any)?.results)
    ? (parsedJson as any).results
    : Array.isArray(parsedJson)
      ? parsedJson
      : [];

  const byIndex = new Map<number, any>();
  for (const entry of rawResults) {
    if (typeof entry?.index === 'number') byIndex.set(entry.index, entry);
  }

  const results: MarkResult[] = items.map((item) => {
    const entry = byIndex.get(item.index);
    if (!entry) {
      return {
        index: item.index,
        awarded: 0,
        feedback: 'Not marked automatically — please review this answer yourself.',
      };
    }
    const awarded = Math.max(
      0,
      Math.min(item.marks, Number.isFinite(entry.awarded) ? entry.awarded : 0),
    );
    const feedback =
      typeof entry.feedback === 'string' && entry.feedback.trim()
        ? entry.feedback.trim().slice(0, 500)
        : awarded >= item.marks
          ? 'Correct.'
          : 'Partly correct — review the marked answer.';
    return { index: item.index, awarded, feedback };
  });

  return NextResponse.json({
    success: true,
    results,
    marked: results.filter((r) => byIndex.has(r.index)).length,
    total: results.length,
    provider: completion.provider,
    model: completion.model,
  });
}
