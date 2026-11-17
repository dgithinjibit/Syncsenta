import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy } from "lucide-react";
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
}

const useCountUp = (target: number, duration = 900) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
};

const fireConfetti = () => {
  const end = Date.now() + 800;
  const colors = ["#16a34a", "#eab308", "#dc2626", "#2563eb"];
  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
};

const ResultsSummary = ({ questions, results }: Props) => {
  const totalMax = questions.reduce((s, q) => s + q.marks, 0);
  const totalAwarded = Object.values(results).reduce((s, r) => s + r.awarded, 0);
  const percent = totalMax ? Math.round((totalAwarded / totalMax) * 100) : 0;

  const animatedAwarded = useCountUp(totalAwarded);
  const animatedPercent = useCountUp(percent);

  // Group by strand
  const strandRows = useMemo(() => {
    const map = new Map<string, { awarded: number; max: number }>();
    questions.forEach((q, i) => {
      const r = results[i];
      if (!r) return;
      const key = q.strand || "Other";
      const cur = map.get(key) ?? { awarded: 0, max: 0 };
      cur.awarded += r.awarded;
      cur.max += r.max;
      map.set(key, cur);
    });
    return Array.from(map.entries())
      .map(([strand, v]) => ({
        strand,
        awarded: v.awarded,
        max: v.max,
        percent: v.max ? Math.round((v.awarded / v.max) * 100) : 0,
      }))
      .sort((a, b) => b.percent - a.percent);
  }, [questions, results]);

  useEffect(() => {
    if (percent >= 80) fireConfetti();
  }, [percent]);

  const message =
    percent >= 80
      ? "Excellent work! 🎉"
      : percent >= 50
        ? "Good effort — keep practicing!"
        : "Keep trying — review the topics and retake.";

  const barTone = (p: number) =>
    p >= 80
      ? "[&>div]:bg-kenya-green"
      : p >= 50
        ? "[&>div]:bg-yellow-500"
        : "[&>div]:bg-kenya-red";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="p-6 bg-primary/5 border-primary space-y-5">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.6, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
          >
            <Trophy className="w-12 h-12 text-primary" />
          </motion.div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold tabular-nums">
              {animatedAwarded} / {totalMax}{" "}
              <span className="text-primary">({animatedPercent}%)</span>
            </h3>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>

        {strandRows.length > 0 && (
          <div className="space-y-3 pt-2 border-t">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Performance by strand
            </h4>
            <div className="space-y-2.5">
              {strandRows.map((row, idx) => (
                <motion.div
                  key={row.strand}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + idx * 0.06, duration: 0.3 }}
                  className="space-y-1"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate pr-2">{row.strand}</span>
                    <span className="text-muted-foreground tabular-nums shrink-0">
                      {row.awarded}/{row.max} • {row.percent}%
                    </span>
                  </div>
                  <Progress value={row.percent} className={`h-2 ${barTone(row.percent)}`} />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default ResultsSummary;
