/**
 * Cross-Device Session Persistence with Upstash Redis
 * 
 * Enables seamless learning continuity across devices - phone to desktop,
 * tablet to laptop. Student progress, activity state, and context preserved.
 */

import { Redis } from '@upstash/redis';

// Reuse Redis client from rate limiting infrastructure
let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redis) return redis;
  
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!url || !token) {
    console.warn('Upstash Redis not configured. Session persistence disabled.');
    return null;
  }
  
  redis = new Redis({ url, token });
  return redis;
}

// Session data structure
export interface LearningSession {
  userId: string;
  deviceId: string;
  grade: string;
  currentActivity?: {
    id: string;
    name: string;
    subject: string;
    progress: number; // 0-100
    timeSpent: number; // seconds
    startedAt: string; // ISO timestamp
    data?: any; // activity-specific state
  };
  recentActivities: Array<{
    id: string;
    name: string;
    subject: string;
    completedAt: string;
    score?: number;
    timeSpent: number;
  }>;
  achievements: Array<{
    id: string;
    name: string;
    unlockedAt: string;
    type: 'milestone' | 'streak' | 'mastery' | 'exploration';
  }>;
  competencyProgress: Record<string, {
    level: number; // 0-4 (beginner to mastery)
    lastUpdated: string;
    evidence: string[]; // activity IDs that contributed
  }>;
  preferences: {
    language: 'english' | 'kiswahili' | 'mixed';
    difficultyLevel: number; // 1-5
    learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
    /** Last Omega scaffolding decision written by /api/chat (fire-and-forget). */
    scaffoldingLevel?: 'Independent' | 'Guided' | 'Intensive';
  };
  metadata: {
    lastSync: string;
    lastDevice: string;
    sessionCount: number;
    totalTimeSpent: number; // seconds
  };
}

const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const SYNC_DEBOUNCE_MS = 2000; // Debounce frequent updates

// In-memory cache to reduce Redis calls
const sessionCache = new Map<string, { data: LearningSession; lastFetch: number }>();
const CACHE_TTL_MS = 30000; // 30 seconds

/**
 * Get learning session for a user across all devices
 */
export async function getLearningSession(userId: string): Promise<LearningSession | null> {
  const client = getRedisClient();
  if (!client) return null;
  
  // Check cache first
  const cached = sessionCache.get(userId);
  if (cached && Date.now() - cached.lastFetch < CACHE_TTL_MS) {
    return cached.data;
  }
  
  try {
    const key = `learning_session:${userId}`;
    const data = await client.get(key);
    
    if (!data) return null;
    
    const session = data as LearningSession;
    sessionCache.set(userId, { data: session, lastFetch: Date.now() });
    
    return session;
  } catch (error) {
    console.error('Failed to get learning session:', error);
    return null;
  }
}

/**
 * Update learning session with new data
 */
export async function updateLearningSession(
  userId: string, 
  updates: Partial<LearningSession>,
  deviceId?: string
): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  
  try {
    const key = `learning_session:${userId}`;
    
    // Get current session or create new one
    let session = await getLearningSession(userId);
    if (!session) {
      session = createInitialSession(userId, deviceId || 'unknown');
    }
    
    // Apply updates
    const updatedSession: LearningSession = {
      ...session,
      ...updates,
      metadata: {
        ...session.metadata,
        ...updates.metadata,
        lastSync: new Date().toISOString(),
        lastDevice: deviceId || session.metadata.lastDevice,
      }
    };
    
    // Update cache and Redis
    sessionCache.set(userId, { data: updatedSession, lastFetch: Date.now() });
    await client.setex(key, SESSION_TTL, updatedSession);
    
    return true;
  } catch (error) {
    console.error('Failed to update learning session:', error);
    return false;
  }
}

/**
 * Record activity progress for cross-device sync
 */
export async function syncActivityProgress(
  userId: string,
  activityId: string,
  progress: {
    name: string;
    subject: string;
    progressPercent: number;
    timeSpent: number;
    isCompleted: boolean;
    score?: number;
    data?: any;
  },
  deviceId: string
): Promise<boolean> {
  const session = await getLearningSession(userId);
  if (!session) return false;
  
  const updates: Partial<LearningSession> = {
    currentActivity: progress.isCompleted ? undefined : {
      id: activityId,
      name: progress.name,
      subject: progress.subject,
      progress: progress.progressPercent,
      timeSpent: progress.timeSpent,
      startedAt: session.currentActivity?.startedAt || new Date().toISOString(),
      data: progress.data,
    },
    metadata: {
      ...session.metadata,
      sessionCount: session.metadata.sessionCount + (session.currentActivity ? 0 : 1),
      totalTimeSpent: session.metadata.totalTimeSpent + progress.timeSpent,
    }
  };
  
  // If completed, move to recent activities
  if (progress.isCompleted) {
    const completedActivity = {
      id: activityId,
      name: progress.name,
      subject: progress.subject,
      completedAt: new Date().toISOString(),
      score: progress.score,
      timeSpent: progress.timeSpent,
    };
    
    updates.recentActivities = [
      completedActivity,
      ...session.recentActivities.slice(0, 19) // Keep last 20 activities
    ];
  }
  
  return updateLearningSession(userId, updates, deviceId);
}

/**
 * Update competency progress for Grade 2 mastery tracking
 */
export async function syncCompetencyProgress(
  userId: string,
  competencyId: string,
  level: number,
  activityId: string
): Promise<boolean> {
  const session = await getLearningSession(userId);
  if (!session) return false;
  
  const currentCompetency = session.competencyProgress[competencyId] || {
    level: 0,
    lastUpdated: new Date().toISOString(),
    evidence: []
  };
  
  const updatedCompetency = {
    level: Math.max(level, currentCompetency.level), // Only increase level
    lastUpdated: new Date().toISOString(),
    evidence: [...new Set([...currentCompetency.evidence, activityId])].slice(-10) // Keep last 10 evidence points
  };
  
  return updateLearningSession(userId, {
    competencyProgress: {
      ...session.competencyProgress,
      [competencyId]: updatedCompetency
    }
  });
}

/**
 * Add achievement for gamification
 */
export async function unlockAchievement(
  userId: string,
  achievementId: string,
  name: string,
  type: 'milestone' | 'streak' | 'mastery' | 'exploration'
): Promise<boolean> {
  const session = await getLearningSession(userId);
  if (!session) return false;
  
  // Don't add duplicate achievements
  if (session.achievements.some(a => a.id === achievementId)) {
    return true;
  }
  
  const newAchievement = {
    id: achievementId,
    name,
    unlockedAt: new Date().toISOString(),
    type
  };
  
  return updateLearningSession(userId, {
    achievements: [newAchievement, ...session.achievements]
  });
}

/**
 * Clear session data (for logout or reset)
 */
export async function clearLearningSession(userId: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  
  try {
    const key = `learning_session:${userId}`;
    await client.del(key);
    sessionCache.delete(userId);
    return true;
  } catch (error) {
    console.error('Failed to clear learning session:', error);
    return false;
  }
}

/**
 * Get device sync status for debugging
 */
export async function getDeviceSyncInfo(userId: string) {
  const session = await getLearningSession(userId);
  if (!session) return null;
  
  return {
    lastSync: session.metadata.lastSync,
    lastDevice: session.metadata.lastDevice,
    sessionCount: session.metadata.sessionCount,
    totalTimeSpent: Math.round(session.metadata.totalTimeSpent / 60), // minutes
    hasActiveActivity: !!session.currentActivity,
    recentActivitiesCount: session.recentActivities.length,
    competenciesTracked: Object.keys(session.competencyProgress).length,
    achievementsUnlocked: session.achievements.length,
  };
}

// Private helper functions
function createInitialSession(userId: string, deviceId: string): LearningSession {
  return {
    userId,
    deviceId,
    grade: 'Grade 2', // Default for demo
    recentActivities: [],
    achievements: [],
    competencyProgress: {},
    preferences: {
      language: 'mixed',
      difficultyLevel: 1,
      learningStyle: 'mixed',
    },
    metadata: {
      lastSync: new Date().toISOString(),
      lastDevice: deviceId,
      sessionCount: 1,
      totalTimeSpent: 0,
    }
  };
}

/**
 * Hook for React components to sync session data
 */
export function useSessionSync() {
  return {
    syncActivity: syncActivityProgress,
    syncCompetency: syncCompetencyProgress,
    unlockAchievement,
    getSession: getLearningSession,
    getSyncInfo: getDeviceSyncInfo,
  };
}