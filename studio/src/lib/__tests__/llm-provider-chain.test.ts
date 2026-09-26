import { describe, expect, it } from 'vitest';
import { resolveLlmTargets } from '../llm/provider-chain';

/**
 * Chat used to have exactly one upstream. `LLM_PROVIDER` picked groq or gemini,
 * the route read that one key, and any failure on that one provider - retired
 * model, rate limit, key entitlement, timeout - returned a 502 and the learner
 * saw nothing. That is what took student chat down on
 * sentastudio.vercel.app on 2026-09-26.
 *
 * `resolveLlmTargets()` is the ordering rule for the fallback chain: configured
 * providers only, the requested one first, the other as backup.
 */

const G = { GROQ_API_KEY: 'gk-live' };
const M = { GEMINI_API_KEY: 'gm-live' };

describe('resolveLlmTargets', () => {
  it('defaults to groq and offers nothing else when only groq is configured', () => {
    expect(resolveLlmTargets({ ...G })).toEqual([
      { provider: 'groq', apiKey: 'gk-live', model: 'llama-3.3-70b-versatile' },
    ]);
  });

  it('puts the requested provider first and the other one behind it', () => {
    const targets = resolveLlmTargets({ ...G, ...M, LLM_PROVIDER: 'gemini' });
    expect(targets.map((t) => t.provider)).toEqual(['gemini', 'groq']);
  });

  it('keeps groq first when the provider is unset, matching today behaviour', () => {
    const targets = resolveLlmTargets({ ...G, ...M });
    expect(targets.map((t) => t.provider)).toEqual(['groq', 'gemini']);
  });

  it('skips a provider that has no key instead of offering a guaranteed failure', () => {
    const targets = resolveLlmTargets({ ...M, LLM_PROVIDER: 'groq' });
    expect(targets.map((t) => t.provider)).toEqual(['gemini']);
  });

  it('treats an empty or whitespace key as not configured', () => {
    expect(resolveLlmTargets({ GROQ_API_KEY: '   ', ...M })).toEqual([
      { provider: 'gemini', apiKey: 'gm-live', model: 'gemini-3.6-flash' },
    ]);
    expect(resolveLlmTargets({ GROQ_API_KEY: '' })).toEqual([]);
  });

  it('returns nothing when no provider is configured, so the route can say so', () => {
    expect(resolveLlmTargets({})).toEqual([]);
  });

  it('accepts a provider name with stray case or spacing, and ignores an unknown one', () => {
    expect(resolveLlmTargets({ ...G, ...M, LLM_PROVIDER: '  Gemini ' })[0].provider).toBe('gemini');
    // An unrecognised LLM_PROVIDER must not silently mean "no chat": the route
    // has always fallen through to groq, and the fallback chain keeps that.
    expect(resolveLlmTargets({ ...G, LLM_PROVIDER: 'ollama' })[0].provider).toBe('groq');
  });

  it('honours per-provider model overrides', () => {
    expect(resolveLlmTargets({ ...G, GROQ_MODEL: 'llama-4-scout' })[0].model).toBe('llama-4-scout');
    expect(resolveLlmTargets({ ...M, LLM_PROVIDER: 'gemini', GEMINI_MODEL: 'gemini-3.5-flash' })[0].model)
      .toBe('gemini-3.5-flash');
  });

  it('never lists the same provider twice', () => {
    const targets = resolveLlmTargets({ ...G, ...M, LLM_PROVIDER: 'groq' });
    expect(new Set(targets.map((t) => t.provider)).size).toBe(targets.length);
  });
});
