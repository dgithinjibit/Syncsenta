'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudentHeader } from '@/components/layout/student-header';
import { MwalimuChat } from '@/components/student/mwalimu-chat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Heart, TrendingUp, Clock } from 'lucide-react';

interface EmotionalState {
  state: 'engaged' | 'frustrated' | 'confused' | 'confident' | 'neutral';
  confidence: number;
  indicators: string[];
}

export default function StudentChatPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState('stu_turkana_001');
  const [studentName, setStudentName] = useState('Student');
  const [emotionalState, setEmotionalState] = useState<EmotionalState>({
    state: 'neutral',
    confidence: 0.5,
    indicators: [],
  });
  const [sessionStats, setSessionStats] = useState({
    questionsAsked: 0,
    timeSpent: 0,
    conceptsCovered: 0,
  });

  useEffect(() => {
    // Load student info from localStorage
    const storedName = localStorage.getItem('userName') || localStorage.getItem('studentName');
    if (storedName) {
      setStudentName(storedName);
    }

    // Try to get student ID from localStorage or use default
    const storedId = localStorage.getItem('studentId');
    if (storedId) {
      setStudentId(storedId);
    }

    // Track session time
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000 / 60);
      setSessionStats((prev) => ({ ...prev, timeSpent: elapsed }));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const handleEmotionalStateChange = (state: EmotionalState) => {
    setEmotionalState(state);
  };

  const getEmotionalStateColor = () => {
    switch (emotionalState.state) {
      case 'engaged':
        return 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100';
      case 'frustrated':
        return 'bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100';
      case 'confused':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100';
      case 'confident':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <StudentHeader showBackButton={true} onBack={() => router.back()} />

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main chat area */}
            <div className="lg:col-span-2">
              <MwalimuChat
                studentId={studentId}
                studentName={studentName}
                subject="Mathematics"
                grade="Grade 5"
                language="english"
                onEmotionalStateChange={handleEmotionalStateChange}
              />
            </div>

            {/* Sidebar with stats and insights */}
            <div className="space-y-6">
              {/* Emotional Intelligence Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Emotional Intelligence
                  </CardTitle>
                  <CardDescription>
                    Mwalimu adapts to your learning state
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`p-4 rounded-lg ${getEmotionalStateColor()}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold capitalize">
                        {emotionalState.state}
                      </span>
                      <Badge variant="outline">
                        {Math.round(emotionalState.confidence * 100)}% confident
                      </Badge>
                    </div>
                    {emotionalState.indicators.length > 0 && (
                      <ul className="text-sm space-y-1">
                        {emotionalState.indicators.map((indicator, i) => (
                          <li key={i}>• {indicator}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <p>
                      Mwalimu uses emotional intelligence to detect your learning state
                      and adapt the teaching approach in real-time.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Session Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Session Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Questions Asked</span>
                    <span className="font-semibold">{sessionStats.questionsAsked}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Time Spent</span>
                    <span className="font-semibold">{sessionStats.timeSpent} min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Concepts Covered</span>
                    <span className="font-semibold">{sessionStats.conceptsCovered}</span>
                  </div>
                </CardContent>
              </Card>

              {/* AI Agents Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Tutors
                  </CardTitle>
                  <CardDescription>
                    Multiple specialized agents working together
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Tutoring</Badge>
                    <span className="text-xs text-muted-foreground">Socratic teaching</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Emotional Intelligence</Badge>
                    <span className="text-xs text-muted-foreground">Adapts to your state</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Assessment</Badge>
                    <span className="text-xs text-muted-foreground">Tracks progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Translation</Badge>
                    <span className="text-xs text-muted-foreground">Multilingual support</span>
                  </div>
                </CardContent>
              </Card>

              {/* Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Quick Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>• Use the microphone button for voice input</p>
                  <p>• Enable auto-speak to hear responses</p>
                  <p>• Upload images or documents for help</p>
                  <p>• Press Enter to send, Shift+Enter for new line</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
