'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, GraduationCap, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSupabaseClient } from '@/lib/supabase/client';

const DEMO_STUDENT = {
  email: 'student01@syncsenta.dev',
  password: 'Demo@Student01',
};

export default function StudentLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_STUDENT.email);
  const [password, setPassword] = useState(DEMO_STUDENT.password);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const openStudentWorkspace = async (event?: FormEvent) => {
    event?.preventDefault();
    setLoading(true);
    setError('');

    try {
      const client = getSupabaseClient();
      const { error: signInError } = await client.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error('Student session was not created. Please try again.');

      const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (profile?.role !== 'student') {
        await client.auth.signOut();
        throw new Error('This account is not configured as a student account.');
      }

      router.replace('/student');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to open the student workspace.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-teal-50 via-background to-sky-50 px-4 py-8 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center">
        <Card className="w-full border-teal-100/80 shadow-xl shadow-teal-900/5">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20">
              <GraduationCap className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-2xl text-teal-950">Open your student workspace</CardTitle>
              <CardDescription className="mt-2">
                Continue to your CBC learning journey, practice, progress, and teacher-connected support.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="space-y-4" onSubmit={openStudentWorkspace}>
              <div className="space-y-2">
                <Label htmlFor="student-email">Student email</Label>
                <Input id="student-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-password">Password</Label>
                <Input id="student-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
              </div>
              {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
              <Button className="min-h-11 w-full bg-teal-700 hover:bg-teal-800" disabled={loading} type="submit">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue to student workspace
              </Button>
            </form>

            <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-4 text-sm text-teal-950">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" aria-hidden="true" />
                <p>Your learning activity stays scoped to your student account while approved teacher connections provide relevant support.</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <Link className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground" href="/login">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to all roles
              </Link>
              <button className="font-medium text-teal-700 hover:underline" disabled={loading} onClick={() => void openStudentWorkspace()} type="button">
                Use demo student
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
