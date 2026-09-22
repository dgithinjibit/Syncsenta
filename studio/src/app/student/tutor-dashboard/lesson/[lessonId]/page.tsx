'use client';

/**
 * Lesson Player Page
 * 
 * Loads and renders an interactive lesson using the LessonRenderer component.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LessonRenderer } from '@/components/tutor-dashboard/lesson-renderer';
import { parseLessonScript } from '@/components/tutor-dashboard/utils/lesson-parser';
import type { LessonScript } from '@/components/tutor-dashboard/types/lesson-script';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { StudentHeader } from '@/components/layout/student-header';

export default function LessonPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.lessonId as string;

  const [lessonScript, setLessonScript] = useState<LessonScript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load lesson script
  useEffect(() => {
    async function loadLesson() {
      try {
        setLoading(true);
        setError(null);

        // Import the lesson JSON
        const lessonModule = await import(
          `@/components/tutor-dashboard/lessons/${lessonId}.json`
        );
        
        // Parse and validate
        const script = parseLessonScript(JSON.stringify(lessonModule.default || lessonModule));
        setLessonScript(script);
      } catch (err) {
        console.error('Failed to load lesson:', err);
        setError(
          err instanceof Error 
            ? err.message 
            : 'Failed to load lesson. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    }

    if (lessonId) {
      loadLesson();
    }
  }, [lessonId]);

  // Handle lesson completion
  const handleComplete = (interactions: any[]) => {
    console.log('Lesson completed!', { lessonId, interactions });
    // TODO: Send to backend for analytics
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <StudentHeader showBackButton={true} onBack={() => router.back()} />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <div>
                <h2 className="text-lg font-semibold">Loading Lesson...</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Preparing your interactive learning experience
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Error state
  if (error || !lessonScript) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <StudentHeader showBackButton={true} onBack={() => router.back()} />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md border-destructive">
            <CardContent className="pt-6 text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <div>
                <h2 className="text-lg font-semibold">Failed to Load Lesson</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {error || 'The lesson could not be found or loaded.'}
                </p>
              </div>
              <Button
                onClick={() => router.push('/student/tutor-dashboard')}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Lessons
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Render lesson
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <StudentHeader 
        showBackButton={true} 
        onBack={() => {
          if (confirm('Are you sure you want to leave this lesson? Your progress will be saved.')) {
            router.push('/student/tutor-dashboard');
          }
        }} 
      />
      <main className="flex-1 p-6">
        <LessonRenderer
          lessonScript={lessonScript}
          studentId="user1" // TODO: Get from auth
          onComplete={handleComplete}
        />
      </main>
    </div>
  );
}
