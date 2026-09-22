import { Progress } from "@/components/ui/progress";
import { Clock } from "lucide-react";
import { formatDuration } from "@/hooks/useExamTimer";

interface Props {
  answered: number;
  total: number;
  seconds: number;
}

const ExamProgressBar = ({ answered, total, seconds }: Props) => {
  const pct = total ? Math.round((answered / total) * 100) : 0;
  return (
    <div className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5 gap-2 flex-wrap">
        <span className="font-medium">
          {answered} of {total} answered
        </span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1 tabular-nums">
            <Clock className="w-3 h-3" />
            {formatDuration(seconds)}
          </span>
          <span className="tabular-nums">{pct}%</span>
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
};

export default ExamProgressBar;
