"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { StudentHeader } from '@/components/layout/student-header';
import { FloatingConceptChat } from '@/components/student/floating-concept-chat';
import { ArrowLeft, Clock, Target, Trophy, Star, Lock, Calendar, AlertTriangle, Info } from 'lucide-react';
import { getActivitiesForGradeSubject, getRecommendedActivities, getTermStatistics } from '@/lib/sandbox/sandbox-activities';
import { Activity, GradeId, SubjectId } from '@/lib/sandbox/sandbox-types';
import { getCurrentTerm, getTermName, formatTermInfo, getDateWarningMessage, isDeviceDateReasonable } from '@/lib/curriculum/term-utils';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function SandboxPage() {
  const params = useParams();
  const router = useRouter();
  const grade = params.grade as GradeId;
  const subject = params.subject as SubjectId;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [completedActivityIds, setCompletedActivityIds] = useState<string[]>([]);
  const [recommendedActivities, setRecommendedActivities] = useState<Activity[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [currentTerm, setCurrentTerm] = useState<number>(1);
  const [dateWarning, setDateWarning] = useState<string | null>(null);

  useEffect(() => {
    // Check device date and get current term
    const term = getCurrentTerm();
    setCurrentTerm(term);

    const warning = getDateWarningMessage();
    setDateWarning(warning);

    // Load activities for this grade and subject (with term filtering)
    const allActivities = getActivitiesForGradeSubject(grade, subject, true);
    setActivities(allActivities);

    // Load student progress from localStorage (in production, use Firebase)
    const savedProgress = localStorage.getItem(`sandbox-progress-${grade}-${subject}`);
    if (savedProgress) {
      const progress = JSON.parse(savedProgress);
      setCompletedActivityIds(progress.completedActivityIds || []);
      setTotalPoints(progress.totalPoints || 0);
      setCurrentStreak(progress.currentStreak || 0);
    } else {
      setCompletedActivityIds([]);
      setTotalPoints(0);
      setCurrentStreak(0);
    }
  }, [grade, subject]);

  useEffect(() => {
    setRecommendedActivities(getRecommendedActivities(grade, subject, completedActivityIds));
  }, [grade, subject, completedActivityIds]);

  const handleBack = () => {
    router.push('/student/sandbox');
  };

  const isActivityLocked = (activity: Activity): boolean => {
    return activity.prerequisites.some(prereq => !completedActivityIds.includes(prereq));
  };

  const getCompletionPercentage = (): number => {
    if (activities.length === 0) return 0;
    return Math.round((completedActivityIds.length / activities.length) * 100);
  };

  const getGradeName = (gradeId: GradeId): string => {
    return `Grade ${gradeId.replace('g', '')}`;
  };

  const getSubjectName = (subjectId: SubjectId): string => {
    return subjectId.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const activityTypeLabels = {
    explore: 'Explore',
    practice: 'Practice',
    challenge: 'Challenge',
    create: 'Create'
  };

  return (
    <div className="education-shell">
      <StudentHeader showBackButton onBack={handleBack} variant="catalog" />
      
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8">
        {/* Date Warning Alert */}
        {dateWarning && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Device Date Issue</AlertTitle>
            <AlertDescription>{dateWarning}</AlertDescription>
          </Alert>
        )}

        {/* Term Information Alert */}
        <Alert className="mb-6 border-teal-200 bg-[#eaf6f3]">
          <Calendar className="h-4 w-4 text-teal-700" />
          <AlertTitle className="text-teal-950">
            Current Term: {getTermName(currentTerm as 1 | 2 | 3)}
          </AlertTitle>
          <AlertDescription className="text-teal-800">
            {formatTermInfo(currentTerm as 1 | 2 | 3)} • You're seeing content available up to this term
          </AlertDescription>
        </Alert>

        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="education-kicker mb-2">Practice studio</p>
              <h1 className="mb-2 font-headline text-3xl font-bold text-foreground sm:text-4xl">
                {getSubjectName(subject)} Sandbox
              </h1>
              <p className="text-base text-muted-foreground sm:text-lg">
                {getGradeName(grade)} • Interactive Learning Activities
              </p>
            </div>
            <div className="flex gap-4">
              <Card className="border-amber-200 bg-[#fffaf0] p-4 shadow-none">
                <div className="flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Points</p>
                    <p className="text-2xl font-bold">{totalPoints}</p>
                  </div>
                </div>
              </Card>
              <Card className="border-amber-200 bg-[#fffaf0] p-4 shadow-none">
                <div className="flex items-center gap-2">
                  <Star className="w-6 h-6 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Streak</p>
                    <p className="text-2xl font-bold">{currentStreak} days</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Progress Bar */}
          <Card className="border-teal-100 bg-card/90 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Overall Progress</p>
              <p className="text-sm text-muted-foreground">
                {completedActivityIds.length} of {activities.length} activities completed
              </p>
            </div>
            <Progress value={getCompletionPercentage()} className="h-3" />
          </Card>
        </div>

        {/* Recommended Activities */}
        {recommendedActivities.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Target className="h-6 w-6 text-accent" />
              Recommended for You
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {recommendedActivities.map((activity) => (
                <Link 
                  key={activity.id} 
                  href={`/student/sandbox/${grade}/${subject}/${activity.id}`}
                >
                  <Card className="h-full border-primary/50 transition-all duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-[0_16px_32px_hsl(174_30%_16%/0.12)]">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="text-4xl mb-2">{activity.icon}</div>
                        <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                          Recommended
                        </Badge>
                      </div>
                      <CardTitle className="text-xl">{activity.title}</CardTitle>
                      <CardDescription>{activity.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {activity.estimatedTime} min
                        </div>
                        <Badge variant="outline">{activityTypeLabels[activity.type]}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All Activities by Type and Term */}
        {['explore', 'practice', 'challenge', 'create'].map((type) => {
          const typeActivities = activities.filter(a => a.type === type);
          if (typeActivities.length === 0) return null;

          return (
            <div key={type} className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold capitalize">
                  {activityTypeLabels[type as keyof typeof activityTypeLabels]} Activities
                </h2>
                <Badge variant="outline" className="text-sm">
                  {typeActivities.length} {typeActivities.length === 1 ? 'activity' : 'activities'}
                </Badge>
              </div>
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                {typeActivities.map((activity) => {
                  const isLocked = isActivityLocked(activity);
                  const isCompleted = completedActivityIds.includes(activity.id);

                  return (
                    <Link
                      key={activity.id}
                      href={isLocked ? '#' : `/student/sandbox/${grade}/${subject}/${activity.id}`}
                      className={cn(
                        "block",
                        isLocked && 'pointer-events-none cursor-not-allowed'
                      )}
                    >
                      <Card className={cn(
                        "h-full transition-all",
                        isLocked && "opacity-50 cursor-not-allowed",
                        !isLocked && "cursor-pointer hover:-translate-y-1 hover:border-primary hover:shadow-[0_16px_32px_hsl(174_30%_16%/0.12)]",
                        isCompleted && "border-2 border-emerald-500"
                      )}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className="text-4xl mb-2">{activity.icon}</div>
                              {activity.term && (
                                <Badge variant="secondary" className="text-xs">
                                  T{activity.term}
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-1">
                              {isLocked && <Lock className="w-5 h-5 text-gray-400" />}
                              {isCompleted && <Star className="w-5 h-5 text-green-500 fill-green-500" />}
                            </div>
                          </div>
                          <CardTitle className="text-lg">{activity.title}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {activity.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              {activity.estimatedTime} min
                            </div>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                activity.color.replace('bg-', 'border-'),
                                'text-xs'
                              )}
                            >
                              Level {activity.difficulty}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {activities.length === 0 && (
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">🚧</div>
            <h3 className="text-2xl font-bold mb-2">Coming Soon!</h3>
            <p className="mb-4 text-muted-foreground">
              We're building amazing activities for {getSubjectName(subject)} in {getGradeName(grade)}.
            </p>
            <Button onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Choose Another Subject
            </Button>
          </Card>
        )}
      </div>
      <FloatingConceptChat
        studentName="Student"
        grade={getGradeName(grade)}
        subject={getSubjectName(subject)}
      />
    </div>
  );
}

// Made with Bob
