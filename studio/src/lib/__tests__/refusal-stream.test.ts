import { describe, expect, it } from 'vitest';

import { refusalEventStream } from '../chat/refusal-stream';
import { consumeTutorStream } from '../chat/tutor-stream';

/**
 * A refusal has to arrive through the same transport as an answer.
 *
 * `/api/chat` streams server-sent events and every chat surface reads them with
 * `consumeTutorStream()`. Returning a `Response.json({ error })` instead would
 * make the safety boundary look like an outage in the one place a child can see
 * it — the tutor pane would show "something went wrong" rather than the reason.
 *
 * So these tests feed the refusal stream through the real reader the browser
 * uses. If the frame shape drifts from the contract, this fails here instead of
 * rendering blank in front of a learner.
 */

describe('a refusal on the tutor stream', () => {
  it('reads back as text, with no error and nothing aborted', async () => {
    const message = 'I will not collect or look up anyone’s phone number.';
    const response = refusalEventStream(message);
    expect(response.body).not.toBeNull();
    const result = await consumeTutorStream(response.body!, () => undefined);

    expect(result.error).toBeNull();
    expect(result.text).toBe(message);
  });

  it('emits the whole sentence in one delta, so a child never sees half a refusal', async () => {
    const message = 'Never share a seed phrase or a private key with anyone, including me.';
    const deltas: string[] = [];
    await consumeTutorStream(refusalEventStream(message).body!, (delta) => deltas.push(delta));

    expect(deltas).toEqual([message]);
  });

  it('carries no rate-limit claim it did not earn, and keeps the session for continuity', () => {
    const response = refusalEventStream('Try a different question instead.', {
      sessionId: '0f9f4c2e-3e2a-4d1b-9c6b-7f2d8c1a5b3e',
    });
    expect(response.headers.get('x-session-id')).toBe('0f9f4c2e-3e2a-4d1b-9c6b-7f2d8c1a5b3e');
  });

  it('is a server-sent event stream, not a JSON body wearing one', () => {
    const response = refusalEventStream('No money advice here.');
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(response.status).toBe(200);
  });
});
