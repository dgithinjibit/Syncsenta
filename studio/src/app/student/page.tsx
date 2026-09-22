'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  MessageCircle,
  Calendar,
  Clock,
  Users,
  Brain,
  Zap,
  ArrowRight,
  Star,
  TrendingUp,
  Heart,
  Target,
} from 'lucide-react';
import { StudentHeader } from '@/components/layout/student-header';
import { InteractiveChallengePath } from '@/components/student/interactive-challenge-path';

interface StudentProfile {
  id: string;
  name: string;
  grade: string;
  preferredLanguage: 'english' | 'kiswahili' | 'mixed';
  learningStyle: string;
  interests: string[];
  strengths: string[];
  challenges: string[];
  culturalContext: {
    region: string;
    culturalReferences: string[];
  };
}

interface LearningProgress {
  subject: string;
  overallProgress: number;
  streakDays: number;
  totalSessions: number;
  averageSessionTime: number;
}

const assignments = [
  {
    id: 1,
    title: 'Mathematics — Algebra Practice',
    due: 'Tomorrow, 11:59 PM',
    status: { label: 'Urgent', variant: 'destructive' as const },
  },
  {
    id: 2,
    title: 'English — Essay Writing',
    due: 'Friday, 11:59 PM',
    status: { label: 'In Progress', variant: 'secondary' as const },
  },
  {
    id: 3,
    title: 'Science — Lab Report',
    due: 'Next Monday, 11:59 PM',
    status: { label: 'Not Started', variant: 'outline' as const },
  },
];

const learningPath = [
  { subject: 'Mathematics', progress: 85, current: 'Fractions', next: 'Ratios' },
  { subject: 'English', progress: 72, current: 'Essay Writing', next: 'Comprehension' },
  { subject: 'Science', progress: 68, current: 'Lab Methods', next: 'Observation' },
];

const todaysClasses = [
  { subject: 'Mathematics', time: '2:00 PM — 3:00 PM' },
  { subject: 'English Literature', time: '3:30 PM — 4:30 PM' },
];

export default function StudentDashboardPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState('Student');
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [learningProgress, setLearningProgress] = useState<LearningProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('userName') || localStorage.getItem('studentName');
    if (stored) setStudentName(stored.split(' ')[0]);
    
    // Load personalized learning data
    loadPersonalizedData();
  }, []);

  const loadPersonalizedData = async () => {
    try {
      setIsLoading(true);
      
      // Get student profile
      const profileResponse = await fetch('/api/test-personalization?action=profile&userId=user1');
      const profileData = await profileResponse.json();
      
      if (profileData.success) {
        setProfile(profileData.profile);
        setStudentName(profileData.profile.name);
      }

      // Get learning progress for main subjects
      const subjects = ['Mathematics', 'English', 'Science'];
      const progressPromises = subjects.map(async (subject) => {
        const response = await fetch(`/api/test-personalization?action=progress&userId=user1&subject=${subject}`);
        const data = await response.json();
        return data.success ? { subject, ...data.progress } : null;
      });

      const progressResults = await Promise.all(progressPromises);
      setLearningProgress(progressResults.filter(Boolean) as LearningProgress[]);
      
    } catch (error) {
      console.error('Failed to load personalized data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const goToTutor = (subject?: string) => {
    if (subject) {
      router.push(`/student/chat/${encodeURIComponent(subject)}`);
    } else {
      router.push('/student/journey');
    }
  };

  const getPersonalizedGreeting = () => {
    if (!profile) return `Karibu, ${studentName}`;
    
    const greetings = {
      english: `Welcome back, ${profile.name}!`,
      kiswahili: `Karibu tena, ${profile.name}!`,
      mixed: `Karibu, ${profile.name}!`
    };
    
    return greetings[profile.preferredLanguage] || greetings.mixed;
  };

  const getPersonalizedMotivation = () => {
    if (!profile) return "Ready to learn with SyncSenta today?";
    
    const totalSessions = learningProgress.reduce((sum, p) => sum + p.totalSessions, 0);
    const maxStreak = Math.max(...learningProgress.map(p => p.streakDays), 0);
    
    if (maxStreak > 7) {
      return `Amazing ${maxStreak}-day streak! You're on fire! 🔥`;
    } else if (totalSessions > 10) {
      return `${totalSessions} learning sessions completed! Keep growing! 🌱`;
    } else if (profile.interests.length > 0) {
      return `Ready to explore ${profile.interests[0]} and more today?`;
    }
    
    return "Let's discover something amazing together today!";
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <StudentHeader showBackButton={false} onBack={() => router.back()} />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <Brain className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading your personalized dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <StudentHeader showBackButton={false} onBack={() => router.back()} />

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-headline">
                {getPersonalizedGreeting()}
              </h1>
              <p className="text-muted-foreground">
                {getPersonalizedMotivation()}
              </p>
              {profile && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary" className="gap-1">
                    <Heart className="h-3 w-3" />
                    {profile.learningStyle} learner
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Target className="h-3 w-3" />
                    {profile.grade}
                  </Badge>
                  {profile.interests.slice(0, 2).map((interest) => (
                    <Badge key={interest} variant="outline" className="gap-1">
                      <Star className="h-3 w-3" />
                      {interest}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Brain className="h-3 w-3" />
                SyncSenta Active
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                Personalized
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Learning Sessions</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {learningProgress.reduce((sum, p) => sum + p.totalSessions, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Avg {Math.round(learningProgress.reduce((sum, p) => sum + p.averageSessionTime, 0) / Math.max(learningProgress.length, 1))} min/session
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Learning Streak</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.max(...learningProgress.map(p => p.streakDays), 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.max(...learningProgress.map(p => p.streakDays), 0) > 0 ? 'days in a row!' : 'Start your streak today!'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(learningProgress.reduce((sum, p) => sum + p.overallProgress, 0) / Math.max(learningProgress.length, 1))}%
                </div>
                <p className="text-xs text-muted-foreground">Across all subjects</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">2 due this week</p>
              </CardContent>
            </Card>
          </div>

          <InteractiveChallengePath
            grade={profile?.grade || 'Grade 6'}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Personalized Learning Path</CardTitle>
                <CardDescription>AI-adapted curriculum based on your progress and interests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {learningProgress.length > 0 ? (
                  learningProgress.map((progress) => (
                    <button
                      key={progress.subject}
                      onClick={() => goToTutor(progress.subject)}
                      className="w-full text-left rounded-lg p-4 border hover:bg-muted transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{progress.subject}</h4>
                          <p className="text-sm text-muted-foreground">
                            {progress.totalSessions} sessions • {progress.streakDays} day streak
                          </p>
                        </div>
                        <Badge variant={progress.overallProgress > 70 ? 'default' : 'secondary'}>
                          {progress.overallProgress}%
                        </Badge>
                      </div>
                      <Progress value={progress.overallProgress} className="mb-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {progress.overallProgress < 30 ? 'Building foundations' :
                           progress.overallProgress < 70 ? 'Making good progress' :
                           'Mastering concepts'}
                        </span>
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </button>
                  ))
                ) : (
                  assignments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{a.title}</h4>
                        <p className="text-sm text-muted-foreground">Due: {a.due}</p>
                      </div>
                      <Badge variant={a.status.variant}>{a.status.label}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Learning Path
                  </CardTitle>
                  <CardDescription>AI-personalized curriculum</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {learningPath.map((p) => (
                    <button
                      key={p.subject}
                      onClick={() => goToTutor(p.subject)}
                      className="w-full text-left rounded-lg p-2 -mx-2 hover:bg-muted transition-colors"
                    >
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">{p.subject}</span>
                        <span>{p.progress}%</span>
                      </div>
                      <Progress value={p.progress} />
                      <p className="text-xs text-muted-foreground mt-1">
                        Current: {p.current} → Next: {p.next}
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Omega Claw Guided Tutor
                  </CardTitle>
                  <CardDescription>
                    Live Socratic tutor grounded in CBC curriculum
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => router.push('/student/chat')}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Start Chat Session
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/student/journey?step=subject')}
                  >
                    Learning Journey
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Today&apos;s Classes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {todaysClasses.map((c) => (
                    <div key={c.subject} className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{c.subject}</p>
                        <p className="text-sm text-muted-foreground">{c.time}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
