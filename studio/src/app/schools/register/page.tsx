'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const types = [
  ['primary', 'Primary school'],
  ['junior_secondary', 'Junior secondary school'],
  ['senior_secondary', 'Senior secondary school'],
  ['integrated', 'Integrated school'],
  ['special', 'Special school'],
];

export default function SchoolRegisterPage() {
  const [form, setForm] = useState({ contactName: '', contactEmail: '', schoolName: '', county: '', schoolCode: '', schoolType: 'primary', classes: '' });
  const [status, setStatus] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setSaving(true);
    try {
      const response = await fetch('/api/schools/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, classes: form.classes.split(',').map((item) => item.trim()).filter(Boolean) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to submit registration.');
      setStatus({ kind: 'success', text: 'Registration received. SyncSenta will keep it pending until an authorized reviewer verifies the school.' });
      setForm({ contactName: '', contactEmail: '', schoolName: '', county: '', schoolCode: '', schoolType: 'primary', classes: '' });
    } catch (error) {
      setStatus({ kind: 'error', text: error instanceof Error ? error.message : 'Unable to submit registration.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="education-shell flex items-center justify-center bg-[radial-gradient(circle_at_top,_hsl(var(--secondary))_0,_transparent_34rem)] p-5">
      <Card className="w-full max-w-2xl border-border/80 shadow-[0_18px_45px_hsl(174_30%_16%/0.1)]">
        <CardHeader>
          <CardTitle>Register your school with SyncSenta</CardTitle>
          <CardDescription>School leaders can submit a directory request directly. This does not create student accounts, and the school will remain hidden from students until verification.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            {status && <Alert className="sm:col-span-2" variant={status.kind === 'error' ? 'destructive' : 'default'}>
              {status.kind === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              <AlertDescription>{status.text}</AlertDescription>
            </Alert>}
            <div className="space-y-2"><Label htmlFor="contactName">Authorized contact name</Label><Input id="contactName" value={form.contactName} onChange={(e) => update('contactName', e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="contactEmail">Work email</Label><Input id="contactEmail" type="email" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="schoolName">School name</Label><Input id="schoolName" value={form.schoolName} onChange={(e) => update('schoolName', e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="county">County</Label><Input id="county" value={form.county} onChange={(e) => update('county', e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="schoolCode">School code, if available</Label><Input id="schoolCode" value={form.schoolCode} onChange={(e) => update('schoolCode', e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="schoolType">School type</Label><select id="schoolType" className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm" value={form.schoolType} onChange={(e) => update('schoolType', e.target.value)}>{types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="classes">Classes or grades</Label><Input id="classes" placeholder="Grade 1, Grade 2, Grade 3" value={form.classes} onChange={(e) => update('classes', e.target.value)} required /><p className="text-xs text-muted-foreground">Separate entries with commas. Do not enter learner names or personal information.</p></div>
            <div className="flex items-center justify-between gap-3 sm:col-span-2"><Link className="text-sm text-primary hover:underline" href="/signup">Back to workspaces</Link><Button type="submit" disabled={saving}>{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</> : 'Submit for review'}</Button></div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
