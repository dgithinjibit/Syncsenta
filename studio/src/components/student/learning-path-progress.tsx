'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Lock, BookOpen } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  getLearningPath,
  calculatePathProgress,
  type LearningPath,
  type LearningCheckpoint,
} from '@/lib/curriculum/learning-paths';
import { getLearningProgress } from '@/lib/progress/progress-tracking';

interface LearningPathProgressProps {
  subject: string;
  grade: string;
  userId: string;
  onSelectCheckpoint?: (competencyCode: string) => void;
}

export function LearningPathProgress({
  subject,
  grade,
  userId,
  onSelectCheckpoint,
}: LearningPathProgressProps) {
  const [path, setPath] = useState<LearningPath | null>(null);
  const [masteredCompetencies, setMasteredCompetencies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<{
    totalCheckpoints: number;
    completedCheckpoints: number;
    percentComplete: number;
    currentCheckpoint: LearningCheckpoint | undefined;
  }>({
    totalCheckpoints: 0,
    completedCheckpoints: 0,
    percentComplete: 0,
    currentCheckpoint: undefined,
  });

  useEffect(() => {
    const loadPathData = async () => {
      try {
        setLoading(true);

        // Get the learning path for this subject/grade
        const learningPath = getLearningPath(subject, grade);
        setPath(learningPath ?? null);

        if (!learningPath) {
          setLoading(false);
          return;
        }

        // Get student's progress on all competencies in this path
        const progressData = await getLearningProgress(userId, subject);
        const mastered = progressData
          .filter((p) => p.masteryLevel === 'mastered')
          .map((p) => p.competencyCode);

        setMasteredCompetencies(mastered);

        // Calculate path progress
        const pathProgress = calculatePathProgress(learningPath, mastered);
        setProgress(pathProgress);
      } catch (error) {
        console.error('Error loading learning path:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPathData();
  }, [subject, grade, userId]);

  if (loading) {
    return (
      <Card className="p-4">
        <div className="text-center text-gray-500">Loading learning path...</div>
      </Card>
    );
  }

  if (!path) {
    return (
      <Card className="p-4 border-2 border-dashed border-gray-300">
        <div className="text-center space-y-3">
          <BookOpen className="w-12 h-12 mx-auto text-gray-400" />
          <div>
            <h4 className="font-semibold text-gray-700">No Learning Path Available</h4>
            <p className="text-sm text-gray-600 mt-2">
              We're still building the structured learning path for <strong>{subject}</strong> in <strong>{grade}</strong>.
            </p>
            <p className="text-sm text-gray-600 mt-2">
              You can still chat with SyncSenta to get help with any topic!
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Navigate back or suggest alternative
              window.history.back();
            }}
            className="mt-2"
          >
            ← Choose Another Subject
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-lg">{path.pathName}</h3>
          <span className="text-2xl">{path.icon}</span>
        </div>
        <p className="text-sm text-gray-600 mb-3">{path.description}</p>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-gray-600">Progress</span>
            <span className="text-xs font-bold text-gray-700">
              {progress.completedCheckpoints}/{progress.totalCheckpoints}
            </span>
          </div>
          <Progress value={progress.percentComplete} className="h-2" />
          <p className="text-xs text-gray-500 mt-1">
            {progress.percentComplete}% Complete • ~{Math.round(path.totalEstimatedHours * (100 - progress.percentComplete) / 100)} hours remaining
          </p>
        </div>
      </div>

      {/* Checkpoints */}
      <div className="space-y-2">
        {path.checkpoints.map((checkpoint, index) => {
          const isMastered = masteredCompetencies.includes(checkpoint.competencyCode);
          const isNext = checkpoint === progress.currentCheckpoint;
          const hasPrerequisites = checkpoint.validateBefore.length === 0 ||
            checkpoint.validateBefore.every((prereq) =>
              masteredCompetencies.includes(prereq)
            );

          return (
            <button
              key={checkpoint.competencyCode}
              onClick={() => {
                if (hasPrerequisites) {
                  onSelectCheckpoint?.(checkpoint.competencyCode);
                }
              }}
              disabled={!hasPrerequisites}
              className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                isMastered
                  ? 'border-green-300 bg-green-50 hover:border-green-400'
                  : isNext
                  ? 'border-blue-400 bg-blue-50 hover:border-blue-500 hover:bg-blue-100'
                  : hasPrerequisites
                  ? 'border-gray-300 bg-white hover:border-gray-400'
                  : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {isMastered ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : isNext ? (
                    <Circle className="w-5 h-5 text-blue-600 animate-pulse" />
                  ) : hasPrerequisites ? (
                    <Circle className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Lock className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">
                      {index + 1}. {checkpoint.competencyName}
                    </h4>
                    {isNext && (
                      <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                    {isMastered && (
                      <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
                        Mastered
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{checkpoint.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>⏱️ {checkpoint.suggestedDuration} min</span>
                    <span>❓ ~{checkpoint.estimatedQuestions} questions</span>
                  </div>

                  {!hasPrerequisites && checkpoint.validateBefore.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2 italic">
                      Complete prerequisites first
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {progress.percentComplete === 100 && (
        <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg text-center">
          <p className="text-sm font-bold text-green-700">
            🎉 Path Complete! You've mastered {path.pathName}
          </p>
        </div>
      )}
    </Card>
  );
}
