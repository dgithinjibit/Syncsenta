'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertCircle, CheckCircle, Clock, Target } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  location: string;
  grade: string;
  subject: string;
  status: string;
  questions: number;
  progress: number;
  last_active: string;
}

interface StudentAnalyticsProps {
  student: Student;
  messages: any[];
}

export function StudentAnalytics({ student, messages }: StudentAnalyticsProps) {
  const studentMessages = messages.filter((m) => m.sender === 'student');
  const agentMessages = messages.filter((m) => m.sender === 'agent');
  const teacherMessages = messages.filter((m) => m.sender === 'teacher');

  const avgResponseTime = agentMessages.length > 0 ? 1.8 : 0; // Mock data
  const emotionalState = 'engaged'; // Mock data
  const weakAreas = ['Fractions', 'Word Problems']; // Mock data
  const strengths = ['Addition', 'Subtraction', 'Multiplication']; // Mock data

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Learning Analytics
          </CardTitle>
          <CardDescription>Detailed insights for {student.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Session Stats */}
          <div>
            <h3 className="font-semibold mb-3">Session Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Questions Asked</p>
                <p className="text-2xl font-bold">{studentMessages.length}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-sm text-muted-foreground">AI Responses</p>
                <p className="text-2xl font-bold">{agentMessages.length}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Teacher Messages</p>
                <p className="text-2xl font-bold">{teacherMessages.length}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold">{avgResponseTime}s</p>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div>
            <h3 className="font-semibold mb-3">Overall Progress</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">{student.subject}</span>
                <span className="text-sm font-medium">{student.progress}%</span>
              </div>
              <Progress value={student.progress} />
            </div>
          </div>

          {/* Emotional State */}
          <div>
            <h3 className="font-semibold mb-3">Emotional State</h3>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                {emotionalState}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Student is actively engaged and motivated
              </span>
            </div>
          </div>

          {/* Weak Areas */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              Areas Needing Support
            </h3>
            <div className="space-y-2">
              {weakAreas.length > 0 ? (
                weakAreas.map((area) => (
                  <div key={area} className="flex items-center justify-between border rounded-lg p-2">
                    <span className="text-sm">{area}</span>
                    <Badge variant="outline" className="gap-1">
                      <Target className="h-3 w-3" />
                      Focus needed
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No weak areas identified</p>
              )}
            </div>
          </div>

          {/* Strengths */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Strengths
            </h3>
            <div className="flex flex-wrap gap-2">
              {strengths.length > 0 ? (
                strengths.map((strength) => (
                  <Badge key={strength} variant="secondary">
                    {strength}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Building strengths...</p>
              )}
            </div>
          </div>

          {/* Activity Timeline */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">
                  Last active: {new Date(student.last_active).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">
                  Total messages: {messages.length}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                <span className="text-muted-foreground">
                  Current status: {student.status}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
