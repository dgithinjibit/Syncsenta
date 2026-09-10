/**
 * Teacher Dashboard Page
 */

import { EnhancedTeacherDashboard } from '@/components/teacher/enhanced-teacher-dashboard';

export const metadata = {
  title: 'Teacher Dashboard — syncsenta',
  description: 'Monitor your students in real-time and provide timely interventions',
};

export default function TeacherDashboardPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
        <EnhancedTeacherDashboard />
      </div>
    </main>
  );
}
