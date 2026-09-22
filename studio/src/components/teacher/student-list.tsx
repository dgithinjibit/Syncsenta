'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, MapPin, Users, CheckCircle2, Activity, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface StudentListProps {
  students: Student[];
  selectedStudent: Student | null;
  onSelectStudent: (student: Student) => void;
}

export function StudentList({ students, selectedStudent, onSelectStudent }: StudentListProps) {
  const getStatusBadge = (status: Student['status']) => {
    const variants = {
      online: { variant: 'default' as const, icon: CheckCircle2, color: 'text-green-500' },
      active: { variant: 'default' as const, icon: Activity, color: 'text-blue-500' },
      idle: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-500' },
      offline: { variant: 'outline' as const, icon: XCircle, color: 'text-gray-500' },
    };

    const { variant, icon: Icon, color } = variants[status];
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className={cn('h-3 w-3', color)} />
        {status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Students
        </CardTitle>
        <CardDescription>{students.length} total students</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-2">
            {students.map((student) => (
              <button
                key={student.id}
                onClick={() => onSelectStudent(student)}
                className={cn(
                  'w-full text-left p-3 rounded-lg border transition-colors',
                  selectedStudent?.id === student.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{student.name}</p>
                      <p className="text-xs opacity-80 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {student.location}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(student.status)}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="opacity-80">{student.grade}</span>
                  <span className="opacity-80">{student.questions} questions</span>
                </div>
                <Progress value={student.progress} className="mt-2 h-1" />
              </button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
