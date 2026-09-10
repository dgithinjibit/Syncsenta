'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { StudentHeader } from '@/components/layout/student-header';
import { SubjectHeader } from '@/components/student/subject-header';
import { supabase } from '@/lib/supabase/client';
import {
  SUBJECT_REGISTRY,
  getSubjectXP,
  getOrCreateChatSession,
  defaultCompetencyForSubject,
} from '@/lib/chat/subject-session';
import { getChatMessages } from '@/lib/chat/chat-history-supabase';
import type { ChatHistoryMessage } from '@/lib/chat/chat-history-supabase';
import type { LearningSession } from '@/lib/session/session-persistence';

// Lazy-import the two layout components so the bundle is not bloated when
// neither is needed.
import dynamic from 'next/dynamic';

const SubjectChat = dynamic(
  () =>
    import('@/components/student/subject-chat').then((m) => m.SubjectChat),
  { ssr: false, loading: () => <PageSkeleton /> },
);

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-teal-100" />
      <div className="h-4 w-32 rounded bg-teal-50" />
      <div className="mt-4 flex-1 rounded-2xl bg-teal-50 h-96" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

interface PageState {
  sessionId: string;
  initialHistory: { role: 'user' | 'assistant'; content: string }[];
  totalXP: number;
  level: number;
  nextLevelXP: number;
  resumeActivity: { id: string; name: string; progress: number } | null;
  scaffoldingLevel: 'Independent' | 'Guided' | 'Intensive' | null;
}

export default function SubjectPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { user, profile, loading: authLoading } = useAuth();
  const [state, setState] = useState<PageState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const subjectMeta = SUBJECT_REGISTRY[slug];

  // Redirect unknown slugs immediately (before auth resolves).
  useEffect(() => {
    if (!subjectMeta) {
      router.replace('/student/sandbox');
    }
  }, [subjectMeta, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!subjectMeta) return;

    // Not logged in → redirect to login, preserve intended destination.
    if (!user) {
      router.replace(`/login?next=/student/subject/${slug}`);
      return;
    }

    const grade = profile?.grade ?? 'grade-4';
    const userId = user.id;

    const load = async () => {
      try {
        // Fetch all data in parallel.
        const [xpResult, sessionSyncRaw, chatSessionResult] = await Promise.all([
          getSubjectXP(userId, slug),
          fetch('/api/session/sync?action=get').then((r) =>
            r.ok ? r.json() : { session: null },
          ),
          getOrCreateChatSession(supabase, userId, slug, grade),
        ]);

        const redisSession: LearningSession | null =
          sessionSyncRaw?.session ?? null;

        const resumeRaw = redisSession?.currentActivity;
        const resumeActivity =
          resumeRaw && resumeRaw.subject === slug
            ? {
                id: resumeRaw.id,
                name: resumeRaw.name,
                progress: resumeRaw.progress,
              }
            : null;

        // Read last Omega scaffolding decision from Redis (written fire-and-forget by /api/chat).
        const scaffoldingLevel =
          (redisSession?.preferences?.scaffoldingLevel as
            | 'Independent'
            | 'Guided'
            | 'Intensive'
            | undefined) ?? null;

        // Fetch the last 40 messages for the session.
        const rawMessages = await getChatMessages(chatSessionResult.sessionId);
        const initialHistory: { role: 'user' | 'assistant'; content: string }[] =
          rawMessages
            .filter(
              (m: ChatHistoryMessage): m is ChatHistoryMessage & { role: 'user' | 'assistant' } =>
                m.role === 'user' || m.role === 'assistant',
            )
            .slice(-40)
            .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

        setState({
          sessionId: chatSessionResult.sessionId,
          initialHistory,
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

  // ── Guard renders ──────────────────────────────────────────────────────────

  if (!subjectMeta) return null; // redirecting

  if (authLoading || !state) {
    return (
      <div className="min-h-screen bg-teal-400 p-1 sm:p-2">
        <div className="min-h-[calc(100vh-0.5rem)] overflow-hidden rounded-[1.6rem] bg-[#fffaf0] shadow-2xl sm:rounded-[2rem]">
          <StudentHeader
            showBackButton
            onBack={() => router.push('/student/sandbox')}
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

  const grade = profile?.grade ?? 'grade-4';
  const language =
    (profile?.language_preference as 'english' | 'kiswahili' | 'mixed') ?? 'mixed';
  const studentName = profile?.full_name ?? 'Student';

  const handleResume = () => {
    if (state.resumeActivity && subjectMeta.layout === 'sandbox') {
      const gradeSlug = grade.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      router.push(
        `/student/sandbox/${gradeSlug}/${slug}/${state.resumeActivity.id}`,
      );
    }
  };

  const handleStartFresh = () => {
    if (subjectMeta.layout === 'sandbox') {
      const gradeSlug = grade.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      router.push(`/student/sandbox/${gradeSlug}/${slug}`);
    }
    // For chat layout, "start fresh" simply scrolls the chat to top — no
    // navigation needed; the SubjectChat will handle a fresh context on its own.
  };

  return (
    <div className="min-h-screen bg-teal-400 p-1 sm:p-2">
      <div className="flex min-h-[calc(100vh-0.5rem)] flex-col overflow-hidden rounded-[1.6rem] bg-[#fffaf0] shadow-2xl sm:rounded-[2rem]">
        <StudentHeader
          showBackButton
          onBack={() => router.push('/student/sandbox')}
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
            <SubjectChat
              subjectSlug={slug}
              subjectLabel={subjectMeta.label}
              grade={grade}
              language={language}
              studentName={studentName}
              sessionId={state.sessionId}
              initialHistory={state.initialHistory}
              {...defaultCompetencyForSubject(slug)}
            />
          ) : (
            /* Sandbox layout: redirect to the subject activity list */
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

// ─────────────────────────────────────────────────────────────────────────────
// Sandbox redirect panel (shown briefly while router.push fires)
// ─────────────────────────────────────────────────────────────────────────────

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
    const gradeSlug = grade.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (resumeActivity) {
      router.replace(`/student/sandbox/${gradeSlug}/${slug}/${resumeActivity.id}`);
    } else {
      router.replace(`/student/sandbox/${gradeSlug}/${slug}`);
    }
  }, [slug, grade, resumeActivity, router]);

  return <PageSkeleton />;
}
