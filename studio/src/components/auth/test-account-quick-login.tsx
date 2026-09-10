/**
 * Test Account Quick Login
 * 
 * Provides quick-login buttons for test accounts.
 * Only shown in development or for testing.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { TEST_ACCOUNTS, type TestAccountRole } from '@/lib/test-accounts';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getRoleHome } from '@/lib/auth/role-home';

const ROLES: TestAccountRole[] = ['student', 'teacher', 'parent', 'admin'];

export function TestAccountQuickLogin() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState<TestAccountRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuickLogin = async (role: TestAccountRole) => {
    setLoading(role);
    setError(null);
    try {
      const account = TEST_ACCOUNTS[role];
      const profile = await signIn(account.email, account.password);
      router.push(getRoleHome(profile?.role ?? role));
    } catch (err: any) {
      setError(`Failed to sign in as ${role}: ${err.message || 'Please try again'}`);
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-xs font-semibold text-amber-900">
        🧪 Quick Test Login (Development)
      </p>
      
      {error && (
        <Alert variant="destructive" className="border-amber-300 bg-red-50">
          <AlertDescription className="text-xs text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-2">
        {ROLES.map((role) => (
          <Button
            key={role}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickLogin(role)}
            disabled={loading !== null}
            className="text-xs capitalize"
          >
            {loading === role && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Continue as {role}01
          </Button>
        ))}
      </div>

      <p className="text-xs text-amber-800">
        Test accounts use password: <code className="font-mono">TestPassword123!</code>
      </p>
    </div>
  );
}
