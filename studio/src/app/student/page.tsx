'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen, MessageCircle, Brain, Zap, ArrowRight,
  TrendingUp, Target, Trophy, Map, Sparkles,
  ChevronRight, Flame,
} from 'lucide-react';
import { StudentHeader } from '@/components/layout/student-header';
import { GamificationOverview } from '@/components/gamification/gamification-overview';
import { LeaderboardPanel } from '@/components/gamification/leaderboard-panel';
import { tutorTaglineFor } from '@/lib/curriculum/grade-greetings';
import type { GamificationMode } from '@/components/student/gamification-panel';
import { loadGamificationMode } from '@/components/student/gamification-mode-switcher';
import { supabase } from '@/lib/supabase/client';
import { CompetencyMap } from '@/components/student/competency-map';
import { FloatingConceptChat } from '@/components/student/floating-concept-chat';
import { getActivitiesForGradeSubject } from '@/lib/sandbox/sandbox-activities';
import { gradeNameToId } from '@/lib/curriculum/grade-id';
import type { GradeId, SubjectId } from '@/lib/sandbox/sandbox-types';
import { useAgeTheme } from '@/lib/theme/age-theme-context';
import { ErrorState, classifyError } from '@/components/student/error-boundary';
import { StatCardSkeleton, SubjectCardSkeleton } from '@/components/ui/skeleton';
import { perfMonitor, measureAsync } from '@/lib/telemetry/performance-monitor';

interface StudentProfile {
  id: string;
  name: string;
  grade: string;
  preferredLanguage: 'english' | 'kiswahili' | 'mixed';
  learningStyle: string;
  interests: string[];
  strengths: string[];
  challenges: string[];
  culturalContext: { region: string; culturalReferences: string[] };
}

interface LearningProgress {
  subject: string;
  overallProgress: number;
  streakDays: number;
  totalSessions: number;
  averageSessionTime: number;
}

type Tab = 'overview' | 'gamification' | 'competency';

const COMPETENCY_DATA = [
  { id: 'math', name: 'Mathematics', icon: 'calculator', overallMastery: 78, topics: [{ id: 'fractions', name: 'Fractions', overallMastery: 85, competencies: [{ id: 'frac-1', name: 'Understanding Fractions', mastery: 95, status: 'mastered' as const, gamesRecommended: false, lastPracticed: new Date(Date.now() - 2 * 86400000).toISOString(), totalPractices: 12 }, { id: 'frac-2', name: 'Adding Fractions', mastery: 80, status: 'in-progress' as const, gamesRecommended: false, lastPracticed: new Date(Date.now() - 86400000).toISOString(), totalPractices: 8 }] }, { id: 'decimals', name: 'Decimals', overallMastery: 70, competencies: [{ id: 'dec-1', name: 'Understanding Decimals', mastery: 75, status: 'in-progress' as const, gamesRecommended: false, lastPracticed: new Date(Date.now() - 86400000).toISOString(), totalPractices: 6 }] }] },
  { id: 'english', name: 'English', icon: 'book', overallMastery: 82, topics: [{ id: 'reading', name: 'Reading Comprehension', overallMastery: 88, competencies: [{ id: 'read-1', name: 'Main Idea', mastery: 92, status: 'mastered' as const, gamesRecommended: false, lastPracticed: new Date(Date.now() - 86400000).toISOString(), totalPractices: 10 }, { id: 'read-2', name: 'Inference', mastery: 84, status: 'in-progress' as const, gamesRecommended: false, lastPracticed: new Date(Date.now() - 2 * 86400000).toISOString(), totalPractices: 7 }] }] },
  { id: 'science', name: 'Science', icon: 'flask', overallMastery: 68, topics: [{ id: 'biology', name: 'Biology', overallMastery: 72, competencies: [{ id: 'bio-1', name: 'Plant Parts', mastery: 80, status: 'in-progress' as const, gamesRecommended: false, lastPracticed: new Date(Date.now() - 2 * 86400000).toISOString(), totalPractices: 6 }, { id: 'bio-2', name: 'Photosynthesis', mastery: 64, status: 'in-progress' as const, gamesRecommended: true, lastPracticed: new Date(Date.now() - 4 * 86400000).toISOString(), totalPractices: 3 }] }] },
];

export default function StudentDashboardPage() {
  const router = useRouter();
  const { theme, ageTheme, setGrade: setThemeGrade } = useAgeTheme();
  const [studentName, setStudentName] = useState('Student');
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [learningProgress, setLearningProgress] = useState<LearningProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [gamificationMode, setGamificationMode] = useState<GamificationMode>('balanced');

  useEffect(() => {
    const stored = localStorage.getItem('userName') || localStorage.getItem('studentName');
    if (stored) setStudentName(stored.split(' ')[0]);
    setGamificationMode(loadGamificationMode());

    const savedGrade = sessionStorage.getItem('learningJourney.grade') || localStorage.getItem('learningJourney.grade');
    const savedLevel = sessionStorage.getItem('learningJourney.level') || localStorage.getItem('learningJourney.level');
    if (savedGrade && !sessionStorage.getItem('learningJourney.grade')) sessionStorage.setItem('learningJourney.grade', savedGrade);
    if (savedLevel && !sessionStorage.getItem('learningJourney.level')) sessionStorage.setItem('learningJourney.level', savedLevel);
    if (!savedGrade) { router.push('/student/journey'); return; }
    if (savedGrade) setThemeGrade(savedGrade);

    loadPersonalizedLearningData();
  }, [router]);

  const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit = {}, ms = 8000) => {
    const ctrl = new AbortController();
    const t = window.setTimeout(() => ctrl.abort(), ms);
    try { return await fetch(input, { ...init, signal: ctrl.signal }); }
    finally { window.clearTimeout(t); }
  };

  const loadPersonalizedLearningData = async () => {
    perfMonitor.start('dashboard.load');
    
    try {
      setIsLoading(true);
      setLoadError(null);
      
      // Get authenticated user ID
      perfMonitor.start('dashboard.auth');
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'anonymous';
      perfMonitor.end('dashboard.auth');
      
      // Load profile
      const profileData = await measureAsync('dashboard.profile', async () => {
        const profileRes = await fetchWithTimeout(`/api/test-personalization?action=profile&userId=${userId}`);
        if (!profileRes.ok) {
          throw new Error(`HTTP ${profileRes.status}: Failed to load profile`);
        }
        const data = await profileRes.json();
        if (!data.success || !data.profile) {
          throw new Error('Profile data unavailable');
        }
        return data;
      });
      
      setProfile(profileData.profile);
      setStudentName(profileData.profile.name);
      if (profileData.profile.grade) setThemeGrade(profileData.profile.grade);

      // Load progress for all subjects in parallel
      const subjects = ['Mathematics', 'English', 'Science'];
      const results = await measureAsync('dashboard.progress.all', async () => {
        return Promise.all(subjects.map(async (subject) => {
          try {
            const res = await fetchWithTimeout(`/api/test-personalization?action=progress&userId=${userId}&subject=${subject}`);
            if (!res.ok) return null;
            const d = await res.json();
            return d.success && d.progress ? { subject, ...d.progress } : null;
          } catch (err) {
            console.warn(`Failed to load ${subject} progress:`, err);
            return null;
          }
        }));
      });
      
      setLearningProgress(results.filter(Boolean) as LearningProgress[]);
      
      perfMonitor.end('dashboard.load');
      const summary = perfMonitor.getSummary();
      console.log('📊 Dashboard load metrics:', {
        totalTime: `${summary.totalTime.toFixed(0)}ms`,
        avgTime: `${summary.avgTime.toFixed(0)}ms`,
        p50: `${summary.p50.toFixed(0)}ms`,
        p95: `${summary.p95.toFixed(0)}ms`,
      });
      
    } catch (error) {
      console.error('[StudentDashboard] loadPersonalizedLearningData error:', error);
      const classified = classifyError(error);
      setLoadError(classified.action || classified.message);
      perfMonitor.end('dashboard.load');
    } finally {
      setIsLoading(false);
    }
  };

  const goToSandbox = (subject?: string) => {
    const savedGrade = sessionStorage.getItem('learningJourney.grade') || localStorage.getItem('learningJourney.grade');
    if (!savedGrade) { router.push('/student/journey'); return; }
    const resolved = subject || localStorage.getItem('learningJourney.subject') || 'Mathematics';
    const subjectId = resolved.toLowerCase().includes('math') ? 'mathematics'
      : resolved.toLowerCase().includes('kiswahili') ? 'kiswahili'
      : resolved.toLowerCase().includes('environment') ? 'environmental'
      : resolved.toLowerCase().includes('creative') ? 'creative'
      : resolved.toLowerCase().includes('english') ? 'english' : 'mathematics';
    const gradeId = gradeNameToId(savedGrade) as GradeId;
    const first = getActivitiesForGradeSubject(gradeId, subjectId as SubjectId)[0];
    sessionStorage.setItem('learningJourney.subject', resolved);
    localStorage.setItem('learningJourney.subject', resolved);
    if (!first) { router.push(`/student/sandbox?grade=${encodeURIComponent(gradeId)}&subject=${encodeURIComponent(subjectId)}`); return; }
    router.push(`/student/sandbox/${encodeURIComponent(gradeId)}/${encodeURIComponent(subjectId)}/${encodeURIComponent(first.id)}`);
  };

  const greeting = profile
    ? (profile.preferredLanguage === 'kiswahili' ? `Karibu tena, ${profile.name}!` : `Welcome back, ${profile.name}!`)
    : `Karibu, ${studentName}`;

  const totalSessions = learningProgress.reduce((s, p) => s + p.totalSessions, 0);
  const maxStreak = Math.max(...learningProgress.map(p => p.streakDays), 0);
  const avgProgress = Math.round(learningProgress.reduce((s, p) => s + p.overallProgress, 0) / Math.max(learningProgress.length, 1));

  const isYoung = ageTheme === 'pre-primary' || ageTheme === 'lower-primary';

  if (isLoading) {
    return (
      <div className={`flex min-h-screen flex-col ${theme.pageBg}`}>
        <StudentHeader showBackButton={false} onBack={() => router.back()} />
        <main className="flex-1 px-4 py-5 md:px-6 md:py-6">
          <div className="max-w-6xl mx-auto space-y-5">
            {/* Greeting skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-2">
                <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-32 bg-slate-200 rounded animate-pulse" />
                <div className="h-9 w-24 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>

            {/* Stats skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>

            {/* Tab bar skeleton */}
            <div className="flex border-b border-border gap-4">
              <div className="h-10 w-24 bg-slate-200 rounded-t animate-pulse" />
              <div className="h-10 w-28 bg-slate-200 rounded-t animate-pulse" />
              <div className="h-10 w-32 bg-slate-200 rounded-t animate-pulse" />
            </div>

            {/* Content skeleton */}
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-3">
                <SubjectCardSkeleton />
                <SubjectCardSkeleton />
                <SubjectCardSkeleton />
              </div>
              <div className="space-y-3">
                <div className="h-48 bg-slate-200 rounded-lg animate-pulse" />
                <div className="h-64 bg-slate-200 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`flex min-h-screen flex-col ${theme.pageBg}`}>
        <StudentHeader showBackButton={false} onBack={() => router.back()} />
        <main className="flex flex-1 items-center justify-center p-6">
          <ErrorState
            error={{
              type: 'network',
              message: 'Learning path unavailable',
              action: loadError,
              canRetry: true,
              showSupport: true,
            }}
            onRetry={() => void loadPersonalizedLearningData()}
            onGoBack={() => router.push('/student/journey')}
            onGoHome={() => router.push('/student')}
            size="md"
          />
        </main>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen flex-col ${theme.pageBg} text-slate-900`}>
      <StudentHeader showBackButton={false} onBack={() => router.back()} variant="catalog" />

      <main className="flex-1 px-4 py-5 md:px-6 md:py-6">
        <div className="max-w-6xl mx-auto space-y-5">

          {/* ── Greeting + actions ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className={`font-bold font-headline ${theme.headingSize}`}>
                {greeting}{isYoung ? ' 🌟' : ''}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {maxStreak > 7 ? `🔥 ${maxStreak}-day streak — you're on fire!`
                  : totalSessions > 10 ? `${totalSessions} sessions done. Keep going!`
                  : tutorTaglineFor(profile?.grade)}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => goToSandbox(learningProgress[0]?.subject)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm ${theme.ctaClass}`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isYoung ? '🚀 Start Learning!' : 'Start Learning'}
              </button>
              <Button size="sm" variant="outline" onClick={() => setActiveTab('competency')} className={`gap-1.5 ${theme.radiusClass}`}>
                <Map className="h-3.5 w-3.5" />
                {isYoung ? '🗺️ Map' : 'Learning Map'}
              </Button>
            </div>
          </div>

          {/* ── Stats ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard theme={theme} label={isYoung ? '🎯 Sessions' : 'Sessions'} value={totalSessions || '—'} sub={totalSessions ? `Avg ${Math.round(learningProgress.reduce((s, p) => s + p.averageSessionTime, 0) / Math.max(learningProgress.length, 1))} min` : 'Start your first!'} icon={<MessageCircle className="h-4 w-4 text-teal-600" />} />
            <StatCard theme={theme} label={isYoung ? '🔥 Streak' : 'Streak'} value={maxStreak > 0 ? `${maxStreak}d` : '—'} sub={maxStreak > 0 ? 'days in a row! 🔥' : 'Start today!'} icon={<Flame className="h-4 w-4 text-orange-500" />} />
            <StatCard theme={theme} label={isYoung ? '📈 Progress' : 'Progress'} value={learningProgress.length ? `${avgProgress}%` : '—'} sub="Across subjects" icon={<TrendingUp className="h-4 w-4 text-blue-500" />} />
            <StatCard theme={theme} label={isYoung ? '⭐ Grade' : 'Grade'} value={profile?.grade ?? (sessionStorage.getItem('learningJourney.grade') ?? '—')} sub={profile?.learningStyle ? `${profile.learningStyle} learner` : 'CBC curriculum'} icon={<Target className="h-4 w-4 text-violet-500" />} />
          </div>

          {/* ── Tab bar ── */}
          <div className="flex border-b border-border">
            {([
              { id: 'overview' as Tab, label: isYoung ? '📚 Overview' : 'Overview', icon: <BookOpen className="h-3.5 w-3.5" /> },
              { id: 'gamification' as Tab, label: isYoung ? '🏆 Badges' : 'Achievements', icon: <Trophy className="h-3.5 w-3.5" /> },
              { id: 'competency' as Tab, label: isYoung ? '🗺️ Map' : 'Learning Map', icon: <Map className="h-3.5 w-3.5" /> },
            ]).map(({ id, label, icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === id ? 'border-teal-600 text-teal-700' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                {icon}{label}
              </button>
            ))}
          </div>

          {/* ── Overview ── */}
          {activeTab === 'overview' && (
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-3">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {isYoung ? '📖 Your Subjects' : 'Your subjects'}
                </h2>
                {learningProgress.length > 0 ? (
                  learningProgress.map((p, i) => (
                    <button key={p.subject} onClick={() => goToSandbox(p.subject)}
                      className={`w-full text-left ${theme.cardClass} border p-4 hover:shadow-md transition-all ${theme.subjectColours[i % theme.subjectColours.length]}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{isYoung ? ['📐', '📝', '🔬'][i] ?? '📚' : ''} {p.subject}</span>
                        <span className="flex items-center gap-1 text-xs font-medium">{p.overallProgress}% <ChevronRight className="h-3 w-3 opacity-50" /></span>
                      </div>
                      <Progress value={p.overallProgress} className="h-1.5 mb-1.5" />
                      <div className="flex justify-between text-xs opacity-70">
                        <span>{p.totalSessions} sessions · {p.streakDays}d streak</span>
                        <span>{p.overallProgress < 30 ? 'Building foundations' : p.overallProgress < 70 ? 'Good progress' : 'Mastering it'}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className={`${theme.cardClass} border border-dashed border-teal-200 bg-teal-50/50 p-6 text-center`}>
                    <Brain className="h-8 w-8 mx-auto text-teal-400 mb-2" />
                    <p className="text-sm font-medium text-teal-700">{isYoung ? '✨ No sessions yet — let\'s start!' : 'No sessions yet'}</p>
                    <p className="text-xs text-teal-600 mt-1">Start learning to see your progress here</p>
                    <button onClick={() => goToSandbox()} className={`mt-3 px-4 py-2 text-sm ${theme.ctaClass}`}>
                      {isYoung ? '🚀 Begin!' : 'Start first session'}
                    </button>
                  </div>
                )}
              </div>

              {/* Right quick-access */}
              <div className="space-y-3">
                <Card className={`${theme.cardClass} bg-white`}>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4 text-teal-600" />
                      {isYoung ? '🤖 SyncSenta' : 'SyncSenta Tutor'}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{tutorTaglineFor(profile?.grade)}</p>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <button className={`w-full flex items-center justify-center gap-1.5 py-2 text-sm ${theme.ctaClass}`}
                      onClick={() => { const s = localStorage.getItem('learningJourney.subject') || sessionStorage.getItem('learningJourney.subject'); s ? goToSandbox(s) : router.push('/student/journey'); }}>
                      <MessageCircle className="h-3.5 w-3.5" />
                      {isYoung ? '💬 Open Sandbox!' : 'Open Sandbox'}
                      <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                    </button>
                  </CardContent>
                </Card>

                <Card className={`${theme.cardClass} bg-amber-50/50`} style={{ borderColor: 'rgb(253 230 138)' }}>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-600" />
                      {isYoung ? '🏅 My Badges' : 'Achievements'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <button onClick={() => setActiveTab('gamification')} className={`w-full flex items-center justify-between text-sm text-amber-700 font-medium hover:underline ${theme.radiusClass}`}>
                      {isYoung ? 'See my stickers! ⭐' : 'View badges & leaderboard'}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </CardContent>
                </Card>

                <Card className={`${theme.cardClass} bg-violet-50/50`} style={{ borderColor: 'rgb(221 214 254)' }}>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Map className="h-4 w-4 text-violet-600" />
                      {isYoung ? '🗺️ My Map' : 'Competency Map'}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{isYoung ? 'See what you know!' : 'See what you\'ve mastered'}</p>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <button onClick={() => setActiveTab('competency')} className={`w-full flex items-center justify-between text-sm text-violet-700 font-medium hover:underline ${theme.radiusClass}`}>
                      {isYoung ? 'Open map 🗺️' : 'Open learning map'}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'gamification' && (
            <div className="space-y-5">
              <GamificationOverview userId={getStudentId()} userName={studentName} />
              <div className="grid gap-5 lg:grid-cols-2">
                <LeaderboardPanel userId={getStudentId()} scope="class" />
                <LeaderboardPanel userId={getStudentId()} scope="school" />
              </div>
            </div>
          )}

          {activeTab === 'competency' && (
            <CompetencyMap subjects={COMPETENCY_DATA}
              onStartPractice={(id) => router.push(`/student/tutor-dashboard?competency=${id}`)} />
          )}

        </div>
      </main>

      <FloatingConceptChat studentName={studentName} grade={profile?.grade} language={profile?.preferredLanguage ?? 'mixed'} />
    </div>
  );
}

function StatCard({ theme, label, value, sub, icon }: {
  theme: any; label: string; value: string | number; sub: string; icon: React.ReactNode;
}) {
  return (
    <Card className={`${theme.cardClass} bg-white`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
          {icon}
        </div>
        <p className="text-xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-tight">{sub}</p>
      </CardContent>
    </Card>
  );
}
