'use client';

/**
 * /student/chat/[subject]
 *
 * Thin client wrapper that decodes the subject + grade and renders
'use client';

/**
 * /student/chat/[subject]
 *
 * Thin client wrapper that decodes the subject + grade and renders
 * <SocraticChat />. Grade is read from the ?grade= query param first, then
 * from sessionStorage (set by /student/journey), then a sensible default.
 *
 * No data fetching here — everything chat-related is in the SocraticChat
 * component which POSTs to /api/chat.
 */

import { useEffect, useState, use, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StudentHeader } from '@/components/layout/student-header';
import { SocraticChat } from '@/components/student/socratic-chat';
import { AdaptiveDifficultyDisplay } from '@/components/student/adaptive-difficulty-display';
import { ChatModeSelector, type ChatMode } from '@/components/student/chat-mode-selector';
import { LearningPathProgress } from '@/components/student/learning-path-progress';
import { useAuth } from '@/hooks/use-auth';
import { tutorLabelFor } from '@/lib/curriculum/grade-greetings';
import { Card } from '@/components/ui/card';
import { WellbeingCheckIn } from '@/components/student/wellbeing-checkin';
import { resolveTeachingLanguage } from '@/lib/teaching-language-policy';

const STORAGE_GRADE = 'learningJourney.grade';
const DEFAULT_GRADE = 'Grade 4';

interface PageProps {
  // Next.js 16 wraps dynamic route params in a Promise; React.use() unwraps it.
  params: Promise<{ subject: string }>;
}

function StudentChatContent({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subject: subjectParam } = use(params);
  const { user, profile } = useAuth();

  const subject = decodeURIComponent(subjectParam);
  const routeGrade = searchParams.get('grade')?.trim();
  const [grade, setGrade] = useState<string>(routeGrade || DEFAULT_GRADE);
  const effectiveGrade = routeGrade || grade;
  
  // Use authenticated user ID, fallback to 'anonymous' for unauthenticated sessions
  const studentId = user?.id || 'anonymous-student';
  const studentName = profile?.full_name || 'Mwanafunzi';
  
  const [language, setLanguage] = useState<'english' | 'kiswahili' | 'mixed'>('english');
  const [chatMode, setChatMode] = useState<ChatMode>('socratic');
  const [showAdaptiveDifficulty, setShowAdaptiveDifficulty] = useState(true);
  const [competencyCode, setCompetencyCode] = useState<string | undefined>(undefined);

  useEffect(() => {
    const queryGrade = (searchParams.get('grade') || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('grade') : null))?.trim();
    if (queryGrade) {
      setGrade(queryGrade);
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(STORAGE_GRADE, queryGrade);
        window.localStorage.setItem(STORAGE_GRADE, queryGrade);
      }
    } else if (typeof window !== 'undefined') {
      const stored = window.sessionStorage.getItem(STORAGE_GRADE) || window.localStorage.getItem(STORAGE_GRADE);
      if (stored) setGrade(stored);
    }

    if (typeof window !== 'undefined') {
      const savedLanguage = window.localStorage.getItem('preferredLanguage');
      if (savedLanguage === 'english' || savedLanguage === 'kiswahili' || savedLanguage === 'mixed') {
        setLanguage(resolveTeachingLanguage({ subject, grade: routeGrade || grade, requestedLanguage: savedLanguage }));
      } else {
        setLanguage(resolveTeachingLanguage({ subject, grade: routeGrade || grade }));
      }

      const savedMode = window.localStorage.getItem('chatMode.preferred');
      if (savedMode === 'socratic' || savedMode === 'homework-help' || savedMode === 'compass') {
        setChatMode(savedMode as ChatMode);
      }
    }
  }, [searchParams, subject, grade, routeGrade]);

  return (
    <div className="education-shell flex flex-col">
      <StudentHeader showBackButton onBack={() => router.push('/student/journey')} variant="catalog" />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 flex-col md:flex-row">
          <div>
            <h1 className="text-2xl font-bold">SyncSenta · {subject}</h1>
            <p className="text-sm text-muted-foreground">
              Your CBC learning guide · {effectiveGrade} · {tutorLabelFor(effectiveGrade)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">It uses your selected grade, subject, language, and learning progress to choose the next helpful step.</p>
          </div>
          <ChatModeSelector
            currentMode={chatMode}
            onModeChange={(m) => {
              setChatMode(m);
              if (typeof window !== 'undefined') {
                window.localStorage.setItem('chatMode.preferred', m);
              }
            }}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <div className="lg:col-span-3 min-h-96">
            <SocraticChat
              studentId={studentId}
              studentName={studentName}
              grade={effectiveGrade}
              subject={subject}
              language={resolveTeachingLanguage({ subject, grade: effectiveGrade, requestedLanguage: language })}
                mode={chatMode}
                competencyCode={competencyCode}
            />
          </div>

          <aside className="space-y-4">
            <WellbeingCheckIn />
            {/* Learning Path Progress */}
            <LearningPathProgress
              subject={subject}
              grade={effectiveGrade}
              userId={studentId}
              onSelectCheckpoint={(code) => {
                // When user clicks a checkpoint, guide the chat to that topic
                console.log('Selected checkpoint:', code);
                setCompetencyCode(code);
                // switch to homework help mode to guide step-by-step
                setChatMode('homework-help');
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem('chatMode.preferred', 'homework-help');
                }
              }}
            />

            {/* Adaptive Difficulty Display */}
            {showAdaptiveDifficulty && (
              <Card className="p-3">
                <button
                  onClick={() => setShowAdaptiveDifficulty(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 float-right"
                >
                  ✕
                </button>
                <AdaptiveDifficultyDisplay
                  userId={studentId}
                  competencyCode={subject}
                  subject={subject}
                />
              </Card>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function StudentChatPage(props: PageProps) {
  return (
    <Suspense fallback={<div className="education-shell flex flex-col min-h-screen bg-background" />}>
      <StudentChatContent {...props} />
    </Suspense>
  );
}
