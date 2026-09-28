'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Loader2, Users, User, CircleSlash } from 'lucide-react';
import { StudentList } from './student-list';
import { ChatHistory } from './chat-history';
import { AgentActivity } from './agent-activity';
import { StudentAnalytics } from './student-analytics';

interface Student {
  id: string;
  name: string;
  location: string;
  grade: string;
  subject: string;
  status: 'online' | 'offline' | 'active' | 'idle';
  questions: number;
  progress: number;
  last_active: string;
}

/**
 * Where the live-monitoring backend is reached.
 *
 * Both the roster and the socket belong to `backend/syncsenta-backend` (Rust,
 * `/api/v1/mvp/*`), which is not deployed anywhere. `next.config.js` rewrites
 * `/api/v1/*` to `http://localhost:8080`, so on Vercel the roster 404s and the
 * socket has no listener. Setting `NEXT_PUBLIC_BACKEND_API_URL` /
 * `NEXT_PUBLIC_BACKEND_WS_URL` is what turns this view on; until then it says
 * so instead of pretending to connect.
 */
const MVP_API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL || '/api/v1/mvp').replace(
  /\/$/,
  ''
);
const DASHBOARD_WS_TEACHER_PATH = '/dashboard/ws/teacher';
const LIVE_BACKEND_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_BACKEND_WS_URL);

interface Message {
  id: string;
  student_id: string;
  sender: 'student' | 'agent' | 'teacher';
  text: string;
  agent?: string;
  agents_used?: string[];
  timestamp: string;
}

interface AgentActivity {
  agent: string;
  task: string;
  confidence: number;
  timestamp: string;
  recommendation?: string;
  student_id?: string;
  agents_used?: string[];
}

// Generate teacher recommendations based on AI agent activity
function generateTeacherRecommendation(agentData: any): string {
  const agent = agentData.agent;
  const agentsUsed = agentData.agents_used || [];
  
  // Multi-agent recommendations
  if (agentsUsed.includes('emotional_intelligence')) {
    return 'Student may need emotional support. Consider checking in personally or adjusting teaching approach.';
  }
  
  if (agentsUsed.includes('translation')) {
    return 'Student is using language translation. Consider providing bilingual materials or extra language support.';
  }
  
  if (agentsUsed.length > 2) {
    return 'Complex question requiring multiple agents. Student may benefit from one-on-one tutoring session.';
  }
  
  // Single agent recommendations
  switch (agent) {
    case 'tutoring':
    case 'socratic_tutor':
      return 'Student is actively learning. Monitor progress and provide encouragement.';
    
    case 'assessment':
      return 'Student is being assessed. Review results and provide targeted feedback.';
    
    case 'emotional_intelligence':
      return 'Emotional state detected. Consider personal check-in or counseling referral if needed.';
    
    case 'content':
      return 'Student accessing learning materials. Ensure content is appropriate for their level.';
    
    case 'analytics':
      return 'Performance data being analyzed. Review insights for intervention opportunities.';
    
    default:
      return 'AI agent is assisting student. Monitor interaction for quality assurance.';
  }
}

export function TeacherDashboard() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentActivities, setAgentActivities] = useState<AgentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  // WebSocket connection
  useEffect(() => {
    // Next.js rewrites do not proxy WebSockets, so the socket must be given a
    // real origin. When it has none, stop: the old code built
    // `wss://<current-host>/api/v1/mvp/ws` - a port nothing listens to on
    // Vercel - and then retried every 3 seconds forever, which kept the badge
    // on "Connecting" and burned battery on the low-spec Chromebooks this
    // project targets.
    const wsBase = process.env.NEXT_PUBLIC_BACKEND_WS_URL;
    if (!wsBase) {
      setWsConnected(false);
      return;
    }

    const wsUrl = `${wsBase.replace(/\/$/, '')}${DASHBOARD_WS_TEACHER_PATH}`;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[TeacherDashboard] WebSocket connected');
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'student_message' || data.type === 'agent_response' || data.type === 'teacher_message') {
              if (selectedStudent && data.message?.student_id === selectedStudent.id) {
                setMessages((prev) => [...prev, data.message]);
              }
            }

            if (data.type === 'agent_activity') {
              // Generate teacher recommendation based on agent activity
              const recommendation = generateTeacherRecommendation(data);
              
              setAgentActivities((prev) => [
                {
                  agent: data.agent,
                  task: `Processing ${data.student_id}'s question`,
                  confidence: 0.85,
                  timestamp: new Date().toISOString(),
                  recommendation,
                  student_id: data.student_id,
                  agents_used: data.agents_used || [data.agent],
                },
                ...prev.slice(0, 19),
              ]);
            }

            if (data.type === 'status_change') {
              setStudents((prev) =>
                prev.map((s) =>
                  s.id === data.student_id
                    ? { ...s, status: data.status as Student['status'], last_active: new Date().toISOString() }
                    : s
                )
              );
            }
          } catch (err) {
            console.error('[TeacherDashboard] Failed to parse WebSocket message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('[TeacherDashboard] WebSocket error:', error);
          setWsConnected(false);
        };

        ws.onclose = () => {
          setWsConnected(false);
          if (closed) return;
          console.log('[TeacherDashboard] WebSocket closed, reconnecting...');
          reconnectTimer = setTimeout(connectWebSocket, 3000);
        };
      } catch (err) {
        console.error('[TeacherDashboard] Failed to connect WebSocket:', err);
        if (!closed) reconnectTimer = setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [selectedStudent]);

  // Load students
  useEffect(() => {
    const loadStudents = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${MVP_API_BASE}/students`);
        if (!response.ok) {
          // A 404 here is the expected answer on Vercel until the Rust service
          // is deployed; say which service is missing rather than "try again".
          setRosterError(`HTTP ${response.status}`);
          return;
        }
        const data = await response.json();
        if (data.students && Array.isArray(data.students)) {
          setStudents(data.students);
          setRosterError(null);
        }
      } catch (err) {
        console.error('[TeacherDashboard] Failed to load students:', err);
        setRosterError('unreachable');
        toast({
          title: 'Live monitoring is not connected',
          description: 'The student roster comes from the SyncSenta API service, which is not reachable.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadStudents();
  }, [toast]);

  // Load student messages
  const loadStudentMessages = useCallback(async (studentId: string) => {
    try {
      const response = await fetch(`${MVP_API_BASE}/students/${studentId}/messages`);
      if (response.ok) {
        const data = await response.json();
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      }
    } catch (err) {
      console.error('[TeacherDashboard] Failed to load messages:', err);
    }
  }, []);

  // Select student
  const handleSelectStudent = useCallback(
    (student: Student) => {
      setSelectedStudent(student);
      loadStudentMessages(student.id);
    },
    [loadStudentMessages]
  );

  // Send teacher message
  const handleSendMessage = async (text: string) => {
    if (!selectedStudent) return;

    try {
      const response = await fetch(`${MVP_API_BASE}/teachers/messages/${selectedStudent.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }

      toast({
        title: 'Message sent',
        description: `Your message was sent to ${selectedStudent.name}`,
      });
    } catch (err) {
      console.error('[TeacherDashboard] Failed to send message:', err);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
              <p className="text-sm text-muted-foreground">Monitor students and AI agent activity</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={wsConnected ? 'default' : 'secondary'} className="gap-1">
                {wsConnected ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Live
                  </>
                ) : LIVE_BACKEND_CONFIGURED ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Reconnecting
                  </>
                ) : (
                  <>
                    <CircleSlash className="h-3 w-3" />
                    Live monitoring off
                  </>
                )}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Users className="h-3 w-3" />
                {students.filter((s) => s.status !== 'offline').length} Active
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        {students.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CircleSlash className="h-5 w-5" />
                Live monitoring is not connected
              </CardTitle>
              <CardDescription>
                No students to show, because the service that answers this view is not
                reachable from here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                The roster, the chat transcripts and the agent feed come from the
                SyncSenta API service (<code>/api/v1/mvp</code>). That service is not
                deployed yet, and <code>next.config.js</code> sends
                <code> /api/v1/*</code> to <code>http://localhost:8080</code>, so from
                Vercel every request fails{rosterError ? ` (last attempt: ${rosterError})` : ''}.
              </p>
              <p>
                Everything else you can reach from here - signing in, the Mwalimu
                tutor and the other Next.js API routes - is unaffected. Fixing this
                view means deploying that service and pointing
                <code> NEXT_PUBLIC_BACKEND_API_URL</code> and
                <code> NEXT_PUBLIC_BACKEND_WS_URL</code> at it.
              </p>
            </CardContent>
          </Card>
        ) : (
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Student List */}
          <div className="lg:col-span-1">
            <StudentList
              students={students}
              selectedStudent={selectedStudent}
              onSelectStudent={handleSelectStudent}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {selectedStudent ? (
              <>
                {/* Student Details */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>
                            <User className="h-6 w-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle>{selectedStudent.name}</CardTitle>
                          <CardDescription>
                            {selectedStudent.grade} • {selectedStudent.subject} • {selectedStudent.location}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={selectedStudent.status === 'active' ? 'default' : 'secondary'}>
                        {selectedStudent.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{selectedStudent.progress}%</p>
                        <p className="text-xs text-muted-foreground">Progress</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{selectedStudent.questions}</p>
                        <p className="text-xs text-muted-foreground">Questions</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{messages.length}</p>
                        <p className="text-xs text-muted-foreground">Messages</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          {new Date(selectedStudent.last_active).toLocaleTimeString()}
                        </p>
                        <p className="text-xs text-muted-foreground">Last Active</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabs */}
                <Tabs defaultValue="chat" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="chat">Chat History</TabsTrigger>
                    <TabsTrigger value="agents">AI Agents</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  </TabsList>

                  <TabsContent value="chat">
                    <ChatHistory
                      messages={messages}
                      studentName={selectedStudent.name}
                      onSendMessage={handleSendMessage}
                    />
                  </TabsContent>

                  <TabsContent value="agents">
                    <AgentActivity activities={agentActivities} />
                  </TabsContent>

                  <TabsContent value="analytics">
                    <StudentAnalytics student={selectedStudent} messages={messages} />
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a Student</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    Choose a student from the list to view their chat history, AI agent activity, and learning analytics.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        )}
      </main>
    </div>
  );
}
