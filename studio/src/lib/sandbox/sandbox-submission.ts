/**
 * Sandbox Activity Submission API
 * 
 * Handles student practice activity telemetry backed by Supabase.
 * Replaces the original Firebase Firestore implementation.
 */

import { getSupabaseClient } from '@/lib/supabase/client';

export interface ActivitySubmission {
  id?: string;
  student_id: string;
  activity_type: string;
  grade: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  score: number;
  time_spent: number; // seconds
  completed_at?: string;
  submittedAt?: string;
  answers?: Record<string, any>;
  feedback?: string;
}

export interface BatchSubmission {
  id?: string;
  student_id: string;
  grade: string;
  subject: string;
  total_activities: number;
  average_score: number;
  total_time: number;
  completed_at?: string;
}

export interface TeacherNotification {
  id?: string;
  teacher_id: string;
  student_id: string;
  submission_id: string;
  message: string;
  read: boolean;
  created_at?: string;
}

/**
 * Submit a single activity completion
 */
export async function submitActivity(
  submission: Omit<ActivitySubmission, 'id' | 'completed_at'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('activity_submissions')
      .insert({
        student_id: submission.student_id,
        activity_type: submission.activity_type,
        grade: submission.grade,
        subject: submission.subject,
        difficulty: submission.difficulty,
        score: submission.score,
        time_spent: submission.time_spent,
        completed_at: new Date().toISOString(),
        answers: submission.answers || null,
        feedback: submission.feedback || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to submit activity:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  } catch (err) {
    console.error('Unexpected error submitting activity:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Submit a batch of activities (session summary)
 */
export async function submitBatch(
  batch: Omit<BatchSubmission, 'id' | 'completed_at'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('batch_submissions')
      .insert({
        student_id: batch.student_id,
        grade: batch.grade,
        subject: batch.subject,
        total_activities: batch.total_activities,
        average_score: batch.average_score,
        total_time: batch.total_time,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to submit batch:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  } catch (err) {
    console.error('Unexpected error submitting batch:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Queue a submission for AI personalization analysis
 */
export async function queueForAI(
  studentId: string,
  submissionId: string,
  priority: number = 5
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('ai_personalization_queue')
      .insert({
        student_id: studentId,
        submission_id: submissionId,
        priority,
        status: 'pending',
      });

    if (error) {
      console.error('Failed to queue for AI:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error queueing for AI:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Create a notification for the student's teacher(s)
 */
export async function notifyTeacher(
  teacherId: string,
  studentId: string,
  submissionId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('teacher_notifications')
      .insert({
        teacher_id: teacherId,
        student_id: studentId,
        submission_id: submissionId,
        message,
        read: false,
      });

    if (error) {
      console.error('Failed to notify teacher:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error notifying teacher:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Get student's recent submissions
 */
export async function getStudentSubmissions(
  studentId: string,
  limit: number = 20
): Promise<ActivitySubmission[]> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('activity_submissions')
      .select('*')
      .eq('student_id', studentId)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch student submissions:', error);
      return [];
    }

    return (data || []).map((submission) => ({
      ...submission,
      submittedAt: submission.completed_at,
    })) as ActivitySubmission[];
  } catch (err) {
    console.error('Unexpected error fetching submissions:', err);
    return [];
  }
}

/**
 * Get submissions for students assigned to a teacher
 */
export async function getTeacherStudentSubmissions(
  teacherId: string,
  limit: number = 50
): Promise<ActivitySubmission[]> {
  try {
    const supabase = getSupabaseClient();
    
    // First get the teacher's assigned student IDs
    const { data: assignments, error: assignError } = await supabase
      .from('teacher_student_assignments')
      .select('student_id')
      .eq('teacher_id', teacherId);

    if (assignError || !assignments || assignments.length === 0) {
      return [];
    }

    const studentIds = assignments.map((a: { student_id: string }) => a.student_id);

    // Then fetch submissions for those students
    const { data, error } = await supabase
      .from('activity_submissions')
      .select('*')
      .in('student_id', studentIds)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch teacher student submissions:', error);
      return [];
    }

    return (data || []).map((submission) => ({
      ...submission,
      submittedAt: submission.completed_at,
    })) as ActivitySubmission[];
  } catch (err) {
    console.error('Unexpected error fetching teacher submissions:', err);
    return [];
  }
}

/**
 * Get AI recommendations for a student
 */
export async function getAIRecommendations(
  studentId: string
): Promise<Array<{
  id: string;
  activity_type: string;
  difficulty: string;
  reason: string;
  confidence: number;
}>> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('ai_recommendations')
      .select('*')
      .eq('student_id', studentId)
      .gt('expires_at', new Date().toISOString())
      .order('confidence', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Failed to fetch AI recommendations:', error);
      return [];
    }

    return (data || []) as Array<{
      id: string;
      activity_type: string;
      difficulty: string;
      reason: string;
      confidence: number;
    }>;
  } catch (err) {
    console.error('Unexpected error fetching recommendations:', err);
    return [];
  }
}

// Made with Bob
