/**
 * Progress Tracking System
 * 
 * Tracks student learning progress across CBC competencies.
 * Provides analytics and insights for students, teachers, and parents.
 */

import { supabase } from '../supabase/client';
import type { Database } from '../supabase/types';

type LearningProgress = Database['public']['Tables']['learning_progress']['Row'];
type DailyActivity = Database['public']['Tables']['daily_activity']['Row'];
type Achievement = Database['public']['Tables']['achievements']['Row'];

export type MasteryLevel = 'not_started' | 'emerging' | 'developing' | 'proficient' | 'mastered';

export interface CompetencyProgress {
  competencyCode: string;
  competencyName: string;
  subject: string;
  strand: string;
  masteryLevel: MasteryLevel;
  progressPercentage: number;
  questionsAsked: number;
  questionsAnswered: number;
  /** Derived until topic-level telemetry is persisted separately. */
  questionsAnsweredOnTopic: number;
  correctAnswers: number;
  timeSpentMinutes: number;
  lastPracticedAt: string;
}

export interface StudentStats {
  totalSessions: number;
  totalMessages: number;
  totalTimeMinutes: number;
  currentStreak: number;
  competenciesMastered: number;
  achievementsEarned: number;
}

/**
 * Update learning progress for a competency
 */
export async function updateLearningProgress(
  userId: string,
  competencyCode: string,
  updates: {
    competencyName: string;
    subject: string;
    grade: string;
    strand?: string;
    questionsAsked?: number;
    questionsAnswered?: number;
    correctAnswers?: number;
    timeSpentMinutes?: number;
  }
): Promise<void> {
  // Check if progress record exists
  const existingRes = await supabase
    .from('learning_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('competency_code', competencyCode)
    .single();
  const existing = existingRes.data as any | null;

  if (existing) {
    // Update existing record
    const newQuestionsAsked = existing.questions_asked + (updates.questionsAsked || 0);
    const newQuestionsAnswered = existing.questions_answered + (updates.questionsAnswered || 0);
    const newCorrectAnswers = existing.correct_answers + (updates.correctAnswers || 0);
    const newTimeSpent = existing.time_spent_minutes + (updates.timeSpentMinutes || 0);

    // Calculate new progress percentage
    const accuracyRate = newQuestionsAnswered > 0 
      ? (newCorrectAnswers / newQuestionsAnswered) * 100 
      : 0;
    const engagementScore = Math.min(100, (newQuestionsAsked / 50) * 100); // 50 questions = 100%
    const progressPercentage = Math.round((accuracyRate * 0.7) + (engagementScore * 0.3));

    // Determine mastery level
    const masteryLevel = calculateMasteryLevel(progressPercentage, newQuestionsAnswered);

    const { error } = await supabase
      .from('learning_progress')
      .update({
        questions_asked: newQuestionsAsked,
        questions_answered: newQuestionsAnswered,
        correct_answers: newCorrectAnswers,
        time_spent_minutes: newTimeSpent,
        progress_percentage: progressPercentage,
        mastery_level: masteryLevel,
        last_practiced_at: new Date().toISOString(),
        mastered_at: masteryLevel === 'mastered' && !existing.mastered_at 
          ? new Date().toISOString() 
          : existing.mastered_at,
      })
      .eq('user_id', userId)
      .eq('competency_code', competencyCode);

    if (error) throw error;

    // Check for mastery achievement
    if (masteryLevel === 'mastered' && existing.mastery_level !== 'mastered') {
      await awardAchievement(userId, 'competency_mastered', {
        competencyCode,
        competencyName: updates.competencyName,
      });
    }
  } else {
    // Create new record
    const progressPercentage = updates.questionsAnswered && updates.correctAnswers
      ? Math.round((updates.correctAnswers / updates.questionsAnswered) * 100)
      : 0;

    const { error } = await supabase
      .from('learning_progress')
      .insert({
        user_id: userId,
        subject: updates.subject,
        grade: updates.grade,
        competency_code: competencyCode,
        competency_name: updates.competencyName,
        strand: updates.strand,
        questions_asked: updates.questionsAsked || 0,
        questions_answered: updates.questionsAnswered || 0,
        correct_answers: updates.correctAnswers || 0,
        time_spent_minutes: updates.timeSpentMinutes || 0,
        progress_percentage: progressPercentage,
        mastery_level: calculateMasteryLevel(progressPercentage, updates.questionsAnswered || 0),
      });

    if (error) throw error;
  }
}

/**
 * Calculate mastery level based on progress and engagement
 */
function calculateMasteryLevel(progressPercentage: number, questionsAnswered: number): MasteryLevel {
  if (questionsAnswered === 0) return 'not_started';
  if (progressPercentage >= 90 && questionsAnswered >= 20) return 'mastered';
  if (progressPercentage >= 75 && questionsAnswered >= 15) return 'proficient';
  if (progressPercentage >= 50 && questionsAnswered >= 10) return 'developing';
  return 'emerging';
}

/**
 * Get learning progress for a user
 */
export async function getLearningProgress(
  userId: string,
  subject?: string
): Promise<CompetencyProgress[]> {
  let query = supabase
    .from('learning_progress')
    .select('*')
    .eq('user_id', userId)
    .order('last_practiced_at', { ascending: false });

  if (subject) {
    query = query.eq('subject', subject);
  }

  const queryRes = await query;
  const data = queryRes.data as any[] | null;
  const error = queryRes.error;

  if (error) {
    console.error('Error fetching learning progress:', error);
    throw error;
  }

  return (data || []).map((item: any) => ({
    competencyCode: item.competency_code,
    competencyName: item.competency_name,
    subject: item.subject,
    strand: item.strand || '',
    masteryLevel: item.mastery_level,
    progressPercentage: item.progress_percentage,
    questionsAsked: item.questions_asked,
    questionsAnswered: item.questions_answered,
    questionsAnsweredOnTopic: item.questions_answered,
    correctAnswers: item.correct_answers,
    timeSpentMinutes: item.time_spent_minutes,
    lastPracticedAt: item.last_practiced_at,
  }));
}

/**
 * Update daily activity
 */
export async function updateDailyActivity(
  userId: string,
  updates: {
    messagesSent?: number;
    sessionsStarted?: number;
    timeSpentMinutes?: number;
    subjectsPracticed?: string[];
  }
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // Check if record exists for today
  const existingRes = await supabase
    .from('daily_activity')
    .select('*')
    .eq('user_id', userId)
    .eq('activity_date', today)
    .single();
  const existing = existingRes.data as any | null;

  if (existing) {
    // Update existing record
    const newSubjects = updates.subjectsPracticed
      ? Array.from(new Set([...(existing.subjects_practiced || []), ...updates.subjectsPracticed]))
      : existing.subjects_practiced;

    const updRes = await supabase
        .from('daily_activity')
        .update({
          messages_sent: (existing?.messages_sent || 0) + (updates.messagesSent || 0),
          sessions_started: (existing?.sessions_started || 0) + (updates.sessionsStarted || 0),
          time_spent_minutes: (existing?.time_spent_minutes || 0) + (updates.timeSpentMinutes || 0),
          subjects_practiced: newSubjects,
        })
        .eq('user_id', userId)
        .eq('activity_date', today);
    const { error } = updRes as any;

    if (error) throw error;
  } else {
    // Calculate streak
    const streak = await calculateStreak(userId);

    // Create new record
    const insertRes = await supabase
      .from('daily_activity')
      .insert({
        user_id: userId,
        activity_date: today,
        messages_sent: updates.messagesSent || 0,
        sessions_started: updates.sessionsStarted || 0,
        time_spent_minutes: updates.timeSpentMinutes || 0,
        subjects_practiced: updates.subjectsPracticed || [],
        daily_streak: streak,
      });
    const { error } = insertRes as any;

    if (error) throw error;

    // Check for streak achievements
    if (streak === 7) {
      await awardAchievement(userId, 'streak_7', { streak: 7 });
    } else if (streak === 30) {
      await awardAchievement(userId, 'streak_30', { streak: 30 });
    } else if (streak === 100) {
      await awardAchievement(userId, 'streak_100', { streak: 100 });
    }
  }
}

/**
 * Calculate current streak
 */
async function calculateStreak(userId: string): Promise<number> {
  const streakRes = await supabase
    .from('daily_activity')
    .select('activity_date, daily_streak')
    .eq('user_id', userId)
    .order('activity_date', { ascending: false })
    .limit(2);
  const data = (streakRes as any).data as any[] | null;
  const error = (streakRes as any).error;
  if (error || !data || data.length === 0) return 1;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // If most recent activity is today, return existing streak
  if (data[0].activity_date === today) {
    return data[0].daily_streak;
  }

  // If most recent activity is yesterday, increment streak
  if (data[0].activity_date === yesterday) {
    return data[0].daily_streak + 1;
  }

  // Streak broken, start over
  return 1;
}

/**
 * Award an achievement
 */
export async function awardAchievement(
  userId: string,
  achievementType: string,
  metadata?: Record<string, any>
): Promise<void> {
  // Check if achievement already awarded
  const existingRes = await supabase
    .from('achievements')
    .select('id')
    .eq('user_id', userId)
    .eq('achievement_type', achievementType)
    .single();
  const existing = existingRes.data as any | null;
  if (existing) return; // Already awarded

  // Get achievement details
  const achievementDetails = getAchievementDetails(achievementType, metadata);

  const insertRes = await supabase
    .from('achievements')
    .insert({
      user_id: userId,
      achievement_type: achievementType,
      achievement_name: achievementDetails.name,
      achievement_description: achievementDetails.description,
      badge_icon: achievementDetails.icon,
    });
  const { error } = insertRes as any;
  if (error) {
    console.error('Error awarding achievement:', error);
    throw error;
  }
}

/**
 * Get achievement details
 */
function getAchievementDetails(
  type: string,
  metadata?: Record<string, any>
): { name: string; description: string; icon: string } {
  const achievements: Record<string, { name: string; description: string; icon: string }> = {
    first_session: {
      name: 'First Steps',
      description: 'Started your first learning session with syncsenta',
      icon: '🎯',
    },
    streak_7: {
      name: '7-Day Streak',
      description: 'Practiced for 7 days in a row',
      icon: '🔥',
    },
    streak_30: {
      name: '30-Day Streak',
      description: 'Practiced for 30 days in a row',
      icon: '⭐',
    },
    streak_100: {
      name: '100-Day Streak',
      description: 'Practiced for 100 days in a row',
      icon: '🏆',
    },
    competency_mastered: {
      name: 'Competency Mastered',
      description: `Mastered ${metadata?.competencyName || 'a competency'}`,
      icon: '✅',
    },
    messages_100: {
      name: 'Curious Learner',
      description: 'Asked 100 questions',
      icon: '💬',
    },
    messages_1000: {
      name: 'Super Learner',
      description: 'Asked 1000 questions',
      icon: '🚀',
    },
  };

  return achievements[type] || {
    name: 'Achievement',
    description: 'You earned an achievement!',
    icon: '🎉',
  };
}

/**
 * Get student statistics
 */
export async function getStudentStats(userId: string): Promise<StudentStats> {
  const statsRes = await supabase.rpc('get_user_stats', {
    p_user_id: userId,
  }) as any;
  const data = statsRes.data as any[] | null;
  const error = statsRes.error;
  if (error) {
    console.error('Error fetching student stats:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return {
      totalSessions: 0,
      totalMessages: 0,
      totalTimeMinutes: 0,
      currentStreak: 0,
      competenciesMastered: 0,
      achievementsEarned: 0,
    };
  }

  const stats = data[0];
  return {
    totalSessions: stats.total_sessions,
    totalMessages: stats.total_messages,
    totalTimeMinutes: stats.total_time_minutes,
    currentStreak: stats.current_streak,
    competenciesMastered: stats.competencies_mastered,
    achievementsEarned: stats.achievements_earned,
  };
}

/**
 * Get achievements for a user
 */
export async function getAchievements(userId: string): Promise<Achievement[]> {
  const achRes = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false }) as any;
  const data = achRes.data as any[] | null;
  const error = achRes.error;
  if (error) {
    console.error('Error fetching achievements:', error);
    throw error;
  }
  return data || [];
}

/**
 * Get subject-wise progress summary
 */
export async function getSubjectProgressSummary(
  userId: string
): Promise<Record<string, { mastered: number; proficient: number; developing: number; emerging: number }>> {
  const lpRes = await supabase
    .from('learning_progress')
    .select('subject, mastery_level')
    .eq('user_id', userId) as any;
  const data = lpRes.data as any[] | null;
  const error = lpRes.error;
  if (error) {
    console.error('Error fetching subject progress:', error);
    throw error;
  }

  const summary: Record<string, any> = {};
  (data || []).forEach((item: any) => {
    if (!summary[item.subject]) {
      summary[item.subject] = {
        mastered: 0,
        proficient: 0,
        developing: 0,
        emerging: 0,
      };
    }
    summary[item.subject][item.mastery_level]++;
  });

  return summary;
}
