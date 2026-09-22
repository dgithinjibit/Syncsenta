'use client';

import { useState } from 'react';
import {
  Calendar,
  DollarSign,
  MessageCircle,
  Phone,
  TrendingUp,
  Users,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const mockParent = {
  id: 'parent_1',
  name: 'Grace Wanjiku',
  phone: '+254712345678',
  email: 'grace.wanjiku@email.com',
};

const mockLinkedStudents = [
  {
    id: 'student_1',
    name: 'Amina Wanjiku',
    grade: 'Grade 6',
    class: '6A',
    school: 'Nairobi Primary School',
    avatar: '',
    overallProgress: 85,
    attendanceRate: 92,
    recentGrades: [
      { subject: 'Mathematics', grade: 'A-', score: 88 },
      { subject: 'English', grade: 'B+', score: 82 },
      { subject: 'Science', grade: 'A', score: 91 },
    ],
    upcomingAssignments: 3,
    feeBalance: 15000,
    lastAttendance: '2026-04-28',
  },
  {
    id: 'student_2',
    name: 'James Wanjiku',
    grade: 'Grade 4',
    class: '4B',
    school: 'Nairobi Primary School',
    avatar: '',
    overallProgress: 78,
    attendanceRate: 88,
    recentGrades: [
      { subject: 'Mathematics', grade: 'B', score: 75 },
      { subject: 'English', grade: 'B+', score: 80 },
      { subject: 'Science', grade: 'B-', score: 72 },
    ],
    upcomingAssignments: 2,
    feeBalance: 12000,
    lastAttendance: '2026-04-28',
  },
];

const mockRecentMessages = [
  {
    id: 'msg_1',
    from: 'Mr. Kiprotich',
    subject: 'Mathematics Progress Update',
    preview: 'Amina is showing excellent progress in fractions...',
    timestamp: '2 hours ago',
    read: false,
  },
  {
    id: 'msg_2',
    from: 'Ms. Achieng',
    subject: 'Parent-Teacher Meeting',
    preview: 'Scheduled for next Friday at 2:00 PM...',
    timestamp: '1 day ago',
    read: true,
  },
];

const mockUpcomingEvents = [
  {
    id: 'event_1',
    title: 'Parent-Teacher Meeting',
    date: '2026-05-03',
    time: '2:00 PM',
    type: 'meeting',
  },
  {
    id: 'event_2',
    title: 'Science Fair',
    date: '2026-05-10',
    time: '9:00 AM',
    type: 'event',
  },
  {
    id: 'event_3',
    title: 'Fee Payment Due',
    date: '2026-05-15',
    time: 'All Day',
    type: 'payment',
  },
];

export default function ParentDashboard() {
  const [selectedStudent, setSelectedStudent] = useState(mockLinkedStudents[0]);
  const students = mockLinkedStudents;
  const messages = mockRecentMessages;

  const totalFeeBalance = students.reduce((sum, s) => sum + s.feeBalance, 0);
  const averageAttendance = Math.round(
    students.reduce((sum, s) => sum + s.attendanceRate, 0) / students.length
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground font-headline">
            Karibu, {mockParent.name}
          </h1>
          <p className="text-muted-foreground">
            Monitor your children&apos;s academic progress and school activities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Messages
          </Button>
          <Button className="gap-2">
            <Phone className="h-4 w-4" />
            Contact School
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Children</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground">Enrolled students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Attendance</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageAttendance}%</div>
            <p className="text-xs text-muted-foreground">This term</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fee Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KSh {totalFeeBalance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Outstanding amount</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messages.filter((m) => !m.read).length}</div>
            <p className="text-xs text-muted-foreground">From teachers</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Children&apos;s Progress</CardTitle>
            <CardDescription>Academic performance and attendance overview</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={selectedStudent.id}
              onValueChange={(value) => {
                const student = students.find((s) => s.id === value);
                if (student) setSelectedStudent(student);
              }}
            >
              <TabsList className="grid w-full grid-cols-2">
                {students.map((student) => (
                  <TabsTrigger key={student.id} value={student.id}>
                    {student.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {students.map((student) => (
                <TabsContent key={student.id} value={student.id} className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={student.avatar} />
                      <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{student.name}</h3>
                      <p className="text-muted-foreground">
                        {student.grade} • Class {student.class}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant="outline">Progress: {student.overallProgress}%</Badge>
                        <Badge variant="outline">Attendance: {student.attendanceRate}%</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Recent Grades</h4>
                      {student.recentGrades.map((grade, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <span className="font-medium">{grade.subject}</span>
                          <div className="text-right">
                            <div className="font-bold">{grade.grade}</div>
                            <div className="text-sm text-muted-foreground">{grade.score}%</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold">Quick Stats</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Overall Progress</span>
                          <span className="font-semibold">{student.overallProgress}%</span>
                        </div>
                        <Progress value={student.overallProgress} />
                      </div>
                      <div className="p-3 border rounded-lg space-y-2">
                        <div className="flex justify-between">
                          <span>Upcoming Assignments</span>
                          <Badge>{student.upcomingAssignments}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Fee Balance</span>
                          <span className="font-semibold">
                            KSh {student.feeBalance.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Last Attendance</span>
                          <span className="text-sm text-muted-foreground">
                            {student.lastAttendance}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Recent Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 border rounded-lg ${!message.read ? 'bg-muted/50' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">{message.from}</span>
                        {!message.read && (
                          <Badge variant="destructive" className="h-2 w-2 p-0" />
                        )}
                      </div>
                      <h4 className="font-medium text-sm">{message.subject}</h4>
                      <p className="text-xs text-muted-foreground">{message.preview}</p>
                      <p className="text-xs text-muted-foreground mt-1">{message.timestamp}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <Button variant="outline" className="w-full mt-3">
                View All Messages
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockUpcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg"
                  >
                    <div
                      className={`p-2 rounded-full ${
                        event.type === 'payment'
                          ? 'bg-red-100 text-red-600'
                          : event.type === 'meeting'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-green-100 text-green-600'
                      }`}
                    >
                      {event.type === 'payment' ? (
                        <DollarSign className="h-4 w-4" />
                      ) : event.type === 'meeting' ? (
                        <Users className="h-4 w-4" />
                      ) : (
                        <Calendar className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{event.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.date).toLocaleDateString()} • {event.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
