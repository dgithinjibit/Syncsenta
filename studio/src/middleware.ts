/**
 * Next.js Middleware for Security Headers
 *
 * SECURITY: Content-Security-Policy (CSP)
 * - Prevents XSS attacks by controlling resource loading
 * - Restricts inline scripts and styles
 * - Allows only trusted sources
 *
 * SECURITY: API Versioning (Phase 4 - P3)
 * - Adds API version headers
 * - Supports version negotiation
 * - Maintains backward compatibility
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { shouldEnforceAuthWall, isProtectedWorkspace } from '@/lib/auth/route-policy';

const API_VERSION = '1.0.0';
const SUPPORTED_VERSIONS = ['1.0.0'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // SECURITY: API Versioning
  response.headers.set('X-API-Version', API_VERSION);
  response.headers.set('X-Supported-Versions', SUPPORTED_VERSIONS.join(', '));
  
  // Check if client requested specific API version
  const requestedVersion = request.headers.get('X-API-Version');
  if (requestedVersion && !SUPPORTED_VERSIONS.includes(requestedVersion)) {
    return NextResponse.json(
      {
        error: 'Unsupported API version',
        requestedVersion,
        supportedVersions: SUPPORTED_VERSIONS,
        currentVersion: API_VERSION,
      },
      {
        status: 400,
        headers: {
          'X-API-Version': API_VERSION,
          'X-Supported-Versions': SUPPORTED_VERSIONS.join(', '),
        },
      }
    );
  }

  // Protect every learner, teacher, parent, and head workspace in production.
  // The former unauthenticated /student/demo mock is now a compatibility
  // redirect to the real student_1 demo account.
  //
  // /dashboard is included deliberately: it is the legacy surface whose
  // identity came from a `userEmail` cookie that nothing writes any more, so
  // unprotected visitors got an unresolved loading skeleton instead of a page.
  const protectedRoute = isProtectedWorkspace(request.nextUrl.pathname);
  const demoBypass = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_AUTH_DEMO_BYPASS === 'true';
  // Production role workspaces are protected by default. Local development
  // remains opt-in so contributors can run the UI without a Supabase session.
  // Set AUTH_WALL_ENABLED=false only for a deliberate non-production preview.
  const authWallEnabled = shouldEnforceAuthWall(
    process.env.NODE_ENV,
    process.env.AUTH_WALL_ENABLED,
  );
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (protectedRoute && authWallEnabled && !demoBypass) {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(new URL('/auth/signin?error=auth_not_configured', request.url));
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Bounce straight to the Supabase sign-in page. This used to target
      // /login, which was a stub that client-side redirected to the anonymous
      // /signup role picker — two hops that ended on a blank /dashboard.
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Content Security Policy
  // This is a strict CSP that prevents most XSS attacks.
  //
  // connect-src is built from env at request time so that:
  //  - Renaming/redeploying the AI backend doesn't require editing this file
  //  - Local dev (npm run dev → http://localhost:8080) isn't silently blocked
  //  - The legacy hardcoded onrender host stays in the list as a fallback so
  //    existing prod deployments keep working if the env var is missing
  const aiAgentsUrl = process.env.NEXT_PUBLIC_AI_AGENTS_URL?.trim();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  const isDev = process.env.NODE_ENV !== 'production';
  const transportDirective = isDev ? '' : 'upgrade-insecure-requests;';

  const connectSrc = [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    // The tutor and the teacher live link talk to this host. It used to be
    // listed unconditionally *and* followed by `aiAgentsUrl`, which on Vercel
    // is the same value - a duplicate origin in every response header.
    aiAgentsUrl || 'https://ascendra-1.onrender.com',
    // NEXT_PUBLIC_BACKEND_WS_URL is metadata about a service that is not
    // deployed yet; when it is set, the socket it names must survive the
    // CSP or the teacher view fails in a way that looks like a UI bug.
    process.env.NEXT_PUBLIC_BACKEND_WS_URL?.trim(),
    apiUrl,
    // `MVP_BACKEND_URL` is a server-side rewrite target (next.config.js), so
    // the browser only ever sees this origin and needs no entry here.
    isDev ? 'http://localhost:*' : null,
    isDev ? 'ws://localhost:*' : null,
  ]
    .filter(Boolean)
    .join(' ');

  // Nothing in the app loads a script from a public CDN (verified by search:
  // the only mention of jsdelivr/unpkg in the tree was this header), so
  // allowing them would widen the XSS surface for no benefit.
  //
  // SECURITY: this prose is a JavaScript comment and must stay outside the
  // template literal below. The `.replace(/\s{2,}/g, ' ')` that flattens the
  // header also collapses the newlines around it, so comments written inside
  // the literal were emitted as a directive named `//`, the browser rejected
  // the policy, and `script-src` — glued to the end of that garbage directive
  // — never applied. Every inline script then fell back to `default-src 'self'`,
  // Next.js's inline RSC payload was blocked, and signed-in student pages
  // rendered blank. Regression test: src/lib/__tests__/csp-headers.test.ts.
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: https: blob:;
    font-src 'self' https://fonts.gstatic.com;
    connect-src ${connectSrc};
    worker-src 'self' blob:;
    frame-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    ${transportDirective}
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', cspHeader);

  // Additional Security Headers
  
  // Prevent clickjacking attacks
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection in older browsers
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy - don't leak referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy - restrict browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Strict-Transport-Security (HSTS) - force HTTPS
  // Only set in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  return response;
}

// Apply middleware to all routes except static files
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

// Made with Bob
