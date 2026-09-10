/**
 * Student Progress Dashboard
 * 
 * Displays student learning progress, achievements, and statistics.
 * Shows competency mastery, streaks, and subject-wise breakdown.
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getStudentStats,
  getLearningProgress,
  getAchievements,
  getSubjectProgressSummary,
  type CompetencyProgress,
  type StudentStats,
} from '@/lib/progress/progress-tracking';
import type { Database } from '@/lib/supabase/types';
import { Flame, Trophy, Clock, MessageSquare, Target, Award } from 'lucide-react';

type Achievement = Database['public']['Tables']['achievements']['Row'];

interface ProgressDashboardProps {
  userId: string;
}

export function ProgressDashboard({ userId }: ProgressDashboardProps) {
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [progress, setProgress] = useState<CompetencyProgress[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [subjectSummary, setSubjectSummary] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, progressData, achievementsData, summaryData] = await Promise.all([
        getStudentStats(userId),
        getLearningProgress(userId),
        getAchievements(userId),
        getSubjectProgressSummary(userId),
      ]);

      setStats(statsData);
      setProgress(progressData);
      setAchievements(achievementsData);
      setSubjectSummary(summaryData);
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProgress =
    selectedSubject === 'all'
      ? progress
      : progress.filter((p) => p.subject === selectedSubject);

  const subjects = Array.from(new Set(progress.map((p) => p.subject)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.currentStreak || 0} days</div>
            <p className="text-xs text-muted-foreground">
              Keep it up! Practice daily to maintain your streak
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Competencies Mastered</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.competenciesMastered || 0}</div>
            <p className="text-xs text-muted-foreground">
              {progress.length > 0
                ? `${Math.round(((stats?.competenciesMastered || 0) / progress.length) * 100)}% of total`
                : 'Start practicing to track progress'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Spent Learning</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((stats?.totalTimeMinutes || 0) / 60)}h
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalTimeMinutes || 0} minutes total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questions Asked</CardTitle>
            <MessageSquare className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMessages || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across {stats?.totalSessions || 0} learning sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Achievements</CardTitle>
            <Award className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.achievementsEarned || 0}</div>
            <p className="text-xs text-muted-foreground">
              Badges earned for your hard work
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Sessions</CardTitle>
            <Target className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSessions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total conversations with syncsenta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subject Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Subject Progress</CardTitle>
          <CardDescription>
            Your mastery level across different subjects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(subjectSummary).map(([subject, levels]: [string, any]) => {
              const total =
                levels.mastered + levels.proficient + levels.developing + levels.emerging;
              const masteredPercent = total > 0 ? (levels.mastered / total) * 100 : 0;

              return (
                <div key={subject} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{subject}</span>
                    <span className="text-sm text-muted-foreground">
                      {levels.mastered} / {total} mastered
                    </span>
                  </div>
                  <Progress value={masteredPercent} className="h-2" />
                  <div className="flex gap-2 text-xs">
                    <Badge variant="default" className="bg-green-500">
                      {levels.mastered} Mastered
                    </Badge>
                    <Badge variant="secondary">{levels.proficient} Proficient</Badge>
                    <Badge variant="outline">{levels.developing} Developing</Badge>
                    <Badge variant="outline">{levels.emerging} Emerging</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Competency Details */}
      <Card>
        <CardHeader>
          <CardTitle>Competency Breakdown</CardTitle>
          <CardDescription>
            Detailed progress for each CBC competency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedSubject} onValueChange={setSelectedSubject}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Subjects</TabsTrigger>
              {subjects.map((subject) => (
                <TabsTrigger key={subject} value={subject}>
                  {subject}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedSubject} className="space-y-4">
              {filteredProgress.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No progress data yet. Start learning to see your progress!
                </p>
              ) : (
                filteredProgress.map((comp) => (
                  <div
                    key={comp.competencyCode}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{comp.competencyName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {comp.strand} • {comp.competencyCode}
                        </p>
                      </div>
                      <Badge
                        variant={
                          comp.masteryLevel === 'mastered'
                            ? 'default'
                            : comp.masteryLevel === 'proficient'
                            ? 'secondary'
                            : 'outline'
                        }
                        className={
                          comp.masteryLevel === 'mastered'
                            ? 'bg-green-500'
                            : ''
                        }
                      >
                        {comp.masteryLevel}
                      </Badge>
                    </div>

                    <Progress value={comp.progressPercentage} className="h-2" />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Questions</p>
                        <p className="font-medium">{comp.questionsAsked}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Answered</p>
                        <p className="font-medium">{comp.questionsAnswered}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Accuracy</p>
                        <p className="font-medium">
                          {comp.questionsAnswered > 0
                            ? Math.round(
                                (comp.correctAnswers / comp.questionsAnswered) * 100
                              )
                            : 0}
                          %
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Time Spent</p>
                        <p className="font-medium">{comp.timeSpentMinutes}m</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Achievements */}
      {achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Achievements</CardTitle>
            <CardDescription>
              Badges you've earned on your learning journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="border rounded-lg p-4 text-center space-y-2"
                >
                  <div className="text-4xl">{achievement.badge_icon}</div>
                  <h4 className="font-medium text-sm">{achievement.achievement_name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {achievement.achievement_description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(achievement.earned_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
