'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const message = reason === 'profile_lookup_failed'
    ? 'Your Google account connected, but we could not load the profile service. Please try again.'
    : 'We could not complete Google sign-in. Please try again, or use email and password.';

  return (
    <main className="education-shell flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_hsl(var(--secondary))_0,_transparent_34rem)] p-5">
      <Card className="w-full max-w-md border-border/80">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-destructive"><AlertCircle className="h-5 w-5" /><span className="text-sm font-medium">Sign-in needs attention</span></div>
          <CardTitle>We could not finish signing you in</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button asChild><Link href="/auth/signin">Try Google sign-in again</Link></Button>
          <Button asChild variant="outline"><Link href="/signup">Open a demo workspace</Link></Button>
        </CardContent>
      </Card>
    </main>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<main className="education-shell flex min-h-screen items-center justify-center p-5"><p className="text-sm text-muted-foreground">Loading sign-in help…</p></main>}>
      <AuthErrorContent />
    </Suspense>
  );
}
