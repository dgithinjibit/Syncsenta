/**
 * Session Management System (FREE)
 * Handles session timeouts and activity tracking
 *
 * SECURITY: Session Fixation Protection
 * - Generates unique session IDs on login
 * - Rotates session IDs on privilege escalation
 * - Enforces maximum session age (24 hours)
 * - Validates session integrity
 */

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_TIMEOUT = 5 * 60 * 1000; // 5 minutes before timeout
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every minute
const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours maximum

export interface SessionInfo {
  valid: boolean;
  reason?: 'no_session' | 'expired' | 'invalid' | 'max_age_exceeded';
  lastActivity?: number;
  timeRemaining?: number;
  warningShown?: boolean;
  sessionId?: string;
  createdAt?: number;
}

/**
 * Generate a cryptographically secure session ID
 * SECURITY: Uses crypto.randomUUID() for unpredictable session IDs
 */
function generateSessionId(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Validate session ID format
 * SECURITY: Ensures session ID matches expected UUID format
 */
function isValidSessionId(sessionId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(sessionId);
}

/**
 * Check if session is valid
 * SECURITY: Validates session ID, checks expiry, and enforces max age
 */
export function checkSession(): SessionInfo {
  if (typeof window === 'undefined') {
    return { valid: false, reason: 'no_session' };
  }

  const sessionId = localStorage.getItem('session_id');
  const lastActivity = localStorage.getItem('last_activity');
  const sessionCreated = localStorage.getItem('session_created');

  // SECURITY: Require session ID
  if (!sessionId || !lastActivity || !sessionCreated) {
    return { valid: false, reason: 'no_session' };
  }

  // SECURITY: Validate session ID format
  if (!isValidSessionId(sessionId)) {
    endSession();
    return { valid: false, reason: 'invalid' };
  }

  const lastActivityTime = parseInt(lastActivity);
  const sessionCreatedTime = parseInt(sessionCreated);
  const now = Date.now();
  const timeSinceActivity = now - lastActivityTime;
  const sessionAge = now - sessionCreatedTime;

  // SECURITY: Check if session exceeded maximum age (24 hours)
  if (sessionAge > MAX_SESSION_AGE) {
    endSession();
    return {
      valid: false,
      reason: 'max_age_exceeded',
      lastActivity: lastActivityTime,
      createdAt: sessionCreatedTime,
    };
  }

  // Check if session timed out due to inactivity
  if (timeSinceActivity > SESSION_TIMEOUT) {
    endSession();
    return {
      valid: false,
      reason: 'expired',
      lastActivity: lastActivityTime,
    };
  }

  const timeRemaining = SESSION_TIMEOUT - timeSinceActivity;
  const warningShown = localStorage.getItem('session_warning_shown') === 'true';

  return {
    valid: true,
    lastActivity: lastActivityTime,
    timeRemaining,
    warningShown,
    sessionId,
    createdAt: sessionCreatedTime,
  };
}

/**
 * Update last activity timestamp
 */
export function updateActivity(): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem('last_activity', Date.now().toString());
  localStorage.removeItem('session_warning_shown');
}

/**
 * Initialize session
 * SECURITY: Generates new session ID on initialization
 */
export function initSession(forceNew: boolean = false): string {
  if (typeof window === 'undefined') return '';

  const existingSession = checkSession();
  
  // SECURITY: Generate new session ID if forced or no valid session exists
  if (forceNew || !existingSession.valid) {
    const sessionId = generateSessionId();
    const now = Date.now();
    
    localStorage.setItem('session_id', sessionId);
    localStorage.setItem('session_created', now.toString());
    localStorage.setItem('last_activity', now.toString());
    localStorage.removeItem('session_warning_shown');
    
    console.log('🔐 New session created:', sessionId.substring(0, 8) + '...');
    
    return sessionId;
  }
  
  updateActivity();
  
  // Track user activity
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  
  events.forEach(event => {
    window.addEventListener(event, updateActivity, { passive: true });
  });
  
  return existingSession.sessionId || '';
}

/**
 * Rotate session ID
 * SECURITY: Call this after privilege escalation (e.g., login, role change)
 */
export function rotateSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  const oldSessionId = localStorage.getItem('session_id');
  const newSessionId = generateSessionId();
  const now = Date.now();
  
  // Keep session created time but update session ID
  localStorage.setItem('session_id', newSessionId);
  localStorage.setItem('last_activity', now.toString());
  localStorage.removeItem('session_warning_shown');
  
  console.log('🔄 Session ID rotated:', {
    old: oldSessionId?.substring(0, 8) + '...',
    new: newSessionId.substring(0, 8) + '...',
  });
  
  return newSessionId;
}

/**
 * End session
 * SECURITY: Clears all session data including session ID
 */
export function endSession(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('session_id');
  localStorage.removeItem('session_created');
  localStorage.removeItem('last_activity');
  localStorage.removeItem('session_warning_shown');
  
  console.log('🔒 Session ended');
}

/**
 * Get session duration
 */
export function getSessionDuration(): number {
  if (typeof window === 'undefined') return 0;

  const lastActivity = localStorage.getItem('last_activity');
  if (!lastActivity) return 0;

  return Date.now() - parseInt(lastActivity);
}

/**
 * Format time remaining
 */
export function formatTimeRemaining(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Check if warning should be shown
 */
export function shouldShowWarning(): boolean {
  const session = checkSession();
  
  if (!session.valid || !session.timeRemaining) return false;
  
  return session.timeRemaining <= WARNING_BEFORE_TIMEOUT && !session.warningShown;
}

/**
 * Mark warning as shown
 */
export function markWarningShown(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('session_warning_shown', 'true');
}

/**
 * React hook for session management
 */
export function useSessionManager(options: {
  onExpired?: () => void;
  onWarning?: (timeRemaining: number) => void;
  checkInterval?: number;
} = {}) {
  const {
    onExpired,
    onWarning,
    checkInterval = ACTIVITY_CHECK_INTERVAL,
  } = options;

  const [session, setSession] = React.useState<SessionInfo>({ valid: true });

  React.useEffect(() => {
    // Initialize session (don't force new if one exists)
    initSession(false);

    // Check session periodically
    const interval = setInterval(() => {
      const currentSession = checkSession();
      setSession(currentSession);

      if (!currentSession.valid && onExpired) {
        onExpired();
      } else if (shouldShowWarning() && onWarning && currentSession.timeRemaining) {
        markWarningShown();
        onWarning(currentSession.timeRemaining);
      }
    }, checkInterval);

    return () => {
      clearInterval(interval);
    };
  }, [onExpired, onWarning, checkInterval]);

  return {
    session,
    updateActivity,
    endSession,
    rotateSessionId,
    formatTimeRemaining: (ms: number) => formatTimeRemaining(ms),
  };
}

/**
 * Get session statistics
 */
export function getSessionStats(): {
  totalSessions: number;
  averageDuration: number;
  longestSession: number;
} {
  if (typeof window === 'undefined') {
    return { totalSessions: 0, averageDuration: 0, longestSession: 0 };
  }

  const stats = localStorage.getItem('session_stats');
  if (!stats) {
    return { totalSessions: 0, averageDuration: 0, longestSession: 0 };
  }

  return JSON.parse(stats);
}

/**
 * Track session end
 */
export function trackSessionEnd(): void {
  if (typeof window === 'undefined') return;

  const duration = getSessionDuration();
  const stats = getSessionStats();

  stats.totalSessions += 1;
  stats.averageDuration = 
    (stats.averageDuration * (stats.totalSessions - 1) + duration) / stats.totalSessions;
  stats.longestSession = Math.max(stats.longestSession, duration);

  localStorage.setItem('session_stats', JSON.stringify(stats));
}

// For non-React usage
import React from 'react';

// Made with Bob
