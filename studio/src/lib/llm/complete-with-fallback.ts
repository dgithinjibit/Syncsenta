/**
 * Single-shot LLM completion with the same provider fallback chain as /api/chat.
 *
 * `provider-chain.ts` deliberately owns only the *ordering* decision and leaves
 * the calls in the route. That was true while `/api/chat` was the only caller.
 * Exam marking (`/api/exams/mark`) needs the identical retry semantics, and
 * copying the Groq/Gemini plumbing into a second route is how the two would
 * drift — one keeps working while the other quietly 502s, which is the failure
 * class this whole branch has been removing.
 *
 * Streaming stays in `/api/chat`. This helper is for one-shot prompts that need
 * a whole answer, so it has no backpressure, no SSE framing and no session
 * persistence.
 */

import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PROVIDER_KEY_ENV_NAMES, resolveLlmTargets, type LlmTarget } from './provider-chain';

export type CompletionInput = {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
};

export type CompletionResult = {
  text: string;
  provider: LlmTarget['provider'];
  model: string;
  /** `provider:model:reason` for each target that was tried and failed. */
  attempts: string[];
};

/**
 * Thrown when no provider is configured, or every configured one failed.
 * `providersTried` is what to show an operator — a 502 that names nothing is
 * what made the tutor outage on 2026-09-26 impossible to diagnose from the UI.
 */
export class LlmUnavailableError extends Error {
  readonly noProviderConfigured: boolean;
  readonly providersTried: string[];

  constructor(message: string, providersTried: string[], noProviderConfigured = false) {
    super(message);
    this.name = 'LlmUnavailableError';
    this.providersTried = providersTried;
    this.noProviderConfigured = noProviderConfigured;
  }
}

async function callTarget(target: LlmTarget, input: CompletionInput): Promise<string> {
  if (target.provider === 'gemini') {
    const gemini = new GoogleGenerativeAI(target.apiKey);
    const model = gemini.getGenerativeModel({
      model: target.model,
      systemInstruction: input.system,
    });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: input.user }] }],
      generationConfig: {
        temperature: input.temperature ?? 0.2,
        maxOutputTokens: input.maxTokens ?? 1024,
      },
    });
    return result.response.text();
  }

  const groq = new Groq({ apiKey: target.apiKey });
  const completion = await groq.chat.completions.create({
    model: target.model,
    messages: [
      { role: 'system', content: input.system },
      { role: 'user', content: input.user },
    ],
    temperature: input.temperature ?? 0.2,
    max_tokens: input.maxTokens ?? 1024,
    stream: false,
  });
  return completion.choices[0]?.message?.content ?? '';
}

/**
 * Ask the first provider that answers, in `resolveLlmTargets()` order.
 *
 * A provider that returns an empty string counts as a failure: reasoning models
 * on this account have been observed spending the whole token budget on
 * reasoning and returning no `content`, which must not be handed to the caller
 * as a successful completion.
 */
export async function completeWithFallback(input: CompletionInput): Promise<CompletionResult> {
  const targets = resolveLlmTargets();
  if (targets.length === 0) {
    throw new LlmUnavailableError(
      `No LLM provider is configured. Set ${PROVIDER_KEY_ENV_NAMES.join(' or ')}.`,
      [],
      true,
    );
  }

  const attempts: string[] = [];
  for (const target of targets) {
    try {
      const text = await callTarget(target, input);
      if (!text.trim()) {
        attempts.push(`${target.provider}:${target.model} returned no content`);
        continue;
      }
      return { text, provider: target.provider, model: target.model, attempts };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      attempts.push(`${target.provider}:${target.model} ${reason}`);
    }
  }

  throw new LlmUnavailableError(
    'Every configured LLM provider failed.',
    attempts,
  );
}

/**
 * Pull the first JSON object or array out of a completion.
 *
 * Models wrap JSON in prose or a ```json fence often enough that a bare
 * JSON.parse is the less reliable path, and a marking failure would discard a
 * teacher's whole grading run.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : trimmed).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.search(/[[{]/);
    if (start === -1) throw new Error('Response contained no JSON');
    for (let end = candidate.length; end > start; end -= 1) {
      const slice = candidate.slice(start, end);
      if (!/[\]}]$/.test(slice)) continue;
      try {
        return JSON.parse(slice);
      } catch {
        /* keep shortening */
      }
    }
    throw new Error('Response contained no complete JSON');
  }
}
