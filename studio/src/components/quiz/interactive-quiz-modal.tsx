"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, ArrowLeft, ArrowRight, Send } from 'lucide-react';
import {
  type QuizQuestion,
  type QuizCompletionResult,
  MasteryLevel,
  type FeedbackResponse,
} from '@/types/curriculum';

interface InteractiveQuizModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: QuizQuestion[];
  studentId: string;
  context: {
    grade: string;
    subject: string;
    currentTopic: string;
  };
  onComplete: (result: QuizCompletionResult) => void;
}

export function InteractiveQuizModal({
  open,
  onOpenChange,
  questions,
  studentId,
  context,
  onComplete,
}: InteractiveQuizModalProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [startTime] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const hasAnswer = answers[currentQuestionIndex] !== undefined;

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setCurrentQuestionIndex(0);
      setAnswers({});
      setShowResults(false);
      setFeedback(null);
    }
  }, [open]);

  const handleAnswerChange = (answer: string) => {
    setAnswers({ ...answers, [currentQuestionIndex]: answer });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);

      // Submit quiz to backend
      const response = await fetch('/api/v1/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          questions,
          answers: Object.values(answers),
          timeSpent,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit quiz');
      }

      const result: QuizCompletionResult = await response.json();

      setFeedback(result.feedback);
      setShowResults(true);
      onComplete(result);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      // Show error feedback
      setFeedback({
        overallScore: 0,
        masteryLevel: MasteryLevel.Beginner,
        feedbackText: 'Failed to submit quiz. Please try again.',
        weakStrands: [],
        practiceRecommendations: [],
        canAdvance: false,
      });
      setShowResults(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setShowResults(false);
    setFeedback(null);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!currentQuestion && !showResults) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {!showResults ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {context.subject} Quiz - {context.currentTopic}
              </DialogTitle>
              <div className="space-y-2 mt-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                  <span>{Math.round(progress)}% Complete</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </DialogHeader>

            <div className="space-y-6 py-6">
              {/* Question */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                        {currentQuestionIndex + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-lg font-medium">{currentQuestion.question}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {currentQuestion.marks} {currentQuestion.marks === 1 ? 'mark' : 'marks'}
                        </p>
                      </div>
                    </div>

                    {/* Answer Input */}
                    <div className="mt-6">
                      {currentQuestion.type === 'mcq' && currentQuestion.options ? (
                        <RadioGroup
                          value={answers[currentQuestionIndex]}
                          onValueChange={handleAnswerChange}
                        >
                          {currentQuestion.options.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted">
                              <RadioGroupItem value={String(index)} id={`option-${index}`} />
                              <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                                {option}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      ) : (
                        <Textarea
                          value={answers[currentQuestionIndex] || ''}
                          onChange={(e) => handleAnswerChange(e.target.value)}
                          placeholder="Type your answer here..."
                          className="min-h-[120px]"
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isFirstQuestion}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                {isLastQuestion ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={!hasAnswer || isSubmitting}
                    className="min-w-[120px]"
                  >
                    {isSubmitting ? (
                      'Submitting...'
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Quiz
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={!hasAnswer}
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          <QuizResultsView
            feedback={feedback!}
            onRetry={handleRetry}
            onClose={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface QuizResultsViewProps {
  feedback: FeedbackResponse;
  onRetry: () => void;
  onClose: () => void;
}

function QuizResultsView({ feedback, onRetry, onClose }: QuizResultsViewProps) {
  const getMasteryColor = (level: MasteryLevel) => {
    switch (level) {
      case MasteryLevel.Mastery:
        return 'text-green-600';
      case MasteryLevel.Proficient:
        return 'text-blue-600';
      case MasteryLevel.Developing:
        return 'text-yellow-600';
      case MasteryLevel.Beginner:
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getMasteryIcon = (level: MasteryLevel) => {
    if (level === MasteryLevel.Mastery || level === MasteryLevel.Proficient) {
      return <CheckCircle2 className="w-16 h-16 text-green-600" />;
    }
    return <XCircle className="w-16 h-16 text-yellow-600" />;
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl">Quiz Results</DialogTitle>
      </DialogHeader>

      <div className="space-y-6 py-6">
        {/* Score Display */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            {getMasteryIcon(feedback.masteryLevel)}
          </div>
          <div>
            <p className="text-4xl font-bold">{Math.round(feedback.overallScore)}%</p>
            <p className={`text-xl font-semibold ${getMasteryColor(feedback.masteryLevel)}`}>
              {feedback.masteryLevel}
            </p>
          </div>
        </div>

        {/* Feedback Text */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">{feedback.feedbackText}</p>
          </CardContent>
        </Card>

        {/* Weak Strands */}
        {feedback.weakStrands.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">Areas for Improvement:</h3>
              <ul className="list-disc list-inside space-y-1">
                {feedback.weakStrands.map((strand, index) => (
                  <li key={index} className="text-sm text-muted-foreground">{strand}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Practice Recommendations */}
        {feedback.practiceRecommendations.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">Recommended Practice:</h3>
              <div className="space-y-2">
                {feedback.practiceRecommendations.map((rec, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">{rec.strand} - {rec.subStrand}</p>
                    <p className="text-xs text-muted-foreground">
                      {rec.questionCount} practice questions ({rec.practiceType})
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onRetry} className="flex-1">
            Retry Quiz
          </Button>
          <Button onClick={onClose} className="flex-1">
            Continue Learning
          </Button>
        </div>
      </div>
    </>
  );
}
