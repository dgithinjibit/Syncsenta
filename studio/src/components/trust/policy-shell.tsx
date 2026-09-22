import type { ReactNode } from 'react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PolicyShell({
  title,
  description,
  lastUpdated = 'September 21, 2026',
  children,
}: {
  title: string;
  description: string;
  lastUpdated?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-4xl py-8 md:py-12" aria-labelledby="policy-title">
      <Card>
        <CardHeader>
          <CardTitle id="policy-title" className="font-headline text-3xl">{title}</CardTitle>
          <CardDescription>{description} Last updated: {lastUpdated}.</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground">
          <Alert className="not-prose mb-8">
            <AlertTitle>Experimental release notice</AlertTitle>
            <AlertDescription>
              SyncSenta is being evaluated with demo accounts. Use fictional information only. These pages describe the intended production controls; live child or school data must not be entered until the corresponding backend, operational, and legal reviews are complete.
            </AlertDescription>
          </Alert>
          {children}
          <div className="mt-10 border-t pt-6 not-prose">
            <p className="text-sm text-muted-foreground">Questions, privacy requests, deletion requests, or safety concerns should use the <Link className="underline" href="/support">Support and safety process</Link>.</p>
            <nav aria-label="Policy navigation" className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <Link className="underline" href="/privacy">Privacy</Link>
              <Link className="underline" href="/terms">Terms</Link>
              <Link className="underline" href="/child-safety">Child safety</Link>
              <Link className="underline" href="/data-retention">Data retention</Link>
              <Link className="underline" href="/data-ownership">Data ownership</Link>
              <Link className="underline" href="/ai-limitations">AI limitations</Link>
              <Link className="underline" href="/parental-consent">Parental consent</Link>
              <Link className="underline" href="/report">Report concern</Link>
              <Link className="underline" href="/school-controls">School controls</Link>
              <Link className="underline" href="/support">Support</Link>
            </nav>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
