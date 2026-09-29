/**
 * Analytics Tab
 * 
 * Displays class performance analytics with charts and trends.
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Users, Target, MessageSquare, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { activityDateInTimeZone, activityDateOffset } from '@/lib/time/activity-date';

interface AnalyticsTabProps {
  teacherId: string;
  className: string;
}

export function AnalyticsTab({ teacherId, className }: AnalyticsTabProps) {
  const [loading, setLoading] = useState(true);
  const [weeklyActivity, setWeeklyActivity] = useState<any[]>([]);
  const [masteryDistribution, setMasteryDistribution] = useState<any[]>([]);
  const [topCompetencies, setTopCompetencies] = useState<any[]>([]);
  const [engagementMetrics, setEngagementMetrics] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, [teacherId, className]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadWeeklyActivity(),
        loadMasteryDistribution(),
        loadTopCompetencies(),
        loadEngagementMetrics(),
      ]);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWeeklyActivity = async () => {
    // Get last 7 days of activity.
    //
    // The day labels must be built on the same boundary `daily_activity` is
    // written on (Africa/Nairobi, see lib/time/activity-date.ts). Deriving them
    // from the teacher's browser clock and UTC meant a teacher in Nairobi
    // between 21:00 and 23:59 was querying a day the learners had not started
    // yet, and the chart read as an empty class.
    const days = [];
    for (let i = 6; i >= 0; i--) {
      days.push(activityDateOffset(i));
    }

    const { data: students } = await supabase
      .from('teacher_students')
      .select('student_id')
      .eq('teacher_id', teacherId)
      .eq('class_name', className)
      .eq('status', 'active');

    if (!students) return;

    const studentIds = students.map((s) => s.student_id);

    const activityData = await Promise.all(
      days.map(async (day) => {
        const { data: activity } = await supabase
          .from('daily_activity')
          .select('messages_sent, time_spent_minutes')
          .in('user_id', studentIds)
          .eq('activity_date', day);

        const totalMessages = activity?.reduce((sum, a) => sum + a.messages_sent, 0) || 0;
        const totalTime = activity?.reduce((sum, a) => sum + a.time_spent_minutes, 0) || 0;
        const activeStudents = activity?.length || 0;

        return {
          // Pinned to UTC: `day` is a calendar date, so interpreting it in the
          // teacher's own zone could relabel Monday as Sunday for anyone behind
          // UTC.
          date: new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', {
            weekday: 'short',
            timeZone: 'UTC',
          }),
          messages: totalMessages,
          time: Math.round(totalTime / 60), // Convert to hours
          students: activeStudents,
        };
      })
    );

    setWeeklyActivity(activityData);
  };

  const loadMasteryDistribution = async () => {
    const { data: students } = await supabase
      .from('teacher_students')
      .select('student_id')
      .eq('teacher_id', teacherId)
      .eq('class_name', className)
      .eq('status', 'active');

    if (!students) return;

    const studentIds = students.map((s) => s.student_id);

    const { data: progress } = await supabase
      .from('learning_progress')
      .select('mastery_level')
      .in('user_id', studentIds);

    const distribution = {
      mastered: 0,
      proficient: 0,
      developing: 0,
      emerging: 0,
    };

    progress?.forEach((p) => {
      if (p.mastery_level in distribution) {
        distribution[p.mastery_level as keyof typeof distribution]++;
      }
    });

    setMasteryDistribution([
      { name: 'Mastered', value: distribution.mastered, color: '#22c55e' },
      { name: 'Proficient', value: distribution.proficient, color: '#3b82f6' },
      { name: 'Developing', value: distribution.developing, color: '#eab308' },
      { name: 'Emerging', value: distribution.emerging, color: '#ef4444' },
    ]);
  };

  const loadTopCompetencies = async () => {
    const { data: students } = await supabase
      .from('teacher_students')
      .select('student_id')
      .eq('teacher_id', teacherId)
      .eq('class_name', className)
      .eq('status', 'active');

    if (!students) return;

    const studentIds = students.map((s) => s.student_id);

    const { data: progress } = await supabase
      .from('learning_progress')
      .select('competency_code, progress_percentage, practice_count')
      .in('user_id', studentIds)
      .order('practice_count', { ascending: false })
      .limit(100);

    // Aggregate by competency
    const competencyMap = new Map<string, { total: number; count: number; practices: number }>();

    progress?.forEach((p) => {
      const existing = competencyMap.get(p.competency_code) || { total: 0, count: 0, practices: 0 };
      competencyMap.set(p.competency_code, {
        total: existing.total + p.progress_percentage,
        count: existing.count + 1,
        practices: existing.practices + p.practice_count,
      });
    });

    const topComps = Array.from(competencyMap.entries())
      .map(([code, data]) => ({
        competency: code,
        avgProgress: Math.round(data.total / data.count),
        practices: data.practices,
      }))
      .sort((a, b) => b.practices - a.practices)
      .slice(0, 10);

    setTopCompetencies(topComps);
  };

  const loadEngagementMetrics = async () => {
    const { data: students } = await supabase
      .from('teacher_students')
      .select('student_id')
      .eq('teacher_id', teacherId)
      .eq('class_name', className)
      .eq('status', 'active');

    if (!students) return;

    const studentIds = students.map((s) => s.student_id);

    // Get today's activity (platform day, matching how learners' rows are written)
    const today = activityDateInTimeZone();
    const { data: todayActivity } = await supabase
      .from('daily_activity')
      .select('messages_sent, time_spent_minutes')
      .in('user_id', studentIds)
      .eq('activity_date', today);

    // Get yesterday's activity for comparison
    const yesterdayStr = activityDateOffset(1);
    const { data: yesterdayActivity } = await supabase
      .from('daily_activity')
      .select('messages_sent, time_spent_minutes')
      .in('user_id', studentIds)
      .eq('activity_date', yesterdayStr);

    const todayMessages = todayActivity?.reduce((sum, a) => sum + a.messages_sent, 0) || 0;
    const todayTime = todayActivity?.reduce((sum, a) => sum + a.time_spent_minutes, 0) || 0;
    const yesterdayMessages = yesterdayActivity?.reduce((sum, a) => sum + a.messages_sent, 0) || 0;
    const yesterdayTime = yesterdayActivity?.reduce((sum, a) => sum + a.time_spent_minutes, 0) || 0;

    const messageChange = yesterdayMessages > 0
      ? Math.round(((todayMessages - yesterdayMessages) / yesterdayMessages) * 100)
      : 0;
    const timeChange = yesterdayTime > 0
      ? Math.round(((todayTime - yesterdayTime) / yesterdayTime) * 100)
      : 0;

    setEngagementMetrics({
      todayMessages,
      todayTime: Math.round(todayTime / 60), // Convert to hours
      messageChange,
      timeChange,
      activeStudents: todayActivity?.length || 0,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Engagement Metrics */}
      {engagementMetrics && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages Today</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{engagementMetrics.todayMessages}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {engagementMetrics.messageChange > 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-green-500">+{engagementMetrics.messageChange}%</span>
                  </>
                ) : engagementMetrics.messageChange < 0 ? (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-500" />
                    <span className="text-red-500">{engagementMetrics.messageChange}%</span>
                  </>
                ) : (
                  <span>No change</span>
                )}
                {' '}from yesterday
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Learning Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{engagementMetrics.todayTime}h</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {engagementMetrics.timeChange > 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-green-500">+{engagementMetrics.timeChange}%</span>
                  </>
                ) : engagementMetrics.timeChange < 0 ? (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-500" />
                    <span className="text-red-500">{engagementMetrics.timeChange}%</span>
                  </>
                ) : (
                  <span>No change</span>
                )}
                {' '}from yesterday
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{engagementMetrics.activeStudents}</div>
              <p className="text-xs text-muted-foreground">
                Engaged today
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Weekly Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Activity Trends</CardTitle>
          <CardDescription>Student engagement over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="messages"
                stroke="#3b82f6"
                name="Messages"
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="students"
                stroke="#22c55e"
                name="Active Students"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Mastery Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Mastery Distribution</CardTitle>
            <CardDescription>Student competency levels across all subjects</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={masteryDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {masteryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Competencies */}
        <Card>
          <CardHeader>
            <CardTitle>Most Practiced Competencies</CardTitle>
            <CardDescription>Top 10 competencies by practice count</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCompetencies} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="competency" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="practices" fill="#3b82f6" name="Practices" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
