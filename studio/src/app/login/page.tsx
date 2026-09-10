"use client";

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSupabaseClient } from '@/lib/supabase/client';
import { DEMO_DESTINATIONS, type DemoRole } from '@/lib/auth/demo-destinations';

const DEMO_ACCOUNTS: Array<{ role: DemoRole; label: string; email: string; password: string }> = [
  { role: 'student', label: 'Join as Demo Student', email: 'student01@syncsenta.dev', password: 'Demo@Student01' },
  { role: 'teacher', label: 'Join as Demo Teacher', email: 'teacher01@syncsenta.dev', password: 'Demo@Teacher01' },
  { role: 'parent', label: 'Join as Demo Parent', email: 'parent01@syncsenta.dev', password: 'Demo@Parent01' },
  { role: 'head', label: 'Join as Demo Head of School', email: 'head01@syncsenta.dev', password: 'Demo@Head01' },
];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const next = searchParams.get('next');

  const resolveWorkspace = async () => {
    if (next?.startsWith('/')) return next;
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    if (!user) return '/login';
    const { data: profile } = await getSupabaseClient().from('profiles').select('role').eq('id', user.id).maybeSingle();
    return profile?.role === 'student' ? '/student'
      : profile?.role === 'teacher' ? '/teacher'
      : profile?.role === 'parent' ? '/parent'
      : profile?.role === 'admin' ? '/head'
      : '/login';
  };

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error: signInError } = await getSupabaseClient().auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      router.replace(await resolveWorkspace());
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const signInAsDemo = async (account: (typeof DEMO_ACCOUNTS)[number]) => {
    if (account.role === 'student') {
      router.push('/login/student');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: signInError } = await getSupabaseClient().auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });
      if (signInError) throw signInError;
      router.replace(DEMO_DESTINATIONS[account.role]);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to open the demo account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to SyncSenta</CardTitle>
          <CardDescription>Sign in to open your protected teacher or learner workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={signIn}>
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" disabled={loading} type="submit">{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sign in</Button>
          </form>
          <div className="my-6 border-t pt-6">
            <p className="mb-3 text-center text-sm font-semibold">🚀 Try a demo account — no sign-up needed</p>
            <div className="grid gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <Button
                  key={account.role}
                  className="w-full"
                  disabled={loading}
                  onClick={() => void signInAsDemo(account)}
                  type="button"
                  variant="outline"
                >
                  {account.role === 'student' ? 'Join as Student' : account.label}
                </Button>
              ))}
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">Accounts are provisioned by Syncsenta administrators. No public signup is available yet.</p>
        </CardContent>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-background p-4" />}>
      <LoginContent />
    </Suspense>
  );
}
