"use client";

/**
 * Dynamic Teacher Route
 *
 * Resolves URLs emitted by `TeacherSidebar`:
 *   - Generalist: /teacher/grade/<Grade>/<page>
 *   - Specialist: /teacher/grade/<Grade>/subject/<Subject>/<page>
 *
 * Behaviour:
 *   1. Parse params (Next.js already URL-decodes them).
 *   2. Check the teacher is assigned to this grade (+subject) via the
 *      `useTeacherContext` store. If not, redirect to /teacher.
 *      NOTE: this is a client-side guard for UX. Real authorization
 *      belongs in middleware / the API layer — flagged as a follow-up
 *      because the API itself currently has no auth (see CLAUDE.md
 *      security notes).
 *   3. Sync the store's `currentGrade` / `currentSubject` so the
 *      sidebar badge and downstream consumers reflect the URL.
 *   4. Render the existing flat teacher page for the matched slug.
 *      Slugs without a page yet render a stub instead of 404'ing —
 *      the sidebar lists more items than we've built (lesson-plans,
 *      assessments, etc.), and a stub is less broken than a dead link.
 */

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Construction } from 'lucide-react';
import { useTeacherContext } from '@/stores/teacher-context';
import type { Grade } from '@/lib/curriculum/cbc-curriculum';

// Flat page components delegated to. Loaded dynamically so a build failure
// in any one page doesn't take down the whole dynamic route.
const TeacherDashboardNew = dynamic(
  () => import('@/components/teacher/teacher-dashboard-new').then(m => ({ default: m.TeacherDashboardNew })),
  { ssr: false },
);
const SchemeWizard = dynamic(
  () => import('@/components/scheme-wizard/scheme-wizard').then(m => ({ default: m.SchemeWizard })),
  { ssr: false },
);
const ExamGeneratorDialog = dynamic(
  () => import('@/components/exam/ExamGeneratorDialog'),
  { ssr: false },
);
const Phase2TeacherDashboard = dynamic(
  () => import('@/components/teacher/phase2-teacher-dashboard').then(m => ({ default: m.Phase2TeacherDashboard })),
  { ssr: false },
);

// ─────────────────────────────────────────────────────────────────────────────
// Slug parsing
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedSlug {
  subject: string | null;
  page: string;
}

/**
 * The sidebar emits two URL shapes under /teacher/grade/<grade>/:
 *
 *   ["dashboard"]                              → generalist
 *   ["subject", "Mathematics", "dashboard"]    → specialist
 *
 * Anything else we treat as a malformed link and route the user back
 * to /teacher. We don't try to be clever about partial matches — the
 * sidebar is the only emitter, so the shape is closed.
 */
function parseSlug(slug: string[]): ParsedSlug | null {
  if (slug.length === 1) {
    return { subject: null, page: slug[0] };
  }
  if (slug.length === 3 && slug[0] === 'subject') {
    return { subject: slug[1], page: slug[2] };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page registry
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps a slug to the component that should render. Anything not in
 * this map renders the "coming soon" stub — the sidebar deliberately
 * exposes paths we haven't built yet so the menu shape is final, and
 * we'd rather show a stub than emit a dead link.
 */
function renderPage(page: string): React.ReactNode {
  switch (page) {
    case 'dashboard':
      return <TeacherDashboardNew />;
    case 'scheme-wizard':
      return <SchemeWizard />;
    case 'exams':
      // Exams page wraps the dialog with marketing copy; the dialog
      // itself is the useful surface, so we render it directly here.
      return <ExamGeneratorDialog />;
    case 'metta-analytics':
      return <Phase2TeacherDashboard />;
    default:
      return <ComingSoon page={page} />;
  }
}

function ComingSoon({ page }: { page: string }) {
  const router = useRouter();
  const label = page.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <div className="container mx-auto py-12">
      <Card className="max-w-xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Construction className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>{label}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            This section is on the roadmap but not yet built. Your sidebar
            shows it because the CBC navigation shape is final — only the
            page contents are still landing.
          </p>
          <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────

export default function TeacherGradePage() {
  const router = useRouter();
  const params = useParams<{ grade: string; slug: string[] }>();
  const { setContext, getAssignmentForGrade, assignments, isLoading } = useTeacherContext();

  // Next.js decodes URL params, but the catch-all `slug` arrives as a
  // string[]. The literal `grade` already matches our Grade union if
  // the URL was emitted by the sidebar.
  const grade = params.grade as Grade;
  const slug = Array.isArray(params.slug) ? params.slug : [params.slug];
  const parsed = parseSlug(slug);

  useEffect(() => {
    // Don't gate on isLoading — assignments persist to localStorage,
    // so first paint may already have them and `isLoading` only
    // matters before the initial fetch. We re-check on every render
    // and only act once assignments are present OR we've finished
    // loading with none.
    if (isLoading) return;
    if (!parsed) {
      router.replace('/teacher');
      return;
    }

    const assignment = getAssignmentForGrade(grade);
    if (!assignment) {
      router.replace('/teacher');
      return;
    }

    // Specialist URL but the teacher isn't assigned to that subject.
    if (
      parsed.subject !== null &&
      assignment.teaching_model === 'specialist' &&
      !assignment.subjects.includes(parsed.subject)
    ) {
      router.replace('/teacher');
      return;
    }

    // Generalist URL on a specialist grade, or vice versa — the
    // sidebar shouldn't produce these, but a hand-typed URL might.
    if (parsed.subject === null && assignment.teaching_model === 'specialist') {
      router.replace('/teacher');
      return;
    }

    setContext(grade, parsed.subject ?? undefined);
    // setContext is a stable store action; we intentionally exclude
    // it from deps to avoid re-running on every render. Same for
    // getAssignmentForGrade and assignments (we read via the store).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade, parsed?.subject, parsed?.page, isLoading, assignments.length]);

  // Gate the render too — without this, the dashboard mounts before
  // the access check completes and may flash unauthorized content.
  if (isLoading || !parsed) return null;
  const assignment = getAssignmentForGrade(grade);
  if (!assignment) return null;
  if (
    parsed.subject !== null &&
    assignment.teaching_model === 'specialist' &&
    !assignment.subjects.includes(parsed.subject)
  ) {
    return null;
  }

  return renderPage(parsed.page);
}

// Made with Bob
