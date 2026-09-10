/**
 * MeTTa system environment configuration.
 *
 * Single place to read and validate all env vars the MeTTa subsystem needs.
 * Throws at import time in production if a required server-side var is missing,
 * so deployment fails loudly rather than silently at runtime.
 */

// ---------------------------------------------------------------- helpers ---

function requireServer(name: string): string {
  const val = process.env[name];
  if (!val && process.env.NODE_ENV === 'production') {
    throw new Error(
      `[metta-config] Required server env var "${name}" is not set. ` +
      `Add it to your Vercel project environment variables.`
    );
  }
  return val ?? '';
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

// ----------------------------------------------------------- Supabase -------

/**
 * Public (browser-safe) Supabase URL.
 * Used by client-side MeTTaSession.persist() / restore() via fetch to /api/metta/*.
 * The API routes themselves use the server client with SUPABASE_SERVICE_ROLE_KEY.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Server-only service role key.
 * Only referenced in server components and API routes — never sent to the browser.
 * requireServer() throws at production startup if this is missing.
 */
export const SUPABASE_SERVICE_ROLE_KEY =
  typeof window === 'undefined'
    ? requireServer('SUPABASE_SERVICE_ROLE_KEY')
    : ''; // browser context: never needed, never exposed

// ----------------------------------------------------------- LLM / AI -------

/** Primary LLM provider for the chat API. Defaults to groq. */
export const LLM_PROVIDER = optional('LLM_PROVIDER', 'groq');

/** Groq API key — server-only. */
export const GROQ_API_KEY =
  typeof window === 'undefined' ? optional('GROQ_API_KEY') : '';

/** Groq model to use. */
export const GROQ_MODEL = optional('GROQ_MODEL', 'llama-3.3-70b-versatile');

/** Gemini API key — server-only. */
export const GEMINI_API_KEY =
  typeof window === 'undefined' ? optional('GEMINI_API_KEY') : '';

export const GEMINI_MODEL = optional('GEMINI_MODEL', 'gemini-3.6-flash');

// ----------------------------------------------------------- AI Agents ------

/**
 * URL of the Python AI-agents FastAPI backend (Render deployment).
 * Public — safe to expose.  Used in lesson-plan proxy route.
 */
export const AI_AGENTS_URL = optional(
  'NEXT_PUBLIC_AI_AGENTS_URL',
  'https://ascendra-1.onrender.com'
);

// ----------------------------------------------------------- Feature flags --

/** Disable auth wall for demo/prototype mode. */
export const AUTH_WALL_ENABLED =
  process.env.AUTH_WALL_ENABLED === 'true';

/** Allow unauthenticated chat during local development. */
export const ALLOW_DEV_CHAT =
  process.env.NODE_ENV !== 'production' &&
  process.env.SYNCSENTA_ALLOW_DEV_CHAT === 'true';

// ----------------------------------------------------------- MeTTa-specific -

/**
 * How many session facts to keep per MeTTa session before truncation.
 * Prevents unbounded growth of the in-memory atomspace.
 */
export const METTA_MAX_SESSION_FACTS = parseInt(
  optional('METTA_MAX_SESSION_FACTS', '500'),
  10
);

/**
 * Timeout in ms for a single processInteraction() call.
 * The TypeScript interpreter is synchronous, so this only applies to
 * async wrappers that call external services.
 */
export const METTA_INTERACTION_TIMEOUT_MS = parseInt(
  optional('METTA_INTERACTION_TIMEOUT_MS', '5000'),
  10
);

/**
 * Whether to run the MeTTa interaction on the server via /api/metta/interact
 * (persisted) or locally in the browser (ephemeral).
 * Set METTA_REMOTE_INTERACTIONS=false to force client-side only (useful in dev).
 */
export const METTA_REMOTE_INTERACTIONS =
  optional('METTA_REMOTE_INTERACTIONS', 'true') !== 'false';

// -------------------------------------------------------- validation check --

/**
 * Call this once at app boot (server side) to assert all required vars exist.
 * Returns a list of missing variable names, or an empty array if all good.
 */
export function validateMeTTaConfig(): string[] {
  const missing: string[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
    missing.push('GROQ_API_KEY (or GEMINI_API_KEY)');
  }

  return missing;
}
