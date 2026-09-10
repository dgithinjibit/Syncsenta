/**
 * Student Detail Modal
 * 
 * Shows detailed information about a student and allows teacher interventions.
 */

'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare,
  TrendingUp,
  Clock,
  Target,
  Flame,
  Send,
  BookOpen,
  Download,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
  sendIntervention,
  getStudentRecentSessions,
  getStudentProgressBySubject,
  getStudentInterventions,
} from '@/lib/teacher/teacher-dashboard';
import { formatDistanceToNow } from 'date-fns';

interface TeacherStudent {
  student_id: string;
  student_name: string;
  student_email: string;
  grade: string;
  class_name: string;
  last_active: string;
  total_sessions: number;
  total_messages: number;
  current_streak: number;
  competencies_mastered: number;
  average_mastery_percentage: number;
}

interface StudentDetailModalProps {
  student: TeacherStudent;
  onClose: () => void;
  onRefresh: () => void;
}

export function StudentDetailModal({
  student,
  onClose,
  onRefresh,
}: StudentDetailModalProps) {
  const { user } = useAuth();
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [progressBySubject, setProgressBySubject] = useState<Record<string, any>>({});
  const [interventions, setInterventions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Intervention form
  const [interventionType, setInterventionType] = useState<string>('hint');
  const [interventionMessage, setInterventionMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadStudentData();
  }, [student.student_id]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      const [sessions, progress, interventionsData] = await Promise.all([
        getStudentRecentSessions(student.student_id, 5),
        getStudentProgressBySubject(student.student_id),
        getStudentInterventions(student.student_id, 10),
      ]);

      setRecentSessions(sessions);
      setProgressBySubject(progress);
      setInterventions(interventionsData);
    } catch (error) {
      console.error('Error loading student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendIntervention = async () => {
    if (!user || !interventionMessage.trim()) return;

    try {
      setSending(true);
      await sendIntervention(
        user.id,
        student.student_id,
        interventionType as any,
        interventionMessage
      );

      setInterventionMessage('');
      loadStudentData();
      onRefresh();
    } catch (error) {
      console.error('Error sending intervention:', error);
    } finally {
      setSending(false);
    }
  };

  const handleExportReport = async (format: 'json' | 'csv') => {
    try {
      setExporting(true);
      const response = await fetch('/api/teacher/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.student_id,
          format,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `student-report-${student.student_name}-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `student-report-${student.student_name}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{student.student_name}</DialogTitle>
              <DialogDescription>
                {student.grade} • {student.class_name}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportReport('csv')}
                disabled={exporting}
              >
                <FileText className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportReport('json')}
                disabled={exporting}
              >
                <Download className="h-4 w-4 mr-1" />
                Export JSON
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="interventions">Interventions</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Streak</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-orange-500" />
                      <span className="text-2xl font-bold">
                        {student.current_streak}
                      </span>
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Messages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-blue-500" />
                      <span className="text-2xl font-bold">
                        {student.total_messages}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Mastered</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-green-500" />
                      <span className="text-2xl font-bold">
                        {student.competencies_mastered}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Last Active</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-purple-500" />
                      <span className="text-sm">
                        {formatDistanceToNow(new Date(student.last_active), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Send Intervention */}
              <Card>
                <CardHeader>
                  <CardTitle>Send Intervention</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={interventionType} onValueChange={setInterventionType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hint">Hint</SelectItem>
                      <SelectItem value="encouragement">Encouragement</SelectItem>
                      <SelectItem value="redirect">Redirect</SelectItem>
                      <SelectItem value="clarification">Clarification</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                      <SelectItem value="meeting_scheduled">
                        Schedule Meeting
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Textarea
                    placeholder="Type your message to the student..."
                    value={interventionMessage}
                    onChange={(e) => setInterventionMessage(e.target.value)}
                    rows={4}
                  />

                  <Button
                    onClick={handleSendIntervention}
                    disabled={sending || !interventionMessage.trim()}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sending ? 'Sending...' : 'Send Message'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress" className="space-y-4">
              {Object.values(progressBySubject).map((subject: any) => (
                <Card key={subject.subject}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{subject.subject}</span>
                      <Badge>{subject.averageProgress}% Average</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-500">
                          {subject.mastered}
                        </div>
                        <div className="text-xs text-muted-foreground">Mastered</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-500">
                          {subject.proficient}
                        </div>
                        <div className="text-xs text-muted-foreground">Proficient</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-yellow-500">
                          {subject.developing}
                        </div>
                        <div className="text-xs text-muted-foreground">Developing</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-500">
                          {subject.emerging}
                        </div>
                        <div className="text-xs text-muted-foreground">Emerging</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {subject.competencies.slice(0, 5).map((comp: any) => (
                        <div key={comp.id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{comp.competency_name}</span>
                            <Badge variant="outline">{comp.mastery_level}</Badge>
                          </div>
                          <Progress value={comp.progress_percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Sessions Tab */}
            <TabsContent value="sessions" className="space-y-4">
              {recentSessions.map((session) => (
                <Card key={session.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{session.subject}</span>
                      <Badge variant="outline">{session.mode}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Messages:</span>
                        <span>{session.message_count}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Started:</span>
                        <span>
                          {formatDistanceToNow(new Date(session.started_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      {session.title && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Topic:</span>
                          <span>{session.title}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Interventions Tab */}
            <TabsContent value="interventions" className="space-y-4">
              {interventions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No interventions sent yet
                  </CardContent>
                </Card>
              ) : (
                interventions.map((intervention) => (
                  <Card key={intervention.id}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <Badge>{intervention.intervention_type}</Badge>
                        <span className="text-sm font-normal text-muted-foreground">
                          {formatDistanceToNow(new Date(intervention.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{intervention.message}</p>
                      <div className="mt-2">
                        <Badge variant="outline">{intervention.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
