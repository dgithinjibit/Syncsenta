/**
 * Real-Time Teacher-Student Feedback System
 * 
 * Enables instant communication between teacher dashboard and student interface.
 * Teacher feedback, interventions, and encouragements appear immediately on student screen.
 */

import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface TeacherFeedback {
  id: string;
  teacherId: string;
  studentId: string;
  type: 'encouragement' | 'intervention' | 'hint' | 'redirect' | 'celebration';
  message: string;
  activityId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: {
    competency?: string;
    misconception?: string;
    suggestedAction?: string;
    relatedResources?: string[];
  };
  createdAt: string;
  readAt?: string;
  respondedAt?: string;
}

export interface StudentProgress {
  studentId: string;
  activityId: string;
  activityName: string;
  subject: string;
  grade: string;
  progress: number; // 0-100
  timeSpent: number; // seconds
  competencyLevel?: number; // 1-4 mastery scale
  strugglingWith?: string;
  lastAction: string;
  timestamp: string;
}

export interface LiveClassroomState {
  teacherId: string;
  students: Array<{
    studentId: string;
    studentName: string;
    currentActivity?: string;
    status: 'active' | 'struggling' | 'completed' | 'idle';
    attentionLevel: 'focused' | 'distracted' | 'needs_help';
    lastSeen: string;
  }>;
  activeAlerts: TeacherFeedback[];
}

class RealtimeFeedbackManager {
  private studentChannel: RealtimeChannel | null = null;
  private teacherChannel: RealtimeChannel | null = null;
  private progressChannel: RealtimeChannel | null = null;
  
  private feedbackCallbacks = new Set<(feedback: TeacherFeedback) => void>();
  private progressCallbacks = new Set<(progress: StudentProgress) => void>();
  private classroomCallbacks = new Set<(state: LiveClassroomState) => void>();
  
  /**
   * Initialize student-side real-time feedback listening
   */
  async initializeStudentListener(studentId: string, grade: string = 'Grade 2') {
    // Clean up existing connections
    this.cleanup();
    
    // Student-specific feedback channel
    this.studentChannel = supabase
      .channel(`student_feedback:${studentId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'teacher_student_feedback',
        filter: `student_id=eq.${studentId}`
      }, (payload) => {
        const feedback = payload.new as TeacherFeedback;
        this.notifyFeedbackCallbacks(feedback);
      })
      .on('broadcast', {
        event: 'live_feedback'
      }, (payload) => {
        const feedback = payload.payload as TeacherFeedback;
        if (feedback.studentId === studentId) {
          this.notifyFeedbackCallbacks(feedback);
        }
      })
      .subscribe();
    
    console.log(`✅ Student ${studentId} connected to real-time feedback`);
  }
  
  /**
   * Initialize teacher-side classroom monitoring
   */
  async initializeTeacherListener(teacherId: string, classId: string = 'Grade 2A') {
    this.cleanup();
    
    // Teacher classroom monitoring channel
    this.teacherChannel = supabase
      .channel(`classroom:${classId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public', 
        table: 'student_sessions',
        filter: `metadata->>class_name=eq.${classId}`
      }, (payload) => {
        // Convert session data to progress update
        if (payload.eventType === 'UPDATE' && payload.new) {
          const session = payload.new as any;
          const progress: StudentProgress = {
            studentId: session.student_id,
            activityId: session.activity_data?.activity_id || 'unknown',
            activityName: session.activity_data?.activity_name || 'Learning Activity',
            subject: session.subject || 'Unknown',
            grade: session.grade || 'Grade 2',
            progress: session.progress || 0,
            timeSpent: Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000),
            lastAction: session.status || 'active',
            timestamp: session.updated_at || new Date().toISOString()
          };
          
          this.notifyProgressCallbacks(progress);
        }
      })
      .on('broadcast', {
        event: 'student_progress'
      }, (payload) => {
        const progress = payload.payload as StudentProgress;
        this.notifyProgressCallbacks(progress);
      })
      .subscribe();
    
    console.log(`✅ Teacher ${teacherId} connected to classroom monitoring`);
  }
  
  /**
   * Send live feedback from teacher to student
   */
  async sendFeedbackToStudent(feedback: Omit<TeacherFeedback, 'id' | 'createdAt'>) {
    const feedbackWithId: TeacherFeedback = {
      ...feedback,
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    
    // Store in database
    const { error: dbError } = await supabase
      .from('teacher_student_feedback')
      .insert([feedbackWithId]);
    
    if (dbError) {
      console.error('Failed to store feedback:', dbError);
    }
    
    // Broadcast immediately via realtime
    if (this.teacherChannel) {
      await this.teacherChannel.send({
        type: 'broadcast',
        event: 'live_feedback',
        payload: feedbackWithId
      });
    }
    
    return feedbackWithId;
  }
  
  /**
   * Send student progress update to teacher dashboard
   */
  async broadcastStudentProgress(progress: StudentProgress) {
    if (this.studentChannel) {
      await this.studentChannel.send({
        type: 'broadcast', 
        event: 'student_progress',
        payload: progress
      });
    }
    
    // Also update session in database
    const { error } = await supabase
      .from('student_sessions')
      .upsert({
        student_id: progress.studentId,
        activity_id: progress.activityId,
        subject: progress.subject,
        grade: progress.grade,
        progress: progress.progress,
        status: progress.lastAction,
        updated_at: progress.timestamp,
        activity_data: {
          activity_name: progress.activityName,
          competency_level: progress.competencyLevel,
          struggling_with: progress.strugglingWith
        }
      }, {
        onConflict: 'student_id,activity_id'
      });
    
    if (error) {
      console.error('Failed to update session:', error);
    }
  }
  
  /**
   * Mark feedback as read by student
   */
  async markFeedbackRead(feedbackId: string, studentId: string) {
    const { error } = await supabase
      .from('teacher_student_feedback')
      .update({ 
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', feedbackId)
      .eq('student_id', studentId);
    
    if (error) {
      console.error('Failed to mark feedback as read:', error);
    }
  }
  
  /**
   * Student responds to teacher feedback
   */
  async respondToFeedback(feedbackId: string, studentId: string, response: string) {
    const { error } = await supabase
      .from('teacher_student_feedback')
      .update({
        responded_at: new Date().toISOString(),
        metadata: { student_response: response },
        updated_at: new Date().toISOString()
      })
      .eq('id', feedbackId)
      .eq('student_id', studentId);
    
    if (error) {
      console.error('Failed to record response:', error);
      return false;
    }
    
    return true;
  }
  
  // Callback management
  onFeedbackReceived(callback: (feedback: TeacherFeedback) => void) {
    this.feedbackCallbacks.add(callback);
    return () => this.feedbackCallbacks.delete(callback);
  }
  
  onProgressUpdate(callback: (progress: StudentProgress) => void) {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }
  
  onClassroomUpdate(callback: (state: LiveClassroomState) => void) {
    this.classroomCallbacks.add(callback);
    return () => this.classroomCallbacks.delete(callback);
  }
  
  private notifyFeedbackCallbacks(feedback: TeacherFeedback) {
    this.feedbackCallbacks.forEach(callback => {
      try {
        callback(feedback);
      } catch (error) {
        console.error('Feedback callback error:', error);
      }
    });
  }
  
  private notifyProgressCallbacks(progress: StudentProgress) {
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Progress callback error:', error);
      }
    });
  }
  
  private notifyClassroomCallbacks(state: LiveClassroomState) {
    this.classroomCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('Classroom callback error:', error);
      }
    });
  }
  
  cleanup() {
    if (this.studentChannel) {
      supabase.removeChannel(this.studentChannel);
      this.studentChannel = null;
    }
    
    if (this.teacherChannel) {
      supabase.removeChannel(this.teacherChannel);
      this.teacherChannel = null;
    }
    
    if (this.progressChannel) {
      supabase.removeChannel(this.progressChannel);
      this.progressChannel = null;
    }
  }
}

// Global instance
export const realtimeFeedback = new RealtimeFeedbackManager();

// Grade 2 specific feedback templates
export const GRADE_2_FEEDBACK_TEMPLATES = {
  encouragement: [
    "Great counting, {studentName}! You're doing amazing! 🌟",
    "Wonderful work on your numbers! Keep it up! ⭐",
    "You're getting so good at math! I'm proud of you! 🎉",
    "Excellent job! You're a math star! ⚡",
  ],
  
  hint: [
    "Try counting on your fingers, {studentName}! 👆",
    "Remember to count slowly, one by one! 🐌",
    "Look at the pictures to help you count! 👀",
    "Take your time, you've got this! ⏰",
  ],
  
  intervention: [
    "Let's try a different way, {studentName}! 🔄", 
    "I'm here to help! Let's work through this together! 🤝",
    "No worries! Let's break this into smaller steps! 📝",
    "Great effort! Let me show you a trick! ✨",
  ],

  redirect: [
    "Let's refocus on the question, {studentName}! 🎯",
    "Try connecting this step to what you already know! 🔗",
  ],
  
  celebration: [
    "AMAZING! You solved it! 🎊🎉",
    "WOW! You're a Grade 2 math champion! 🏆",
    "Fantastic! Give yourself a pat on the back! 👏",
    "Incredible work! You should be so proud! 🌈",
  ]
};

// Helper function to generate personalized feedback
export function generatePersonalizedFeedback(
  type: TeacherFeedback['type'],
  studentName: string,
  context?: { activity?: string; subject?: string; mistake?: string }
): string {
  const templates = GRADE_2_FEEDBACK_TEMPLATES[type] || GRADE_2_FEEDBACK_TEMPLATES.encouragement;
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  return template.replace('{studentName}', studentName);
}