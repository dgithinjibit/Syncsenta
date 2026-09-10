/**
 * Smart Intervention System (FREE)
 * Detects when students need help and suggests interventions
 */

interface StudentActivity {
  studentId: string;
  attempts: number;
  correctAnswers: number;
  timeSpent: number; // in seconds
  lastActivity: Date;
  currentTopic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface Intervention {
  type: 'stuck' | 'frustrated' | 'inactive' | 'rushing' | 'struggling';
  severity: 'low' | 'medium' | 'high';
  message: string;
  action: string;
  priority: number;
}

/**
 * Detect if student needs intervention
 */
export function detectIntervention(activity: StudentActivity): Intervention[] {
  const interventions: Intervention[] = [];

  // 1. Stuck: 3+ wrong attempts with no correct answers
  if (activity.attempts >= 3 && activity.correctAnswers === 0) {
    interventions.push({
      type: 'stuck',
      severity: 'high',
      message: 'Student is stuck on current topic',
      action: 'Suggest easier problem, provide hint, or offer video explanation',
      priority: 10,
    });
  }

  // 2. Frustrated: Long time with no progress (10+ minutes)
  if (activity.timeSpent > 600 && activity.correctAnswers === 0) {
    interventions.push({
      type: 'frustrated',
      severity: 'high',
      message: 'Student spending too long without progress',
      action: 'Offer break, switch topics, or provide step-by-step guidance',
      priority: 9,
    });
  }

  // 3. Inactive: No activity for 5+ minutes
  const inactiveMinutes = (Date.now() - activity.lastActivity.getTime()) / 60000;
  if (inactiveMinutes > 5) {
    interventions.push({
      type: 'inactive',
      severity: 'low',
      message: 'Student has been inactive',
      action: 'Send gentle reminder or motivational message',
      priority: 3,
    });
  }

  // 4. Rushing: Too many attempts too quickly (>5 attempts in <2 minutes)
  if (activity.attempts > 5 && activity.timeSpent < 120) {
    interventions.push({
      type: 'rushing',
      severity: 'medium',
      message: 'Student may be rushing through content',
      action: 'Encourage careful reading and thinking before answering',
      priority: 6,
    });
  }

  // 5. Struggling: Low accuracy (<40%) with multiple attempts
  const accuracy = activity.attempts > 0 
    ? (activity.correctAnswers / activity.attempts) * 100 
    : 0;
  
  if (activity.attempts >= 5 && accuracy < 40) {
    interventions.push({
      type: 'struggling',
      severity: 'high',
      message: 'Student struggling with current difficulty level',
      action: 'Reduce difficulty, provide additional practice, or offer tutoring',
      priority: 8,
    });
  }

  // Sort by priority (highest first)
  return interventions.sort((a, b) => b.priority - a.priority);
}

/**
 * Track student activity
 */
export function trackActivity(
  studentId: string,
  action: 'attempt' | 'correct' | 'incorrect' | 'hint' | 'skip',
  metadata?: Record<string, any>
): void {
  if (typeof window === 'undefined') return;

  const key = `activity:${studentId}`;
  const stored = localStorage.getItem(key);
  const activity: StudentActivity = stored 
    ? JSON.parse(stored)
    : {
        studentId,
        attempts: 0,
        correctAnswers: 0,
        timeSpent: 0,
        lastActivity: new Date(),
      };

  // Update activity based on action
  activity.lastActivity = new Date();

  switch (action) {
    case 'attempt':
      activity.attempts = (activity.attempts || 0) + 1;
      break;
    case 'correct':
      activity.correctAnswers = (activity.correctAnswers || 0) + 1;
      activity.attempts = (activity.attempts || 0) + 1;
      break;
    case 'incorrect':
      activity.attempts = (activity.attempts || 0) + 1;
      break;
  }

  // Update metadata if provided
  if (metadata) {
    Object.assign(activity, metadata);
  }

  localStorage.setItem(key, JSON.stringify(activity));

  // Check for interventions
  const interventions = detectIntervention(activity);
  if (interventions.length > 0) {
    console.log('🚨 Interventions needed:', interventions);
    
    // Store interventions for display
    const interventionsKey = `interventions:${studentId}`;
    localStorage.setItem(interventionsKey, JSON.stringify(interventions));
  }
}

/**
 * Get student activity
 */
export function getActivity(studentId: string): StudentActivity | null {
  if (typeof window === 'undefined') return null;

  const key = `activity:${studentId}`;
  const stored = localStorage.getItem(key);
  
  if (!stored) return null;

  const activity = JSON.parse(stored);
  activity.lastActivity = new Date(activity.lastActivity);
  
  return activity;
}

/**
 * Get pending interventions for student
 */
export function getInterventions(studentId: string): Intervention[] {
  if (typeof window === 'undefined') return [];

  const key = `interventions:${studentId}`;
  const stored = localStorage.getItem(key);
  
  return stored ? JSON.parse(stored) : [];
}

/**
 * Clear interventions for student
 */
export function clearInterventions(studentId: string): void {
  if (typeof window === 'undefined') return;

  const key = `interventions:${studentId}`;
  localStorage.removeItem(key);
}

/**
 * Reset student activity
 */
export function resetActivity(studentId: string): void {
  if (typeof window === 'undefined') return;

  const key = `activity:${studentId}`;
  localStorage.removeItem(key);
  clearInterventions(studentId);
}

/**
 * Get activity summary for all students
 */
export function getAllActivities(): Record<string, StudentActivity> {
  if (typeof window === 'undefined') return {};

  const activities: Record<string, StudentActivity> = {};
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('activity:')) {
      const studentId = key.replace('activity:', '');
      const activity = getActivity(studentId);
      if (activity) {
        activities[studentId] = activity;
      }
    }
  }

  return activities;
}

/**
 * React hook for intervention detection
 */
export function useInterventionDetector(studentId: string) {
  const [activity, setActivity] = React.useState<StudentActivity | null>(null);
  const [interventions, setInterventions] = React.useState<Intervention[]>([]);

  React.useEffect(() => {
    const updateData = () => {
      const currentActivity = getActivity(studentId);
      const currentInterventions = getInterventions(studentId);
      
      setActivity(currentActivity);
      setInterventions(currentInterventions);
    };

    updateData();

    // Update every 30 seconds
    const interval = setInterval(updateData, 30000);

    return () => clearInterval(interval);
  }, [studentId]);

  return {
    activity,
    interventions,
    track: (action: 'attempt' | 'correct' | 'incorrect' | 'hint' | 'skip', metadata?: Record<string, any>) => {
      trackActivity(studentId, action, metadata);
      setActivity(getActivity(studentId));
      setInterventions(getInterventions(studentId));
    },
    clear: () => {
      clearInterventions(studentId);
      setInterventions([]);
    },
    reset: () => {
      resetActivity(studentId);
      setActivity(null);
      setInterventions([]);
    },
  };
}

// For non-React usage
import React from 'react';

// Made with Bob
