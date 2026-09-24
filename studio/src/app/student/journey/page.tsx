'use client';

/**
 * /student/journey
 *
 * Grade-first onboarding:
 *   Step 1: choose school level
 *   Step 2: choose grade
 *   → /student (canonical LMS dashboard)
 *
 * Date of birth remains part of the learner profile and is used internally for
 * safety/personalisation. It is not used as the learner's navigation model.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, GraduationCap, Layers, Loader2, MessageCircle } from 'lucide-react';
import { StudentHeader } from '@/components/layout/student-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAllGrades } from '@/data/curriculum';
import { supabase } from '@/lib/supabase/client';
import { getGradePersonalizationCopy } from '@/lib/student-journey';
import { normalizeGradeKey } from '@/lib/curriculum/grade-id';

const STORAGE_LEVEL = 'learningJourney.level';
const STORAGE_GRADE = 'learningJourney.grade';
const STORAGE_SUBJECT = 'learningJourney.subject';

type LevelId = 'lower-primary' | 'upper-primary' | 'junior-secondary';

interface CbcLevel {
  id: LevelId;
  label: string;
  ageRange: string;
  description: string;
  grades: string[];
}

const CBC_LEVELS: readonly CbcLevel[] = [
  {
    id: 'lower-primary',
    label: 'Lower Primary',
    ageRange: 'Typical ages 7–10',
    description: 'Grades 1–3: literacy, numeracy, language and environmental foundations.',
    grades: ['Grade 1', 'Grade 2', 'Grade 3'],
  },
  {
    id: 'upper-primary',
    label: 'Upper Primary',
    ageRange: 'Typical ages 10–13',
    description: 'Grades 4–6: broader subjects building toward the KPSEA at Grade 6.',
    grades: ['Grade 4', 'Grade 5', 'Grade 6'],
  },
  {
    id: 'junior-secondary',
    label: 'Junior Secondary',
    ageRange: 'Typical ages 13–16',
    description: 'Grades 7–9: wider learning pathways and subject discovery.',
    grades: ['Grade 7', 'Grade 8', 'Grade 9'],
  },
];

const LEVELS_BY_ID: Record<LevelId, CbcLevel> = CBC_LEVELS.reduce(
  (acc, level) => ({ ...acc, [level.id]: level }),
  {} as Record<LevelId, CbcLevel>,
);

type Step = 'level' | 'grade';

export default function JourneyPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('level');
  const [level, setLevel] = useState<LevelId | null>(null);
  const [grade, setGrade] = useState<string | null>(null);
  const [isPreparingDashboard, setIsPreparingDashboard] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedLevel = (window.sessionStorage.getItem(STORAGE_LEVEL) || window.localStorage.getItem(STORAGE_LEVEL)) as LevelId | null;
    const savedGrade = window.sessionStorage.getItem(STORAGE_GRADE) || window.localStorage.getItem(STORAGE_GRADE);
    if (savedLevel && LEVELS_BY_ID[savedLevel]) {
      setLevel(savedLevel);
      if (savedGrade && LEVELS_BY_ID[savedLevel].grades.includes(savedGrade)) {
        setGrade(savedGrade);
      }
    }
  }, []);

  // Registry keys are `Grade4` while journey options are `Grade 4`; compare
  // on one normalized form so coverage checks actually match.
  const coveredGrades = new Set<string>(getAllGrades().map(normalizeGradeKey));

  const pickLevel = (id: LevelId) => {
    setLevel(id);
    setGrade(null);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(STORAGE_LEVEL, id);
      window.localStorage.setItem(STORAGE_LEVEL, id);
      window.sessionStorage.removeItem(STORAGE_GRADE);
      window.localStorage.removeItem(STORAGE_GRADE);
      window.sessionStorage.removeItem(STORAGE_SUBJECT);
      window.localStorage.removeItem(STORAGE_SUBJECT);
    }
    setStep('grade');
  };

  const pickGrade = async (selectedGrade: string) => {
    if (!coveredGrades.has(normalizeGradeKey(selectedGrade)) || isPreparingDashboard) return;
    setIsPreparingDashboard(true);
    setGrade(selectedGrade);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(STORAGE_GRADE, selectedGrade);
      window.localStorage.setItem(STORAGE_GRADE, selectedGrade);
      window.sessionStorage.removeItem(STORAGE_SUBJECT);
      window.localStorage.removeItem(STORAGE_SUBJECT);
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('profiles').update({ grade: selectedGrade }).eq('id', user.id);
      if (error) console.error('Unable to persist selected grade:', error);
    }
    router.push('/student');
  };

  const currentLevel = level ? LEVELS_BY_ID[level] : null;

  const personalizationCopy = grade ? getGradePersonalizationCopy(grade) : null;

  return (
    <div className="education-shell">
      <StudentHeader showBackButton onBack={() => router.back()} />

      <main className="container mx-auto max-w-4xl px-4 py-8" aria-live="polite">
        {isPreparingDashboard && personalizationCopy ? (
          <div className="flex min-h-[22rem] flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-full bg-primary/10 p-4 text-primary">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold md:text-3xl">{personalizationCopy.title}</h1>
              <p className="max-w-md text-muted-foreground">{personalizationCopy.description}</p>
              <p className="text-sm text-muted-foreground">You can wait here—we are taking you to your dashboard next.</p>
            </div>
          </div>
        ) : (
          <>
        <div className="mb-8 space-y-2 text-center">
          <div className="inline-flex items-center gap-2 text-primary">
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-medium uppercase tracking-wide">Learning Journey</span>
          </div>
          <h1 className="text-3xl font-bold md:text-4xl">
            {step === 'level' ? 'Choose your school level' : 'Choose your grade'}
          </h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
            {step === 'level'
              ? 'Your grade shapes the timetable, lessons, sandbox activities, and tutor support in your dashboard.'
              : `${currentLevel?.label} · ${currentLevel?.description ?? ''}`}
          </p>
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-2 text-sm md:gap-3">
          <Badge variant={step === 'level' ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => setStep('level')}>
            1. School level{currentLevel ? ` · ${currentLevel.label}` : ''}
          </Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant={step === 'grade' ? 'default' : 'secondary'} className={level ? 'cursor-pointer' : 'opacity-50'} onClick={() => level && setStep('grade')}>
            2. Grade{grade ? ` · ${grade}` : ''}
          </Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant="outline">3. Dashboard</Badge>
        </div>

        {step === 'level' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {CBC_LEVELS.map((schoolLevel) => (
              <Card
                key={schoolLevel.id}
                role="button"
                tabIndex={0}
                onClick={() => pickLevel(schoolLevel.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') pickLevel(schoolLevel.id);
                }}
                className="cursor-pointer transition hover:border-primary hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Layers className="h-5 w-5 text-primary" />
                    {schoolLevel.label}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {schoolLevel.ageRange}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium text-foreground">{schoolLevel.grades.join(' · ')}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{schoolLevel.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {step === 'grade' && currentLevel && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {currentLevel.grades.map((selectedGrade) => {
                const covered = coveredGrades.has(normalizeGradeKey(selectedGrade));
                return (
                  <Card
                    key={selectedGrade}
                    role="button"
                    tabIndex={covered && !isPreparingDashboard ? 0 : -1}
                    aria-disabled={!covered || isPreparingDashboard}
                    onClick={() => void pickGrade(selectedGrade)}
                    onKeyDown={(event) => {
                      if (covered && !isPreparingDashboard && (event.key === 'Enter' || event.key === ' ')) {
                        void pickGrade(selectedGrade);
                      }
                    }}
                    className={covered && !isPreparingDashboard ? 'cursor-pointer transition hover:border-primary hover:shadow-md' : 'cursor-not-allowed opacity-60'}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <GraduationCap className="h-5 w-5 text-primary" />
                        {selectedGrade}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{currentLevel.label}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {currentLevel.ageRange}
                      </p>
                      {!covered && <Badge variant="outline" className="mt-3 text-xs">Coming soon</Badge>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="mt-8 flex justify-center">
              <Button variant="ghost" onClick={() => setStep('level')} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Change school level
              </Button>
            </div>
          </>
        )}
          </>
        )}
      </main>
    </div>
  );
}
