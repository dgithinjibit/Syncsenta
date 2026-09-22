"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function ParentalConsentPage() {
  const [confirmed, setConfirmed] = useState(false);
  const [voice, setVoice] = useState(false);
  const [status, setStatus] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmed) return;
    const record = { version: 'experiment-2026-09-21', voice, recordedAt: new Date().toISOString() };
    localStorage.setItem('demoParentalConsent', JSON.stringify(record));

    try {
      const response = await fetch('/api/parental-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: 'demo-child', consentVersion: record.version, purposes: ['learning', ...(voice ? ['voice' as const] : [])], granted: true }),
      });
      const result = await response.json();
      if (response.ok) {
        setStatus(result.mode === 'demo' ? 'Demo consent recorded locally and acknowledged by the demo backend. No real child record was created.' : 'Consent recorded and queued for school review.');
      } else if (response.status === 401) {
        setStatus('Demo consent recorded locally. Sign in as an authorised parent or school role to submit a production consent record.');
      } else {
        setStatus('Demo consent was saved locally, but the backend could not accept the record. Please use Support.');
      }
    } catch {
      setStatus('Demo consent was saved locally. The backend is unavailable; no production record was created.');
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl py-8 md:py-12">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Parental Consent — Experiment</CardTitle>
          <CardDescription>Review the choices before a child uses a demo learning experience.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <p className="text-sm text-muted-foreground">This flow records the consent version, selected purposes, and timestamp. A production release must verify the guardian, connect consent to the school and child account, support withdrawal, and retain an auditable record.</p>
            <div className="flex items-start gap-3"><Checkbox id="consent" checked={confirmed} onCheckedChange={(value) => setConfirmed(value === true)} /><Label htmlFor="consent" className="text-sm leading-5">I am an authorised parent or guardian, and I understand the experimental privacy, child-safety, data-retention, and AI-limitation notices.</Label></div>
            <div className="flex items-start gap-3"><Checkbox id="voice" checked={voice} onCheckedChange={(value) => setVoice(value === true)} /><Label htmlFor="voice" className="text-sm leading-5">I understand that voice features are optional, should be supervised, and must not be used with sensitive information.</Label></div>
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">Read the <Link className="underline" href="/privacy">Privacy Policy</Link>, <Link className="underline" href="/child-safety">Child Safety Policy</Link>, <Link className="underline" href="/data-retention">Data Retention</Link>, and <Link className="underline" href="/ai-limitations">AI Limitations</Link> before continuing.</div>
            <Button type="submit" disabled={!confirmed}>Record demo consent</Button>
            {status && <p role="status" className="text-sm text-primary">{status}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
