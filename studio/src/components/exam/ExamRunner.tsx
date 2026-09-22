import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useExamAutosave } from "@/hooks/useExamAutosave";
import { useExamTimer, formatDuration } from "@/hooks/useExamTimer";
import {
  useExamKeyboardNav,
  focusQuestionCard,
} from "@/hooks/useExamKeyboardNav";
import ResultsSummary from "./ResultsSummary";
import QuestionCard, { type ExamQuestion } from "./QuestionCard";
import SectionHeader from "./SectionHeader";
import ExamProgressBar from "./ExamProgressBar";
import UnansweredWarning from "./UnansweredWarning";
import ResultsActions from "./ResultsActions";

interface MarkResult {
  awarded: number;
  max: number;
  correct: boolean;
  feedback?: string;
}

interface ExamRunnerProps {
  questions: ExamQuestion[];
  grade: string;
  subject: string;
  term: string;
  pupilName?: string;
  examId?: string | null;
  onRetake?: () => void;
  onPracticeWeak?: (weakStrands: string[]) => void;
}

// Helper: Detect expected answer count from question text
const detectExpectedCount = (question: string): number => {
  const wordMap: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
    moja: 1, mbili: 2, tatu: 3, nne: 4, tano: 5, sita: 6,
  };
  const verbs =
    "(?:name|list|give|state|mention|identify|write|provide|taja|andika|orodhesha|toa)";
  const re = new RegExp(
    `\\b${verbs}\\b[^.?!]*?\\b(\\d+|${Object.keys(wordMap).join("|")})\\b`,
    "i",
  );
  const match = question.match(re);
  if (!match) return 1;
  const token = match[1].toLowerCase();
  const num = /^\d+$/.test(token) ? parseInt(token, 10) : wordMap[token];
  return num >= 2 && num <= 6 ? num : 1;
};

// Helper: Check if question is answered
const isAnswered = (q: ExamQuestion, raw: string | undefined): boolean => {
  if (raw === undefined) return false;
  const value = String(raw).trim();
  if (value.length === 0) return false;
  if (q.type === "short") {
    const slots = detectExpectedCount(q.question);
    if (slots > 1) {
      const parts = raw.split("\n").map((p) => p.trim()).filter(Boolean);
      return parts.length >= slots;
    }
  }
  return true;
};

const ExamRunner = ({
  questions,
  grade,
  subject,
  term,
  pupilName,
  examId,
  onRetake,
  onPracticeWeak,
}: ExamRunnerProps) => {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, MarkResult> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showUnansweredWarning, setShowUnansweredWarning] = useState(false);
  const [highlightUnanswered, setHighlightUnanswered] = useState(false);
  const elapsed = useExamTimer(!!results);
  const finalElapsedRef = useRef<number>(0);
  const { toast } = useToast();

  // Auto-save & restore
  const autosaveKey = useMemo(() => {
    if (examId) return `${examId}:${(pupilName || "anon").trim().toLowerCase()}`;
    return `local:${grade}:${subject}:${term}:${(pupilName || "anon").trim().toLowerCase()}`;
  }, [examId, pupilName, grade, subject, term]);

  const { restored, dismissRestored, clearSaved } = useExamAutosave(
    autosaveKey,
    answers,
    !!results,
  );

  const setAns = useCallback(
    (i: number, v: string) => setAnswers((p) => ({ ...p, [i]: v })),
    [],
  );

  const setAnsAt = useCallback(
    (i: number, slot: number, v: string, total: number) => {
      setAnswers((prev) => {
        const current = (prev[i] ?? "").split("\n");
        const arr = Array.from({ length: total }, (_, k) => current[k] ?? "");
        arr[slot] = v;
        return { ...prev, [i]: arr.join("\n") };
      });
    },
    [],
  );

  const handleResume = () => {
    if (restored?.answers) setAnswers(restored.answers);
    dismissRestored();
  };

  const answeredFlags = useMemo(
    () => questions.map((q, i) => isAnswered(q, answers[i])),
    [questions, answers],
  );
  const answeredCount = answeredFlags.filter(Boolean).length;
  const unansweredCount = questions.length - answeredCount;

  // Keyboard navigation
  useExamKeyboardNav({
    enabled: !results,
    questionsCount: questions.length,
    onPickOption: (qIndex, optionIndex) => {
      const q = questions[qIndex];
      if (!q || q.type !== "mcq" || !q.options) return false;
      if (optionIndex >= q.options.length) return false;
      setAns(qIndex, String(optionIndex));
      return true;
    },
    onNext: () => {
      const cards = Array.from(
        document.querySelectorAll<HTMLElement>("[data-question-index]"),
      );
      const active = document.activeElement as HTMLElement | null;
      const current = active?.closest<HTMLElement>("[data-question-index]");
      const idx = current ? cards.indexOf(current) : -1;
      const next = cards[Math.min(cards.length - 1, idx + 1)];
      if (next) focusQuestionCard(parseInt(next.dataset.questionIndex || "0", 10));
    },
    onPrev: () => {
      const cards = Array.from(
        document.querySelectorAll<HTMLElement>("[data-question-index]"),
      );
      const active = document.activeElement as HTMLElement | null;
      const current = active?.closest<HTMLElement>("[data-question-index]");
      const idx = current ? cards.indexOf(current) : 0;
      const prev = cards[Math.max(0, idx - 1)];
      if (prev) focusQuestionCard(parseInt(prev.dataset.questionIndex || "0", 10));
    },
  });

  const performSubmit = async () => {
    finalElapsedRef.current = elapsed;
    setSubmitting(true);
    setHighlightUnanswered(false);
    const out: Record<number, MarkResult> = {};

    // Mark MCQs instantly (frontend)
    questions.forEach((q, i) => {
      if (q.type === "mcq") {
        const picked = parseInt(answers[i] ?? "-1");
        const correct = picked === q.answerIndex;
        out[i] = { awarded: correct ? q.marks : 0, max: q.marks, correct };
      }
    });

    // Prepare short/long answers for backend marking
    const aiItems = questions
      .map((q, i) => ({ q, i }))
      .filter((x) => x.q.type === "short" || x.q.type === "long")
      .map((x) => ({
        index: x.i,
        type: x.q.type as "short" | "long",
        question: x.q.question,
        expectedAnswer: x.q.expectedAnswer || "",
        acceptableKeywords: x.q.acceptableKeywords || [],
        rubric: x.q.rubric || "",
        marks: x.q.marks,
        studentAnswer: answers[x.i] ?? "",
      }));

    if (aiItems.length) {
      try {
        const response = await fetch("/api/v1/exams/mark", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: aiItems,
            grade,
            subject,
          }),
        });

        if (!response.ok) {
          throw new Error("Marking failed");
        }

        const data = await response.json();
        const list = (data?.results ?? []) as Array<{
          index: number;
          awarded: number;
          feedback: string;
        }>;

        list.forEach((r) => {
          const q = questions[r.index];
          const awarded = Math.max(0, Math.min(q.marks, Math.round(r.awarded)));
          out[r.index] = {
            awarded,
            max: q.marks,
            correct: awarded >= q.marks * 0.7,
            feedback: r.feedback,
          };
        });
      } catch (e) {
        console.error(e);
        toast({
          title: "Marking Failed",
          description: "AI marking failed — showing partial results.",
          variant: "destructive",
        });
        aiItems.forEach((it) => {
          if (!out[it.index])
            out[it.index] = { awarded: 0, max: it.marks, correct: false };
        });
      }
    }

    setResults(out);
    setSubmitting(false);

    const totalMaxNow = questions.reduce((s, q) => s + q.marks, 0);
    const awardedNow = Object.values(out).reduce((s, r) => s + r.awarded, 0);
    const percentNow = totalMaxNow
      ? Math.round((awardedNow / totalMaxNow) * 100)
      : 0;

    toast({
      title: "Exam Submitted",
      description: `You scored ${awardedNow}/${totalMaxNow} (${percentNow}%)`,
    });
  };

  const handleSubmit = () => {
    if (unansweredCount > 0) {
      setShowUnansweredWarning(true);
      return;
    }
    performSubmit();
  };

  const jumpToFirstUnanswered = () => {
    const idx = answeredFlags.findIndex((a) => !a);
    if (idx >= 0) {
      setHighlightUnanswered(true);
      focusQuestionCard(idx);
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setResults(null);
    setShowUnansweredWarning(false);
    setHighlightUnanswered(false);
    finalElapsedRef.current = 0;
    clearSaved();
    onRetake?.();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  let lastSection: ExamQuestion["type"] | null = null;

  return (
    <div className="space-y-6">
      {restored && !results && (
        <Card className="p-4 bg-yellow-50 dark:bg-yellow-950 border-yellow-500/40 flex items-center gap-3">
          <RotateCcw className="w-5 h-5 text-yellow-600 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-medium">Welcome back!</p>
            <p className="text-muted-foreground">
              We saved your answers from{" "}
              {new Date(restored.savedAt).toLocaleString()}. Continue where you left off?
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={clearSaved}>
            Start fresh
          </Button>
          <Button size="sm" onClick={handleResume}>
            Resume
          </Button>
        </Card>
      )}

      {!results && questions.length > 0 && (
        <ExamProgressBar
          answered={answeredCount}
          total={questions.length}
          seconds={elapsed}
        />
      )}

      {results && (
        <>
          <ResultsSummary questions={questions} results={results} />
          <div className="text-xs text-muted-foreground">
            Time taken:{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatDuration(finalElapsedRef.current)}
            </span>
          </div>
          <ResultsActions
            questions={questions}
            results={results}
            examId={examId}
            onRetake={handleRetake}
            onPracticeWeak={(weak) => onPracticeWeak?.(weak)}
          />
        </>
      )}

      {questions.map((q, i) => {
        const showHeader = q.type !== lastSection;
        lastSection = q.type;
        const flagged =
          highlightUnanswered && !results && !answeredFlags[i];
        return (
          <div key={i}>
            {showHeader && <SectionHeader type={q.type} />}
            <QuestionCard
              index={i}
              question={q}
              answer={answers[i] ?? ""}
              result={results?.[i]}
              expectedSlots={
                q.type === "short" ? detectExpectedCount(q.question) : 1
              }
              onChange={(v) => setAns(i, v)}
              onChangeSlot={(slot, v, total) => setAnsAt(i, slot, v, total)}
              flagged={flagged}
            />
          </div>
        );
      })}

      {!results && (
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          size="lg"
          className="w-full"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Marking...
            </>
          ) : (
            "Submit Exam"
          )}
        </Button>
      )}

      <UnansweredWarning
        open={showUnansweredWarning}
        unansweredCount={unansweredCount}
        onOpenChange={setShowUnansweredWarning}
        onConfirm={() => {
          setShowUnansweredWarning(false);
          performSubmit();
        }}
        onJumpToFirst={() => {
          setShowUnansweredWarning(false);
          jumpToFirstUnanswered();
        }}
      />
    </div>
  );
};

export default ExamRunner;
