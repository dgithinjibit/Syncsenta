'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, BookOpen, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Question {
  question: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[];
  correct_answer: string;
  difficulty: string;
  points: number;
  competency?: string;
  cbc_citation?: string;
}

interface Quiz {
  title: string;
  competencies: string[];
  cbc_citations: string[];
  questions: Question[];
}

interface GradeResult {
  total_points_earned: number;
  total_points_possible: number;
  overall_feedback?: { overall_feedback?: string; next_steps?: string[] };
  graded_answers?: { correct: boolean; points_earned: number; feedback?: string }[];
}

const GRADES = [
  { value: 'g4', label: 'Grade 4' },
  { value: 'g5', label: 'Grade 5' },
  { value: 'g6', label: 'Grade 6' },
  { value: 'g7', label: 'Grade 7' },
];

const SUBJECTS = ['Mathematics', 'Science', 'English', 'Social Studies'];

export default function QuizPage() {
  const { toast } = useToast();
  const [grade, setGrade] = useState('g4');
  const [subject, setSubject] = useState('Mathematics');
  const [competency, setCompetency] = useState('fractions');
  const [numQuestions, setNumQuestions] = useState('5');
  const [generating, setGenerating] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [grading, setGrading] = useState(false);

  async function generateQuiz() {
    setGenerating(true);
    setQuiz(null);
    setGradeResult(null);
    setAnswers({});

    try {
      const res = await fetch('/api/v1/mvp/agents/assessment/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade,
          subject,
          competency,
          num_questions: parseInt(numQuestions),
          language: 'english',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate quiz');
      }

      const data = await res.json();
      setQuiz(data);
      toast({
        title: 'Quiz Generated!',
        description: `${data.questions.length} questions ready`,
      });
    } catch (err) {
      console.error('[QuizPage] Failed to generate quiz:', err);
      toast({
        title: 'Error',
        description: 'Failed to generate quiz. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  }

  async function submitQuiz() {
    if (!quiz) return;
    setGrading(true);

    try {
      const submission = {
        quiz_id: 'demo',
        student_id: 'demo-student',
        answers: quiz.questions.map((_, i) => ({
          question_id: String(i),
          answer: answers[i] ?? '',
        })),
      };

      const res = await fetch('/api/v1/mvp/agents/assessment/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz, submission }),
      });

      if (!res.ok) {
        throw new Error('Failed to grade quiz');
      }

      const data = await res.json();
      setGradeResult(data);

      const percentage = Math.round(
        (data.total_points_earned / (data.total_points_possible || 1)) * 100
      );

      toast({
        title: 'Quiz Graded!',
        description: `You scored ${percentage}% (${data.total_points_earned}/${data.total_points_possible} points)`,
      });
    } catch (err) {
      console.error('[QuizPage] Failed to grade quiz:', err);
      toast({
        title: 'Error',
        description: 'Failed to grade quiz. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGrading(false);
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    }
  };

  const percentage = gradeResult
    ? Math.round((gradeResult.total_points_earned / (gradeResult.total_points_possible || 1)) * 100)
    : null;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">CBC Quiz Generator</h1>
          <p className="text-sm text-muted-foreground">
            Generate and take CBC-aligned quizzes with instant grading
          </p>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 space-y-6">
        {/* Quiz Generator Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Generate Quiz
            </CardTitle>
            <CardDescription>
              Create a CBC-aligned quiz for any grade and subject
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger id="grade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger id="subject">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="competency">Topic / Competency</Label>
                <Input
                  id="competency"
                  value={competency}
                  onChange={(e) => setCompetency(e.target.value)}
                  placeholder="e.g. fractions"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numQuestions">Questions</Label>
                <Select value={numQuestions} onValueChange={setNumQuestions}>
                  <SelectTrigger id="numQuestions">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={generateQuiz} disabled={generating} className="w-full md:w-auto">
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Quiz'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Quiz Display */}
        {quiz && (
          <Card>
            <CardHeader>
              <CardTitle>{quiz.title}</CardTitle>
              {quiz.cbc_citations && quiz.cbc_citations.length > 0 && (
                <CardDescription className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {quiz.cbc_citations.join(' · ')}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {quiz.questions.map((q, i) => {
                const ga = gradeResult?.graded_answers?.[i];
                return (
                  <div key={i} className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">Q{i + 1}</Badge>
                          <Badge className={getDifficultyColor(q.difficulty)}>{q.difficulty}</Badge>
                          <span className="text-sm text-muted-foreground">{q.points} pts</span>
                        </div>
                        <p className="text-sm leading-relaxed">{q.question}</p>
                      </div>
                    </div>

                    {q.question_type === 'short_answer' ? (
                      <Input
                        value={answers[i] ?? ''}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                        disabled={!!gradeResult}
                        placeholder="Type your answer..."
                      />
                    ) : (
                      <div className="space-y-2">
                        {q.options.map((opt, oi) => {
                          const isSelected = answers[i] === opt;
                          const isCorrect = gradeResult && opt === q.correct_answer;
                          const isWrong = gradeResult && isSelected && opt !== q.correct_answer;

                          return (
                            <Button
                              key={oi}
                              variant={
                                isCorrect
                                  ? 'default'
                                  : isWrong
                                  ? 'destructive'
                                  : isSelected
                                  ? 'secondary'
                                  : 'outline'
                              }
                              className="w-full justify-start text-left h-auto py-3"
                              onClick={() => setAnswers((prev) => ({ ...prev, [i]: opt }))}
                              disabled={!!gradeResult}
                            >
                              {isCorrect && <CheckCircle2 className="mr-2 h-4 w-4" />}
                              {isWrong && <XCircle className="mr-2 h-4 w-4" />}
                              {opt}
                            </Button>
                          );
                        })}
                      </div>
                    )}

                    {ga && (
                      <div
                        className={`text-sm p-3 rounded-lg ${
                          ga.correct
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {ga.correct ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          <span className="font-semibold">
                            {ga.correct ? 'Correct' : 'Incorrect'} — {ga.points_earned}/{q.points} pts
                          </span>
                        </div>
                        {ga.feedback && <p className="text-sm">{ga.feedback}</p>}
                      </div>
                    )}
                  </div>
                );
              })}

              {!gradeResult && (
                <Button onClick={submitQuiz} disabled={grading} className="w-full">
                  {grading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Grading...
                    </>
                  ) : (
                    'Submit Quiz'
                  )}
                </Button>
              )}

              {gradeResult && (
                <Card className="bg-muted">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-primary">
                        {gradeResult.total_points_earned}/{gradeResult.total_points_possible}
                      </div>
                      <div className="text-2xl text-muted-foreground">({percentage}%)</div>
                    </div>

                    {gradeResult.overall_feedback?.overall_feedback && (
                      <p className="text-sm leading-relaxed">
                        {gradeResult.overall_feedback.overall_feedback}
                      </p>
                    )}

                    {gradeResult.overall_feedback?.next_steps &&
                      gradeResult.overall_feedback.next_steps.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold">Next Steps:</p>
                          <ul className="space-y-1">
                            {gradeResult.overall_feedback.next_steps.map((step, i) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <span className="text-primary">→</span>
                                {step}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setQuiz(null);
                        setGradeResult(null);
                        setAnswers({});
                      }}
                    >
                      Try Another Quiz
                    </Button>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
