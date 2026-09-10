/**
 * Real-Time Feedback Hooks for Teacher-Student Communication
 * 
 * React hooks for seamless real-time feedback integration.
 * Student sees teacher messages instantly, teacher sees student progress live.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './use-auth';
import { 
  realtimeFeedback, 
  type TeacherFeedback, 
  type StudentProgress,
  type LiveClassroomState,
  generatePersonalizedFeedback
} from '@/lib/teacher/realtime-feedback';

/**
 * Hook for students to receive real-time teacher feedback
 */
export function useStudentFeedback(studentId?: string) {
  const { user, profile } = useAuth();
  const [feedback, setFeedback] = useState<TeacherFeedback[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const audioRef = useRef<HTMLAudioElement>();
  
  const actualStudentId = studentId || user?.id;
  const grade = profile?.grade || 'Grade 2';
  
  // Initialize audio for notifications
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/gentle-notification.mp3');
      audioRef.current.volume = 0.3;
    }
  }, []);
  
  // Connect to real-time feedback
  useEffect(() => {
    if (!actualStudentId) return;
    
    const initializeConnection = async () => {
      try {
        await realtimeFeedback.initializeStudentListener(actualStudentId, grade);
        setIsConnected(true);
        
        // Listen for new feedback
        const unsubscribe = realtimeFeedback.onFeedbackReceived((newFeedback) => {
          setFeedback(prev => [newFeedback, ...prev.slice(0, 9)]); // Keep last 10 messages
          setUnreadCount(prev => prev + 1);
          
          // Play gentle notification sound
          if (audioRef.current && newFeedback.priority !== 'low') {
            audioRef.current.play().catch(console.warn);
          }
          
          // Show browser notification for high priority
          if (newFeedback.priority === 'high' || newFeedback.priority === 'urgent') {
            showBrowserNotification(newFeedback);
          }
        });
        
        return unsubscribe;
      } catch (error) {
        console.error('Failed to initialize student feedback listener:', error);
        setIsConnected(false);
      }
    };
    
    const cleanup = initializeConnection();
    
    return () => {
      cleanup?.then(unsub => unsub?.());
      realtimeFeedback.cleanup();
      setIsConnected(false);
    };
  }, [actualStudentId, grade]);
  
  // Mark feedback as read
  const markAsRead = useCallback(async (feedbackId: string) => {
    if (!actualStudentId) return;
    
    await realtimeFeedback.markFeedbackRead(feedbackId, actualStudentId);
    setFeedback(prev => prev.map(f => 
      f.id === feedbackId ? { ...f, readAt: new Date().toISOString() } : f
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, [actualStudentId]);
  
  // Respond to teacher feedback
  const respondToFeedback = useCallback(async (feedbackId: string, response: string) => {
    if (!actualStudentId) return false;
    
    const success = await realtimeFeedback.respondToFeedback(feedbackId, actualStudentId, response);
    if (success) {
      setFeedback(prev => prev.map(f => 
        f.id === feedbackId ? { ...f, respondedAt: new Date().toISOString() } : f
      ));
    }
    return success;
  }, [actualStudentId]);
  
  // Clear all feedback
  const clearFeedback = useCallback(() => {
    setFeedback([]);
    setUnreadCount(0);
  }, []);
  
  return {
    feedback,
    unreadCount,
    isConnected,
    markAsRead,
    respondToFeedback,
    clearFeedback,
  };
}

/**
 * Hook for teachers to monitor classroom and send feedback
 */
export function useTeacherClassroom(teacherId?: string, classId: string = 'Grade 2A') {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<TeacherFeedback[]>([]);
  
  const actualTeacherId = teacherId || user?.id;
  
  // Connect to classroom monitoring
  useEffect(() => {
    if (!actualTeacherId) return;
    
    const initializeConnection = async () => {
      try {
        await realtimeFeedback.initializeTeacherListener(actualTeacherId, classId);
        setIsConnected(true);
        
        // Listen for student progress updates
        const unsubscribe = realtimeFeedback.onProgressUpdate((progress) => {
          setStudents(prev => {
            const existing = prev.findIndex(s => s.studentId === progress.studentId);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = progress;
              return updated;
            }
            return [progress, ...prev];
          });
          
          // Auto-generate intervention alerts for struggling students
          if (progress.strugglingWith && progress.competencyLevel !== undefined && progress.competencyLevel < 2) {
            generateInterventionAlert(progress);
          }
        });
        
        return unsubscribe;
      } catch (error) {
        console.error('Failed to initialize teacher classroom listener:', error);
        setIsConnected(false);
      }
    };
    
    const cleanup = initializeConnection();
    
    return () => {
      cleanup?.then(unsub => unsub?.());
      realtimeFeedback.cleanup();
      setIsConnected(false);
    };
  }, [actualTeacherId, classId]);
  
  // Send feedback to student
  const sendFeedback = useCallback(async (
    studentId: string,
    type: TeacherFeedback['type'],
    message: string,
    options?: {
      priority?: TeacherFeedback['priority'];
      activityId?: string;
      metadata?: TeacherFeedback['metadata'];
    }
  ) => {
    if (!actualTeacherId) return null;
    
    const feedback = await realtimeFeedback.sendFeedbackToStudent({
      teacherId: actualTeacherId,
      studentId,
      type,
      message,
      priority: options?.priority || 'medium',
      activityId: options?.activityId,
      metadata: options?.metadata,
    });
    
    setActiveAlerts(prev => [feedback, ...prev.slice(0, 19)]); // Keep last 20 alerts
    
    return feedback;
  }, [actualTeacherId]);
  
  // Send personalized encouragement
  const sendEncouragement = useCallback(async (
    studentId: string,
    studentName: string,
    context?: { activity?: string; subject?: string }
  ) => {
    const message = generatePersonalizedFeedback('encouragement', studentName, context);
    return sendFeedback(studentId, 'encouragement', message, { priority: 'low' });
  }, [sendFeedback]);
  
  // Send learning hint
  const sendHint = useCallback(async (
    studentId: string,
    studentName: string,
    hint: string,
    activityId?: string
  ) => {
    const personalizedHint = hint || generatePersonalizedFeedback('hint', studentName);
    return sendFeedback(studentId, 'hint', personalizedHint, { 
      priority: 'medium',
      activityId,
    });
  }, [sendFeedback]);
  
  // Send urgent intervention
  const sendIntervention = useCallback(async (
    studentId: string,
    studentName: string,
    issue: string,
    suggestedAction?: string
  ) => {
    const message = `${studentName}, I notice you might need some help with ${issue}. ${suggestedAction || "Let's work through this together!"}`;
    return sendFeedback(studentId, 'intervention', message, {
      priority: 'high',
      metadata: {
        misconception: issue,
        suggestedAction,
      },
    });
  }, [sendFeedback]);
  
  // Send celebration message
  const sendCelebration = useCallback(async (
    studentId: string,
    studentName: string,
    achievement: string
  ) => {
    const message = generatePersonalizedFeedback('celebration', studentName) + ` You just ${achievement}!`;
    return sendFeedback(studentId, 'celebration', message, { priority: 'medium' });
  }, [sendFeedback]);
  
  // Generate automatic intervention alert
  const generateInterventionAlert = useCallback((progress: StudentProgress) => {
    const alert: TeacherFeedback = {
      id: `auto_alert_${Date.now()}`,
      teacherId: actualTeacherId!,
      studentId: progress.studentId,
      type: 'intervention',
      message: `Student struggling with ${progress.strugglingWith || progress.activityName}`,
      priority: 'high',
      metadata: {
        competency: progress.strugglingWith,
        suggestedAction: 'Provide additional scaffolding or redirect to easier activity',
      },
      createdAt: new Date().toISOString(),
    };
    
    setActiveAlerts(prev => [alert, ...prev]);
  }, [actualTeacherId]);
  
  // Get classroom summary
  const getClassroomSummary = useCallback(() => {
    const activeStudents = students.filter(s => 
      Date.now() - new Date(s.timestamp).getTime() < 300000 // Active in last 5 minutes
    );
    
    const strugglingStudents = activeStudents.filter(s => 
      s.competencyLevel !== undefined && s.competencyLevel < 2
    );
    
    const highPerformers = activeStudents.filter(s => 
      s.competencyLevel !== undefined && s.competencyLevel >= 3
    );
    
    return {
      totalStudents: students.length,
      activeStudents: activeStudents.length,
      strugglingStudents: strugglingStudents.length,
      highPerformers: highPerformers.length,
      averageProgress: activeStudents.reduce((sum, s) => sum + s.progress, 0) / activeStudents.length || 0,
      needsAttention: strugglingStudents.map(s => s.studentId),
    };
  }, [students]);
  
  return {
    students,
    activeAlerts,
    isConnected,
    sendFeedback,
    sendEncouragement, 
    sendHint,
    sendIntervention,
    sendCelebration,
    getClassroomSummary,
  };
}

/**
 * Hook for broadcasting student progress to teacher
 */
export function useProgressBroadcast() {
  const { user } = useAuth();
  
  const broadcastProgress = useCallback(async (progress: Omit<StudentProgress, 'studentId' | 'timestamp'>) => {
    if (!user?.id) return;
    
    const fullProgress: StudentProgress = {
      ...progress,
      studentId: user.id,
      timestamp: new Date().toISOString(),
    };
    
    await realtimeFeedback.broadcastStudentProgress(fullProgress);
  }, [user?.id]);
  
  return { broadcastProgress };
}

// Helper function for browser notifications
function showBrowserNotification(feedback: TeacherFeedback) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Message from your teacher', {
      body: feedback.message,
      icon: '/icons/teacher-notification.png',
      badge: '/icons/syncsenta-badge.png',
    });
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        showBrowserNotification(feedback);
      }
    });
  }
}