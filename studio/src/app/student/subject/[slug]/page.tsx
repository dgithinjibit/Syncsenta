'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { StudentHeader } from '@/components/layout/student-header';
import { SubjectHeader } from '@/components/student/subject-header';
import { SocraticChat } from '@/components/student/socratic-chat';
import {
  SUBJECT_REGISTRY,
  getSubjectXP,
  defaultCompetencyForSubject,
} from '@/lib/chat/subject-session';
import type { LearningSession } from '@/lib/session/session-persistence';

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-teal-100" />
      <div className="h-4 w-32 rounded bg-teal-50" />
      <div className="mt-4 flex-1 rounded-2xl bg-teal-50 h-96" />
    </div>
  );
}

interface PageState {
  totalXP: number;
  level: number;
  nextLevelXP: number;
  resumeActivity: { id: string; name: string; progress: number } | null;
  scaffoldingLevel: 'Independent' | 'Guided' | 'Intensive' | null;
}

function toSandboxGradeId(grade: string): string {
  const normalized = grade.trim().toLowerCase();
  const match = normalized.match(/(?:grade[- ]?|g)([1-9])/);
  return match ? `g${match[1]}` : normalized.replace(/[^a-z0-9]+/g, '-');
}

function selectedBrowserGrade(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem('learningJourney.grade')
    || window.localStorage.getItem('learningJourney.grade');
}

export default function SubjectPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user, profile, loading: authLoading } = useAuth();
  const [state, setState] = useState<PageState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const subjectMeta = SUBJECT_REGISTRY[slug];

  useEffect(() => {
    if (!subjectMeta) {
      router.replace('/student/learn_by_making');
    }
  }, [subjectMeta, router]);

  useEffect(() => {
    if (authLoading || !subjectMeta) return;
    if (!user) {
      router.replace(`/login?next=/student/subject/${slug}`);
      return;
    }

    const grade = selectedBrowserGrade() ?? profile?.grade;
    if (!grade) {
      router.replace('/student/journey');
      return;
    }
    const userId = user.id;

    const load = async () => {
      try {
        // The unified SocraticChat owns conversation hydration/persistence.
        // This shell fetches only the data needed for the subject header.
        const [xpResult, sessionSyncRaw] = await Promise.all([
          getSubjectXP(userId, slug),
          fetch('/api/session/sync?action=get').then((r) =>
            r.ok ? r.json() : { session: null },
          ),
        ]);

        const redisSession: LearningSession | null = sessionSyncRaw?.session ?? null;
        const resumeRaw = redisSession?.currentActivity;
        const resumeActivity =
          resumeRaw && resumeRaw.subject === slug
            ? { id: resumeRaw.id, name: resumeRaw.name, progress: resumeRaw.progress }
            : null;
        const scaffoldingLevel =
          (redisSession?.preferences?.scaffoldingLevel as
            | 'Independent'
            | 'Guided'
            | 'Intensive'
            | undefined) ?? null;

        setState({
          totalXP: xpResult.totalXP,
          level: xpResult.level,
          nextLevelXP: xpResult.nextLevelXP,
          resumeActivity,
          scaffoldingLevel,
        });
      } catch (err) {
        console.error('[SubjectPage] load error', err);
        setLoadError('Could not load your subject data. Please refresh.');
      }
    };

    load();
  }, [authLoading, user, profile, slug, subjectMeta, router]);

  if (!subjectMeta) return null;

  if (authLoading || !state) {
    return (
      <div className="min-h-screen bg-teal-400 p-1 sm:p-2">
        <div className="min-h-[calc(100vh-0.5rem)] overflow-hidden rounded-[1.6rem] bg-[#fffaf0] shadow-2xl sm:rounded-[2rem]">
          <StudentHeader
            showBackButton
            onBack={() => router.push('/student/learn_by_making')}
            variant="catalog"
          />
          {loadError ? (
            <p className="px-6 pt-8 text-red-600">{loadError}</p>
          ) : (
            <PageSkeleton />
          )}
        </div>
      </div>
    );
  }

  const grade = selectedBrowserGrade() ?? profile?.grade;
  if (!grade) {
    router.replace('/student/journey');
    return null;
  }
  const language =
    (profile?.language_preference as 'english' | 'kiswahili' | 'mixed') ?? 'mixed';
  const studentName = profile?.full_name ?? 'Student';

  const handleResume = () => {
    if (state.resumeActivity && subjectMeta.layout === 'sandbox') {
      const gradeSlug = toSandboxGradeId(grade);
      router.push(`/student/sandbox/${gradeSlug}/${slug}/${state.resumeActivity.id}`);
    }
  };

  const handleStartFresh = () => {
    if (subjectMeta.layout === 'sandbox') {
      const gradeSlug = toSandboxGradeId(grade);
      router.push(`/student/sandbox/${gradeSlug}/${slug}`);
    }
  };

  return (
    <div className="min-h-screen bg-teal-400 p-1 sm:p-2">
      <div className="flex min-h-[calc(100vh-0.5rem)] flex-col overflow-hidden rounded-[1.6rem] bg-[#fffaf0] shadow-2xl sm:rounded-[2rem]">
        <StudentHeader
          showBackButton
          onBack={() => router.push('/student/learn_by_making')}
          variant="catalog"
        />
        <SubjectHeader
          label={subjectMeta.label}
          slug={slug}
          totalXP={state.totalXP}
          level={state.level}
          nextLevelXP={state.nextLevelXP}
          resumeActivity={state.resumeActivity}
          scaffoldingLevel={state.scaffoldingLevel}
          grade={grade}
          onResume={handleResume}
          onStartFresh={handleStartFresh}
        />
        <main className="flex flex-1 flex-col overflow-hidden">
          {subjectMeta.layout === 'chat' ? (
            <SocraticChat
              studentId={user?.id ?? 'student'}
              studentName={studentName}
              grade={grade}
              subject={slug}
              language={language}
              competencyCode={defaultCompetencyForSubject(slug).competencyCode}
            />
          ) : (
            <SandboxRedirect
              slug={slug}
              grade={grade}
              resumeActivity={state.resumeActivity}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function SandboxRedirect({
  slug,
  grade,
  resumeActivity,
}: {
  slug: string;
  grade: string;
  resumeActivity: { id: string; name: string; progress: number } | null;
}) {
  const router = useRouter();

  useEffect(() => {
    const gradeSlug = toSandboxGradeId(grade);
    if (resumeActivity) {
      router.replace(`/student/sandbox/${gradeSlug}/${slug}/${resumeActivity.id}`);
    } else {
      router.replace(`/student/sandbox/${gradeSlug}/${slug}`);
    }
  }, [slug, grade, resumeActivity, router]);

  return <PageSkeleton />;
}
