/**
 * API Configuration
 * 
 * Centralized configuration for backend API endpoints.
 * This ensures consistent error handling and prevents localhost fallbacks in production.
 */

/**
 * Get the AI Agents backend URL
 *
 * In production, this MUST be set via NEXT_PUBLIC_AI_AGENTS_URL environment variable.
 * In development, falls back to localhost.
 *
 * Returns null if not configured (instead of throwing) to prevent build/render failures.
 */
export function getApiUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_AI_AGENTS_URL;
  
  // In production, return null if not configured (don't throw during module load)
  if (process.env.NODE_ENV === 'production' && !url) {
    console.error(
      'NEXT_PUBLIC_AI_AGENTS_URL environment variable is not set. ' +
      'Backend API calls will fail. Please configure in deployment settings.'
    );
    return null;
  }
  
  // In development, allow localhost fallback
  return url || 'http://localhost:8001';
}

/**
 * Get WebSocket URL for real-time features
 * Converts HTTP(S) URL to WS(S) URL
 * Returns null if backend is not configured
 */
export function getWebSocketUrl(): string | null {
  const httpUrl = getApiUrl();
  if (!httpUrl) return null;
  return httpUrl.replace(/^http/, 'ws');
}

/**
 * Check if backend is configured
 */
export function isBackendConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_AI_AGENTS_URL;
}

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  // Agent endpoints
  AGENTS_CHAT: '/agents/chat',

  // Lesson Architect endpoints (scheme/lesson-plan/exam generation + storage)
  LESSON_ARCHITECT_GENERATE_SCHEME: '/lesson-architect/generate-scheme',
  LESSON_ARCHITECT_GENERATE_LESSON_PLAN: '/lesson-architect/generate-lesson-plan',
  LESSON_ARCHITECT_GENERATE_WORKSHEET: '/lesson-architect/generate-worksheet',
  LESSON_ARCHITECT_GENERATE_TEXT_LEVELER: '/lesson-architect/generate-text-leveler',
  LESSON_ARCHITECT_UNPACK_OUTCOME: '/lesson-architect/unpack-outcome',
  LESSON_ARCHITECT_GENERATE_DIFFERENTIATION: '/lesson-architect/generate-differentiation',
  LESSON_ARCHITECT_GENERATE_EXAM: '/lesson-architect/generate-exam',
  LESSON_ARCHITECT_SCHEMES: '/lesson-architect/schemes',


  // Dashboard endpoints
  DASHBOARD_AGENTS_STATS: '/dashboard/agents/stats',
  DASHBOARD_STUDENTS_ACTIVE: '/dashboard/students/active',
  DASHBOARD_STUDENTS_PROGRESS: (studentId: string) => `/dashboard/students/${studentId}/progress`,
  DASHBOARD_STUDENTS_MISCONCEPTIONS: (studentId: string) => `/dashboard/students/${studentId}/misconceptions`,
  DASHBOARD_STUDENTS_INTERVENTIONS: (studentId: string) => `/dashboard/students/${studentId}/interventions`,
  DASHBOARD_STUDENTS_TIMELINE: (studentId: string) => `/dashboard/students/${studentId}/timeline`,
  DASHBOARD_COMPETENCIES_SUMMARY: '/dashboard/competencies/summary',
  DASHBOARD_COMPETENCIES_TRENDS: (competency: string) => `/dashboard/competencies/${competency}/trends`,
  DASHBOARD_INTERVENTIONS: '/dashboard/interventions',
  DASHBOARD_ALERTS: '/dashboard/alerts',
  DASHBOARD_WS_TEACHER: '/dashboard/ws/teacher',
  
  // Telemetry endpoints
  TELEMETRY_CAPTURE: '/telemetry/capture',
} as const;

/**
 * Build full API URL
 * Throws error if backend is not configured (at call time, not module load time)
 */
export function buildApiUrl(endpoint: string): string {
  const baseUrl = getApiUrl();
  
  if (!baseUrl) {
    throw new Error(
      'Backend API is not configured. Set NEXT_PUBLIC_AI_AGENTS_URL environment variable.'
    );
  }
  
  return `${baseUrl}${endpoint}`;
}

export function getAiAgentsServiceHeaders(
  additionalHeaders: Record<string, string> = {},
): Record<string, string> {
  const apiKey = process.env.SYNCSENTA_AI_AGENTS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'SYNCSENTA_AI_AGENTS_API_KEY is not configured for the Studio server.',
    );
  }
  return {
    ...additionalHeaders,
    Authorization: `Bearer ${apiKey}`,
  };
}

/**
 * Build WebSocket URL
 * Throws error if backend is not configured (at call time, not module load time)
 */
export function buildWebSocketUrl(endpoint: string): string {
  const baseUrl = getWebSocketUrl();
  
  if (!baseUrl) {
    throw new Error(
      'Backend API is not configured. Set NEXT_PUBLIC_AI_AGENTS_URL environment variable.'
    );
  }
  
  return `${baseUrl}${endpoint}`;
}

// Made with Bob
