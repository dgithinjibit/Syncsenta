'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';

type Role = 'student' | 'teacher' | 'parent' | 'admin';
type SchoolOption = { id: string; name: string; county: string | null };
type ClassOption = { id: string; name: string; grade: string };

const grades = ['PP1', 'PP2', ...Array.from({ length: 12 }, (_, index) => `Grade ${index + 1}`)];

function roleFromQuery(value: string | null): Role {
  if (value === 'teacher' || value === 'parent' || value === 'admin') return value;
  return 'student';
}

function safeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

function GoogleOnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = roleFromQuery(searchParams.get('role'));
  const next = safeNext(searchParams.get('next'));
  const [fullName, setFullName] = useState('');
  const [grade, setGrade] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [schoolMode, setSchoolMode] = useState<'school' | 'home'>('school');
  const [classroomId, setClassroomId] = useState('');
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogMessage, setCatalogMessage] = useState<string | null>(null);

  const selectedSchool = useMemo(() => schools.find((school) => school.id === schoolId), [schools, schoolId]);

  useEffect(() => {
    let cancelled = false;
    async function loadIdentity() {
      const { data, error: identityError } = await supabase.auth.getUser();
      if (cancelled) return;
      if (identityError || !data.user) {
        router.replace('/auth/signin?message=Please%20sign%20in%20with%20Google%20again');
        return;
      }
      setFullName(data.user.user_metadata?.full_name || data.user.user_metadata?.name || '');
      setLoading(false);
    }
    loadIdentity();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    async function loadSchools() {
      const { data, error: directoryError } = await (supabase as any)
        .from('schools')
        .select('id,name,county')
        .eq('status', 'active')
        .order('name')
        .limit(200);
      if (cancelled) return;
      if (directoryError) {
        setCatalogMessage('The approved school directory is temporarily unavailable. You can continue as a home learner, or try again later.');
        return;
      }
      setSchools((data ?? []) as SchoolOption[]);
      if (!data?.length) setCatalogMessage('No approved schools are published yet. Home learning is available without choosing a school.');
    }
    loadSchools();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadClasses() {
      if (!schoolId || role !== 'student') { setClasses([]); return; }
      const { data, error: classError } = await (supabase as any)
        .from('school_classes')
        .select('id,name,grade')
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .order('grade')
        .order('name')
        .limit(100);
      if (cancelled) return;
      if (classError) setError('The class directory is temporarily unavailable. You may continue without a class if you are learning at home.');
      else setClasses((data ?? []) as ClassOption[]);
    }
    loadClasses();
    return () => { cancelled = true; };
  }, [role, schoolId]);

  const handleSchoolChange = (value: string) => {
    if (value === 'home-learning') {
      setSchoolMode('home');
      setSchoolId('');
      setClassroomId('');
      return;
    }
    setSchoolMode('school');
    setSchoolId(value);
    setClassroomId('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!fullName.trim()) { setError('Please enter your full name.'); return; }
    if (role === 'student' && !grade) { setError('Please choose your CBC grade so SyncSenta can personalize your learning path.'); return; }
    if (role === 'admin' && !schoolId) { setError('Heads of School must select an approved school.'); return; }

    setSaving(true);
    try {
      const response = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, fullName, grade, schoolId, classroomId, next }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'We could not finish your profile.');
      if (role === 'student' && grade) {
        window.sessionStorage.setItem('learningJourney.grade', grade);
        window.localStorage.setItem('learningJourney.grade', grade);
      }
      router.replace(result.next || (role === 'student' ? '/student' : '/teacher'));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'We could not finish your profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <main className="education-shell flex min-h-screen items-center justify-center p-5"><p className="text-sm text-muted-foreground">Checking your secure Google session…</p></main>;
  }

  return (
    <main className="education-shell flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_hsl(var(--secondary))_0,_transparent_34rem)] p-5">
      <Card className="w-full max-w-lg border-border/80 shadow-[0_18px_45px_hsl(174_30%_16%/0.1)]">
        <CardHeader>
          <p className="education-kicker">One last step</p>
          <CardTitle>Complete your SyncSenta profile</CardTitle>
          <CardDescription>Your Google account is connected. Add only the learning context you want to use.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="space-y-2">
              <Label htmlFor="onboarding-full-name">Full name</Label>
              <Input id="onboarding-full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} disabled={saving} required />
            </div>

            {role === 'student' && (
              <div className="space-y-2">
                <Label htmlFor="onboarding-grade">CBC grade</Label>
                <select id="onboarding-grade" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={grade} onChange={(event) => { setGrade(event.target.value); setClassroomId(''); }} disabled={saving} required>
                  <option value="">Choose your grade</option>
                  {grades.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
            )}

            {(role === 'student' || role === 'admin') && (
              <div className="space-y-2">
                <Label htmlFor="onboarding-school">School {role === 'student' ? '(optional for home learners)' : ''}</Label>
                <select id="onboarding-school" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={schoolMode === 'home' ? 'home-learning' : schoolId} onChange={(event) => handleSchoolChange(event.target.value)} disabled={saving} required={role === 'admin'}>
                  <option value="">Choose a school</option>
                  {role === 'student' && <option value="home-learning">I learn at home / no school</option>}
                  {schools.map((school) => <option key={school.id} value={school.id}>{school.name}{school.county ? ` — ${school.county}` : ''}</option>)}
                </select>
                {role === 'student' && <p className="text-xs text-muted-foreground">You can start learning from home without sharing a school. You can connect a school later.</p>}
                {selectedSchool && <p className="text-xs text-muted-foreground">Selected: {selectedSchool.name}</p>}
                {catalogMessage && <p className="text-xs text-muted-foreground" role="status">{catalogMessage}</p>}
              </div>
            )}

            {role === 'student' && schoolId && (
              <div className="space-y-2">
                <Label htmlFor="onboarding-class">Class (optional)</Label>
                <select id="onboarding-class" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={classroomId} onChange={(event) => setClassroomId(event.target.value)} disabled={saving || !grade}>
                  <option value="">Choose a class later</option>
                  {classes.filter((item) => item.grade === grade).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={saving}>{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving profile…</> : 'Continue to SyncSenta'}</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export default function GoogleOnboardingPage() {
  return (
    <Suspense fallback={<main className="education-shell flex min-h-screen items-center justify-center p-5"><p className="text-sm text-muted-foreground">Loading your secure profile form…</p></main>}>
      <GoogleOnboardingForm />
    </Suspense>
  );
}
