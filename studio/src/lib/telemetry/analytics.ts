/**
 * Simple Analytics System (FREE)
 * Uses localStorage for basic event tracking
 *
 * SECURITY: NoSQL Injection Protection
 * - Validates all user IDs and session IDs
 * - Sanitizes event names and properties
 * - Uses strict type checking
 * - Prevents query manipulation
 */

import React from 'react';

interface Event {
  name: string;
  properties?: Record<string, any>;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

/**
 * Validate UUID v4 format
 * SECURITY: Ensures IDs match expected format to prevent injection
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate a generic identifier (user, teacher, student, etc.)
 *
 * The earlier hardening only accepted UUID v4 here, which silently dropped
 * every userId the app actually emits — Supabase profile IDs come through
 * as strings like `user1`, teacher dashboards use `teacher_${random}`, and
 * a few legacy chat call sites pass `teacher_001`. Strict UUID validation
 * meant `trackEvent('lesson_completed', {...}, 'user1')` quietly stored a
 * null userId, and `getEventsByUser('user1')` always returned [].
 *
 * Identifiers are not interpolated into queries (storage is JSON in
 * localStorage), so the real risk is only oversized / control-char input.
 * Allow alnum, dash, underscore, and dot; cap length.
 */
function isValidIdentifier(id: string): boolean {
  if (typeof id !== 'string') return false;
  if (id.length === 0 || id.length > 128) return false;
  return /^[a-zA-Z0-9._-]+$/.test(id);
}

/**
 * Sanitize event name
 * SECURITY: Removes special characters that could be used for injection
 */
function sanitizeEventName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Invalid event name');
  }
  
  // Allow only alphanumeric, underscore, hyphen, and space
  return name.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().substring(0, 100);
}

/**
 * Sanitize properties object
 * SECURITY: Recursively sanitizes all property values
 */
function sanitizeProperties(properties: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(properties)) {
    // Sanitize key
    const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 50);
    
    if (!sanitizedKey) continue;
    
    // Sanitize value based on type
    if (typeof value === 'string') {
      sanitized[sanitizedKey] = value.substring(0, 500); // Limit string length
    } else if (typeof value === 'number') {
      sanitized[sanitizedKey] = isFinite(value) ? value : 0;
    } else if (typeof value === 'boolean') {
      sanitized[sanitizedKey] = value;
    } else if (value === null) {
      sanitized[sanitizedKey] = null;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // Recursively sanitize nested objects (max 1 level deep)
      sanitized[sanitizedKey] = sanitizeProperties(value);
    }
    // Skip arrays, functions, and other types
  }
  
  return sanitized;
}

interface AnalyticsSummary {
  totalEvents: number;
  eventCounts: Record<string, number>;
  recentEvents: Event[];
  uniqueUsers: number;
  sessionsCount: number;
}

const STORAGE_KEY = 'analytics';
const MAX_EVENTS = 1000;
const SESSION_KEY = 'analytics_session';

/**
 * Get or create session ID
 * SECURITY: Validates existing session ID before use
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  
  // SECURITY: Validate existing session ID
  if (sessionId && !isValidUUID(sessionId)) {
    console.warn('Invalid session ID detected, generating new one');
    sessionId = null;
  }
  
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  
  return sessionId;
}

/**
 * Track an event
 * SECURITY: Validates and sanitizes all inputs before storage
 */
export function trackEvent(
  name: string,
  properties?: Record<string, any>,
  userId?: string
): void {
  if (typeof window === 'undefined') return;

  try {
    // SECURITY: Sanitize event name
    const sanitizedName = sanitizeEventName(name);
    
    // SECURITY: Validate userId if provided. See isValidIdentifier — we
    // accept the non-UUID id shapes the app actually uses (`user1`,
    // `teacher_${random}`, etc.) instead of dropping them silently.
    if (userId && !isValidIdentifier(userId)) {
      console.warn('Invalid userId provided to trackEvent');
      userId = undefined;
    }
    
    // SECURITY: Sanitize properties
    const sanitizedProperties = properties ? sanitizeProperties(properties) : undefined;

    const event: Event = {
      name: sanitizedName,
      properties: sanitizedProperties,
      timestamp: new Date().toISOString(),
      userId,
      sessionId: getSessionId(),
    };

    // Store locally
    const events = getStoredEvents();
    events.push(event);
    
    // Keep last MAX_EVENTS events
    if (events.length > MAX_EVENTS) {
      events.shift();
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Event:', sanitizedName, sanitizedProperties);
    }
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}

/**
 * Get stored events
 */
function getStoredEvents(): Event[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to parse analytics:', error);
    return [];
  }
}

/**
 * Get analytics summary
 * SECURITY: Can optionally filter by current user for authorization
 */
export function getAnalytics(currentUserId?: string): AnalyticsSummary {
  let events = getStoredEvents();
  
  // SECURITY: If userId provided, only return events for that user
  if (currentUserId) {
    events = events.filter(e => !e.userId || e.userId === currentUserId);
  }
  
  // Group by event name
  const eventCounts = events.reduce((acc: Record<string, number>, event: Event) => {
    acc[event.name] = (acc[event.name] || 0) + 1;
    return acc;
  }, {});

  // Count unique users
  const uniqueUsers = new Set(
    events.filter(e => e.userId).map(e => e.userId)
  ).size;

  // Count unique sessions
  const sessionsCount = new Set(
    events.map(e => e.sessionId)
  ).size;

  return {
    totalEvents: events.length,
    eventCounts,
    recentEvents: events.slice(-10),
    uniqueUsers,
    sessionsCount,
  };
}

/**
 * Get events by name
 * SECURITY: Sanitizes input to prevent injection
 */
export function getEventsByName(name: string): Event[] {
  try {
    const sanitizedName = sanitizeEventName(name);
    const events = getStoredEvents();
    // SECURITY: Use strict equality check
    return events.filter(e => e.name === sanitizedName);
  } catch (error) {
    console.error('Failed to get events by name:', error);
    return [];
  }
}

/**
 * Get events by user
 * SECURITY: Validates userId format and authorization before querying
 */
export function getEventsByUser(userId: string, currentUserId?: string): Event[] {
  // SECURITY: Validate userId format (see isValidIdentifier for shape rules)
  if (!isValidIdentifier(userId)) {
    console.warn('Invalid userId provided to getEventsByUser');
    return [];
  }
  
  // SECURITY: Authorization check - users can only access their own events
  if (currentUserId && userId !== currentUserId) {
    console.warn('Authorization failed: User attempting to access another user\'s events');
    return [];
  }
  
  const events = getStoredEvents();
  // SECURITY: Use strict equality check
  return events.filter(e => e.userId === userId);
}

/**
 * Get events in date range
 * SECURITY: Validates date inputs and authorization
 */
export function getEventsByDateRange(
  startDate: Date,
  endDate: Date,
  currentUserId?: string
): Event[] {
  // SECURITY: Validate date inputs
  if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
    console.warn('Invalid date parameters provided');
    return [];
  }
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.warn('Invalid date values provided');
    return [];
  }
  
  if (startDate > endDate) {
    console.warn('Start date is after end date');
    return [];
  }
  
  let events = getStoredEvents();
  
  // SECURITY: Filter by current user if provided
  if (currentUserId) {
    events = events.filter(e => !e.userId || e.userId === currentUserId);
  }
  
  return events.filter(e => {
    try {
      const eventDate = new Date(e.timestamp);
      return eventDate >= startDate && eventDate <= endDate;
    } catch (error) {
      return false;
    }
  });
}

/**
 * Clear all analytics data
 */
export function clearAnalytics(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  console.log('🗑️ Analytics cleared');
}

/**
 * Export analytics data
 */
export function exportAnalytics(): string {
  const events = getStoredEvents();
  return JSON.stringify(events, null, 2);
}

/**
 * Common event tracking helpers
 */
export const Analytics = {
  // Page views
  pageView: (page: string, userId?: string) => {
    trackEvent('page_view', { page }, userId);
  },

  // User actions
  buttonClick: (buttonName: string, userId?: string) => {
    trackEvent('button_click', { buttonName }, userId);
  },

  // Learning events
  lessonStarted: (subject: string, grade: string, userId?: string) => {
    trackEvent('lesson_started', { subject, grade }, userId);
  },

  lessonCompleted: (subject: string, grade: string, duration: number, userId?: string) => {
    trackEvent('lesson_completed', { subject, grade, duration }, userId);
  },

  quizStarted: (subject: string, grade: string, userId?: string) => {
    trackEvent('quiz_started', { subject, grade }, userId);
  },

  quizCompleted: (subject: string, grade: string, score: number, userId?: string) => {
    trackEvent('quiz_completed', { subject, grade, score }, userId);
  },

  // AI interactions
  aiQuestionAsked: (subject: string, userId?: string) => {
    trackEvent('ai_question_asked', { subject }, userId);
  },

  aiResponseReceived: (subject: string, responseTime: number, userId?: string) => {
    trackEvent('ai_response_received', { subject, responseTime }, userId);
  },

  // Errors
  error: (errorType: string, errorMessage: string, userId?: string) => {
    trackEvent('error', { errorType, errorMessage }, userId);
  },

  // Feature usage
  featureUsed: (featureName: string, userId?: string) => {
    trackEvent('feature_used', { featureName }, userId);
  },
};

/**
 * React hook for analytics
 * SECURITY: Optionally filters by current user
 */
export function useAnalytics(currentUserId?: string) {
  const [summary, setSummary] = React.useState<AnalyticsSummary | null>(null);

  React.useEffect(() => {
    setSummary(getAnalytics(currentUserId));
  }, [currentUserId]);

  const refresh = () => {
    setSummary(getAnalytics(currentUserId));
  };

  return {
    summary,
    refresh,
    track: trackEvent,
    Analytics,
    getEventsByUser: (userId: string) => getEventsByUser(userId, currentUserId),
    getEventsByDateRange: (start: Date, end: Date) => getEventsByDateRange(start, end, currentUserId),
  };
}

// Made with Bob
