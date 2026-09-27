'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Send,
  Mic,
  MicOff,
  Image as ImageIcon,
  Paperclip,
  Volume2,
  VolumeX,
  Loader2,
  Brain,
  Heart,
  Smile,
  Frown,
  Meh,
  AlertCircle,
  Sparkles,
  User,
  Bot,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { streamTutorTurn, type TutorHistoryEntry } from '@/lib/chat/tutor-stream';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: string;
  sender: 'student' | 'agent' | 'teacher';
  text: string;
  agent?: string;
  agents_used?: string[];
  timestamp: string;
  isStreaming?: boolean;
}

interface EmotionalState {
  state: 'engaged' | 'frustrated' | 'confused' | 'confident' | 'neutral';
  confidence: number;
  indicators: string[];
}

interface MwalimuChatProps {
  studentId: string;
  studentName: string;
  subject?: string;
  grade?: string;
  language?: 'english' | 'kiswahili' | 'mixed';
  onEmotionalStateChange?: (state: EmotionalState) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MwalimuChat({
  studentId,
  studentName,
  subject = 'General',
  grade = 'Grade 5',
  language = 'english',
  onEmotionalStateChange,
  className,
}: MwalimuChatProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [emotionalState, setEmotionalState] = useState<EmotionalState>({
    state: 'neutral',
    confidence: 0.5,
    indicators: [],
  });
  const [wsConnected, setWsConnected] = useState(false);
  /**
   * Whether the tutor itself can answer. This is the same-origin `/api/chat`
   * route, not the WebSocket: the socket only pushes live teacher and agent
   * updates when a backend URL is configured, and conflating the two is what
   * left every learner on this screen staring at a "Connecting" spinner that
   * had nothing to do with their question.
   */
  const [tutorStatus, setTutorStatus] = useState<'live' | 'thinking' | 'offline'>('live');
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // ---------------------------------------------------------------------------
  // WebSocket connection for real-time updates
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // The socket is an enhancement, not the tutor: it carries teacher replies
    // and agent activity from the Rust MVP backend. Next.js rewrites do not
    // proxy WebSockets, so the old fallback built a `wss://<vercel-host>` URL
    // that no server ever answered — the browser retried every three seconds
    // for the life of the page. Without a configured backend there is nothing
    // to dial, and saying so is better than pretending to connect.
    const wsBase = process.env.NEXT_PUBLIC_BACKEND_WS_URL;
    if (!wsBase) return;

    const wsUrl = `${wsBase.replace(/\/$/, '')}/dashboard/ws/student/${studentId}`;

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[MwalimuChat] WebSocket connected');
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'student_message' && data.message?.student_id === studentId) {
              // Prevent duplicate messages by checking if ID already exists
              setMessages((prev) => {
                const exists = prev.some(msg => msg.id === data.message.id);
                if (exists) return prev;
                
                return [...prev, {
                  id: data.message.id,
                  sender: 'student',
                  text: data.message.text,
                  timestamp: data.message.timestamp,
                }];
              });
            }
            
            if (data.type === 'agent_response' && data.message?.student_id === studentId) {
              // Prevent duplicate messages by checking if ID already exists
              setMessages((prev) => {
                const exists = prev.some(msg => msg.id === data.message.id);
                if (exists) return prev;
                
                return [...prev, {
                  id: data.message.id,
                  sender: 'agent',
                  text: data.message.text,
                  agent: data.message.agent,
                  agents_used: data.message.agents_used || [],
                  timestamp: data.message.timestamp,
                }];
              });

              // Auto-speak if enabled
              if (autoSpeak) {
                speakText(data.message.text);
              }
            }

            if (data.type === 'teacher_message' && data.message?.student_id === studentId) {
              // Prevent duplicate messages by checking if ID already exists
              setMessages((prev) => {
                const exists = prev.some(msg => msg.id === data.message.id);
                if (exists) return prev;
                
                return [...prev, {
                  id: data.message.id,
                  sender: 'teacher',
                  text: data.message.text,
                  timestamp: data.message.timestamp,
                }];
              });

              toast({
                title: 'Teacher Message',
                description: 'Your teacher sent you a message',
                duration: 3000,
              });
            }

            if (data.type === 'agent_activity' && data.student_id === studentId) {
              // Update emotional state based on agent activity
              updateEmotionalState(data);
            }
          } catch (err) {
            console.error('[MwalimuChat] Failed to parse WebSocket message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('[MwalimuChat] WebSocket error:', error);
          setWsConnected(false);
        };

        ws.onclose = () => {
          console.log('[MwalimuChat] WebSocket closed, reconnecting...');
          setWsConnected(false);
          setTimeout(connectWebSocket, 3000);
        };

        wsRef.current = ws;
      } catch (err) {
        console.error('[MwalimuChat] Failed to connect WebSocket:', err);
        setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [studentId, autoSpeak, toast]);

  // ---------------------------------------------------------------------------
  // Auto-scroll to bottom when new messages arrive
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ---------------------------------------------------------------------------
  // Emotional state detection
  // ---------------------------------------------------------------------------

  const updateEmotionalState = useCallback((data: any) => {
    // Simple heuristic based on agent activity
    const newState: EmotionalState = {
      state: 'neutral',
      confidence: 0.7,
      indicators: [],
    };

    if (data.agents_used?.includes('emotional_intelligence')) {
      newState.state = 'engaged';
      newState.indicators.push('Active participation');
    }

    if (data.response_time_ms > 5000) {
      newState.state = 'confused';
      newState.indicators.push('Long processing time');
    }

    setEmotionalState(newState);
    onEmotionalStateChange?.(newState);

    // Show toast for significant emotional changes
    if (newState.state === 'frustrated' || newState.state === 'confused') {
      toast({
        title: 'Mwalimu is adapting',
        description: `Adjusting teaching approach for ${newState.state} state`,
        duration: 2000,
      });
    }
  }, [onEmotionalStateChange, toast]);

  // ---------------------------------------------------------------------------
  // Send message
  // ---------------------------------------------------------------------------

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Temporary local ID
      sender: 'student',
      text,
      timestamp: new Date().toISOString(),
    };
    const replyId = `tutor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Only learner and tutor turns belong in the conversation the model sees.
    // A teacher's interjection is context for the human, not a turn to imitate.
    const history: TutorHistoryEntry[] = messages
      .filter((m) => m.sender !== 'teacher' && m.text.trim())
      .map((m) => ({
        role: m.sender === 'student' ? ('user' as const) : ('assistant' as const),
        content: m.text,
      }));

    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: replyId, sender: 'agent', text: '', timestamp: new Date().toISOString(), isStreaming: true },
    ]);
    setInputText('');
    setIsLoading(true);
    setTutorStatus('thinking');

    const result = await streamTutorTurn(
      {
        message: text,
        history,
        grade,
        subject,
        language,
        studentName,
        mode: 'socratic',
        ...(sessionId ? { sessionId } : {}),
      },
      (delta) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === replyId ? { ...m, text: m.text + delta } : m)),
        );
      },
    );

    if (result.sessionId && !sessionId) setSessionId(result.sessionId);

    const failed = Boolean(result.error) && !result.aborted;
    setTutorStatus(failed ? 'offline' : 'live');
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== replyId) return m;
        if (!failed) return { ...m, isStreaming: false };
        // Keep whatever did stream in: a tutor that stops halfway should show
        // the half answer plus the reason, not a blank bubble or a spinner.
        return {
          ...m,
          isStreaming: false,
          text: m.text || `I could not reach my lessons just now. ${result.error}`,
        };
      }),
    );

    if (failed) {
      toast({
        title: 'Mwalimu is unavailable',
        description: result.error ?? 'Please try again in a moment.',
        variant: 'destructive',
        duration: 4000,
      });
    } else if (autoSpeak && result.text) {
      speakText(result.text);
    }

    setIsLoading(false);
  };

  // ---------------------------------------------------------------------------
  // Voice input (Web Speech API)
  // ---------------------------------------------------------------------------

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        
        // For now, use Web Speech API for transcription
        // In production, send to backend for Whisper transcription
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.lang = language === 'kiswahili' ? 'sw-KE' : 'en-KE';
          recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInputText((prev) => prev + ' ' + transcript);
          };
          recognition.start();
        } else {
          toast({
            title: 'Voice input unavailable',
            description: 'Your browser does not support voice input',
            variant: 'destructive',
          });
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      toast({
        title: 'Recording...',
        description: 'Speak your question',
        duration: 1000,
      });
    } catch (err) {
      console.error('[MwalimuChat] Failed to start recording:', err);
      toast({
        title: 'Microphone access denied',
        description: 'Please allow microphone access to use voice input',
        variant: 'destructive',
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Text-to-speech
  // ---------------------------------------------------------------------------

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) {
      toast({
        title: 'Text-to-speech unavailable',
        description: 'Your browser does not support text-to-speech',
        variant: 'destructive',
      });
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'kiswahili' ? 'sw-KE' : 'en-KE';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // ---------------------------------------------------------------------------
  // File upload (images, documents)
  // ---------------------------------------------------------------------------

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // For now, just show a toast
    // In production, upload to backend and include in message
    toast({
      title: 'File upload',
      description: `${file.name} will be sent with your next message`,
      duration: 2000,
    });
  };

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------------

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ---------------------------------------------------------------------------
  // Emotional state icon
  // ---------------------------------------------------------------------------

  const getEmotionalIcon = () => {
    switch (emotionalState.state) {
      case 'engaged':
        return <Smile className="h-4 w-4 text-green-500" />;
      case 'frustrated':
        return <Frown className="h-4 w-4 text-red-500" />;
      case 'confused':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'confident':
        return <Sparkles className="h-4 w-4 text-blue-500" />;
      default:
        return <Meh className="h-4 w-4 text-gray-500" />;
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Card className={cn('flex flex-col h-[600px] max-h-[80vh]', className)}>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 bg-primary">
              <AvatarFallback>
                <Brain className="h-5 w-5 text-primary-foreground" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">Mwalimu AI Tutor</CardTitle>
              <p className="text-sm text-muted-foreground">
                {subject} • {grade}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={tutorStatus === 'offline' ? 'destructive' : 'default'} className="gap-1">
              {tutorStatus === 'thinking' ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Thinking
                </>
              ) : tutorStatus === 'offline' ? (
                <>
                  <AlertCircle className="h-3 w-3" />
                  Unavailable
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Live
                </>
              )}
            </Badge>
            {process.env.NEXT_PUBLIC_BACKEND_WS_URL && !wsConnected && (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Teacher link
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              {getEmotionalIcon()}
              {emotionalState.state}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Welcome, {studentName}!</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  I'm Mwalimu, your AI tutor. Ask me anything about {subject} and I'll help you learn!
                </p>
              </div>
            )}

            {messages.map((msg) => (
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
                        <Bot className="h-4 w-4 text-primary-foreground" />
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
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                      : 'bg-muted'
                  )}
                >
                  {msg.sender === 'teacher' && (
                    <div className="flex items-center gap-1 mb-1">
                      <User className="h-3 w-3" />
                      <span className="text-xs font-semibold">Teacher</span>
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
                  {msg.sender !== 'student' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 mt-1"
                      onClick={() => speakText(msg.text)}
                      disabled={isSpeaking}
                    >
                      <Volume2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {msg.sender === 'student' && (
                  <Avatar className="h-8 w-8 bg-secondary">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <Avatar className="h-8 w-8 bg-primary">
                  <AvatarFallback>
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* Input area */}
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleRecording}
              disabled={isLoading}
              className={cn(isRecording && 'bg-red-100 dark:bg-red-900')}
            >
              {isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>

            <label htmlFor="file-upload">
              <Button
                variant="outline"
                size="icon"
                disabled={isLoading}
                asChild
              >
                <span>
                  <Paperclip className="h-4 w-4" />
                </span>
              </Button>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileUpload}
              />
            </label>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setAutoSpeak(!autoSpeak)}
              disabled={isLoading}
              className={cn(autoSpeak && 'bg-green-100 dark:bg-green-900')}
            >
              {autoSpeak ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>

            <Textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Mwalimu anything..."
              className="min-h-[60px] max-h-[120px] resize-none"
              disabled={isLoading}
            />

            <Button
              onClick={sendMessage}
              disabled={!inputText.trim() || isLoading}
              size="icon"
              className="h-[60px] w-[60px]"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
