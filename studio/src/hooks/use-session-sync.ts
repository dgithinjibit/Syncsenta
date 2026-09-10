/**
 * Session Sync Hook - Cross-device learning continuity
 * 
 * Provides seamless session synchronization across devices.
 * Student can start on phone, continue on tablet, finish on desktop.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './use-auth';
import type { LearningSession } from '@/lib/session/session-persistence';

interface SyncOptions {
  autoSync?: boolean; // Auto-sync every 30 seconds
  syncOnVisibilityChange?: boolean; // Sync when tab becomes visible
  debounceMs?: number; // Debounce rapid updates
}

interface UseSyncSessionResult {
  session: LearningSession | null;
  loading: boolean;
  error: string | null;
  lastSync: Date | null;
  
  // Sync methods
  syncActivityProgress: (activityId: string, progress: ActivityProgress) => Promise<void>;
  syncCompetency: (competencyId: string, level: number, activityId: string) => Promise<void>;
  unlockAchievement: (achievementId: string, name: string, type: AchievementType) => Promise<void>;
  updatePreferences: (preferences: Partial<SessionPreferences>) => Promise<void>;
  forceSync: () => Promise<void>;
  
  // Status
  isOnline: boolean;
  syncEnabled: boolean;
  deviceId: string;
}

interface ActivityProgress {
  name: string;
  subject: string;
  progress: number; // 0-100
  timeSpent: number; // seconds
  completed: boolean;
  score?: number;
  activityData?: any;
}

interface SessionPreferences {
  language: 'english' | 'kiswahili' | 'mixed';
  difficultyLevel: number;
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
}

type AchievementType = 'milestone' | 'streak' | 'mastery' | 'exploration';

// Generate device ID for this browser session
function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  
  let deviceId = localStorage.getItem('syncsenta_device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('syncsenta_device_id', deviceId);
  }
  return deviceId;
}

// Check if browser is online
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
}

export function useSessionSync(options: SyncOptions = {}): UseSyncSessionResult {
  const { user } = useAuth();
  const [session, setSession] = useState<LearningSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  const isOnline = useOnlineStatus();
  const deviceId = getDeviceId();
  const pendingSyncs = useRef<Set<string>>(new Set());
  
  const {
    autoSync = true,
    syncOnVisibilityChange = true,
    debounceMs = 1000
  } = options;
  
  const syncEnabled = !!user && isOnline;
  
  // Debounced sync function
  const debouncedSync = useCallback(
    debounce((syncFn: () => Promise<void>) => syncFn(), debounceMs),
    [debounceMs]
  );
  
  // Core sync function
  const performSync = useCallback(async (type: string, data: any): Promise<void> => {
    if (!syncEnabled || pendingSyncs.current.has(type)) return;
    
    pendingSyncs.current.add(type);
    setError(null);
    
    try {
      const response = await fetch('/api/session/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data, deviceId }),
      });
      
      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success && result.session) {
        setSession(result.session);
        setLastSync(new Date());
      } else {
        throw new Error('Sync failed on server');
      }
    } catch (err) {
      console.error(`Session sync error (${type}):`, err);
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      pendingSyncs.current.delete(type);
    }
  }, [syncEnabled, deviceId]);
  
  // Load initial session
  const loadSession = useCallback(async () => {
    if (!syncEnabled) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/session/sync');
      if (response.ok) {
        const result = await response.json();
        setSession(result.session);
        setLastSync(new Date());
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      setError('Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [syncEnabled]);
  
  // Public sync methods
  const syncActivityProgress = useCallback(async (
    activityId: string, 
    progress: ActivityProgress
  ) => {
    await debouncedSync(() => performSync('activity_progress', {
      activityId,
      name: progress.name,
      subject: progress.subject,
      progress: progress.progress,
      timeSpent: progress.timeSpent,
      completed: progress.completed,
      score: progress.score,
      activityData: progress.activityData,
    }));
  }, [debouncedSync, performSync]);
  
  const syncCompetency = useCallback(async (
    competencyId: string,
    level: number,
    activityId: string
  ) => {
    await performSync('competency_progress', { competencyId, level, activityId });
  }, [performSync]);
  
  const unlockAchievement = useCallback(async (
    achievementId: string,
    name: string,
    type: AchievementType
  ) => {
    await performSync('achievement', { achievementId, name, type });
  }, [performSync]);
  
  const updatePreferences = useCallback(async (preferences: Partial<SessionPreferences>) => {
    await performSync('preferences', preferences);
  }, [performSync]);
  
  const forceSync = useCallback(loadSession, [loadSession]);
  
  // Auto-sync timer
  useEffect(() => {
    if (!autoSync || !syncEnabled) return;
    
    const interval = setInterval(loadSession, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [autoSync, syncEnabled, loadSession]);
  
  // Sync on visibility change (tab focus)
  useEffect(() => {
    if (!syncOnVisibilityChange || typeof window === 'undefined') return;
    
    const handleVisibilityChange = () => {
      if (!document.hidden && syncEnabled) {
        loadSession();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [syncOnVisibilityChange, syncEnabled, loadSession]);
  
  // Initial load
  useEffect(() => {
    if (syncEnabled) {
      loadSession();
    }
  }, [syncEnabled, loadSession]);
  
  return {
    session,
    loading,
    error,
    lastSync,
    syncActivityProgress,
    syncCompetency,
    unlockAchievement,
    updatePreferences,
    forceSync,
    isOnline,
    syncEnabled,
    deviceId,
  };
}

// Utility debounce function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Student activity tracking helper
export function useActivityTracker() {
  const { syncActivityProgress, syncCompetency } = useSessionSync();
  const startTimeRef = useRef<number>();
  const currentActivityRef = useRef<string>();
  
  const startActivity = useCallback((activityId: string) => {
    startTimeRef.current = Date.now();
    currentActivityRef.current = activityId;
  }, []);
  
  const recordProgress = useCallback(async (
    activityId: string,
    progress: Omit<ActivityProgress, 'timeSpent'>
  ) => {
    const timeSpent = startTimeRef.current ? 
      Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;
    
    await syncActivityProgress(activityId, {
      ...progress,
      timeSpent,
    });
    
    // Update competency if activity is for Grade 2
    if (progress.completed && progress.score !== undefined) {
      const competencyId = `MATH.G2.${progress.subject.toUpperCase()}`;
      const level = Math.floor((progress.score / 100) * 4); // 0-4 mastery scale
      await syncCompetency(competencyId, level, activityId);
    }
  }, [syncActivityProgress, syncCompetency]);
  
  return { startActivity, recordProgress };
}