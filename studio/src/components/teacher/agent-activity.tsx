'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Heart, Target, BookOpen, TrendingUp, Sparkles, Users } from 'lucide-react';

interface AgentActivity {
  agent: string;
  task: string;
  confidence: number;
  timestamp: string;
  recommendation?: string;
  student_id?: string;
  agents_used?: string[];
}

interface AgentActivityProps {
  activities: AgentActivity[];
}

const agentIcons: Record<string, any> = {
  emotional_intelligence: Heart,
  tutoring: Brain,
  assessment: Target,
  translation: Sparkles,
  analytics: TrendingUp,
  content: BookOpen,
  teacher: Users,
};

const agentColors: Record<string, string> = {
  emotional_intelligence: 'text-pink-500',
  tutoring: 'text-blue-500',
  assessment: 'text-purple-500',
  translation: 'text-green-500',
  analytics: 'text-orange-500',
  content: 'text-cyan-500',
  teacher: 'text-indigo-500',
};

export function AgentActivity({ activities }: AgentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Agent Activity
        </CardTitle>
        <CardDescription>Real-time agent tasks and recommendations</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-4">
            {activities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No agent activity yet</p>
              </div>
            ) : (
              activities.map((activity, index) => {
                const Icon = agentIcons[activity.agent] || Brain;
                const color = agentColors[activity.agent] || 'text-gray-500';

                return (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${color}`} />
                        <div>
                          <p className="font-medium capitalize">
                            {activity.agent.replace('_', ' ')} Agent
                          </p>
                          <p className="text-sm text-muted-foreground">{activity.task}</p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {Math.round(activity.confidence * 100)}% confident
                      </Badge>
                    </div>
                    
                    {activity.agents_used && activity.agents_used.length > 1 && (
                      <div className="flex flex-wrap gap-1">
                        {activity.agents_used.map((agent, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {agent.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <Progress value={activity.confidence * 100} className="h-2" />
                    
                    {activity.recommendation && (
                      <div className="bg-muted rounded-lg p-3 mt-2">
                        <p className="text-sm font-medium mb-1 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Teacher Recommendation
                        </p>
                        <p className="text-sm text-muted-foreground">{activity.recommendation}</p>
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
