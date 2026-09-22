'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  ArrowRight,
  Book,
  Bot,
  FlaskConical,
  GraduationCap,
  Key,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Teacher, LearningSummary } from '@/lib/types';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db, app } from '@/lib/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const mockTeacher: Teacher = {
    id: 'usr_3',
    name: 'Teacher',
    classes: [
        { id: 'class_1', name: 'Grade 5 English', performance: 75, students: [{id: 'stud_101', name: 'Asha Juma', chatTokens: 100}], color: 'bg-blue-500' },
        { id: 'class_2', name: 'Grade 6 Social Studies', performance: 82, students: [], color: 'bg-green-500' },
        { id: 'class_3', name: 'Grade 4 Mathematics', performance: 78, students: [], color: 'bg-orange-500' },
    ],
    totalStudents: 120,
};

export default function TeacherDashboard() {
  const [learningSummaries, setLearningSummaries] = useState<LearningSummary[]>([]);
  const [teacherName, setTeacherName] = useState('Teacher');
  const teacherData = mockTeacher;

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
            setTeacherName(localStorage.getItem('userName') || user.displayName || 'Teacher');
            
            const q = query(
                collection(db, "learningSummaries"), 
                where("teacherId", "==", user.uid),
                orderBy("createdAt", "desc"),
                limit(10)
            );
            
            const unsubscribeSummaries = onSnapshot(q, (snapshot) => {
                const summaries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LearningSummary));
                setLearningSummaries(summaries);
            });

            return () => unsubscribeSummaries();
        }
    });

    return () => unsubscribeAuth();
  }, []);

  const averagePerformance = teacherData.classes.length > 0
      ? Math.round(
          teacherData.classes.reduce((sum, c) => sum + c.performance, 0) /
          teacherData.classes.length
        )
      : 0;

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold font-headline text-foreground">
                    Karibu, {teacherName}
                </h1>
                <p className="text-muted-foreground">Here is your teaching summary for today.</p>
            </div>
            <div className="flex items-center gap-2">
                 <Button asChild>
                    <Link href="/dashboard/learning-lab">
                        <FlaskConical className="mr-2 h-4 w-4" /> Create Learning Lab
                    </Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href="/dashboard/tools">
                         <Sparkles className="mr-2 h-4 w-4" /> Create Resource
                    </Link>
                </Button>
            </div>
        </div>

        {/* At-a-Glance Stats */}
        <div className="grid gap-6 md:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{teacherData.totalStudents}</div>
                    <p className="text-xs text-muted-foreground">Across all your classes</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Your Classes</CardTitle>
                    <Book className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{teacherData.classes.length}</div>
                    <p className="text-xs text-muted-foreground">Actively managed by you</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Class Performance</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{averagePerformance}%</div>
                    <p className="text-xs text-muted-foreground">Based on recent assessments</p>
                </CardContent>
            </Card>
            <Card className="bg-muted">
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Student Join Code</CardTitle>
                    <Key className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-mono font-bold">QWERTY456</div>
                    <p className="text-xs text-muted-foreground">For all Learning Labs</p>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Class Overview */}
            <Card className="lg:col-span-2">
                 <CardHeader>
                    <CardTitle>My Classes</CardTitle>
                    <CardDescription>An overview of your current classes.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                     {teacherData.classes.map(classItem => (
                        <Card key={classItem.id} className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                 <CardTitle className="text-base font-medium">{classItem.name}</CardTitle>
                                 <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold">{classItem.students.length} Students</div>
                                <div className="flex items-center gap-2 mt-2">
                                    <Progress value={classItem.performance} aria-label={`${classItem.performance}% performance`} />
                                    <span className="text-xs font-semibold">{classItem.performance}%</span>
                                </div>
                            </CardContent>
                             <CardFooter>
                                <Button variant="outline" size="sm" className="w-full">
                                    View Class <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </CardContent>
            </Card>

            {/* Student Insights Feed */}
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="text-primary" /> Student Insights
                    </CardTitle>
                    <CardDescription>Live feedback from AI tutor sessions.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-[350px]">
                        <div className="space-y-4 p-6 pt-0">
                             {learningSummaries.length > 0 ? learningSummaries.map((summary, index) => (
                                <div key={index} className="flex flex-col gap-2">
                                     <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                             <AvatarFallback>{summary.studentName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="grid gap-0.5">
                                            <p className="font-semibold">{summary.studentName}</p>
                                            <div className="text-xs text-muted-foreground">
                                                Studied <Badge variant="secondary">{summary.subject}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-md bg-muted/50 border text-sm space-y-2">
                                        <div>
                                            <h4 className="font-semibold text-green-600">Strengths:</h4>
                                            <p className="text-muted-foreground">{summary.strengths}</p>
                                        </div>
                                        <Separator />
                                        <div>
                                             <h4 className="font-semibold text-orange-600">Areas for Improvement:</h4>
                                            <p className="text-muted-foreground">{summary.areasForImprovement}</p>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <p className="text-sm italic">No insights yet. Insights will appear as students interact with Mwalimu AI.</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
                 <CardFooter>
                    <Button variant="secondary" className="w-full">
                        View All Insights
                    </Button>
                </CardFooter>
            </Card>
        </div>
    </div>
  );
}
