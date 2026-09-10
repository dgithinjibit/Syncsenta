/**
 * Teacher Dashboard — Real-time Student Monitoring
 * Tightened layout: compact header, smaller stat cards, inline class selector.
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getTeacherClasses,
  getClassSummary,
  getTeacherStudents,
  getTeacherAlerts,
  subscribeToAlerts,
  type TeacherStudent,
  type StudentAlert,
  type ClassSummary,
} from '@/lib/teacher/teacher-dashboard';
import {
  Users, Target, MessageSquare, AlertTriangle,
  RefreshCw, BookOpen, BarChart2, Bell,
} from 'lucide-react';
import { StudentListView } from './student-list-view';
import { AlertsPanel } from './alerts-panel';
import { StudentDetailModal } from './student-detail-modal';
import { AnalyticsTab } from './analytics-tab';
import { BulkAssignStudents } from './bulk-assign-students';

export function TeacherDashboardNew() {
  const { user, profile } = useAuth();

  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classSummary, setClassSummary] = useState<ClassSummary | null>(null);
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [alerts, setAlerts] = useState<StudentAlert[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<TeacherStudent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadClasses();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedClass) return;
    loadClassData();
  }, [user, selectedClass]);

  useEffect(() => {
    if (!user) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    const unsubscribe = subscribeToAlerts(user.id, (alert) => {
      setAlerts((prev) => [alert, ...prev]);
      if (Notification.permission === 'granted') {
        new Notification(`Alert: ${alert.title}`, {
          body: `${alert.student_name} — ${alert.description || alert.alert_type}`,
          icon: '/icon-192.png',
        });
      }
    });
    return unsubscribe;
  }, [user]);

  const loadClasses = async () => {
    if (!user) return;
    try {
      const data = await getTeacherClasses(user.id);
      setClasses(data);
      if (data.length > 0 && !selectedClass) setSelectedClass(data[0]);
    } catch (e) { console.error('Error loading classes:', e); }
  };

  const loadClassData = async () => {
    if (!user || !selectedClass) return;
    try {
      setLoading(true);
      const [summary, studentsData, alertsData] = await Promise.all([
        getClassSummary(user.id, selectedClass),
        getTeacherStudents(user.id, selectedClass),
        getTeacherAlerts(user.id),
      ]);
      setClassSummary(summary);
      setStudents(studentsData);
      setAlerts(alertsData);
    } catch (e) { console.error('Error loading class data:', e); }
    finally { setLoading(false); }
  };

  const criticalAlerts = alerts.filter((a) => a.severity === 'high' || a.severity === 'critical').length;

  if (!user || profile?.role !== 'teacher') {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        You must be logged in as a teacher to view this dashboard.
      </div>
    );
  }

  if (loading && !classSummary) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Header row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-headline">Teacher Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time student monitoring</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <BulkAssignStudents
            teacherId={user.id}
            className={selectedClass}
            onSuccess={loadClassData}
          />
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="h-9 w-44 text-sm">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={loadClassData} variant="outline" size="sm" className="h-9 gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      {classSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Students"
            value={classSummary.total_students}
            sub={`${classSummary.active_today} active today`}
            icon={<Users className="h-4 w-4 text-teal-600" />}
          />
          <StatCard
            label="Avg Mastery"
            value={`${classSummary.average_mastery_percentage}%`}
            sub="Across all competencies"
            icon={<Target className="h-4 w-4 text-blue-500" />}
          />
          <StatCard
            label="Messages"
            value={classSummary.total_messages_today}
            sub={`${classSummary.total_sessions_today} sessions today`}
            icon={<MessageSquare className="h-4 w-4 text-violet-500" />}
          />
          <StatCard
            label="Need Attention"
            value={classSummary.struggling_students}
            sub={`${classSummary.excelling_students} excelling`}
            icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
            highlight={classSummary.struggling_students > 0}
          />
        </div>
      )}

      {/* ── Tabs ── */}
      <Tabs defaultValue="students" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="students" className="text-sm gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Students
            {students.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-xs">{students.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="text-sm gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Alerts
            {criticalAlerts > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 px-1.5 text-xs">{criticalAlerts}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-sm gap-1.5">
            <BarChart2 className="h-3.5 w-3.5" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-4 mt-0">
          <StudentListView
            students={students}
            onStudentClick={setSelectedStudent}
            onRefresh={loadClassData}
          />
        </TabsContent>

        <TabsContent value="alerts" className="mt-0">
          <AlertsPanel alerts={alerts} onAlertAction={loadClassData} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-0">
          {user && selectedClass && (
            <AnalyticsTab teacherId={user.id} className={selectedClass} />
          )}
        </TabsContent>
      </Tabs>

      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onRefresh={loadClassData}
        />
      )}
    </div>
  );
}

function StatCard({
  label, value, sub, icon, highlight = false,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={`shadow-sm ${highlight ? 'border-amber-200 bg-amber-50/40' : 'border-slate-100 bg-white'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
          {icon}
        </div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}
