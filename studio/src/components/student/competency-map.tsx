'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Circle,
  Gamepad2,
  BookOpen,
  Target,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';

interface Competency {
  id: string;
  name: string;
  mastery: number;
  status: 'not-started' | 'in-progress' | 'mastered';
  gamesRecommended: boolean;
  lastPracticed?: string;
  totalPractices: number;
}

interface Topic {
  id: string;
  name: string;
  competencies: Competency[];
  overallMastery: number;
}

interface Subject {
  id: string;
  name: string;
  icon: string;
  topics: Topic[];
  overallMastery: number;
}

interface ProgressRow {
  competency_code: string | null;
  competency_name: string;
  subject: string;
  strand: string | null;
  mastery_level: string | null;
  progress_percentage: number | null;
  questions_answered: number | null;
  last_practiced_at: string | null;
}

interface CompetencyMapProps {
  // Kept optional for compatibility with existing callers. The displayed map
  // is intentionally sourced from the authenticated student's learning_progress
  // records rather than caller-provided demo mastery values.
  subjects?: Subject[];
  onStartPractice?: (competencyId: string) => void;
  className?: string;
}

function toStatus(level: string | null, progress: number): Competency['status'] {
  if (level === 'mastered' || progress >= 90) return 'mastered';
  if (!level || level === 'not_started' || progress <= 0) return 'not-started';
  return 'in-progress';
}

function iconForSubject(subject: string): string {
  const normalized = subject.toLowerCase();
  if (normalized.includes('math')) return 'calculator';
  if (normalized.includes('science')) return 'flask';
  if (normalized.includes('english') || normalized.includes('language')) return 'book';
  return 'book';
}

function buildSubjects(rows: ProgressRow[]): Subject[] {
  const grouped = new Map<string, Map<string, ProgressRow[]>>();

  for (const row of rows) {
    const subject = row.subject.trim() || 'Other';
    const strand = row.strand?.trim() || 'General';
    if (!grouped.has(subject)) grouped.set(subject, new Map());
    const topics = grouped.get(subject)!;
    if (!topics.has(strand)) topics.set(strand, []);
    topics.get(strand)!.push(row);
  }

  return Array.from(grouped.entries()).map(([subject, topics]) => {
    const topicModels: Topic[] = Array.from(topics.entries()).map(([strand, topicRows]) => {
      const competencies = topicRows.map((row) => {
        const mastery = Math.max(0, Math.min(100, row.progress_percentage ?? 0));
        return {
          id: row.competency_code || `${subject}:${strand}:${row.competency_name}`,
          name: row.competency_name,
          mastery,
          status: toStatus(row.mastery_level, mastery),
          gamesRecommended: false,
          lastPracticed: row.last_practiced_at ?? undefined,
          totalPractices: row.questions_answered ?? 0,
        };
      });

      const overallMastery = competencies.length
        ? Math.round(competencies.reduce((sum, competency) => sum + competency.mastery, 0) / competencies.length)
        : 0;

      return {
        id: `${subject}:${strand}`,
        name: strand,
        competencies,
        overallMastery,
      };
    });

    const allCompetencies = topicModels.flatMap((topic) => topic.competencies);
    const overallMastery = allCompetencies.length
      ? Math.round(allCompetencies.reduce((sum, competency) => sum + competency.mastery, 0) / allCompetencies.length)
      : 0;

    return {
      id: subject.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: subject,
      icon: iconForSubject(subject),
      topics: topicModels,
      overallMastery,
    };
  });
}

export function CompetencyMap({ onStartPractice, className }: CompetencyMapProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const loadProgress = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) setSubjects([]);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('grade')
          .eq('id', user.id)
          .maybeSingle();

        let query = supabase
          .from('learning_progress')
          .select(
            'competency_code, competency_name, subject, strand, mastery_level, progress_percentage, questions_answered, last_practiced_at',
          )
          .eq('user_id', user.id)
          .order('last_practiced_at', { ascending: false });

        if (profile?.grade) {
          query = query.eq('grade', profile.grade);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (!cancelled) {
          setSubjects(buildSubjects((data as ProgressRow[] | null) ?? []));
        }
      } catch (error) {
        console.error('[CompetencyMap] Failed to load learning progress:', error);
        if (!cancelled) setLoadError('Your learning map could not be loaded.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadProgress();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });
  };

  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  const getMasteryColor = (mastery: number) => {
    if (mastery >= 90) return 'text-green-600 dark:text-green-400';
    if (mastery >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getMasteryBgColor = (mastery: number) => {
    if (mastery >= 90) return 'bg-green-100 dark:bg-green-950';
    if (mastery >= 50) return 'bg-amber-100 dark:bg-amber-950';
    return 'bg-red-100 dark:bg-red-950';
  };

  const getStatusIcon = (status: Competency['status'], mastery: number) => {
    if (status === 'mastered' || mastery >= 90) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (status === 'in-progress' || mastery > 0) return <Circle className="h-4 w-4 text-amber-600" />;
    return <Circle className="h-4 w-4 text-slate-400" />;
  };

  const recommended = subjects
    .flatMap((subject) => subject.topics.map((topic) => ({ subject, topic })))
    .flatMap(({ subject, topic }) => topic.competencies.map((competency) => ({ subject, topic, competency })))
    .find(({ competency }) => competency.mastery > 0 && competency.mastery < 70);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your learning map…
        </CardContent>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card className={className}>
        <CardContent className="flex min-h-48 flex-col items-center justify-center text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Learning map unavailable</p>
          <p className="text-xs text-muted-foreground mt-1">Your saved learning progress could not be loaded.</p>
        </CardContent>
      </Card>
    );
  }

  if (subjects.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex min-h-56 flex-col items-center justify-center text-center px-6">
          <Sparkles className="h-9 w-9 text-teal-500 mb-3" />
          <p className="font-semibold">Your learning map is waiting for your first activity</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Complete a lesson or ask SyncSenta a question and your competency progress will appear here automatically.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {recommended && (
        <Card className="bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-950 dark:to-violet-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Sparkles className="h-5 w-5" />
              Recommended for You
            </CardTitle>
            <CardDescription className="text-blue-600 dark:text-blue-400">
              Based on your saved competency progress
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {recommended.subject.name} → {recommended.topic.name}
              </p>
              <p className="font-semibold text-blue-700 dark:text-blue-300">
                {recommended.competency.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={recommended.competency.mastery} className="flex-1 h-2 bg-blue-200 dark:bg-blue-900" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {recommended.competency.mastery}%
              </span>
            </div>
            <Button onClick={() => onStartPractice?.(recommended.competency.id)} className="w-full bg-blue-600 hover:bg-blue-700">
              <Target className="mr-2 h-4 w-4" />
              Start Practice
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Your Learning Map
          </CardTitle>
          <CardDescription>
            Track your saved progress across subjects, strands, and competencies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-2">
              {subjects.map((subject) => {
                const isExpanded = expandedSubjects.has(subject.id);
                return (
                  <div key={subject.id} className="space-y-2">
                    <button
                      onClick={() => toggleSubject(subject.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:bg-muted',
                        getMasteryBgColor(subject.overallMastery),
                      )}
                    >
                      {isExpanded ? <ChevronDown className="h-5 w-5 flex-shrink-0" /> : <ChevronRight className="h-5 w-5 flex-shrink-0" />}
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold">{subject.name}</span>
                          <span className={cn('text-sm font-bold', getMasteryColor(subject.overallMastery))}>{subject.overallMastery}%</span>
                        </div>
                        <Progress value={subject.overallMastery} className="h-2" />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="ml-6 space-y-2">
                        {subject.topics.map((topic) => {
                          const isTopicExpanded = expandedTopics.has(topic.id);
                          return (
                            <div key={topic.id} className="space-y-2">
                              <button
                                onClick={() => toggleTopic(topic.id)}
                                className="w-full flex items-center gap-3 p-2 rounded-lg border hover:bg-muted transition-all"
                              >
                                {isTopicExpanded ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                                <div className="flex-1 text-left">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium">{topic.name}</span>
                                    <span className={cn('text-xs font-semibold', getMasteryColor(topic.overallMastery))}>{topic.overallMastery}%</span>
                                  </div>
                                  <Progress value={topic.overallMastery} className="h-1.5" />
                                </div>
                              </button>

                              {isTopicExpanded && (
                                <div className="ml-6 space-y-1">
                                  {topic.competencies.map((competency) => (
                                    <div
                                      key={competency.id}
                                      className={cn(
                                        'flex items-center gap-2 p-2 rounded-lg border transition-all',
                                        competency.gamesRecommended && 'bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700',
                                      )}
                                    >
                                      {getStatusIcon(competency.status, competency.mastery)}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-xs font-medium truncate">{competency.name}</span>
                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            {competency.gamesRecommended && (
                                              <Badge variant="secondary" className="text-xs gap-1 px-1.5 py-0">
                                                <Gamepad2 className="h-3 w-3" />
                                              </Badge>
                                            )}
                                            <span className={cn('text-xs font-semibold', getMasteryColor(competency.mastery))}>{competency.mastery}%</span>
                                          </div>
                                        </div>
                                        <Progress value={competency.mastery} className="h-1 mt-1" />
                                        {competency.lastPracticed && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            Last: {new Date(competency.lastPracticed).toLocaleDateString()} • {competency.totalPractices} practices
                                          </p>
                                        )}
                                      </div>
                                      <Button size="sm" variant="ghost" onClick={() => onStartPractice?.(competency.id)} className="h-7 px-2">
                                        <Target className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Mastery Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500" /><span>90%+ Mastered</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span>50-89% Learning</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span>&lt;50% Needs Practice</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
