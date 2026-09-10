/**
 * Live Classroom Monitor - Teacher Dashboard Component
 * 
 * Real-time monitoring of Grade 2 students with instant feedback capabilities.
 * Shows student progress, alerts for struggling learners, and quick intervention tools.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeacherClassroom, useProgressBroadcast } from '@/hooks/use-realtime-feedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  MessageSquare,
  Heart,
  Lightbulb,
  AlertCircle,
  Sparkles,
  Clock,
  Target,
  Activity,
  Send,
  User
} from 'lucide-react';
import type { StudentProgress, TeacherFeedback } from '@/lib/teacher/realtime-feedback';

interface StudentCardProps {
  student: StudentProgress;
  onSendEncouragement: (studentId: string, name: string) => void;
  onSendHint: (studentId: string, name: string, hint: string, activityId?: string) => Promise<TeacherFeedback | null>;
  onSendIntervention: (studentId: string, name: string, issue: string) => void;
  onSendCelebration: (studentId: string, name: string, achievement: string) => void;
}

function StudentCard({ 
  student, 
  onSendEncouragement,
  onSendHint, 
  onSendIntervention,
  onSendCelebration 
}: StudentCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  
  // Determine student status based on progress and competency
  const getStatus = () => {
    if (student.strugglingWith) return 'struggling';
    if (student.competencyLevel && student.competencyLevel >= 3) return 'excelling';
    if (student.progress >= 80) return 'completing';
    if (Date.now() - new Date(student.timestamp).getTime() > 300000) return 'idle';
    return 'active';
  };
  
  const status = getStatus();
  const statusColors = {
    struggling: 'border-red-300 bg-red-50',
    excelling: 'border-green-300 bg-green-50',
    completing: 'border-blue-300 bg-blue-50',
    active: 'border-gray-300 bg-white',
    idle: 'border-gray-200 bg-gray-50'
  };
  
  const statusIcons = {
    struggling: AlertTriangle,
    excelling: TrendingUp,
    completing: Target,
    active: Activity,
    idle: Clock
  };
  
  const StatusIcon = statusIcons[status];
  
  // Get student name from ID (in real implementation, this would come from profile)
  const getStudentName = (id: string) => {
    if (id === 'ada8a968-6a7d-458f-b507-606cbffc1927') return 'Demo Student';
    return `Student ${id.substring(0, 8)}`;
  };
  
  const studentName = getStudentName(student.studentId);
  
  return (
    <Card className={`transition-all duration-300 ${statusColors[status]} ${status === 'struggling' ? 'ring-2 ring-red-200' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-600" />
            <CardTitle className="text-sm font-medium">{studentName}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon className="h-4 w-4 text-gray-600" />
            <Badge variant={status === 'struggling' ? 'destructive' : 'secondary'} className="text-xs">
              {status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Current Activity */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Current Activity</p>
          <p className="text-sm">{student.activityName}</p>
          <p className="text-xs text-gray-500">{student.subject}</p>
        </div>
        
        {/* Progress */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-gray-600">Progress</span>
            <span className="text-xs text-gray-500">{student.progress}%</span>
          </div>
          <Progress value={student.progress} className="h-2" />
        </div>
        
        {/* Time & Competency */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="font-medium text-gray-600">Time Spent</p>
            <p className="text-gray-500">{Math.floor(student.timeSpent / 60)}m</p>
          </div>
          {student.competencyLevel !== undefined && (
            <div>
              <p className="font-medium text-gray-600">Mastery Level</p>
              <p className="text-gray-500">{student.competencyLevel}/4</p>
            </div>
          )}
        </div>
        
        {/* Struggling Indicator */}
        {student.strugglingWith && (
          <div className="p-2 bg-red-100 border border-red-200 rounded-md">
            <p className="text-xs font-medium text-red-800">Struggling with:</p>
            <p className="text-xs text-red-700">{student.strugglingWith}</p>
          </div>
        )}
        
        {/* Quick Actions */}
        <div className="border-t pt-3">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSendEncouragement(student.studentId, studentName)}
              className="h-7 text-xs"
            >
              <Heart className="h-3 w-3 mr-1" />
              Encourage
            </Button>
            
            <Button
              size="sm" 
              variant="outline"
              onClick={() => onSendHint(student.studentId, studentName, student.strugglingWith || 'Try the next step slowly')}
              className="h-7 text-xs"
            >
              <Lightbulb className="h-3 w-3 mr-1" />
              Hint
            </Button>
          </div>
          
          {status === 'struggling' && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onSendIntervention(student.studentId, studentName, student.strugglingWith || 'current activity')}
              className="w-full h-7 text-xs"
            >
              <AlertCircle className="h-3 w-3 mr-1" />
              Send Help
            </Button>
          )}
          
          {status === 'excelling' && (
            <Button
              size="sm"
              variant="default"
              onClick={() => onSendCelebration(student.studentId, studentName, 'excellent work')}
              className="w-full h-7 text-xs bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Celebrate
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowActions(!showActions)}
            className="w-full h-7 text-xs mt-1"
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            Custom Message
          </Button>
          
          {showActions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 space-y-2"
            >
              <input
                type="text"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Type a personal message..."
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
              />
              <Button
                size="sm"
                onClick={() => {
                  // Send custom message logic here
                  setCustomMessage('');
                  setShowActions(false);
                }}
                disabled={!customMessage.trim()}
                className="w-full h-6 text-xs"
              >
                <Send className="h-3 w-3 mr-1" />
                Send
              </Button>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ClassroomStatsProps {
  summary: {
    totalStudents: number;
    activeStudents: number;
    strugglingStudents: number;
    highPerformers: number;
    averageProgress: number;
    needsAttention: string[];
  };
}

function ClassroomStats({ summary }: ClassroomStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <Card>
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-600">{summary.activeStudents}</p>
          <p className="text-xs text-gray-600">Active Now</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">{summary.strugglingStudents}</p>
          <p className="text-xs text-gray-600">Need Help</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">{summary.highPerformers}</p>
          <p className="text-xs text-gray-600">Excelling</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Target className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-600">{Math.round(summary.averageProgress)}%</p>
          <p className="text-xs text-gray-600">Avg Progress</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Activity className="h-5 w-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-600">{summary.totalStudents}</p>
          <p className="text-xs text-gray-600">Total Students</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LiveClassroomMonitor() {
  const { 
    students, 
    activeAlerts, 
    isConnected, 
    sendEncouragement,
    sendHint,
    sendIntervention, 
    sendCelebration,
    getClassroomSummary
  } = useTeacherClassroom();
  
  const [alertsFilter, setAlertsFilter] = useState<'all' | 'unread' | 'urgent'>('all');
  
  const summary = getClassroomSummary();
  
  // Filter alerts based on selection
  const filteredAlerts = activeAlerts.filter(alert => {
    if (alertsFilter === 'unread') return !alert.readAt;
    if (alertsFilter === 'urgent') return alert.priority === 'urgent' || alert.priority === 'high';
    return true;
  });
  
  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <h2 className="text-xl font-semibold">
            Live Classroom - Grade 2A
          </h2>
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
        
        <div className="text-sm text-gray-600">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
      
      {/* Classroom Stats */}
      <ClassroomStats summary={summary} />
      
      {/* Main Content Tabs */}
      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Students ({students.length})
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alerts ({filteredAlerts.length})
          </TabsTrigger>
        </TabsList>
        
        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4">
          {students.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No students active right now.</p>
                <p className="text-sm">Students will appear here when they start learning activities.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {students.map((student) => (
                  <motion.div
                    key={student.studentId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <StudentCard
                      student={student}
                      onSendEncouragement={sendEncouragement}
                      onSendHint={sendHint}
                      onSendIntervention={sendIntervention}
                      onSendCelebration={sendCelebration}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
        
        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Filter:</span>
              <Button
                size="sm"
                variant={alertsFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setAlertsFilter('all')}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={alertsFilter === 'unread' ? 'default' : 'outline'}
                onClick={() => setAlertsFilter('unread')}
              >
                Unread
              </Button>
              <Button
                size="sm"
                variant={alertsFilter === 'urgent' ? 'default' : 'outline'}
                onClick={() => setAlertsFilter('urgent')}
              >
                Urgent
              </Button>
            </div>
          </div>
          
          {filteredAlerts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No alerts to show.</p>
                <p className="text-sm">Automatic alerts will appear when students need help.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <Card key={alert.id} className={alert.priority === 'high' ? 'border-red-300 bg-red-50' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={alert.priority === 'high' ? 'destructive' : 'secondary'}>
                          {alert.type}
                        </Badge>
                        <Badge variant="outline">{alert.priority}</Badge>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(alert.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm mb-2">{alert.message}</p>
                    {alert.metadata?.suggestedAction && (
                      <p className="text-xs text-gray-600 bg-gray-100 p-2 rounded">
                        💡 {alert.metadata.suggestedAction}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}