'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { StudentHeader } from '@/components/layout/student-header';
import { FloatingConceptChat } from '@/components/student/floating-concept-chat';
import { getActivityById } from '@/lib/sandbox/sandbox-activities';
import { submitActivity } from '@/lib/sandbox/sandbox-submission';
import type { Activity, Manipulative } from '@/lib/sandbox/sandbox-types';
import GenericActivity from '@/components/sandbox/activities/GenericActivity';
import { InteractiveSandbox, type SandboxActivityType, type SandboxCompletionResult, type SandboxVariation } from '@/components/student/interactive-sandbox';

function manipulativeToActivityType(m: Manipulative | undefined): SandboxActivityType | null {
  if (m === 'fraction-bars') return 'fractions';
  if (m === 'tokens') return 'counting';
  return null;
}

function variationsFor(activity: Activity): SandboxVariation[] | undefined {
  if (activity.variations && activity.variations.length > 0) {
    return activity.variations.map((v) => ({ question: v.question, correctAnswerValue: v.targetValue, correctAnswerLabel: v.targetLabel }));
  }
  if (activity.targetValue !== undefined) {
    return [{ question: activity.description, correctAnswerValue: activity.targetValue, correctAnswerLabel: activity.targetLabel }];
  }
  return undefined;
}

function toCompetencyName(activity: Activity): string {
  return activity.competency ?? activity.title;
}

export default function ActivityPage() {
  const params = useParams();
  const router = useRouter();
  const activityId = params.activityId as string;
  const grade = params.grade as string;
  const subject = params.subject as string;
  const activity = getActivityById(activityId) ?? null;
  const { user, profile } = useAuth();

  const handleBack = () => router.push(`/student/sandbox/${grade}/${subject}`);

  const [resumeVariationIndex, setResumeVariationIndex] = useState(0);
  const [resumeLoaded, setResumeLoaded] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setResumeLoaded(true);
      return;
    }
    fetch('/api/session/sync?action=get')
      .then((r) => (r.ok ? r.json() : { session: null }))
      .then(({ session }) => {
        const ca = session?.currentActivity;
        if (ca?.id === activityId && ca?.data?.currentVariationIndex != null) {
          const index = Number(ca.data.currentVariationIndex);
          if (Number.isInteger(index) && index >= 0) setResumeVariationIndex(index);
        }
      })
      .catch(() => {})
      .finally(() => setResumeLoaded(true));
  }, [user?.id, activityId]);

  const currentVariationRef = useRef(resumeVariationIndex);
  currentVariationRef.current = resumeVariationIndex;

  const persistCompletion = async (score: number) => {
    if (user?.id) {
      try {
        const difficulty = activity?.difficulty ?? 3;
        const difficultyLevel: 'easy' | 'medium' | 'hard' = difficulty <= 2 ? 'easy' : difficulty <= 4 ? 'medium' : 'hard';
        await submitActivity({
          student_id: user.id,
          activity_type: activity?.type ?? 'practice',
          grade,
          subject,
          difficulty: difficultyLevel,
          score,
          time_spent: Math.ceil(score / 10),
          answers: { activityId, mastered: true },
        });
      } catch (err) {
        console.error('Failed to persist sandbox completion to Supabase:', err);
      }
    } else {
      const progressKey = `sandbox-progress-${grade}-${subject}`;
      const savedProgress = localStorage.getItem(progressKey);
      const progress = savedProgress ? JSON.parse(savedProgress) : { completedActivityIds: [], totalPoints: 0, currentStreak: 0 };
      if (!progress.completedActivityIds.includes(activityId)) {
        progress.completedActivityIds.push(activityId);
        progress.totalPoints += score;
        localStorage.setItem(progressKey, JSON.stringify(progress));
      }
    }
    if (user?.id) {
      fetch('/api/session/sync', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action: 'save', sessionData: { currentActivity: null } }),
      }).catch(() => {});
    }
    router.push(`/student/sandbox/${grade}/${subject}`);
  };

  const handleGenericComplete = (score: number, _timeSpent: number) => persistCompletion(score);

  const handleSandboxComplete = (result: SandboxCompletionResult) => {
    if (!result.mastered) {
      if (user?.id) {
        const completionPercent = Math.round((result.score / (activity?.masteryThreshold ?? 1)) * 100);
        fetch('/api/session/sync', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id, action: 'save',
            sessionData: {
              currentActivity: {
                id: activityId,
                name: activity?.title ?? activityId,
                subject,
                progress: completionPercent,
                data: { currentVariationIndex: Math.max(0, result.attempts.at(-1)?.index ?? result.score) + (result.attempts.at(-1)?.correct ? 1 : 0) },
              },
            },
          }),
        }).catch(() => {});
      }
      return;
    }
    persistCompletion(result.score * 10);
  };

  if (!activity) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><h2 className="text-2xl font-bold mb-4">Activity Not Found</h2><button onClick={handleBack} className="px-4 py-2 bg-primary text-white rounded-lg">Go Back</button></div></div>;
  }

  const sandboxActivityType = manipulativeToActivityType(activity.manipulative);
  const sandboxVariations = variationsFor(activity);
  const canvasReady = sandboxActivityType !== null && sandboxVariations !== undefined;

  if (!resumeLoaded) {
    return <div className="education-shell"><StudentHeader showBackButton onBack={handleBack} variant="catalog" /><div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8 animate-pulse"><div className="h-96 rounded-2xl bg-teal-50" /></div></div>;
  }

  const studentName = profile?.full_name ?? 'Student';
  const language = (profile?.language_preference as 'english' | 'kiswahili' | 'mixed') ?? 'mixed';
  const competencyCode = activity.competency ?? `${activity.subject.toUpperCase()}.${activity.grade.toUpperCase()}.${activity.id}`;

  return (
    <div className="education-shell">
      <StudentHeader showBackButton onBack={handleBack} variant="catalog" />
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8">
        {canvasReady && sandboxActivityType && sandboxVariations ? (
          <InteractiveSandbox
            key={`${activity.id}-${resumeVariationIndex}`}
            activityType={sandboxActivityType}
            competency={competencyCode}
            grade={activity.grade}
            subject={activity.subject}
            question={sandboxVariations[0].question}
            correctAnswerValue={sandboxVariations[0].correctAnswerValue}
            correctAnswerLabel={sandboxVariations[0].correctAnswerLabel}
            variations={sandboxVariations}
            masteryThreshold={activity.masteryThreshold ?? Math.min(2, sandboxVariations.length)}
            lessonId={activity.id}
            media={activity.media}
            initialVariationIndex={resumeVariationIndex}
            onComplete={handleSandboxComplete}
          />
        ) : (
          <GenericActivity activity={activity} onComplete={handleGenericComplete} onBack={handleBack} />
        )}
      </div>
      <FloatingConceptChat
        studentName={studentName}
        grade={activity.grade}
        language={language}
        subject={activity.subject}
        competencyCode={competencyCode}
        competencyName={toCompetencyName(activity)}
        question={activity.description || activity.title}
      />
    </div>
  );
}
