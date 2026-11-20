import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  GraduationCap,
  Loader2,
  Trophy,
  TrendingUp,
  Download,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import Leaderboard from "@/components/dashboard/Leaderboard";
import { downloadAttemptsCsv } from "@/utils/exportAttempts";
import { formatDuration } from "@/hooks/useExamTimer";

interface Attempt {
  id: string;
  pupil_name: string;
  grade: string;
  subject: string;
  term: string;
  awarded: number;
  total: number;
  percent: number;
  created_at: string;
  details: { durationSeconds?: number } | null;
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPupil, setSelectedPupil] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("exam_attempts")
        .select(
          "id, pupil_name, grade, subject, term, awarded, total, percent, created_at, details",
        )
        .order("created_at", { ascending: false });
      if (error) console.error(error);
      else setAttempts((data ?? []) as unknown as Attempt[]);
      setLoading(false);
    })();
  }, [user]);

  const pupils = useMemo(() => {
    const map = new Map<string, Attempt[]>();
    for (const a of attempts) {
      const k = a.pupil_name.trim();
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    }
    return Array.from(map.entries())
      .map(([name, list]) => {
        const avg =
          list.reduce((s, a) => s + a.percent, 0) / Math.max(list.length, 1);
        return { name, attempts: list, avg: Math.round(avg) };
      })
      .sort((a, b) => b.avg - a.avg);
  }, [attempts]);

  const selected = selectedPupil
    ? pupils.find((p) => p.name === selectedPupil)
    : null;

  const bySubject = useMemo(() => {
    if (!selected) return [];
    const map = new Map<string, Attempt[]>();
    for (const a of selected.attempts) {
      const k = a.subject;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    }
    return Array.from(map.entries()).map(([subject, list]) => {
      const best = Math.max(...list.map((a) => a.percent));
      const latest = list[0];
      const avg = Math.round(
        list.reduce((s, a) => s + a.percent, 0) / list.length,
      );
      return { subject, best, latest, avg, attempts: list.length };
    });
  }, [selected]);

  const handleExportAll = () => {
    if (attempts.length === 0) {
      toast.info("Nothing to export yet.");
      return;
    }
    downloadAttemptsCsv(attempts, `schemer-attempts-${Date.now()}.csv`);
    toast.success(`Exported ${attempts.length} attempts`);
  };

  const handleExportPupil = () => {
    if (!selected) return;
    downloadAttemptsCsv(
      selected.attempts,
      `${selected.name.replace(/\s+/g, "-").toLowerCase()}-attempts.csv`,
    );
    toast.success(`Exported ${selected.attempts.length} attempts`);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-10 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
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
              <h1 className="text-xl font-bold">Pupil Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground hidden sm:block">
              {user?.email}
            </p>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8">
        {pupils.length === 0 ? (
          <DashboardEmptyState onStart={() => navigate("/")} />
        ) : !selected ? (
          <Tabs defaultValue="pupils" className="space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <TabsList>
                <TabsTrigger value="pupils">Your pupils</TabsTrigger>
                <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
              </TabsList>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAll}
                className="gap-1.5"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>

            <TabsContent value="pupils" className="space-y-6 mt-0">
              <div>
                <p className="text-sm text-muted-foreground">
                  {pupils.length} pupil{pupils.length === 1 ? "" : "s"} •{" "}
                  {attempts.length} total attempt
                  {attempts.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pupils.map((p) => (
                  <Card
                    key={p.name}
                    className="p-5 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40"
                    onClick={() => setSelectedPupil(p.name)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{p.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {p.attempts.length} exam
                          {p.attempts.length === 1 ? "" : "s"} taken
                        </p>
                      </div>
                      {p.avg >= 80 && (
                        <Trophy className="w-5 h-5 text-kenya-green" />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Average</span>
                        <span className="font-semibold tabular-nums">
                          {p.avg}%
                        </span>
                      </div>
                      <Progress value={p.avg} className="h-2" />
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="leaderboard" className="mt-0">
              <Leaderboard attempts={attempts} />
            </TabsContent>
          </Tabs>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPupil(null)}
              className="mb-4 gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> All pupils
            </Button>

            <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-3xl font-bold">{selected.name}</h2>
                <p className="text-sm text-muted-foreground">
                  Overall average:{" "}
                  <span className="font-semibold text-foreground tabular-nums">
                    {selected.avg}%
                  </span>{" "}
                  • {selected.attempts.length} attempt
                  {selected.attempts.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selected.avg >= 80 && (
                  <Badge className="bg-kenya-green/10 text-kenya-green border-kenya-green gap-1">
                    <Trophy className="w-3 h-3" /> Top performer
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPupil}
                  className="gap-1.5"
                >
                  <Download className="w-4 h-4" /> Export
                </Button>
              </div>
            </div>

            <h3 className="font-semibold mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Subject performance
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {bySubject.map((s) => (
                <Card
                  key={s.subject}
                  className="p-4 transition-all hover:shadow-md"
                >
                  <div className="flex justify-between mb-2">
                    <h4 className="font-semibold">{s.subject}</h4>
                    <Badge variant="outline">
                      {s.attempts} attempt{s.attempts === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Latest</p>
                      <p className="font-semibold tabular-nums">
                        {s.latest.percent}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Best</p>
                      <p className="font-semibold text-kenya-green tabular-nums">
                        {s.best}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Average</p>
                      <p className="font-semibold tabular-nums">{s.avg}%</p>
                    </div>
                  </div>
                  <Progress value={s.avg} className="h-1.5 mt-3" />
                </Card>
              ))}
            </div>

            <h3 className="font-semibold mb-3">All attempts</h3>
            <Card className="divide-y">
              {selected.attempts.map((a) => (
                <div
                  key={a.id}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {a.subject}{" "}
                      <span className="text-muted-foreground font-normal">
                        — {a.grade}, {a.term}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{new Date(a.created_at).toLocaleString()}</span>
                      {a.details?.durationSeconds ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(a.details.durationSeconds)}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold tabular-nums">
                      {a.awarded}/{a.total}
                    </p>
                    <p
                      className={`text-xs tabular-nums ${
                        a.percent >= 80
                          ? "text-kenya-green"
                          : a.percent >= 50
                            ? "text-foreground"
                            : "text-kenya-red"
                      }`}
                    >
                      {a.percent}%
                    </p>
                  </div>
                </div>
              ))}
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
