'use client';

/**
 * Teacher Exam Management Page
 * Allows teachers to generate and manage exams
 */

import ExamGeneratorDialog from '@/components/exam/ExamGeneratorDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileQuestion, TrendingUp, Users, Clock } from 'lucide-react';

export default function TeacherExamsPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Exam Management</h1>
        <p className="text-muted-foreground">
          Generate CBC-aligned exams, track student performance, and identify learning gaps.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <ExamGeneratorDialog />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
            <FileQuestion className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              No exams generated yet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students Tested</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Across all exams
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              No data yet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              Per exam
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Exams */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Exams</CardTitle>
          <CardDescription>
            Exams you've generated and their performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FileQuestion className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No exams generated yet</p>
            <p className="text-sm mt-2">
              Click "Generate Term Exam" above to create your first exam
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
