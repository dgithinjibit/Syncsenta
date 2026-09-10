/**
 * Distributed Rate Limiting with Upstash Redis
 * 
 * Replaces the in-memory rate limiter with a production-ready
 * distributed solution using Upstash Redis.
 * 
 * Features:
 * - Sliding window rate limiting
 * - Per-user quotas based on subscription tier
 * - Persistent across server restarts
 * - Works in serverless environments
 */

import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client
let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('Upstash Redis not configured. Rate limiting will be disabled.');
    return null;
  }

  redis = new Redis({
    url,
    token,
  });

  return redis;
}

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  limit: number;

  /**
   * Time window in seconds
   */
  window: number;
}

export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  success: boolean;

  /**
   * Number of requests remaining in the current window
   */
  remaining: number;

  /**
   * Total limit for this identifier
   */
  limit: number;

  /**
   * Time until the window resets (in seconds)
   */
  reset: number;

  /**
   * Whether rate limiting is enabled (false if Redis not configured)
   */
  enabled: boolean;
}

/**
 * Check rate limit using sliding window algorithm
 * 
 * @param identifier - Unique identifier (user ID, IP address, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const client = getRedisClient();

  // If Redis not configured, allow all requests
  if (!client) {
    return {
      success: true,
      remaining: config.limit,
      limit: config.limit,
      reset: 0,
      enabled: false,
    };
  }

  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.window * 1000;

  try {
    // Use Redis pipeline for atomic operations
    const pipeline = client.pipeline();

    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Count requests in current window
    pipeline.zcard(key);

    // Add current request
    pipeline.zadd(key, { score: now, member: `${now}` });

    // Set expiry on the key
    pipeline.expire(key, config.window);

    await pipeline.exec();

    // Extract count (result of zcard) using zcard for a properly typed response
    const count = (await client.zcard(key)) as number;

    const remaining = Math.max(0, config.limit - count - 1);
    const success = count < config.limit;

    // Calculate reset time (when the oldest request in window expires)
    let reset = config.window;
    if (count > 0) {
      const oldestTimestamp = (await client.zrange(key, 0, 0, { withScores: true })) as any;
      if (oldestTimestamp && oldestTimestamp.length > 0) {
        let oldestTime: number | null = null;
        const first = oldestTimestamp[0];
        if (first && typeof first === 'object') {
          if ('score' in first) oldestTime = Number(first.score);
          else if (Array.isArray(first) && first.length > 1) oldestTime = Number(first[1]);
        } else if (!isNaN(Number(first))) {
          oldestTime = Number(first);
        }
        if (oldestTime !== null) {
          reset = Math.ceil((oldestTime + config.window * 1000 - now) / 1000);
        }
      }
    }

    return {
      success,
      remaining,
      limit: config.limit,
      reset: Math.max(0, reset),
      enabled: true,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // On error, allow the request (fail open)
    return {
      success: true,
      remaining: config.limit,
      limit: config.limit,
      reset: 0,
      enabled: true,
    };
  }
}

/**
 * Get rate limit configuration based on subscription tier
 */
export function getRateLimitConfig(tier: 'free' | 'premium' | 'school'): RateLimitConfig {
  switch (tier) {
    case 'free':
      return {
        limit: 50, // 50 requests per day
        window: 86400, // 24 hours
      };
    case 'premium':
      return {
        limit: 10000, // Effectively unlimited
        window: 86400,
      };
    case 'school':
      return {
        limit: 50000, // Very high limit for schools
        window: 86400,
      };
    default:
      return {
        limit: 50,
        window: 86400,
      };
  }
}

/**
 * Check rate limit for API endpoint
 * 
 * @param userId - User ID (or IP address for anonymous users)
 * @param tier - Subscription tier
 * @returns Rate limit result
 */
export async function checkApiRateLimit(
  userId: string,
  tier: 'free' | 'premium' | 'school' = 'free'
): Promise<RateLimitResult> {
  const config = getRateLimitConfig(tier);
  return checkRateLimit(`api:${userId}`, config);
}

/**
 * Check rate limit for chat messages
 * 
 * @param userId - User ID
 * @param tier - Subscription tier
 * @returns Rate limit result
 */
export async function checkChatRateLimit(
  userId: string,
  tier: 'free' | 'premium' | 'school' = 'free'
): Promise<RateLimitResult> {
  const config = getRateLimitConfig(tier);
  return checkRateLimit(`chat:${userId}`, config);
}

/**
 * Reset rate limit for a user (admin function)
 * 
 * @param identifier - Unique identifier
 */
export async function resetRateLimit(identifier: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  const key = `ratelimit:${identifier}`;
  await client.del(key);
}

/**
 * Get current usage for a user
 * 
 * @param identifier - Unique identifier
 * @param window - Time window in seconds
 * @returns Number of requests in the current window
 */
export async function getCurrentUsage(
  identifier: string,
  window: number
): Promise<number> {
  const client = getRedisClient();
  if (!client) return 0;

  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - window * 1000;

  try {
    // Count requests in current window
    const count = await client.zcount(key, windowStart, now);
    return count;
  } catch (error) {
    console.error('Failed to get current usage:', error);
    return 0;
  }
}
