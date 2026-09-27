import { describe, it, expect, vi, afterEach } from 'vitest';
import { consumeTutorStream, streamTutorTurn, type TutorTurnRequest } from '@/lib/chat/tutor-stream';

/**
 * These tests exist because the student tutor has never worked in production.
 * `mwalimu-chat.tsx` called `/api/v1/mvp/messages`, which `next.config.js`
 * rewrites to `http://localhost:8080` — a Rust server that is not deployed
 * anywhere. The browser saw 404, the badge said "Connecting" forever, and no
 * learner ever got an answer. `/api/chat` is the route that exists, so the
 * transport below is the one the chat surfaces have to share.
 */

const REQUEST: TutorTurnRequest = {
  message: 'How do I compare 3/4 and 2/3?',
  history: [],
  grade: 'Grade 5',
  subject: 'Mathematics',
};

function sseBody(frames: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const frame of frames) controller.enqueue(encoder.encode(frame));
      controller.close();
    },
  });
}

function delta(text: string): string {
  return `data: ${JSON.stringify({ delta: text })}\n\n`;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('consumeTutorStream', () => {
  it('returns the model output in order', async () => {
    const seen: string[] = [];
    const { text, error } = await consumeTutorStream(
      sseBody([delta('Fractions are '), delta('parts of a '), delta('whole.')]),
      (d) => seen.push(d),
    );

    expect(text).toBe('Fractions are parts of a whole.');
    expect(seen).toEqual(['Fractions are ', 'parts of a ', 'whole.']);
    expect(error).toBeNull();
  });

  it('reassembles a frame split across two network chunks', async () => {
    // The failure this guards is silent and total: a chunk boundary landing
    // mid-JSON makes a naive parser drop the token, and the learner sees a
    // half sentence.
    const payload = JSON.stringify({ delta: 'twenty-seven' });
    const frame = `data: ${payload}\n\n`;
    const half = Math.floor(frame.length / 2);

    const { text, error } = await consumeTutorStream(
      sseBody([frame.slice(0, half), frame.slice(half)]),
      () => {},
    );

    expect(text).toBe('twenty-seven');
    expect(error).toBeNull();
  });

  it('ignores [DONE], blank frames and comments without treating them as answers', async () => {
    const { text, error } = await consumeTutorStream(
      sseBody([': keep-alive\n\n', delta('Yes'), 'data: [DONE]\n\n', '\n\n']),
      () => {},
    );

    expect(text).toBe('Yes');
    expect(error).toBeNull();
  });

  it('reports the route error and stops consuming', async () => {
    const { text, error } = await consumeTutorStream(
      sseBody([
        delta('So fa'),
        `data: ${JSON.stringify({ error: 'Upstream model error', detail: 'model_not_found' })}\n\n`,
        delta('rther'),
      ]),
      () => {},
    );

    expect(error).toBe('model_not_found');
    // Whatever already streamed stays visible; a tutor that dies mid-sentence
    // should not erase what the learner is already reading.
    expect(text).toBe('So fa');
  });

  it('survives one malformed frame instead of losing the rest of the answer', async () => {
    const { text, error } = await consumeTutorStream(
      sseBody(['data: {not json\n\n', delta('still here')]),
      () => {},
    );

    expect(text).toBe('still here');
    expect(error).toBeNull();
  });
});

describe('streamTutorTurn', () => {
  it('posts to /api/chat, not to the undeployed /api/v1 backend', async () => {
    const calls: { url: string; body: string }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) });
      return new Response(sseBody([delta('ok'), 'data: [DONE]\n\n']), {
        status: 200,
        headers: { 'content-type': 'text/event-stream', 'X-Session-Id': 'sess-1' },
      });
    }));

    const result = await streamTutorTurn(REQUEST, () => {});

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('/api/chat');
    expect(JSON.parse(calls[0].body)).toMatchObject({ grade: 'Grade 5', subject: 'Mathematics' });
    expect(result.sessionId).toBe('sess-1');
    expect(result.text).toBe('ok');
  });

  it('turns a 401 into a readable sign-in failure rather than a spinner', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ error: 'Unauthorized', detail: 'Please sign in to continue' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })));

    const result = await streamTutorTurn(REQUEST, () => {});

    expect(result.error).toContain('Please sign in to continue');
    expect(result.error).toContain('401');
    expect(result.text).toBe('');
  });

  it('reports a connection failure without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));

    await expect(streamTutorTurn(REQUEST, () => {})).resolves.toMatchObject({
      error: 'Failed to fetch',
      aborted: false,
    });
  });

  it('marks an aborted turn as aborted, not as an error', async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw Object.assign(new Error('The user aborted a request.'), { name: 'AbortError' });
    }));

    const result = await streamTutorTurn(REQUEST, () => {}, controller.signal);

    expect(result.aborted).toBe(true);
    expect(result.error).toBeNull();
  });
});
