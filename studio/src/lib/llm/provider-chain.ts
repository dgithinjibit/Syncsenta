/**
 * LLM provider chain for the tutoring endpoints.
 *
 * Until now `LLM_PROVIDER` selected exactly one upstream and `/api/chat` read
 * exactly one key. Any failure there - a retired model, a rate limit, a key
 * whose entitlement changed, a timeout - came back as a 502 with nothing behind
 * it, which is how student chat went dark on sentastudio.vercel.app on
 * 2026-09-26 while a configured second provider sat unused.
 *
 * This module owns only the ordering decision, so it can be tested without
 * network access. Calling the providers stays in the route.
 */

export type LlmProvider = 'groq' | 'gemini';

export type LlmTarget = {
  provider: LlmProvider;
  apiKey: string;
  /** Model id as configured for that provider. */
  model: string;
};

type Env = Record<string, string | undefined>;

/**
 * Defaults kept identical to the values `app/api/chat/route.ts` shipped with, so
 * introducing the chain cannot quietly change which model a learner is served.
 */
export const DEFAULT_MODELS: Record<LlmProvider, string> = {
  groq: 'llama-3.3-70b-versatile',
  gemini: 'gemini-3.6-flash',
};

const KEY_ENV: Record<LlmProvider, string> = {
  groq: 'GROQ_API_KEY',
  gemini: 'GEMINI_API_KEY',
};

const MODEL_ENV: Record<LlmProvider, string> = {
  groq: 'GROQ_MODEL',
  gemini: 'GEMINI_MODEL',
};

function trimmed(value: string | undefined): string {
  return (value ?? '').trim();
}

/**
 * A provider is usable when its key is present and not blank. A Vercel project
 * with `GROQ_API_KEY=""` saved is the common case this guards.
 */
function targetOrNull(provider: LlmProvider, env: Env): LlmTarget | null {
  const apiKey = trimmed(env[KEY_ENV[provider]]);
  if (!apiKey) return null;
  return { provider, apiKey, model: trimmed(env[MODEL_ENV[provider]]) || DEFAULT_MODELS[provider] };
}

/**
 * Ordered providers to try, most-preferred first.
 *
 * - `LLM_PROVIDER` names the primary; unset or unrecognised means groq, which is
 *   what the route already did with anything that was not `gemini`.
 * - Any other configured provider follows as the fallback, so one upstream going
 *   down degrades the answer instead of ending the conversation.
 * - An empty array means no provider is configured at all. The caller must say
 *   so plainly rather than streaming a failure at the learner.
 */
export function resolveLlmTargets(env: Env = process.env): LlmTarget[] {
  const requested = trimmed(env.LLM_PROVIDER).toLowerCase();
  const primary: LlmProvider = requested === 'gemini' ? 'gemini' : 'groq';
  const secondary: LlmProvider = primary === 'gemini' ? 'groq' : 'gemini';

  const ordered: LlmTarget[] = [];
  for (const provider of [primary, secondary]) {
    const target = targetOrNull(provider, env);
    if (target) ordered.push(target);
  }
  return ordered;
}

/** Env variable names to quote when nothing is configured. */
export const PROVIDER_KEY_ENV_NAMES: string[] = ['GROQ_API_KEY', 'GEMINI_API_KEY'];
