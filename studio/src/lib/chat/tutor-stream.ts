/**
 * The tutor transport used by every chat surface.
 *
 * `mwalimu-chat.tsx` posted to `/api/v1/mvp/messages`, which `next.config.js`
 * rewrites to `http://localhost:8080` — a Rust process that only exists on a
 * developer laptop. On Vercel that request 404s, so the student tutor has never
 * answered a single message in production, and its WebSocket retried forever
 * behind a "Connecting" badge. The route that does exist is `/api/chat`:
 * Supabase-authenticated, rate-limited, Omega-decision aware, and streaming
 * server-sent events.
 *
 * This module owns the streaming contract so it can be tested without a
 * browser. Splitting a frame across two network chunks is the failure mode it
 * most exists to prevent.
 */

export type TutorHistoryEntry = { role: 'user' | 'assistant'; content: string };

export type TutorTurnRequest = {
  message: string;
  history: TutorHistoryEntry[];
  grade: string;
  subject: string;
  language?: 'english' | 'kiswahili' | 'mixed';
  studentName?: string;
  mode?: 'socratic' | 'compass';
  sessionId?: string;
  competencyCode?: string;
  competencyName?: string;
  hintsUsed?: number;
};

export type TutorStreamResult = {
  /** Everything the model produced, in order. */
  text: string;
  /** Set when the route or the stream reported a failure. */
  error: string | null;
  /** True when the caller cancelled via `signal`. */
  aborted: boolean;
  /** Session id assigned by the route, for continuity across turns. */
  sessionId: string | null;
};

const EMPTY: TutorStreamResult = { text: '', error: null, aborted: false, sessionId: null };

function streamError(detail: string, status: number): string {
  return status ? `${detail} (HTTP ${status})` : detail;
}

/**
 * Read an SSE body, forwarding each `delta` to `onDelta`.
 *
 * Frames are separated by a blank line and may arrive in pieces: a chunk that
 * ends mid-JSON must be buffered, not parsed and not dropped.
 */
export async function consumeTutorStream(
  body: ReadableStream<Uint8Array>,
  onDelta: (delta: string) => void,
): Promise<{ text: string; error: string | null }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let error: string | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep = buffer.indexOf('\n\n');
    while (sep !== -1) {
      const frame = buffer.slice(0, sep).trim();
      buffer = buffer.slice(sep + 2);
      sep = buffer.indexOf('\n\n');

      if (!frame.startsWith('data:')) continue;
      const payload = frame.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;

      let event: { delta?: string; error?: string; detail?: string };
      try {
        event = JSON.parse(payload);
      } catch {
        // A frame we cannot read is not a reason to lose the frames after it.
        continue;
      }
      if (event.error) {
        error = event.detail || event.error;
        reader.cancel();
        break;
      }
      if (!event.delta) continue;
      text += event.delta;
      onDelta(event.delta);
    }
  }

  return { text, error };
}

/**
 * Send one learner turn to `/api/chat` and stream the reply.
 *
 * Never throws for an upstream reason: a tutor that cannot answer has to be
 * distinguishable from one that was never wired up, and the caller needs the
 * text it did get. Network aborts come back as `aborted: true`.
 */
export async function streamTutorTurn(
  request: TutorTurnRequest,
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
): Promise<TutorStreamResult> {
  let response: Response;
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      ...(signal ? { signal } : {}),
    });
  } catch (err) {
    if (signal?.aborted) return { ...EMPTY, aborted: true };
    return { ...EMPTY, error: err instanceof Error ? err.message : 'Connection failed.' };
  }

  const sessionId = response.headers.get('X-Session-Id') || null;

  if (!response.ok || !response.body) {
    let detail = 'The tutor could not answer right now.';
    try {
      const body = await response.json();
      detail = body.detail || body.error || detail;
    } catch {
      // Keep the HTTP-shaped fallback.
    }
    return { ...EMPTY, error: streamError(detail, response.status), sessionId };
  }

  const { text, error } = await consumeTutorStream(response.body, onDelta);
  if (error) return { text, error, aborted: false, sessionId };
  return { text, error: null, aborted: false, sessionId };
}
