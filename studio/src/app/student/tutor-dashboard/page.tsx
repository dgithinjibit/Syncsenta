'use client';

/**
 * Student Tutor Dashboard Page
 * 
 * Main entry point for interactive lessons.
 * Shows available lessons and progress.
 */

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Clock, CheckCircle2, PlayCircle, Brain } from 'lucide-react';
import { StudentHeader } from '@/components/layout/student-header';

// Available lessons (hardcoded for MVP)
const availableLessons = [
  {
    id: 'grade4-fractions-intro',
    title: 'Introduction to Fractions',
    subject: 'Mathematics',
    grade: 'Grade 4',
    strand: 'Numbers',
    subStrand: 'Fractions',
    estimatedTime: 15,
    difficulty: 'beginner' as const,
    description: 'Learn about fractions using Kenyan examples like chapati and mandazi!',
    learningOutcomes: [
      'Understand fractions as parts of a whole',
      'Identify numerator and denominator',
      'Represent fractions visually',
    ],
  },
];

export default function TutorDashboardPage() {
  const router = useRouter();

  // Load progress from localStorage
  const getProgress = (lessonId: string) => {
    try {
      const studentId = 'user1'; // TODO: Get from auth
      const saved = localStorage.getItem(`lesson-progress-${studentId}-${lessonId}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
    return null;
  };

  const startLesson = (lessonId: string) => {
    router.push(`/student/tutor-dashboard/lesson/${lessonId}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <StudentHeader showBackButton={true} onBack={() => router.push('/student')} />

      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              Interactive Lessons
            </h1>
            <p className="text-muted-foreground mt-2">
              Learn through hands-on, interactive lessons powered by state-of-the-art learning technology
            </p>
          </div>

          {/* Info Card */}
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">How Interactive Lessons Work</h3>
                  <p className="text-sm text-muted-foreground">
                    These lessons adapt to your learning pace. You'll interact with visual tools, answer questions, 
                    and get instant feedback. The system tracks your progress and provides hints when you need help!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lessons Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availableLessons.map((lesson) => {
              const progress = getProgress(lesson.id);
              const isCompleted = progress?.status === 'completed';
              const isInProgress = progress?.status === 'in_progress';

              return (
                <Card key={lesson.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{lesson.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {lesson.grade} • {lesson.subject}
                        </CardDescription>
                      </div>
                      {isCompleted && (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="outline" className="text-xs">
                        {lesson.strand}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {lesson.difficulty}
                      </Badge>
                      <Badge variant="outline" className="text-xs gap-1">
                        <Clock className="h-3 w-3" />
                        {lesson.estimatedTime} min
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {lesson.description}
                    </p>

                    {/* Learning Outcomes */}
                    <div>
                      <p className="text-xs font-medium mb-2">You'll learn to:</p>
                      <ul className="space-y-1">
                        {lesson.learningOutcomes.slice(0, 2).map((outcome, index) => (
                          <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{outcome}</span>
                          </li>
                        ))}
                        {lesson.learningOutcomes.length > 2 && (
                          <li className="text-xs text-muted-foreground">
                            + {lesson.learningOutcomes.length - 2} more...
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Progress Bar (if in progress) */}
                    {isInProgress && progress && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>In Progress</span>
                          <span>{Math.round((progress.completedNodes?.length || 0) / 10 * 100)}%</span>
                        </div>
                        <Progress value={(progress.completedNodes?.length || 0) / 10 * 100} className="h-1" />
                      </div>
                    )}

                    {/* Action Button */}
                    <Button
                      onClick={() => startLesson(lesson.id)}
                      className="w-full"
                      variant={isCompleted ? 'outline' : 'default'}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Review Lesson
                        </>
                      ) : isInProgress ? (
                        <>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Continue
                        </>
                      ) : (
                        <>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Start Lesson
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Coming Soon */}
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold mb-1">More Lessons Coming Soon!</h3>
              <p className="text-sm text-muted-foreground">
                We're creating more interactive lessons for all CBC subjects and grades.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
