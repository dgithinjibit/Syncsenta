'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, WalletCards } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { getRoleHome } from '@/lib/auth/role-home';

declare global {
  interface Window {
    ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
  }
}

type WalletAuthButtonProps = {
  mode: 'signin' | 'signup';
  role?: 'student' | 'teacher' | 'parent' | 'admin';
  fullName?: string;
};

function destinationForRole(role?: WalletAuthButtonProps['role']): string {
  return getRoleHome(role);
}

export function WalletAuthButton({ mode, role = 'student', fullName = '' }: WalletAuthButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function authenticateWallet() {
    setLoading(true);
    setError(null);
    try {
      if (!window.ethereum) {
        throw new Error('No Ethereum wallet was detected. Install a compatible wallet such as MetaMask, then try again.');
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = Array.isArray(accounts) ? String(accounts[0] ?? '') : '';
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error('The wallet did not return a valid public address.');

      const { data, error: authError } = await supabase.auth.signInWithWeb3({
        chain: 'ethereum',
        statement: 'I accept the SyncSenta Terms and privacy safeguards. My wallet address is an identity identifier only and does not grant access to learner information.',
      });
      if (authError) throw authError;
      if (!data.user) throw new Error('Wallet authentication did not return a user session.');

      const rpcName = mode === 'signup' ? 'create_wallet_profile' : 'sync_wallet_identity';
      const rpcArgs = mode === 'signup'
        ? { p_wallet_address: address, p_role: role, p_full_name: fullName || null }
        : { p_wallet_address: address, p_wallet_chain: 'ethereum' };
      const { error: mappingError } = await (supabase as any).rpc(rpcName, rpcArgs);
      if (mappingError) throw new Error(mode === 'signin' ? 'This wallet has no SyncSenta profile yet. Choose wallet sign-up first.' : 'The wallet session was verified, but profile setup could not be completed.');

      localStorage.setItem('syncsenta.wallet.address', address.toLowerCase());
      localStorage.setItem('syncsenta.wallet.chain', 'ethereum');
      router.push(destinationForRole(role));
    } catch (err) {
      console.error('Wallet authentication failed:', err);
      setError(err instanceof Error ? err.message : 'Wallet authentication failed. No learner information was accessed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && <Alert variant="destructive" role="alert"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
      <Button type="button" variant="outline" className="w-full" onClick={authenticateWallet} disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <WalletCards className="mr-2 h-4 w-4" aria-hidden="true" />}
        {loading ? 'Verifying wallet…' : mode === 'signup' ? 'Sign up with wallet' : 'Sign in with wallet'}
      </Button>
      <p className="text-center text-xs text-muted-foreground">You will approve a signed message. SyncSenta never receives your private key and never treats a wallet as proof of guardianship.</p>
    </div>
  );
}
