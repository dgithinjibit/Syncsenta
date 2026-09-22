"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const supportUrl = 'https://forms.gle/3vQhgtJbnEaGD6xV8';

export default function ReportPage() {
  const [report, setReport] = useState('');
  const [status, setStatus] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!report.trim()) return;
    const summary = report.trim();
    try {
      const response = await fetch('/api/trust/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'safety', summary, urgent: false }),
      });
      const result = await response.json();
      if (response.ok) {
        setStatus(result.mode === 'demo' ? 'Demo report acknowledged. No real learner record was created.' : `Report received. Reference: ${result.requestId}`);
        setReport('');
      } else {
        setStatus('The backend could not accept this report. Use the configured support form below.');
      }
    } catch {
      setStatus('The backend is unavailable. Use the configured support form below.');
    }
  }

  return <div className="mx-auto w-full max-w-2xl py-8 md:py-12"><Card><CardHeader><CardTitle className="font-headline text-3xl">Report Content or Safety Concern</CardTitle></CardHeader><CardContent className="space-y-5"><p className="text-sm text-muted-foreground">Do not include a child&apos;s full name, password, address, contact details, or other sensitive information in this experiment form.</p><form onSubmit={handleSubmit} className="space-y-4"><div className="space-y-2"><Label htmlFor="report">What happened?</Label><Textarea id="report" value={report} onChange={(event) => setReport(event.target.value)} placeholder="Describe the harmful, unsafe, inaccurate, or privacy-invasive content." required /></div><Button type="submit">Submit safety report</Button></form>{status && <p role="status" className="text-sm text-primary">{status}</p>}<div className="border-t pt-5"><p className="text-sm text-muted-foreground">If the backend is unavailable, open the <a className="underline" href={supportUrl} target="_blank" rel="noopener noreferrer">SyncSenta support and feedback form</a>. The form is not an emergency service.</p></div></CardContent></Card></div>;
}
