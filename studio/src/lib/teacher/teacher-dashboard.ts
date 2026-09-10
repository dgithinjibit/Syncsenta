/**
 * Teacher Dashboard Functions
 * 
 * Provides real-time student monitoring, interventions, and class analytics.
 */

import { supabase } from '../supabase/client';
import { getSupabaseServerClient } from '../supabase/server';
import type { Database } from '../supabase/types';

export type TeacherStudent = {
  student_id: string;
  student_name: string;
  student_email: string;
  grade: string;
  class_name: string;
  last_active: string;
  total_sessions: number;
  total_messages: number;
  current_streak: number;
  competencies_mastered: number;
  average_mastery_percentage: number;
};

export type StudentAlert = {
  alert_id: string;
  student_id: string;
  student_name: string;
  alert_type: 'stuck' | 'frustrated' | 'off_topic' | 'struggling' | 'inactive' | 'breakthrough' | 'mastery';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string | null;
  session_id: string | null;
  competency_code: string | null;
  created_at: string;
};

export type ClassSummary = {
  total_students: number;
  active_today: number;
  active_this_week: number;
  average_mastery_percentage: number;
  total_sessions_today: number;
  total_messages_today: number;
  struggling_students: number;
  excelling_students: number;
};

type Intervention = Database['public']['Tables']['teacher_interventions']['Row'];

/**
 * Get teacher's students with latest activity
 */
export async function getTeacherStudents(
  teacherId: string,
  className?: string
): Promise<TeacherStudent[]> {
  const { data, error } = await supabase.rpc('get_teacher_students', {
    p_teacher_id: teacherId,
    p_class_name: className || null,
  });

  if (error) {
    console.error('Error fetching teacher students:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get active alerts for teacher's students
 */
export async function getTeacherAlerts(
  teacherId: string,
  severity?: 'low' | 'medium' | 'high' | 'critical'
): Promise<StudentAlert[]> {
  const { data, error } = await supabase.rpc('get_teacher_alerts', {
    p_teacher_id: teacherId,
    p_severity: severity || null,
  });

  if (error) {
    console.error('Error fetching teacher alerts:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get class performance summary
 */
export async function getClassSummary(
  teacherId: string,
  className: string
): Promise<ClassSummary | null> {
  const { data, error } = await supabase.rpc('get_class_summary', {
    p_teacher_id: teacherId,
    p_class_name: className,
  });

  if (error) {
    console.error('Error fetching class summary:', error);
    throw error;
  }

  return data && data.length > 0 ? data[0] : null;
}

/**
 * Get teacher's classes
 */
export async function getTeacherClasses(teacherId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('teacher_students')
    .select('class_name')
    .eq('teacher_id', teacherId)
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching teacher classes:', error);
    throw error;
  }

  // Get unique class names
  const uniqueClasses = Array.from(new Set(data.map((item) => item.class_name)));
  return uniqueClasses;
}

/**
 * Send intervention to student
 */
export async function sendIntervention(
  teacherId: string,
  studentId: string,
  interventionType: 'hint' | 'encouragement' | 'redirect' | 'clarification' | 'assignment' | 'meeting_scheduled',
  message: string,
  sessionId?: string,
  competencyCode?: string
): Promise<string> {
  const { data, error } = await supabase
    .from('teacher_interventions')
    .insert({
      teacher_id: teacherId,
      student_id: studentId,
      intervention_type: interventionType,
      message,
      session_id: sessionId,
      competency_code: competencyCode,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error sending intervention:', error);
    throw error;
  }

  return data.id;
}

/**
 * Get interventions for a student
 */
export async function getStudentInterventions(
  studentId: string,
  limit: number = 50
): Promise<Intervention[]> {
  const { data, error } = await supabase
    .from('teacher_interventions')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching student interventions:', error);
    throw error;
  }

  return data || [];
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(
  alertId: string,
  teacherId: string
): Promise<void> {
  const { error } = await supabase
    .from('student_alerts')
    .update({
      status: 'acknowledged',
      acknowledged_by: teacherId,
      acknowledged_at: new Date().toISOString(),
    })
    .eq('id', alertId);

  if (error) {
    console.error('Error acknowledging alert:', error);
    throw error;
  }
}

/**
 * Resolve an alert
 */
export async function resolveAlert(alertId: string): Promise<void> {
  const { error } = await supabase
    .from('student_alerts')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', alertId);

  if (error) {
    console.error('Error resolving alert:', error);
    throw error;
  }
}

/**
 * Dismiss an alert
 */
export async function dismissAlert(alertId: string): Promise<void> {
  const { error } = await supabase
    .from('student_alerts')
    .update({
      status: 'dismissed',
    })
    .eq('id', alertId);

  if (error) {
    console.error('Error dismissing alert:', error);
    throw error;
  }
}

/**
 * Create a student alert (typically called by system, not directly by teachers)
 */
export async function createStudentAlert(
  studentId: string,
  alertType: 'stuck' | 'frustrated' | 'off_topic' | 'struggling' | 'inactive' | 'breakthrough' | 'mastery',
  severity: 'low' | 'medium' | 'high' | 'critical',
  title: string,
  description?: string,
  sessionId?: string,
  competencyCode?: string,
  metadata?: Record<string, any>
): Promise<string> {
  const { data, error } = await supabase.rpc('create_student_alert', {
    p_student_id: studentId,
    p_alert_type: alertType,
    p_severity: severity,
    p_title: title,
    p_description: description || null,
    p_session_id: sessionId || null,
    p_competency_code: competencyCode || null,
    p_metadata: metadata ? JSON.stringify(metadata) : null,
  });

  if (error) {
    console.error('Error creating student alert:', error);
    throw error;
  }

  return data;
}

/**
 * Assign student to teacher's class
 */
export async function assignStudentToClass(
  teacherId: string,
  studentId: string,
  className: string,
  subject?: string
): Promise<void> {
  const { error } = await supabase
    .from('teacher_students')
    .insert({
      teacher_id: teacherId,
      student_id: studentId,
      class_name: className,
      subject,
    });

  if (error) {
    console.error('Error assigning student to class:', error);
    throw error;
  }
}

/**
 * Remove student from teacher's class
 */
export async function removeStudentFromClass(
  teacherId: string,
  studentId: string,
  className: string
): Promise<void> {
  const { error } = await supabase
    .from('teacher_students')
    .update({ status: 'inactive' })
    .eq('teacher_id', teacherId)
    .eq('student_id', studentId)
    .eq('class_name', className);

  if (error) {
    console.error('Error removing student from class:', error);
    throw error;
  }
}

/**
 * Get student's recent chat sessions
 */
export async function getStudentRecentSessions(
  studentId: string,
  limit: number = 10
): Promise<any[]> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', studentId)
    .eq('status', 'active')
    .order('last_message_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching student sessions:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get student's learning progress by subject
 */
export async function getStudentProgressBySubject(
  studentId: string
): Promise<Record<string, any>> {
  const { data, error } = await supabase
    .from('learning_progress')
    .select('*')
    .eq('user_id', studentId)
    .order('last_practiced_at', { ascending: false });

  if (error) {
    console.error('Error fetching student progress:', error);
    throw error;
  }

  // Group by subject
  const progressBySubject: Record<string, any> = {};
  data?.forEach((item) => {
    if (!progressBySubject[item.subject]) {
      progressBySubject[item.subject] = {
        subject: item.subject,
        competencies: [],
        totalCompetencies: 0,
        mastered: 0,
        proficient: 0,
        developing: 0,
        emerging: 0,
        averageProgress: 0,
      };
    }

    progressBySubject[item.subject].competencies.push(item);
    progressBySubject[item.subject].totalCompetencies++;
    progressBySubject[item.subject][item.mastery_level]++;
  });

  // Calculate averages
  Object.values(progressBySubject).forEach((subject: any) => {
    const totalProgress = subject.competencies.reduce(
      (sum: number, comp: any) => sum + comp.progress_percentage,
      0
    );
    subject.averageProgress = Math.round(totalProgress / subject.totalCompetencies);
  });

  return progressBySubject;
}

/**
 * Subscribe to real-time alerts (for live dashboard updates)
 */
export function subscribeToAlerts(
  teacherId: string,
  callback: (alert: StudentAlert) => void
) {
  const subscription = supabase
    .channel('teacher-alerts')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'student_alerts',
      },
      async (payload) => {
        // Check if this alert is for one of the teacher's students
        const { data: isTeacherStudent } = await supabase
          .from('teacher_students')
          .select('id')
          .eq('teacher_id', teacherId)
          .eq('student_id', payload.new.student_id)
          .eq('status', 'active')
          .single();

        if (isTeacherStudent) {
          // Fetch student name
          const { data: student } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', payload.new.student_id)
            .single();

          callback({
            alert_id: payload.new.id,
            student_id: payload.new.student_id,
            student_name: student?.full_name || 'Unknown',
            alert_type: payload.new.alert_type,
            severity: payload.new.severity,
            title: payload.new.title,
            description: payload.new.description,
            session_id: payload.new.session_id,
            competency_code: payload.new.competency_code,
            created_at: payload.new.created_at,
          });
        }
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}
