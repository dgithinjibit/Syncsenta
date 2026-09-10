/**
 * Conversation persistence for the Socratic Mentor.
 *
 * Storage: window.localStorage, one key per (studentId, subject) pair.
 * Format: a versioned envelope so future schema changes can migrate or drop
 * stale records without surprising the user.
 *
 * Scope of v1:
 *   - Browser-only (SSR-safe — every accessor checks `typeof window`).
 *   - Capped at MAX_TURNS to keep the localStorage footprint bounded and the
 *     request payload reasonable. Older turns are dropped from the head.
 *   - No multi-device sync. No server-side mirror. Clearing browser storage
 *     wipes history; that's the intended MVP behaviour.
 */

export interface StoredChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface HistoryEnvelope {
  /** Bump when the on-disk shape changes incompatibly. */
  version: 1;
  studentId: string;
  subject: string;
  updatedAt: number;
  messages: StoredChatMessage[];
}

export const HISTORY_VERSION = 1 as const;

/** Hard cap on messages we retain per conversation. */
export const MAX_TURNS = 40;

/** Hard cap on chars per message we persist (defensive). */
const MAX_CONTENT = 4000;

const KEY_PREFIX = "socraticChat.v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function keyFor(studentId: string, subject: string): string {
  // localStorage keys are global per origin; namespacing keeps it predictable.
  return `${KEY_PREFIX}:${encodeURIComponent(studentId)}:${encodeURIComponent(subject)}`;
}

function isValidMessage(m: unknown): m is StoredChatMessage {
  if (typeof m !== "object" || m === null) return false;
  const obj = m as Record<string, unknown>;
  return (
    (obj.role === "user" || obj.role === "assistant") &&
    typeof obj.content === "string" &&
    obj.content.length > 0
  );
}

function isValidEnvelope(value: unknown): value is HistoryEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.version === HISTORY_VERSION &&
    typeof obj.studentId === "string" &&
    typeof obj.subject === "string" &&
    typeof obj.updatedAt === "number" &&
    Array.isArray(obj.messages) &&
    obj.messages.every(isValidMessage)
  );
}

/**
 * Load history for a (studentId, subject). Returns [] when nothing is stored,
 * the envelope is corrupt, or the version doesn't match. We do NOT attempt
 * migration; a clean slate is preferable to silently mis-rendering old data.
 */
export function loadHistory(studentId: string, subject: string): StoredChatMessage[] {
  if (!isBrowser()) return [];
  if (!studentId || !subject) return [];
  try {
    const raw = window.localStorage.getItem(keyFor(studentId, subject));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!isValidEnvelope(parsed)) {
      window.localStorage.removeItem(keyFor(studentId, subject));
      return [];
    }
    return parsed.messages.slice(-MAX_TURNS);
  } catch {
    // Defensive: malformed JSON, quota errors on read, etc. Treat as no data.
    return [];
  }
}

/**
 * Persist history. Truncates to MAX_TURNS and clamps oversized messages
 * before writing. Returns the messages that were actually persisted (post-cap),
 * which is also what callers should treat as the canonical state going forward.
 */
export function saveHistory(
  studentId: string,
  subject: string,
  messages: StoredChatMessage[]
): StoredChatMessage[] {
  if (!isBrowser()) return messages;
  if (!studentId || !subject) return messages;

  const sanitized = messages
    .filter(isValidMessage)
    .map((m) => ({
      role: m.role,
      content: m.content.length > MAX_CONTENT ? m.content.slice(0, MAX_CONTENT) : m.content,
    }))
    .slice(-MAX_TURNS);

  const envelope: HistoryEnvelope = {
    version: HISTORY_VERSION,
    studentId,
    subject,
    updatedAt: Date.now(),
    messages: sanitized,
  };

  try {
    window.localStorage.setItem(keyFor(studentId, subject), JSON.stringify(envelope));
  } catch {
    // Quota exceeded or storage disabled (e.g. private mode). Fail soft; the
    // in-memory state is still valid for this session.
  }
  return sanitized;
}

/** Wipe a single conversation. Idempotent. */
export function clearHistory(studentId: string, subject: string): void {
  if (!isBrowser()) return;
  if (!studentId || !subject) return;
  try {
    window.localStorage.removeItem(keyFor(studentId, subject));
  } catch {
    /* ignore */
  }
}

/**
 * Truncate a message array to MAX_TURNS without touching storage. Useful for
 * the route handler to apply the same cap to inbound history.
 */
export function capHistory<T>(messages: T[], max: number = MAX_TURNS): T[] {
  if (messages.length <= max) return messages;
  return messages.slice(-max);
}
