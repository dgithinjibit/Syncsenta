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

const DEMO_ACCOUNTS = [
  { role: 'student',  label: '🎒 Join as Student',  email: 'student01@syncsenta.dev',  password: 'Demo@Student01',  redirect: '/student' },
  { role: 'teacher',  label: '📚 Join as Teacher',  email: 'teacher01@syncsenta.dev',  password: 'Demo@Teacher01',  redirect: '/teacher' },
  { role: 'parent',   label: '👨‍👩‍👧 Join as Parent',   email: 'parent01@syncsenta.dev',   password: 'Demo@Parent01',   redirect: '/parent' },
  { role: 'head',     label: '🏫 Join as Head',      email: 'head01@syncsenta.dev',      password: 'Demo@Head01',      redirect: '/head' },
] as const;

export function SignInForm() {
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
      await signIn(email, password);
      router.push('/dashboard');
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
      await signIn(account.email, account.password);
      router.push(account.redirect);
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

      {/* Demo accounts — try the app instantly */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
        <p className="text-xs font-semibold text-blue-800">🚀 Try a demo account — no sign-up needed</p>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <Button
              key={account.role}
              type="button"
              variant="outline"
              className="h-10 text-xs font-medium border-blue-200 bg-white hover:bg-blue-50"
              onClick={() => handleDemoLogin(account)}
              disabled={isAnyLoading}
            >
              {demoLoading === account.role
                ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                : null}
              {account.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-3 text-muted-foreground">or sign in with email</span>
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
        Don&apos;t have an account?{' '}
        <a href="/auth/signup" className="font-medium text-primary hover:underline">
          Sign up free
        </a>
      </p>
    </div>
  );
}

