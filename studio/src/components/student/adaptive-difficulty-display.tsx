'use client';

import { useEffect, useState } from 'react';
import { Zap, TrendingUp, Brain } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  analyzeAdaptiveDifficulty,
  getDifficultyLabel,
  type DifficultyLevel,
  type AdaptiveDifficultyContext,
} from '@/lib/progress/adaptive-difficulty';

interface AdaptiveDifficultyDisplayProps {
  userId: string;
  competencyCode: string;
  subject: string;
  messageHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export function AdaptiveDifficultyDisplay({
  userId,
  competencyCode,
  subject,
  messageHistory,
}: AdaptiveDifficultyDisplayProps) {
  const [difficulty, setDifficulty] = useState<AdaptiveDifficultyContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDifficulty = async () => {
      try {
        setLoading(true);
        const context = await analyzeAdaptiveDifficulty(
          userId,
          competencyCode,
          subject,
          messageHistory
        );
        setDifficulty(context);
      } catch (error) {
        console.error('Error analyzing difficulty:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDifficulty();
  }, [userId, competencyCode, subject, messageHistory]);

  if (loading || !difficulty) {
    return null;
  }

  const difficultyColors: Record<DifficultyLevel, { bg: string; border: string; text: string }> = {
    L1: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
    L2: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
    L3: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' },
    L4: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
  };

  const colors = difficultyColors[difficulty.level];

  const difficultyIcons: Record<DifficultyLevel, React.ReactNode> = {
    L1: <Brain className="w-4 h-4" />,
    L2: <TrendingUp className="w-4 h-4" />,
    L3: <Zap className="w-4 h-4" />,
    L4: <Zap className="w-4 h-4" />,
  };

  const getMasteryBadge = (masteryLevel: string) => {
    const badges: Record<string, { icon: string; color: string; label: string }> = {
      not_started: { icon: '🌱', color: 'text-gray-500', label: 'Getting Started' },
      emerging: { icon: '📚', color: 'text-yellow-600', label: 'Emerging' },
      developing: { icon: '🎯', color: 'text-blue-600', label: 'Developing' },
      proficient: { icon: '⭐', color: 'text-purple-600', label: 'Proficient' },
      mastered: { icon: '👑', color: 'text-amber-600', label: 'Mastered' },
    };
    return badges[masteryLevel] || badges['not_started'];
  };

  const masteryBadge = getMasteryBadge(difficulty.masteryLevel);

  return (
    <Card className={`p-3 border-2 ${colors.bg} ${colors.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {difficultyIcons[difficulty.level]}
            <span className={`font-bold text-sm ${colors.text}`}>
              {getDifficultyLabel(difficulty.level)} Challenge
            </span>
            <span className="text-xs bg-white px-2 py-1 rounded">
              {difficulty.questionsAnsweredOnTopic} questions
            </span>
          </div>

          {/* Mastery Status */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-lg ${masteryBadge.color}`}>{masteryBadge.icon}</span>
            <span className="text-xs font-medium text-gray-700">{masteryBadge.label}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all"
                style={{ width: `${difficulty.progressPercentage}%` }}
              />
            </div>
            <span className="text-xs font-bold text-gray-600">
              {difficulty.progressPercentage}%
            </span>
          </div>

          {/* Recent Accuracy */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-600">Accuracy:</span>
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  difficulty.recentAccuracy > 70
                    ? 'bg-green-500'
                    : difficulty.recentAccuracy > 40
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${difficulty.recentAccuracy}%` }}
              />
            </div>
            <span className="font-bold text-gray-700">{difficulty.recentAccuracy}%</span>
          </div>
        </div>

        {/* Suggested Actions */}
        <div className="text-right">
          <p className="text-xs font-bold text-gray-700 mb-1">Next Steps:</p>
          <ul className="space-y-0.5">
            {difficulty.suggestedActions.slice(0, 2).map((action, i) => (
              <li key={i} className="text-xs text-gray-600">
                • {action.substring(0, 20)}...
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Performance Indicator */}
      <div className="mt-2 pt-2 border-t border-gray-300 flex justify-between text-xs">
        {difficulty.recentAccuracy > 80 && (
          <span className="text-green-700 font-medium">🌟 Excellent progress! Keep it up!</span>
        )}
        {difficulty.recentAccuracy > 60 && difficulty.recentAccuracy <= 80 && (
          <span className="text-blue-700 font-medium">📈 Good effort! Almost there!</span>
        )}
        {difficulty.recentAccuracy <= 60 && (
          <span className="text-orange-700 font-medium">
            💪 Take your time! Let's break it down.
          </span>
        )}
      </div>
    </Card>
  );
}
