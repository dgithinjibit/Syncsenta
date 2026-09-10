/**
 * Rate Limiting Middleware for API Routes
 * 
 * Apply this middleware to API routes to enforce rate limits.
 * Uses Upstash Redis for distributed rate limiting.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit, RateLimitResult } from '@/lib/session/rate-limit-upstash';
import { createClient } from '@/lib/supabase/server';

export interface RateLimitOptions {
  /**
   * Custom rate limit configuration
   * If not provided, uses tier-based defaults
   */
  limit?: number;
  window?: number;
  
  /**
   * Whether to skip rate limiting for authenticated users
   * Default: false
   */
  skipAuthenticated?: boolean;
  
  /**
   * Custom identifier function
   * Default: uses user ID or IP address
   */
  getIdentifier?: (request: NextRequest) => Promise<string>;
}

/**
 * Apply rate limiting to an API route
 * 
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = await withRateLimit(request);
 *   if (!rateLimitResult.success) {
 *     return rateLimitResult.response;
 *   }
 *   
 *   // Your API logic here
 *   return NextResponse.json({ success: true });
 * }
 * ```
 */
export async function withRateLimit(
  request: NextRequest,
  options: RateLimitOptions = {}
): Promise<{ success: boolean; response?: NextResponse; result?: RateLimitResult }> {
  try {
    // Get identifier (user ID or IP address)
    const identifier = options.getIdentifier 
      ? await options.getIdentifier(request)
      : await getDefaultIdentifier(request);
    
    // Get user tier from database
    const tier = await getUserTier(request);
    
    // Skip rate limiting for authenticated premium/school users if configured
    if (options.skipAuthenticated && tier !== 'free') {
      return { success: true };
    }
    
    // Check rate limit
    const result = await checkApiRateLimit(identifier, tier);
    
    // If rate limit not enabled (Redis not configured), allow request
    if (!result.enabled) {
      return { success: true, result };
    }
    
    // Add rate limit headers to all responses
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', result.limit.toString());
    headers.set('X-RateLimit-Remaining', result.remaining.toString());
    headers.set('X-RateLimit-Reset', result.reset.toString());
    
    // If rate limit exceeded, return 429
    if (!result.success) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: `Too many requests. Please try again in ${result.reset} seconds.`,
            limit: result.limit,
            remaining: 0,
            reset: result.reset,
          },
          {
            status: 429,
            headers,
          }
        ),
      };
    }
    
    return { success: true, result };
  } catch (error) {
    console.error('Rate limit middleware error:', error);
    // On error, allow the request (fail open for availability)
    return { success: true };
  }
}

/**
 * Get default identifier (user ID or IP address)
 */
async function getDefaultIdentifier(request: NextRequest): Promise<string> {
  // Try to get user ID from session
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user?.id) {
      return `user:${session.user.id}`;
    }
  } catch (error) {
    // Ignore auth errors, fall back to IP
  }
  
  // Fall back to IP address
  const ip = request.headers.get('x-forwarded-for') || 
              request.headers.get('x-real-ip') ||
              'unknown';
  
  return `ip:${ip}`;
}

/**
 * Get user tier from database
 */
async function getUserTier(request: NextRequest): Promise<'free' | 'premium' | 'school'> {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return 'free';
    }
    
    // Query user profile for tier/role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    // School admin or teacher gets school tier
    if (profile?.role === 'admin' || profile?.role === 'teacher') {
      return 'school';
    }
    
    // TODO: Check for premium subscription in database
    // For now, default to free
    return 'free';
  } catch (error) {
    console.error('Failed to get user tier:', error);
    return 'free';
  }
}

/**
 * Helper function to add rate limit headers to any response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', result.reset.toString());
  return response;
}

/**
 * Create a rate-limited API route handler
 * 
 * Usage:
 * ```typescript
 * export const POST = withRateLimitHandler(async (request: NextRequest) => {
 *   // Your API logic here
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withRateLimitHandler(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: RateLimitOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const rateLimitCheck = await withRateLimit(request, options);
    
    if (!rateLimitCheck.success && rateLimitCheck.response) {
      return rateLimitCheck.response;
    }
    
    const response = await handler(request);
    
    // Add rate limit headers to successful response
    if (rateLimitCheck.result) {
      return addRateLimitHeaders(response, rateLimitCheck.result);
    }
    
    return response;
  };
}
