/**
 * The refusal transport for `/api/chat`.
 *
 * The tutor's safety boundary has to reach a learner as an *answer*, not as a
 * failed request: the surfaces that read `/api/chat` all use
 * `consumeTutorStream()`, and a JSON `Response.json({ error })` would render as
 * "the tutor could not answer right now" — the same words an outage produces.
 * A child would learn that asking gets an error page, which is the wrong lesson.
 *
 * So a refusal is one delta frame carrying the sentence, then `[DONE]`, with the
 * same headers the answered path sends. It is deliberately not routed through the
 * provider: no prompt is built, no tokens are spent, and nothing about the
 * blocked request reaches a third party.
 */

const encoder = new TextEncoder();

export type RefusalStreamOptions = {
  /** Server-assigned session id, echoed so the next turn continues the same thread. */
  sessionId?: string | null;
  /** Remaining rate-limit allowance, when the caller has already counted this turn. */
  rateLimitRemaining?: number;
  rateLimitLimit?: number;
};

/**
 * A streamed refusal, shaped exactly like an answered turn.
 *
 * `Content-Type: text/event-stream` is not decoration — the client checks
 * `response.ok` and then reads frames, and a body that is not framed is read as
 * an empty answer.
 */
export function refusalEventStream(message: string, options: RefusalStreamOptions = {}): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: message })}\n\n`));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  const headers: Record<string, string> = {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  };
  if (options.sessionId) headers['X-Session-Id'] = options.sessionId;
  if (options.rateLimitRemaining !== undefined) {
    headers['X-RateLimit-Remaining'] = String(options.rateLimitRemaining);
  }
  if (options.rateLimitLimit !== undefined) headers['X-RateLimit-Limit'] = String(options.rateLimitLimit);

  return new Response(stream, { headers });
}
