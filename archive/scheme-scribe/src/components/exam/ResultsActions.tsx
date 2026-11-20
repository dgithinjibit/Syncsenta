import { Button } from "@/components/ui/button";
import { Printer, Share2, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { ExamQuestion } from "../ExamRunner";

interface MarkResult {
  awarded: number;
  max: number;
  correct: boolean;
  feedback?: string;
}

interface Props {
  questions: ExamQuestion[];
  results: Record<number, MarkResult>;
  examId?: string | null;
  onRetake: () => void;
  onPracticeWeak: (weakStrands: string[]) => void;
}

const ResultsActions = ({
  questions,
  results,
  examId,
  onRetake,
  onPracticeWeak,
}: Props) => {
  // Weak strands = strands where pupil scored < 60%
  const weakStrands = (() => {
    const map = new Map<string, { awarded: number; max: number }>();
    questions.forEach((q, i) => {
      const r = results[i];
      if (!r) return;
      const cur = map.get(q.strand) ?? { awarded: 0, max: 0 };
      cur.awarded += r.awarded;
      cur.max += r.max;
      map.set(q.strand, cur);
    });
    return Array.from(map.entries())
      .filter(([, v]) => v.max > 0 && v.awarded / v.max < 0.6)
      .map(([s]) => s);
  })();

  const handleShare = async () => {
    if (!examId) {
      toast.error("This exam isn't shareable yet — generate a saved exam first.");
      return;
    }
    const url = `${window.location.origin}/exam/${examId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Take this exam", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Exam link copied to clipboard");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Exam link copied to clipboard");
      } catch {
        toast.error("Could not share — copy the URL manually");
      }
    }
  };

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {weakStrands.length > 0 && (
        <Button
          size="sm"
          variant="default"
          onClick={() => onPracticeWeak(weakStrands)}
          className="gap-1.5"
        >
          <RefreshCw className="w-4 h-4" />
          Practice weak areas ({weakStrands.length})
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={onRetake} className="gap-1.5">
        <RotateCcw className="w-4 h-4" />
        Retake
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => window.print()}
        className="gap-1.5"
      >
        <Printer className="w-4 h-4" />
        Print paper
      </Button>
      {examId && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleShare}
          className="gap-1.5"
        >
          <Share2 className="w-4 h-4" />
          Share link
        </Button>
      )}
    </div>
  );
};

export default ResultsActions;
