import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { middleware } from '@/middleware';

/**
 * The CSP in `src/middleware.ts` is assembled per request from environment
 * variables, which is exactly the kind of string that goes quietly wrong.
 *
 * Three defects this locks down, found while diagnosing
 * sentastudio.vercel.app on 2026-09-26 and 2026-09-28:
 *  - `script-src` allowed `https://cdn.jsdelivr.net` and `https://unpkg.com`,
 *    and nothing in the app loads a script from either. A CSP that permits two
 *    arbitrary code-hosting CDNs is closer to no CSP than it looks.
 *  - `connect-src` listed `https://ascendra-1.onrender.com` literally *and*
 *    again from `NEXT_PUBLIC_AI_AGENTS_URL`, which on Vercel is the same value,
 *    so every response carried a duplicate origin.
 *  - explanatory `//` comments sat inside the header template literal, where
 *    they were flattened into the policy text and swallowed `script-src` (see
 *    the regression test at the bottom, added 2026-09-28).
 *
 * It also asserts the forward-looking half: when the live-monitoring backend
 * finally gets a URL, `NEXT_PUBLIC_BACKEND_WS_URL` must reach `connect-src`, or
 * the teacher view will fail in a way that reads like a UI bug.
 */

async function cspFor(path = '/student'): Promise<string> {
  const request = new NextRequest(`https://sentastudio.vercel.app${path}`, {
    headers: { host: 'sentastudio.vercel.app' },
  });
  const response = await middleware(request);
  return response.headers.get('content-security-policy') ?? '';
}

function directive(header: string, name: string): string[] {
  const match = new RegExp(`(?:^|;)\\s*${name}\\s+([^;]*)`).exec(
    header.replace(/\n/g, ';')
  );
  return (match?.[1] ?? '').trim().split(/\s+/).filter(Boolean);
}

describe('content-security-policy', () => {
  it('does not let public code CDNs execute', async () => {
    const header = await cspFor('/student');
    expect(header).not.toContain('cdn.jsdelivr.net');
    expect(header).not.toContain('unpkg.com');
  });

  it('lists each connect-src origin once', async () => {
    const origins = directive(await cspFor('/'), 'connect-src');
    expect(origins.length).toBeGreaterThan(0);
    expect(new Set(origins).size).toBe(origins.length);
  });

  it('still allows the deployed AI backend', async () => {
    expect(directive(await cspFor('/'), 'connect-src')).toContain(
      'https://ascendra-1.onrender.com'
    );
  });

  it('allows the live-monitoring socket when it is configured', async () => {
    process.env.NEXT_PUBLIC_BACKEND_WS_URL = 'wss://mvp.example.ke';
    try {
      const origins = directive(await cspFor('/teacher'), 'connect-src');
      expect(origins).toContain('wss://mvp.example.ke');
    } finally {
      delete process.env.NEXT_PUBLIC_BACKEND_WS_URL;
    }
  });

  it('keeps the remaining baseline intact', async () => {
    const header = await cspFor('/student/chat');
    expect(header).toContain("default-src 'self'");
    expect(header).toContain("object-src 'none'");
    expect(header).toContain("frame-ancestors 'none'");
  });

  // Regression: on 2026-09-28 sentastudio.vercel.app served a CSP whose inline
  // JavaScript comments were written *inside* the header's template literal.
  // `.replace(/\s{2,}/g, ' ')` collapsed the newlines, so the prose became a
  // directive named `//`, the browser rejected it, and `script-src` — which had
  // been riding at the end of that same garbage directive — never took effect.
  // Every script then fell back to `default-src 'self'`, Next.js's inline RSC
  // payload was blocked, and the student pages signed in and stayed blank.
  it('emits only directives whose names are valid', async () => {
    const header = await cspFor('/student');
    expect(header.length).toBeGreaterThan(0);

    const invalid = header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => part.split(/\s+/)[0])
      .filter((name) => !/^[a-zA-Z-]+$/.test(name));

    expect(invalid).toEqual([]);
  });

  it('gives script-src its own directive, not one glued to prose', async () => {
    const header = await cspFor('/student');
    const names = header
      .split(';')
      .map((part) => part.trim().split(/\s+/)[0])
      .filter(Boolean);
    expect(names).toContain('script-src');

    // The app is an SPA that hydrates from an inline payload; without
    // 'unsafe-inline' the whole client tree is blocked by default-src.
    expect(directive(header, 'script-src')).toEqual([
      "'self'",
      "'unsafe-eval'",
      "'unsafe-inline'",
    ]);
  });
});
