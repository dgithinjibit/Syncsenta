"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Users, 
  Activity,
  Eye,
  Download,
  Filter
} from 'lucide-react';
import { getTeacherStudentSubmissions } from '@/lib/sandbox/sandbox-submission';
import { useAuth } from '@/hooks/use-auth';

interface ActivitySubmission {
  id?: string;
  student_id: string;
  activity_type: string;
  grade: string;
  subject: string;
  difficulty: string;
  score: number;
  maxScore?: number;
  time_spent: number;
  timeSpent?: number;
  attempts?: number;
  hintsUsed?: number;
  completed_at?: string;
  submittedAt?: string;
  answers?: Record<string, any>;
  feedback?: string;
  learningOutcomes?: string[];
  studentName?: string;
  completed?: boolean;
  activityTitle?: string;
}

export default function StudentSubmissionsPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<ActivitySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const data = await getTeacherStudentSubmissions(user.id, 100);
      setSubmissions(data);
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique students
  const students = Array.from(new Set(submissions.map(s => s.student_id)))
    .map(id => ({
      id,
      name: `Student ${id.slice(0, 8)}`, // Use ID prefix as name until we have student names
      submissions: submissions.filter(s => s.student_id === id).length,
      totalScore: submissions.filter(s => s.student_id === id).reduce((sum, s) => sum + s.score, 0),
      avgScore: submissions.filter(s => s.student_id === id).reduce((sum, s) => sum + s.score, 0) /
                submissions.filter(s => s.student_id === id).length,
    }));

  // Get unique subjects
  const subjects = Array.from(new Set(submissions.map(s => s.subject)));

  // Filter submissions
  const filteredSubmissions = submissions.filter(s => {
    if (selectedStudent && s.student_id !== selectedStudent) return false;
    if (selectedSubject && s.subject !== selectedSubject) return false;
    return true;
  });

  // Calculate stats
  const stats = {
    totalSubmissions: submissions.length,
    totalStudents: students.length,
    avgScore: submissions.length > 0
      ? submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length
      : 0,
    completionRate: 100, // All submissions in DB are completed
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-headline font-bold">Student Activity Submissions</h1>
        <p className="text-muted-foreground text-lg">
          Monitor student progress and performance in sandbox activities
        </p>
      </header>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgScore.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Student</label>
            <select
              className="w-full p-2 border rounded-md"
              value={selectedStudent || ''}
              onChange={(e) => setSelectedStudent(e.target.value || null)}
            >
              <option value="">All Students</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.submissions} submissions)
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Subject</label>
            <select
              className="w-full p-2 border rounded-md"
              value={selectedSubject || ''}
              onChange={(e) => setSelectedSubject(e.target.value || null)}
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>
                  {subject.charAt(0).toUpperCase() + subject.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedStudent(null);
                setSelectedSubject(null);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="submissions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="submissions">Recent Submissions</TabsTrigger>
          <TabsTrigger value="students">Student Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Submissions Tab */}
        <TabsContent value="submissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Submissions</CardTitle>
              <CardDescription>
                {filteredSubmissions.length} submission(s) found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {filteredSubmissions.map((submission, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{submission.studentName}</h3>
                            <Badge variant={submission.completed ? "default" : "secondary"}>
                              {submission.completed ? "Completed" : "In Progress"}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {submission.activityTitle} • {submission.subject} • Grade {submission.grade.replace('g', '')}
                          </p>

                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Score</p>
                              <p className="font-semibold">
                                {submission.score}/{submission.maxScore ?? 100}
                                ({((submission.score / (submission.maxScore ?? 100)) * 100).toFixed(0)}%)
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Time Spent</p>
                              <p className="font-semibold">
                                {Math.floor((submission.timeSpent ?? submission.time_spent) / 60)}m {Math.floor((submission.timeSpent ?? submission.time_spent) % 60)}s
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Attempts</p>
                              <p className="font-semibold">{submission.attempts}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Hints Used</p>
                              <p className="font-semibold">{submission.hintsUsed}</p>
                            </div>
                          </div>

                          {submission.learningOutcomes && submission.learningOutcomes.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium mb-1">Learning Outcomes:</p>
                              <ul className="text-sm text-muted-foreground list-disc list-inside">
                                {submission.learningOutcomes.slice(0, 2).map((outcome, i) => (
                                  <li key={i}>{outcome}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        <div className="text-right text-sm text-muted-foreground">
                          <p>{new Date(submission.submittedAt ?? submission.completed_at ?? 0).toLocaleDateString()}</p>
                          <p>{new Date(submission.submittedAt ?? submission.completed_at ?? 0).toLocaleTimeString()}</p>
                          <Button variant="ghost" size="sm" className="mt-2">
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {filteredSubmissions.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No submissions found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Performance Overview</CardTitle>
              <CardDescription>
                Summary of each student's activity performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {students.map(student => (
                  <Card key={student.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{student.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {student.submissions} activities completed
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{student.avgScore.toFixed(0)}%</p>
                        <p className="text-sm text-muted-foreground">Average Score</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>
                Detailed insights into student performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Analytics dashboard coming soon</p>
                <p className="text-sm">Charts and graphs will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Made with Bob
