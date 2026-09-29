/**
 * Student Report Export API
 *
 * Generates and exports student progress reports as JSON or CSV.
 *
 * There is no PDF branch here, and the header used to claim there was. A PDF
 * report is a Phase 2 deliverable ("automated report card generation") rather
 * than an existing capability, so the comment now matches the code.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { activityDateOffset } from '@/lib/time/activity-date';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a teacher
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can export reports' }, { status: 403 });
    }

    const body = await request.json();
    const { studentId, format = 'json' } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    // Verify teacher has access to this student
    const { data: assignment } = await supabase
      .from('teacher_students')
      .select('*')
      .eq('teacher_id', user.id)
      .eq('student_id', studentId)
      .eq('status', 'active')
      .single();

    if (!assignment) {
      return NextResponse.json({ error: 'Student not found in your classes' }, { status: 404 });
    }

    // Fetch student data
    const { data: student } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', studentId)
      .single();

    // Fetch learning progress
    const { data: progress } = await supabase
      .from('learning_progress')
      .select('*')
      .eq('user_id', studentId)
      .order('last_practiced_at', { ascending: false });

    // Fetch recent sessions
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', studentId)
      .eq('status', 'active')
      .order('last_message_at', { ascending: false })
      .limit(10);

    // Fetch daily activity (last 30 days), on the same day boundary the rows
    // are written on — see lib/time/activity-date.ts.
    const windowStart = activityDateOffset(30);
    const { data: activity } = await supabase
      .from('daily_activity')
      .select('*')
      .eq('user_id', studentId)
      .gte('activity_date', windowStart)
      .order('activity_date', { ascending: false });

    // Fetch achievements
    const { data: achievements } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', studentId)
      .order('earned_at', { ascending: false });

    // Fetch interventions
    const { data: interventions } = await supabase
      .from('teacher_interventions')
      .select('*')
      .eq('student_id', studentId)
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Calculate summary statistics
    const totalMessages = activity?.reduce((sum, a) => sum + a.messages_sent, 0) || 0;
    const totalTime = activity?.reduce((sum, a) => sum + a.time_spent_minutes, 0) || 0;
    const currentStreak = activity?.[0]?.daily_streak || 0;
    const competenciesMastered = progress?.filter((p) => p.mastery_level === 'mastered').length || 0;
    const avgMastery = progress?.length
      ? Math.round(
          progress.reduce((sum, p) => sum + p.progress_percentage, 0) / progress.length
        )
      : 0;

    const report = {
      student: {
        id: student?.id,
        name: student?.full_name,
        email: student?.email,
        grade: student?.grade,
        role: student?.role,
      },
      class: {
        name: assignment.class_name,
        subject: assignment.subject,
        assignedAt: assignment.assigned_at,
      },
      summary: {
        totalMessages,
        totalTimeMinutes: totalTime,
        totalTimeHours: Math.round(totalTime / 60),
        currentStreak,
        competenciesMastered,
        totalCompetencies: progress?.length || 0,
        averageMastery: avgMastery,
        totalSessions: sessions?.length || 0,
        totalAchievements: achievements?.length || 0,
      },
      progress: progress?.map((p) => ({
        subject: p.subject,
        competencyCode: p.competency_code,
        masteryLevel: p.mastery_level,
        progressPercentage: p.progress_percentage,
        practiceCount: p.practice_count,
        lastPracticed: p.last_practiced_at,
      })),
      recentSessions: sessions?.map((s) => ({
        id: s.id,
        title: s.title,
        messageCount: s.message_count,
        lastMessage: s.last_message_at,
        createdAt: s.started_at,
      })),
      activity: activity?.map((a) => ({
        date: a.activity_date,
        messages: a.messages_sent,
        timeMinutes: a.time_spent_minutes,
        streak: a.daily_streak,
      })),
      achievements: achievements?.map((a) => ({
        type: a.achievement_type,
        title: a.achievement_name,
        description: a.achievement_description,
        earnedAt: a.earned_at,
      })),
      interventions: interventions?.map((i) => ({
        type: i.intervention_type,
        message: i.message,
        createdAt: i.created_at,
        competencyCode: i.competency_code,
      })),
      generatedAt: new Date().toISOString(),
      generatedBy: user.id,
    };

    // Return based on format
    if (format === 'csv') {
      // Generate CSV for progress data
      const csvRows = [
        ['Subject', 'Competency', 'Mastery Level', 'Progress %', 'Practice Count', 'Last Practiced'],
        ...(progress?.map((p) => [
          p.subject,
          p.competency_code,
          p.mastery_level,
          p.progress_percentage,
          p.practice_count,
          p.last_practiced_at,
        ]) || []),
      ];

      const csvContent = csvRows.map((row) => row.join(',')).join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="student-report-${studentId}-${Date.now()}.csv"`,
        },
      });
    }

    // Default: return JSON
    return NextResponse.json(report);
  } catch (error) {
    console.error('Export report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
