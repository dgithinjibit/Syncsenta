import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The student tutor has never worked in production, and the reason was
 * invisible in the UI: `mwalimu-chat.tsx` posted to `/api/v1/mvp/messages`,
 * which `next.config.js` rewrites to `http://localhost:8080`. That Rust process
 * runs only on a developer machine, so on Vercel every learner turn 404d while
 * the header badge spun at "Connecting" from a WebSocket to the same host.
 *
 * These assertions keep the student chat on `/api/chat` - the route that is
 * deployed, authenticated and LLM-backed - and record which surfaces are still
 * waiting for a real backend so the next reader does not think they work.
 */

function source(rel: string): string {
  // Strip comments first: the explanation of the old bug must not count as the
  // bug being present.
  return readFileSync(join(process.cwd(), rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('student chat transport', () => {
  it.each([
    'src/components/student/mwalimu-chat.tsx',
    'src/app/student/chat/page.tsx',
  ])('%s never calls the undeployed MVP backend', (rel) => {
    expect(source(rel)).not.toMatch(/['"`]\/api\/v1\/mvp/);
  });

  it('sends learner turns through the deployed chat route', () => {
    const chat = source('src/components/student/mwalimu-chat.tsx');
    expect(chat).toMatch(/streamTutorTurn/);
    expect(source('src/lib/chat/tutor-stream.ts')).toMatch(/['"`]\/api\/chat['"`]/);
  });

  it('only opens a WebSocket when a backend is actually configured', () => {
    const chat = source('src/components/student/mwalimu-chat.tsx');
    // The old fallback built `wss://<current-host>/api/v1/mvp/ws`, which nothing
    // answers, and retried every three seconds forever.
    expect(chat).not.toMatch(/window\.location\.host.*8080/);
    expect(chat).toMatch(/if \(!wsBase\) return/);
  });
});

describe('surfaces still waiting on a deployed backend', () => {
  // Not tonight's fix, but they must not be mistaken for working: these call
  // the same `/api/v1` prefix and 404 on Vercel until the Rust service is
  // deployed and the rewrite points at it.
  it.each([
    'src/components/teacher/teacher-dashboard.tsx',
    'src/app/quiz/page.tsx',
  ])('%s is still wired to /api/v1', (rel) => {
    expect(source(rel)).toMatch(/\/api\/v1\/mvp/);
  });
});
