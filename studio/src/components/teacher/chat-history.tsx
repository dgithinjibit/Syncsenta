'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { User, Brain, MessageCircle, Send, Loader2, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  student_id: string;
  sender: 'student' | 'agent' | 'teacher';
  text: string;
  agent?: string;
  agents_used?: string[];
  timestamp: string;
}

interface ChatHistoryProps {
  messages: Message[];
  studentName: string;
  onSendMessage: (text: string) => Promise<void>;
}

export function ChatHistory({ messages, studentName, onSendMessage }: ChatHistoryProps) {
  const [teacherMessage, setTeacherMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!teacherMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(teacherMessage.trim());
      setTeacherMessage('');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chat History</CardTitle>
        <CardDescription>View and intervene in {studentName}&apos;s conversation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[400px] border rounded-lg p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No messages yet</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-3',
                    msg.sender === 'student' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.sender !== 'student' && (
                    <Avatar className="h-8 w-8 bg-primary">
                      <AvatarFallback>
                        {msg.sender === 'teacher' ? (
                          <User className="h-4 w-4 text-primary-foreground" />
                        ) : (
                          <Brain className="h-4 w-4 text-primary-foreground" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={cn(
                      'max-w-[70%] rounded-lg px-4 py-2',
                      msg.sender === 'student'
                        ? 'bg-primary text-primary-foreground'
                        : msg.sender === 'teacher'
                        ? 'bg-blue-100 dark:bg-blue-900'
                        : 'bg-muted'
                    )}
                  >
                    {msg.sender === 'teacher' && (
                      <div className="flex items-center gap-1 mb-1">
                        <User className="h-3 w-3" />
                        <span className="text-xs font-semibold">You</span>
                      </div>
                    )}
                    {msg.sender === 'agent' && msg.agent && (
                      <div className="flex items-center gap-1 mb-1">
                        <Heart className="h-3 w-3" />
                        <span className="text-xs font-semibold capitalize">
                          {msg.agent.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    {msg.agents_used && msg.agents_used.length > 1 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {msg.agents_used.map((agent) => (
                          <Badge key={agent} variant="secondary" className="text-xs">
                            {agent.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs opacity-60 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>

                  {msg.sender === 'student' && (
                    <Avatar className="h-8 w-8 bg-secondary">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium">Send message to {studentName}</p>
          <div className="flex gap-2">
            <Textarea
              value={teacherMessage}
              onChange={(e) => setTeacherMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="min-h-[80px]"
              disabled={isSending}
            />
            <Button
              onClick={handleSend}
              disabled={!teacherMessage.trim() || isSending}
              size="icon"
              className="h-[80px] w-[80px]"
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
