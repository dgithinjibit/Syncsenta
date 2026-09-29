/**
 * Sign In Form — tightened layout, no Card wrapper (page handles framing)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getRoleHome } from '@/lib/auth/role-home';

const DEMO_ACCOUNTS = [
  { role: 'student', label: 'Student' },
  { role: 'teacher', label: 'Teacher' },
  { role: 'parent', label: 'Parent' },
  { role: 'head', label: 'Head teacher' },
] as const;

/**
 * The `next` target the visitor was originally heading for, resolved on the
 * server by `/auth/signin` and passed down as a prop.
 *
 * Middleware attaches it when it bounces someone off a workspace
 * (`/auth/signin?next=/student/mathematics`), and this form used to ignore it:
 * signing in always landed the visitor on their role home, so the page they
 * were actually trying to reach was lost on every protected-route sign-in. It
 * arrives validated — `safeRedirectTarget()` is what keeps `//example.com` from
 * turning the sign-in form into an open redirect.
 */
type SignInFormProps = {
  next?: string | null;
};

export function SignInForm({ next }: SignInFormProps) {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const profile = await signIn(email, password);
      // Their intended page wins over the role home; a signed-in visitor whose
      // role does not map anywhere goes to profile completion, not back to this
      // form — `/login` is where unmapped roles used to loop.
      router.push(next ?? getRoleHome(profile?.role, '/auth/onboarding'));
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (account: typeof DEMO_ACCOUNTS[number]) => {
    setDemoLoading(account.role);
    setError(null);
    try {
      // Let the server establish the Supabase session cookie, then follow its
      // role-aware redirect. This avoids relying on a client-side auth state
      // update that may not be available immediately after the button click.
      window.location.assign(`/api/auth/demo-login?role=${encodeURIComponent(account.role)}`);
    } catch (err: any) {
      setError(`Demo login failed: ${err.message || 'Please try again'}`);
      setDemoLoading(null);
    }
  };

  const isAnyLoading = loading || demoLoading !== null;

  return (
    <div className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Demo workspaces — one line, no styling of its own. */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Or look around a workspace without creating an account:
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.role}
              type="button"
              onClick={() => handleDemoLogin(account)}
              disabled={isAnyLoading}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline disabled:opacity-50"
            >
              {demoLoading === account.role ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : null}
              {account.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-3 text-muted-foreground">sign in with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            autoComplete="email"
            className="h-11"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <a href="/auth/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
              className="h-11 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full h-11" disabled={loading}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</> : 'Sign In'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        No account yet?{' '}
        <a href="/signup" className="font-medium text-primary hover:underline">
          Open a demo workspace
        </a>
      </p>
    </div>
  );
}
