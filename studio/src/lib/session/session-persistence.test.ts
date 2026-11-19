import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({ redisGet: vi.fn() }));

vi.mock('@upstash/redis', () => ({
  Redis: class {
    get = deps.redisGet;
  },
}));

import { getLearningSessionReadResult } from './session-persistence';

describe('getLearningSessionReadResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    vi.restoreAllMocks();
  });

  it('distinguishes unconfigured Redis from a missing session', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    await expect(getLearningSessionReadResult('learner-unconfigured')).resolves.toEqual({
      status: 'unavailable',
      reason: 'not_configured',
    });

    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'synthetic-token';
    deps.redisGet.mockResolvedValueOnce(null);

    await expect(getLearningSessionReadResult('learner-missing')).resolves.toEqual({
      status: 'missing',
    });
  });

  it('returns a distinct read failure instead of treating Redis errors as missing', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'synthetic-token';
    deps.redisGet.mockRejectedValueOnce(new Error('synthetic Redis failure'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(getLearningSessionReadResult('learner-read-failed')).resolves.toEqual({
      status: 'unavailable',
      reason: 'read_failed',
    });
  });

  it('returns and caches a found session', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'synthetic-token';
    const session = { preferences: { scaffoldingLevel: 'Guided' } };
    deps.redisGet.mockResolvedValueOnce(session);

    await expect(getLearningSessionReadResult('learner-found')).resolves.toEqual({
      status: 'found',
      session,
    });
    await expect(getLearningSessionReadResult('learner-found')).resolves.toEqual({
      status: 'found',
      session,
    });
    expect(deps.redisGet).toHaveBeenCalledOnce();
  });
});
