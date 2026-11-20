/** Phase 2 teacher analytics page. */

import { Phase2TeacherDashboard } from '@/components/teacher/phase2-teacher-dashboard';

export const metadata = {
  title: 'Teacher Analytics - syncsenta',
  description: 'Roster-scoped learner activity, progress, and support observations',
};

export default function MeTTaAnalyticsDashboardPage() {
  return (
    <main className="education-shell">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <Phase2TeacherDashboard />
      </div>
    </main>
  );
}
