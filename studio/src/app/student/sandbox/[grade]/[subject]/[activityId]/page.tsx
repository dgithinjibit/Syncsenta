'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { StudentHeader } from '@/components/layout/student-header';
import { FloatingConceptChat } from '@/components/student/floating-concept-chat';
import { getActivityById } from '@/lib/sandbox/sandbox-activities';
import { submitActivity } from '@/lib/sandbox/sandbox-submission';
import type { Activity, Manipulative } from '@/lib/sandbox/sandbox-types';

// Two renderers — we pick based on whether the activity has been
// classified into a canvas manipulative. Un-classified entries
// continue to use the worksheet renderer; the migration is gradual.
import GenericActivity from '@/components/sandbox/activities/GenericActivity';
import {
  InteractiveSandbox,
  type SandboxActivityType,
  type SandboxCompletionResult,
  type SandboxVariation,
} from '@/components/student/interactive-sandbox';

function manipulativeToActivityType(
  m: Manipulative | undefined,
): SandboxActivityType | null {
  if (m === 'fraction-bars') return 'fractions';
  if (m === 'tokens') return 'counting';
  return null;
}

function variationsFor(activity: Activity): SandboxVariation[] | undefined {
  if (activity.variations && activity.variations.length > 0) {
    return activity.variations.map((v) => ({
      question: v.question,
      correctAnswerValue: v.targetValue,
      correctAnswerLabel: v.targetLabel,
    }));
  }
  if (activity.targetValue !== undefined) {
    return [
      {
        question: activity.description,
        correctAnswerValue: activity.targetValue,
        correctAnswerLabel: activity.targetLabel,
      },
    ];
  }
  return undefined;
}

export default function ActivityPage() {
  const params = useParams();
  const router = useRouter();
  const activityId = params.activityId as string;
  const grade = params.grade as string;
  const subject = params.subject as string;

  // The catalogue is local and synchronous; derive it directly so a browser
  // hydration/HMR hiccup cannot leave the learner on an infinite loading state.
  const activity = getActivityById(activityId) ?? null;

  const handleBack = () => {
    router.push(`/student/sandbox/${grade}/${subject}`);
  };

  // Shared progress-persistence used by both renderers.
  const { user } = useAuth();

  // ── Redis resume state ────────────────────────────────────────────────────
  // On mount, fetch the Redis learning session and restore the variation index
  // if this activity is the one the student was last working on.
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
          setResumeVariationIndex(ca.data.currentVariationIndex as number);
        }
      })
      .catch(() => {/* degraded — start from 0 */})
      .finally(() => setResumeLoaded(true));
  }, [user?.id, activityId]);

  // Ref to track current variation for save-on-step
  const currentVariationRef = useRef(resumeVariationIndex);
  currentVariationRef.current = resumeVariationIndex;

  const persistCompletion = async (score: number) => {
    if (user?.id) {
      try {
        const difficulty = activity?.difficulty ?? 3;
        const difficultyLevel: 'easy' | 'medium' | 'hard' =
          difficulty <= 2 ? 'easy' : difficulty <= 4 ? 'medium' : 'hard';

        await submitActivity({
          student_id: user.id,
          activity_type: activity?.type ?? 'practice',
          grade,
          subject,
          difficulty: difficultyLevel,
          score,
          time_spent: Math.ceil(score / 10),
          answers: {
            activityId,
            mastered: true,
          },
        });
      } catch (err) {
        console.error('Failed to persist sandbox completion to Supabase:', err);
      }
    } else {
      const progressKey = `sandbox-progress-${grade}-${subject}`;
      const savedProgress = localStorage.getItem(progressKey);
      const progress = savedProgress ? JSON.parse(savedProgress) : {
        completedActivityIds: [],
        totalPoints: 0,
        currentStreak: 0,
      };
      if (!progress.completedActivityIds.includes(activityId)) {
        progress.completedActivityIds.push(activityId);
        progress.totalPoints += score;
        localStorage.setItem(progressKey, JSON.stringify(progress));
      }
    }

    // Fire-and-forget: clear Redis currentActivity now that this activity is
    // complete so the subject page no longer shows a stale resume banner.
    if (user?.id) {
      fetch('/api/session/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          action: 'save',
          sessionData: { currentActivity: null },
        }),
      }).catch(() => {/* non-critical */});
    }

    router.push(`/student/sandbox/${grade}/${subject}`);
  };

  // GenericActivity already gives us (score, timeSpent). InteractiveSandbox
  // gives us a richer SandboxCompletionResult — we collapse it to the same
  // shape so the persistence path stays singular.
  const handleGenericComplete = (score: number, _timeSpent: number) => {
    persistCompletion(score);
  };

  const handleSandboxComplete = (result: SandboxCompletionResult) => {
    if (!result.mastered) {
      // Partial progress: save current variation index to Redis so the student
      // can resume from where they left off.
      if (user?.id) {
        const completionPercent = Math.round(
          (result.score / (activity?.masteryThreshold ?? 1)) * 100,
        );
        fetch('/api/session/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            action: 'save',
            sessionData: {
              currentActivity: {
                id: activityId,
                name: activity?.title ?? activityId,
                subject,
                progress: completionPercent,
                data: {
                  currentVariationIndex: result.score, // score = variations passed
                },
              },
            },
          }),
        }).catch(() => {/* non-critical */});
      }
      return;
    }
    persistCompletion(result.score * 10);
  };

  if (!activity) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Activity Not Found</h2>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-primary text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const sandboxActivityType = manipulativeToActivityType(activity.manipulative);
  const sandboxVariations = variationsFor(activity);
  const canvasReady = sandboxActivityType !== null && sandboxVariations !== undefined;

  // Don't render the canvas until we know the resume state (avoids a flash
  // that starts at variation 0 before the Redis response arrives).
  if (!resumeLoaded) {
    return (
      <div className="education-shell">
        <StudentHeader showBackButton onBack={handleBack} variant="catalog" />
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8 animate-pulse">
          <div className="h-96 rounded-2xl bg-teal-50" />
        </div>
      </div>
    );
  }

  return (
    <div className="education-shell">
      <StudentHeader showBackButton onBack={handleBack} variant="catalog" />

      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8">
        {canvasReady && sandboxActivityType && sandboxVariations ? (
          <InteractiveSandbox
            key={`${activity.id}-${resumeVariationIndex}`}
            activityType={sandboxActivityType}
            competency={
              activity.competency ??
              `${activity.subject.toUpperCase()}.${activity.grade.toUpperCase()}.${activity.id}`
            }
            grade={activity.grade}
            subject={activity.subject}
            question={sandboxVariations[0].question}
            correctAnswerValue={sandboxVariations[0].correctAnswerValue}
            correctAnswerLabel={sandboxVariations[0].correctAnswerLabel}
            variations={sandboxVariations}
            masteryThreshold={
              activity.masteryThreshold ??
              Math.min(2, sandboxVariations.length)
            }
            lessonId={activity.id}
            media={activity.media}
            initialVariationIndex={resumeVariationIndex}
            onComplete={handleSandboxComplete}
          />
        ) : (
          <GenericActivity
            activity={activity}
            onComplete={handleGenericComplete}
            onBack={handleBack}
          />
        )}
      </div>
      <FloatingConceptChat
        studentName={
          typeof user?.user_metadata?.full_name === 'string'
            ? user.user_metadata.full_name
            : 'Student'
        }
        grade={`Grade ${grade.replace(/^g/, '')}`}
        subject={subject
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')}
      />
    </div>
  );
}

// Made with Bob
