import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trophy, Medal, Award, Sparkles } from "lucide-react";
import { initials } from "@/utils/exportAttempts";

interface Attempt {
  id: string;
  pupil_name: string;
  grade: string;
  subject: string;
  term: string;
  percent: number;
  awarded: number;
  total: number;
  created_at: string;
}

interface Props {
  attempts: Attempt[];
}

const Leaderboard = ({ attempts }: Props) => {
  // Buckets = grade + subject + term
  const buckets = useMemo(() => {
    const map = new Map<string, Attempt[]>();
    attempts.forEach((a) => {
      const k = `${a.grade}|${a.subject}|${a.term}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    });
    return Array.from(map.entries()).map(([k, list]) => {
      const [grade, subject, term] = k.split("|");
      return { key: k, grade, subject, term, list };
    });
  }, [attempts]);

  const [selectedKey, setSelectedKey] = useState<string>(
    buckets[0]?.key ?? "",
  );

  const selected = buckets.find((b) => b.key === selectedKey) ?? buckets[0];

  // Best attempt per pupil for fairness
  const ranked = useMemo(() => {
    if (!selected) return [];
    const byPupil = new Map<string, Attempt>();
    selected.list.forEach((a) => {
      const cur = byPupil.get(a.pupil_name);
      if (!cur || a.percent > cur.percent) byPupil.set(a.pupil_name, a);
    });
    return Array.from(byPupil.values()).sort((a, b) => b.percent - a.percent);
  }, [selected]);

  if (buckets.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        No attempts to rank yet.
      </Card>
    );
  }

  const trophyFor = (rank: number) => {
    if (rank === 0) return <Trophy className="w-5 h-5 text-kenya-gold" />;
    if (rank === 1) return <Medal className="w-5 h-5 text-muted-foreground" />;
    if (rank === 2) return <Award className="w-5 h-5 text-accent" />;
    return (
      <span className="w-5 inline-block text-center text-xs text-muted-foreground tabular-nums">
        {rank + 1}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-accent" /> Leaderboard
          </h3>
          <p className="text-xs text-muted-foreground">
            Anonymised by initials • best score per pupil counts
          </p>
        </div>
        <Select value={selected?.key ?? ""} onValueChange={setSelectedKey}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Pick exam" />
          </SelectTrigger>
          <SelectContent>
            {buckets.map((b) => (
              <SelectItem key={b.key} value={b.key}>
                {b.grade} • {b.subject} • {b.term}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="divide-y">
        {ranked.map((a, idx) => (
          <div
            key={a.id}
            className="p-3 flex items-center gap-3 hover:bg-muted/40 transition-colors"
          >
            <div className="w-7 flex justify-center shrink-0">{trophyFor(idx)}</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium tabular-nums">{initials(a.pupil_name)}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(a.created_at).toLocaleDateString()}
              </p>
            </div>
            <Badge
              variant="outline"
              className={
                a.percent >= 80
                  ? "border-kenya-green text-kenya-green"
                  : a.percent >= 50
                    ? ""
                    : "border-kenya-red text-kenya-red"
              }
            >
              {a.percent}% • {a.awarded}/{a.total}
            </Badge>
          </div>
        ))}
      </Card>
    </div>
  );
};

export default Leaderboard;
