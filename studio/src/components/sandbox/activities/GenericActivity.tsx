"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity } from '@/lib/sandbox/sandbox-types';
import { CurriculumActivity } from '@/lib/curriculum/curriculum-activities-mapper';
import { Sparkles, Lightbulb, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { submitActivity } from '@/lib/sandbox/sandbox-submission';
import { useAuth } from '@/hooks/use-auth';
import {
  buildFallbackHint,
  buildFallbackOptions,
  buildFallbackPrompt,
  inferAdaptiveProfile,
  personalizePrompt,
} from '@/lib/sandbox/sandbox-personalization';

interface GenericActivityProps {
  activity: Activity;
  onComplete: (score: number, timeSpent: number) => void;
  onBack: () => void;
}

interface ActivityQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  hint: string;
  explanation: string;
}

export default function GenericActivity({ activity, onComplete, onBack }: GenericActivityProps) {
  const { user } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [startTime] = useState(Date.now());
  const [streak, setStreak] = useState(0);
  const [accuracy, setAccuracy] = useState(0.5);

  const profile = inferAdaptiveProfile(activity.grade, activity.difficulty, streak, accuracy);
  const questions = generateQuestionsFromActivity(activity);
  const totalQuestions = questions.length;
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;
  const currentQ = questions[currentQuestion];

  function shuffle<T>(input: T[]): T[] {
    const arr = input.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function generateQuestionsFromActivity(activity: Activity): ActivityQuestion[] {
    const curriculumActivity = activity as CurriculumActivity;
    if (curriculumActivity.questions && curriculumActivity.questions.length > 0) {
      return curriculumActivity.questions.map((q, index) => {
        const shuffledOptions = shuffle(q.options);
        const correctAnswer = shuffledOptions.indexOf(q.options[q.correctAnswer]);
        return {
          id: `q${index + 1}`,
          question: q.question,
          options: shuffledOptions,
          correctAnswer,
          hint: q.hint,
          explanation: 'Excellent! You got it right!',
        };
      });
    }

    return activity.learningObjectives.slice(0, 5).map((objective, index) => {
      const rawOptions = generateOptionsForObjective(objective, activity);
      const correctOption = rawOptions[0];
      const shuffledOptions = shuffle(rawOptions);
      const correctAnswer = shuffledOptions.indexOf(correctOption);
      return {
        id: `q${index + 1}`,
        question: generateQuestionFromObjective(objective, activity),
        options: shuffledOptions,
        correctAnswer,
        hint: generateHintFromObjective(objective, activity),
        explanation: `Great! ${objective}`,
      };
    });
  }

  function personalizeFallbackPrompt(question: string, activity: Activity) {
    return personalizePrompt(question, activity.subject, activity.grade, activity.difficulty, profile);
  }

  function generateQuestionFromObjective(objective: string, activity: Activity): string {
    return buildFallbackPrompt(activity.subject, objective, activity.grade, activity.difficulty, profile);
  }

  function generateOptionsForObjective(objective: string, activity: Activity): string[] {
    return buildFallbackOptions(activity.subject, objective);
  }

  function generateHintFromObjective(objective: string, activity: Activity): string {
    return buildFallbackHint(activity.subject, objective);
  }

  const handleAnswerSelect = (answer: string, index: number) => {
    if (showFeedback) return;

    setSelectedAnswer(answer);
    setAttempts(attempts + 1);

    const correct = index === currentQ.correctAnswer;
    setIsCorrect(correct);

    if (correct) {
      setScore(score + 20);
      setAccuracy(prev => (prev * 0.8) + 0.95 * 0.2);
      setStreak(prev => prev + 1);
      setFeedbackMessage(currentQ.explanation);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } else {
      setAccuracy(prev => (prev * 0.8) + 0.25 * 0.2);
      setStreak(0);
      setFeedbackMessage('Not quite! Try again or use a hint.');
    }

    setShowFeedback(true);

    if (correct) {
      setTimeout(() => {
        if (currentQuestion < totalQuestions - 1) {
          setCurrentQuestion(currentQuestion + 1);
          setShowFeedback(false);
          setSelectedAnswer(null);
          setShowHint(false);
        } else {
          handleActivityComplete();
        }
      }, 2000);
    } else {
      setTimeout(() => {
        setShowFeedback(false);
        setSelectedAnswer(null);
      }, 2000);
    }
  };

  const handleHint = () => {
    setShowHint(true);
    setHintsUsed(hintsUsed + 1);
  };

  const handleActivityComplete = async () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const finalScore = Math.round((score / (totalQuestions * 20)) * 100);

    if (user?.id) {
      try {
        const difficultyLevel: 'easy' | 'medium' | 'hard' =
          activity.difficulty <= 2 ? 'easy' :
          activity.difficulty <= 4 ? 'medium' : 'hard';

        await submitActivity({
          student_id: user.id,
          activity_type: activity.type,
          grade: activity.grade,
          subject: activity.subject,
          difficulty: difficultyLevel,
          score: finalScore,
          time_spent: timeSpent,
          answers: {
            activityId: activity.id,
            attempts,
            hintsUsed,
            totalQuestions,
          },
        });
      } catch (err) {
        console.error('Failed to persist sandbox completion to Supabase:', err);
      }
    }

    onComplete(finalScore, timeSpent);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-3xl flex items-center gap-3">
                <span>{activity.icon}</span>
                {activity.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-sm">Question {currentQuestion + 1} of {totalQuestions}</Badge>
              <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">Score {score}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{currentQ.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {currentQ.options.map((option, index) => (
              <Button
                key={option}
                onClick={() => handleAnswerSelect(option, index)}
                disabled={showFeedback}
                variant={selectedAnswer === option ? 'default' : 'outline'}
                className={
                  selectedAnswer === option || showFeedback
                    ? 'h-20 text-lg'
                    : 'h-20 text-lg'
                }
              >
                {option}
              </Button>
            ))}
          </div>

          {showHint && (
            <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-500">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-purple-500" />
                  <p className="text-sm">{currentQ.hint}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {showFeedback && (
            <Card className={isCorrect ? 'bg-green-50 dark:bg-green-950/20 border-green-500' : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500'}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  {isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                  )}
                  <p className="font-semibold">{feedbackMessage}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            {!showHint && !showFeedback && (
              <Button variant="secondary" onClick={handleHint}>
                <Lightbulb className="w-4 h-4 mr-2" />
                Show Hint
              </Button>
            )}
            <Button variant="ghost" onClick={onBack}>
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Made with Bob
