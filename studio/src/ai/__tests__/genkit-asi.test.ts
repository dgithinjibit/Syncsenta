import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

/**
 * Spoon 13 (ASI swap): every Co-Pilot flow runs through src/ai/genkit.ts.
 * Production 500'd on all 18 tools because that file demanded
 * GEMINI_API_KEY, which the Vercel project does not (and must not) carry.
 * These tests pin the replacement wiring: the ASI gateway
 * (OpenAI-compatible endpoint) reached through @genkit-ai/compat-oai,
 * keyed by ASI_CLOUD_KEY, defaulting to asi/asi1-mini.
 *
 * The real `genkit()` and plugin factories are mocked so this stays a
 * unit test of the wiring — no network, no key.
 */

const genkitCalls: Array<{ model?: string; plugins?: unknown[] }> = [];
const openAICompatibleCalls: Array<Record<string, unknown>> = [];

vi.mock('genkit', () => ({
  genkit: (config: { model?: string; plugins?: unknown[] }) => {
    genkitCalls.push(config);
    return { __fakeAi: true };
  },
}));

vi.mock('@genkit-ai/compat-oai', () => ({
  openAICompatible: (options: Record<string, unknown>) => {
    openAICompatibleCalls.push(options);
    return { __fakePlugin: 'asi' };
  },
}));

vi.mock('@genkit-ai/googleai', () => ({
  googleAI: () => ({ __fakePlugin: 'googleai' }),
}));

describe('GenKit provider wiring (ASI gateway)', () => {
  beforeEach(() => {
    vi.resetModules();
    genkitCalls.length = 0;
    openAICompatibleCalls.length = 0;
    vi.stubEnv('ASI_CLOUD_KEY', 'asi-test-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('registers the ASI gateway via compat-oai, keyed by ASI_CLOUD_KEY', async () => {
    await import('../genkit');

    expect(openAICompatibleCalls).toHaveLength(1);
    const opts = openAICompatibleCalls[0];
    expect(opts.name).toBe('asi');
    expect(opts.baseURL).toBe('https://llm.c.singularitynet.io/v1');
    expect(opts.apiKey).toBe('asi-test-key');
  });

  it('defaults Co-Pilot flows to asi/asi1-mini', async () => {
    await import('../genkit');

    expect(genkitCalls.length).toBeGreaterThan(0);
    expect(genkitCalls[0]?.model).toBe('asi/asi1-mini');
  });
});
