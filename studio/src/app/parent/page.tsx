'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, HeartHandshake, ShieldCheck, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ParentLinkingCanvas } from '@/components/parent/parent-linking-canvas';
import { RoleGate } from '@/components/auth/role-gate';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase/client';

interface PerformanceReport {
  id: string;
  child_profile_id: string;
  school_name: string;
  subject: string;
  mastery_percentage: number;
  performance_band: string;
  teacher_feedback_summary: string;
  next_step: string;
  created_at: string;
}

function ParentContent() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [reports, setReports] = useState<PerformanceReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  const childIds = profile?.children_ids ?? [];

  useEffect(() => {
    if (!user || profile?.role !== 'parent') return;

    const parentId = user.id;
    let cancelled = false;
    async function loadReports() {
      setReportsLoading(true);
      // The generated client types predate this production table; keep the
      // narrow compatibility cast at the integration boundary until types are
      // regenerated from the live schema.
      const { data, error } = await (supabase as any)
        .from('parent_performance_reports')
        .select('id, child_profile_id, school_name, subject, mastery_percentage, performance_band, teacher_feedback_summary, next_step, created_at')
        .eq('parent_id', parentId)
        .order('created_at', { ascending: false });

      if (!cancelled) {
        if (error) console.error('Unable to load parent performance reports:', error);
        setReports((data ?? []) as PerformanceReport[]);
        setReportsLoading(false);
      }
    }

    void loadReports();
    return () => { cancelled = true; };
  }, [profile?.role, user]);

  if (loading) {
    return <main className="education-shell flex min-h-screen items-center justify-center p-6"><p className="text-sm text-muted-foreground">Preparing your private family space…</p></main>;
  }

  const hasVerifiedLink = profile?.role === 'parent' && childIds.length > 0;

  if (!user || !hasVerifiedLink) {
    return (
      <main className="education-shell min-h-screen p-6 md:p-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <header className="space-y-3"><Badge variant="secondary">Parent / guardian</Badge><h1 className="text-3xl font-bold tracking-tight md:text-4xl">Your private family space</h1><p className="max-w-2xl text-muted-foreground">No learner information is shown on this account yet. Connect only a learner who intentionally shares their one-time code with you.</p></header>
          <ParentLinkingCanvas onLinked={() => void refreshProfile()} />
          <p className="text-center text-xs text-muted-foreground">A wallet address, email address, or school name alone never grants access to a learner.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="education-shell min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-3">
          <Badge variant="secondary">Parent / guardian</Badge>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Stay close to learning without taking over</h1>
          <p className="max-w-2xl text-muted-foreground">Consent-gated progress for your linked learner. Raw chat and telemetry are never shown here.</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" aria-label="Parent dashboard areas">
          <Card><CardHeader><BookOpen className="mb-2 h-5 w-5 text-primary" /><CardTitle className="text-base">Learning progress</CardTitle><CardDescription>Competency progress and recent learning activity.</CardDescription></CardHeader><CardContent><Badge variant="default">{reports.length ? `${reports.length} report${reports.length === 1 ? '' : 's'}` : 'Linked'}</Badge></CardContent></Card>
          <Card><CardHeader><Users className="mb-2 h-5 w-5 text-primary" /><CardTitle className="text-base">Teacher connection</CardTitle><CardDescription>Teacher feedback and recommended next steps.</CardDescription></CardHeader><CardContent><Badge variant="outline">Consent active</Badge></CardContent></Card>
          <Card><CardHeader><HeartHandshake className="mb-2 h-5 w-5 text-primary" /><CardTitle className="text-base">Wellbeing support</CardTitle><CardDescription>Voluntary learner check-ins with human support when needed.</CardDescription></CardHeader><CardContent><Badge variant="outline">Consent-gated</Badge></CardContent></Card>
          <Card><CardHeader><ShieldCheck className="mb-2 h-5 w-5 text-primary" /><CardTitle className="text-base">Privacy and consent</CardTitle><CardDescription>Review the information-sharing scope for this relationship.</CardDescription></CardHeader><CardContent><Badge variant="outline">Verified link</Badge></CardContent></Card>
        </section>

        <Card>
          <CardHeader><CardTitle>Linked learner progress</CardTitle><CardDescription>{reportsLoading ? 'Loading consented progress…' : reports.length ? 'Teacher-reviewed summaries shared for this learner.' : 'The relationship is verified; no performance report has been shared yet.'}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{report.subject}</p><p className="text-sm text-muted-foreground">{report.school_name} · Learner ID {report.child_profile_id.slice(0, 8)}</p></div><Badge variant="secondary">{report.performance_band} · {report.mastery_percentage}%</Badge></div>
                <p className="mt-3 text-sm">{report.teacher_feedback_summary}</p>
                <p className="mt-2 text-sm font-medium text-primary">Next step: {report.next_step}</p>
              </div>
            ))}
            {!reportsLoading && reports.length === 0 && <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Your learner is linked securely. Progress will appear here after a teacher-reviewed report is shared.</div>}
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader><CardTitle>Manage this relationship</CardTitle><CardDescription>Use the learner’s one-time code to connect another learner. Existing consent remains protected.</CardDescription></CardHeader>
          <CardContent className="space-y-3"><ParentLinkingCanvas onLinked={() => void refreshProfile()} /><Button asChild variant="outline"><Link href="/terms">Review privacy and terms <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function ParentDashboardPage() {
  return <RoleGate allowedRoles={['parent']}><ParentContent /></RoleGate>;
}
