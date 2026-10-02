'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  MessageCircle,
  Clock,
  Brain,
  Zap,
  ArrowRight,
  Flame,
  Sparkles,
} from 'lucide-react';
import { StudentHeader } from '@/components/layout/student-header';
import { InteractiveChallengePath } from '@/components/student/interactive-challenge-path';
import { useAuth } from '@/hooks/use-auth';
import { SUBJECT_REGISTRY } from '@/lib/chat/subject-session';
import {
  describeLastActive,
  getStudentHomeData,
  type StudentHomeData,
} from '@/lib/student/home-data';

const EMPTY_HOME: StudentHomeData = {
  subjects: [],
  streakDays: 0,
  totalSessions: 0,
  totalMessages: 0,
  points: null,
};

/**
 * `chat_sessions.subject` holds the slug (`mathematics`); the learner should
 * read the curriculum name (`Mathematics`). Unknown slugs are tidied rather
 * than dropped, because a session that exists is worth showing.
 */
function subjectLabel(slug: string): string {
  const meta = SUBJECT_REGISTRY[slug];
  if (meta) return meta.label;
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
}

/**
 * The learner's own record.
 *
 * This page used to be demo content: a hardcoded `assignments` array ("due
 * Tomorrow, 11:59 PM"), a `learningPath` with invented 85/72/68 percentages, a
 * `todaysClasses` list with times nobody scheduled, and a KPI card asserting
 * "3 active assignments, 2 due this week". The real-looking numbers came from
 * `/api/test-personalization`, whose engine kept profiles in per-process
 * `Map`s and tried to persist them with `localStorage` inside a Vercel function
 * — so every cold start returned a randomly generated friendly name and zero
 * progress. The engine and that harness were deleted on 2026-09-29. Everything
 * below now reads the Supabase tables the app genuinely
 * writes (`chat_sessions`, `profiles.total_points`), and a learner with no
 * history sees an empty page instead of someone else's timetable.
 */
export default function StudentDashboardPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [home, setHome] = useState<StudentHomeData>(EMPTY_HOME);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoadFailed(false);
      setHome(await getStudentHomeData(user.id));
    } catch (error) {
      // Say so. The old page swallowed the failure and kept rendering the demo
      // arrays, which looked exactly like real progress.
      console.error('Failed to load learner record:', error);
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }
    void load();
    // Presence stamp so the teacher roster's online chip reflects this
    // session (see /api/presence/touch). Fire-and-forget by design: a failed
    // stamp must never break or block the learner home.
    void fetch('/api/presence/touch', { method: 'POST' }).catch(() => {});
  }, [user, authLoading, load]);

  const firstName = (profile?.full_name ?? 'Student').trim().split(' ')[0] || 'Student';

  const goToSubject = (subject: string) => {
    router.push(`/student/chat/${encodeURIComponent(subjectLabel(subject))}`);
  };

  const getGreeting = () => {
    switch (profile?.language_preference) {
      case 'kiswahili':
        return `Habari, ${firstName}!`;
      case 'mixed':
        return `Karibu, ${firstName}!`;
      default:
        return `Welcome back, ${firstName}!`;
    }
  };

  const getMotivation = () => {
    if (home.streakDays >= 7) return `A ${home.streakDays}-day streak — keep it going!`;
    if (home.totalSessions === 0) return 'Your record starts with one question. Ask Mwalimu anything.';
    if (home.totalMessages > 0) {
      return `${home.totalMessages} questions worked through with your tutor so far.`;
    }
    return 'Ready for today’s session?';
  };

  const mostRecent = home.subjects[0];

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <StudentHeader showBackButton={false} onBack={() => router.back()} />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <Brain className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading your record...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <StudentHeader showBackButton={false} onBack={() => router.back()} />

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-headline">
                {getGreeting()}
              </h1>
              <p className="text-muted-foreground">{getMotivation()}</p>
              {profile && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.grade && <Badge variant="outline">{profile.grade}</Badge>}
                  {(profile.subjects ?? []).slice(0, 3).map((subject) => (
                    <Badge key={subject} variant="outline" className="gap-1">
                      <BookOpen className="h-3 w-3" />
                      {subject}
                    </Badge>
                  ))}
                  {profile.school_name && (
                    <Badge variant="secondary">{profile.school_name}</Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Brain className="h-3 w-3" />
                SyncSenta Active
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                Your own record
              </Badge>
            </div>
          </div>

          {loadFailed && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-base">Could not read your learning record</CardTitle>
                <CardDescription>
                  The numbers below are empty because Supabase did not answer, not
                  because you have not worked. Check your connection and try again.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" onClick={() => void load()}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tutor Sessions</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{home.totalSessions}</div>
                <p className="text-xs text-muted-foreground">
                  {home.totalMessages > 0
                    ? `${home.totalMessages} messages worked through`
                    : 'None recorded yet'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Learning Streak</CardTitle>
                <Flame className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{home.streakDays}</div>
                <p className="text-xs text-muted-foreground">
                  {home.streakDays > 0 ? 'days in a row' : 'Start one today'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Subjects Touched</CardTitle>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{home.subjects.length}</div>
                <p className="text-xs text-muted-foreground">
                  {mostRecent
                    ? `Most recent: ${subjectLabel(mostRecent.subject)}`
                    : 'From your tutor history'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SyncSenta Points</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{home.points ?? '—'}</div>
                <p className="text-xs text-muted-foreground">
                  {home.points === null
                    ? 'No points on your profile yet'
                    : 'From work you have done'}
                </p>
              </CardContent>
            </Card>
          </div>

          <InteractiveChallengePath grade={profile?.grade || 'Grade 6'} />

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Where you are working</CardTitle>
                <CardDescription>
                  Subjects with a tutor session on your record, most recent first
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {home.subjects.length > 0 ? (
                  home.subjects.map((entry) => (
                    <button
                      key={entry.subject}
                      onClick={() => goToSubject(entry.subject)}
                      className="w-full text-left rounded-lg p-4 border hover:bg-muted transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{subjectLabel(entry.subject)}</h4>
                          <p className="text-sm text-muted-foreground">
                            {entry.sessions} session{entry.sessions === 1 ? '' : 's'} •{' '}
                            {entry.messages} message{entry.messages === 1 ? '' : 's'}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {describeLastActive(entry.lastActiveAt) ?? 'no activity yet'}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Open Mwalimu for this subject</span>
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center space-y-3">
                    <p className="text-sm text-muted-foreground">
                      No tutor sessions on your record yet. Everything on this page
                      comes from work you have actually done, so it starts empty —
                      there is no demo homework behind it.
                    </p>
                    <Button onClick={() => router.push('/student/chat')}>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Ask Mwalimu your first question
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Omega Claw Guided Tutor
                  </CardTitle>
                  <CardDescription>
                    Live Socratic tutor grounded in CBC curriculum
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full" onClick={() => router.push('/student/chat')}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Start Chat Session
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/student/journey?step=subject')}
                  >
                    Learning Journey
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Your subjects</CardTitle>
                  <CardDescription>
                    {profile?.subjects?.length
                      ? 'From your school profile'
                      : 'Not set on your profile yet'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(profile?.subjects ?? []).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {(profile?.subjects ?? []).map((subject) => (
                        <Badge key={subject} variant="outline">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Your teacher has not linked you to a class list yet. The tutor
                      works without one — ask it anything.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
