import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, GraduationCap, User } from "lucide-react";
import { toast } from "sonner";
import ExamRunner, { type ExamQuestion } from "@/components/ExamRunner";
import ThemeToggle from "@/components/ThemeToggle";

interface ExamRow {
  id: string;
  grade: string;
  subject: string;
  term: string;
  questions: ExamQuestion[];
  total_marks: number;
}

/** Public-ish page to take a shared exam by link. Requires sign-in to save score. */
const TakeExam = () => {
  const { examId } = useParams<{ examId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [exam, setExam] = useState<ExamRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [pupilName, setPupilName] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/auth?next=/exam/${examId}`);
      return;
    }
    if (!examId) return;
    (async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("id, grade, subject, term, questions, total_marks")
        .eq("id", examId)
        .maybeSingle();
      if (error || !data) {
        toast.error("Exam not found.");
        setLoading(false);
        return;
      }
      setExam({
        id: data.id,
        grade: data.grade,
        subject: data.subject,
        term: data.term,
        questions: data.questions as unknown as ExamQuestion[],
        total_marks: data.total_marks,
      });
      setLoading(false);
    })();
  }, [examId, user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="p-8 max-w-md text-center space-y-3">
          <h2 className="text-lg font-semibold">Exam not found</h2>
          <p className="text-sm text-muted-foreground">
            This link may have expired or been removed.
          </p>
          <Button onClick={() => navigate("/")}>Back home</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Home
            </Button>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <h1 className="text-base font-semibold">
                {exam.grade} • {exam.subject} • {exam.term}
              </h1>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-8">
        {!started ? (
          <Card className="p-6 max-w-md mx-auto space-y-4 animate-fade-in">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold">Ready to start?</h2>
              <p className="text-sm text-muted-foreground">
                {exam.questions.length} questions • {exam.total_marks} marks
              </p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Your name
              </Label>
              <Input
                value={pupilName}
                onChange={(e) => setPupilName(e.target.value)}
                placeholder="e.g. Mary Wanjiku"
                maxLength={60}
              />
            </div>
            <Button
              size="lg"
              className="w-full"
              disabled={!pupilName.trim()}
              onClick={() => setStarted(true)}
            >
              Start Exam
            </Button>
          </Card>
        ) : (
          <ExamRunner
            questions={exam.questions}
            grade={exam.grade}
            subject={exam.subject}
            term={exam.term}
            pupilName={pupilName}
            examId={exam.id}
            onRetake={() => setStarted(false)}
          />
        )}
      </main>
    </div>
  );
};

export default TakeExam;
