/**
 * Lightweight observability helper.
 *
 * Sends error payloads to an external webhook defined by
 * `OBSERVABILITY_ENDPOINT` (optional). Falls back to console logging.
 */
type Payload = {
  level: 'error' | 'warning' | 'info';
  message: string;
  detail?: string;
  context?: Record<string, any>;
  timestamp?: string;
};

const ENDPOINT = process.env.OBSERVABILITY_ENDPOINT;

export async function captureException(err: unknown, context?: Record<string, any>) {
  const message = err instanceof Error ? err.message : String(err);
  const detail = err instanceof Error && err.stack ? err.stack : undefined;
  const payload: Payload = {
    level: 'error',
    message,
    detail,
    context: context || {},
    timestamp: new Date().toISOString(),
  };

  // Always log locally
  // eslint-disable-next-line no-console
  console.error('[observability] captureException', payload);

  if (!ENDPOINT) return;
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (postErr) {
    // eslint-disable-next-line no-console
    console.warn('[observability] failed to send payload', postErr);
  }
}

export async function captureMessage(message: string, context?: Record<string, any>) {
  const payload: Payload = {
    level: 'info',
    message,
    context: context || {},
    timestamp: new Date().toISOString(),
  };
  // eslint-disable-next-line no-console
  console.log('[observability] message', payload);
  if (!ENDPOINT) return;
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (postErr) {
    // eslint-disable-next-line no-console
    console.warn('[observability] failed to send message', postErr);
  }
}

export default { captureException, captureMessage };
