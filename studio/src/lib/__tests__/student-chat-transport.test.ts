import { existsSync, readFileSync } from 'node:fs';
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
  // bug being present. Line comments go before block comments, because a note
  // that mentions `/api/agents/*` would otherwise open a fake block comment and
  // swallow the code below it. The `[^:]` guard keeps `https://…` inside string
  // literals intact.
  return readFileSync(join(process.cwd(), rel), 'utf8')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/\/\*[\s\S]*?\*\//g, '');
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

describe('teacher live view', () => {
  it('does not invent a WebSocket host', () => {
    const dash = source('src/components/teacher/teacher-dashboard.tsx');
    // It used to fall back to `wss://<host>/api/v1/mvp/ws`, guessing at
    // Codespaces port patterns, and retry every 3 seconds with no listener.
    expect(dash).not.toMatch(/window\.location\.(host|hostname|protocol)/);
    expect(dash).toMatch(/NEXT_PUBLIC_BACKEND_WS_URL/);
  });

  it('says the backend is missing instead of showing an empty dashboard', () => {
    const dash = source('src/components/teacher/teacher-dashboard.tsx');
    expect(dash).toMatch(/Live monitoring is not connected/);
  });
});

describe('quiz page', () => {
  it('calls the assessment service through the deployed proxy', () => {
    const quiz = source('src/app/quiz/page.tsx');
    // vercel.json maps /api/agents/* onto the Render service; /api/v1/mvp/* is
    // the undeployed Rust one, and this page was pointing at it.
    expect(quiz).toMatch(/['"`]\/api\/agents\/assessment\/quiz['"`]/);
    expect(quiz).toMatch(/['"`]\/api\/agents\/assessment\/grade['"`]/);
    expect(quiz).not.toMatch(/\/api\/v1\/mvp/);
  });
});

describe('the /api/v1 rewrite', () => {
  it('can be pointed at a deployed service without a code change', () => {
    // The hardcoded `http://localhost:8080` in here is the single reason the
    // tutor, the teacher view and the generators all fail on Vercel while
    // working perfectly on a laptop.
    expect(source('next.config.js')).toMatch(/process\.env\.MVP_BACKEND_URL/);
  });
});

describe('surfaces still waiting on a deployed backend', () => {
  // Tripwire, not a wish: these still call the `/api/v1` prefix that only a
  // local `cargo run` answers, so they fail on Vercel until
  // MVP_BACKEND_URL points the rewrite at a deployed service. If one of these
  // stops matching, this list is stale - remove it and say so in the PR.
  it.each([
    'src/lib/teacher/scheme-v2-client.ts',
    'src/lib/scheme-v2-client.ts',
    'src/components/exam/ExamGeneratorDialog.tsx',
    'src/components/exam/ExamRunner.tsx',
    'src/components/scheme-wizard/steps/preview-step.tsx',
    'src/components/scheme-wizard/lesson-plan-dialog.tsx',
  ])('%s is still wired to /api/v1', (rel) => {
    expect(source(rel)).toMatch(/\/api\/v1/);
  });

  // Deleted on 2026-09-27, not rewired: this 546-line legacy twin of the tutor
  // was the surface `/student/chat/<subject>` rendered, so the subject link on
  // the learner's home page reproduced the original "Connecting forever" bug
  // after the real chat had been fixed. Nothing references it any more.
  it.each([
    'src/app/student/chat/chat-interface.tsx',
    'src/components/quiz/interactive-quiz-modal.tsx',
  ])('%s stays gone', (rel) => {
    expect(existsSync(join(process.cwd(), rel))).toBe(false);
  });

  it('points the subject deep link at the one working tutor', () => {
    const deepLink = source('src/app/student/chat/[subject]/page.tsx');
    expect(deepLink).toMatch(/StudentChatView/);
    expect(deepLink).not.toMatch(/localStorage/);
    // Both URLs must render the same component, or they drift apart again.
    expect(source('src/app/student/chat/page.tsx')).toMatch(/StudentChatView/);
  });
});
