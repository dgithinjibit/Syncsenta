

"use client";

import { useState, useEffect, useRef, Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { MwalimuAiTutorInput, MwalimuAiTutorOutput } from '@/ai/flows/mwalimu-ai-types';
import type { ClassroomCompassInput, ClassroomCompassOutput } from '@/ai/flows/classroom-compass-types';

async function mwalimuAiTutor(input: MwalimuAiTutorInput): Promise<MwalimuAiTutorOutput> {
    const res = await fetch('/api/mwalimu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`Mwalimu API error: ${res.status}`);
    return res.json();
}

type MwalimuStreamHandlers = {
    onChunk: (text: string) => void;
    onReplace: (text: string) => void;
};

async function streamMwalimu(
    input: MwalimuAiTutorInput,
    handlers: MwalimuStreamHandlers,
): Promise<MwalimuAiTutorOutput> {
    const res = await fetch('/api/mwalimu?stream=1', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
        },
        body: JSON.stringify(input),
    });
    if (!res.ok || !res.body) throw new Error(`Mwalimu stream error: ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalText = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
            const lines = frame.split('\n');
            let event = 'message';
            let data = '';
            for (const line of lines) {
                if (line.startsWith('event:')) event = line.slice(6).trim();
                else if (line.startsWith('data:')) data += line.slice(5).trim();
            }
            if (!data) continue;
            let payload: any;
            try { payload = JSON.parse(data); } catch { continue; }
            if (event === 'chunk' && typeof payload.content === 'string') {
                finalText += payload.content;
                handlers.onChunk(payload.content);
            } else if (event === 'replace' && typeof payload.content === 'string') {
                finalText = payload.content;
                handlers.onReplace(payload.content);
            } else if (event === 'error') {
                throw new Error(payload.message || 'stream error');
            }
        }
    }

    return { response: finalText };
}

async function classroomCompass(input: ClassroomCompassInput): Promise<ClassroomCompassOutput> {
    const res = await fetch('/api/classroom-compass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`Compass API error: ${res.status}`);
    return res.json();
}

async function gikuyuAgent(input: { grade: string; currentMessage: string; history: Array<{ role: string; content: string }> }): Promise<MwalimuAiTutorOutput> {
    const res = await fetch('/api/gikuyu-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`Gikuyu Agent API error: ${res.status}`);
    return res.json();
}
import { Loader2, Send, Video, Mic, Bot } from 'lucide-react';
import { StudentHeader } from '@/components/layout/student-header';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { InteractiveQuizModal } from '@/components/quiz/interactive-quiz-modal';
import { QuizTrigger } from '@/lib/quiz-trigger';
import type { QuizQuestion, QuizCompletionResult } from '@/types/curriculum';
import { getSocraticGuidanceStage } from '@/lib/socratic-guidance';
import { SocraticPromptPanel } from '@/components/tutor-dashboard/socratic-prompt-panel';

type Message = {
    role: 'user' | 'model';
    content: string;
    audio?: string;
};

interface ChatInterfaceProps {
    subject: string;
    grade: string;
    onBack: () => void;
    teacherContext?: string;
    roomId?: string;
}

export default function ChatInterface({ subject, grade, onBack, teacherContext, roomId }: ChatInterfaceProps) {
    const gradeName = `Grade ${grade.replace('g', '')}`
    const router = useRouter();
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [tutorMode, setTutorMode] = useState<'compass' | 'mwalimu'>('mwalimu');
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [studentFirstName, setStudentFirstName] = useState('Student');
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any | null>(null);
    const [choices, setChoices] = useState<string[]>([]);
    const [chatTokens, setChatTokens] = useState(100);
    const [studentId, setStudentId] = useState<string | null>(null);
    
    // Quiz state
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
    const [currentTopic, setCurrentTopic] = useState('General');
    const socraticStage = getSocraticGuidanceStage({
        currentMessage: input || messages.filter((message) => message.role === 'user').at(-1)?.content || '',
        history: messages,
    });

     useEffect(() => {
        const name = localStorage.getItem('studentName');
        if (name) {
            setStudentFirstName(name.split(' ')[0]);
        }
        const auth = getAuth(app);
        const user = auth.currentUser;
        if (user) {
            setStudentId(user.uid);
        }
    }, []);

    const parseResponse = (text: string) => {
        const choiceRegex = /\[CHOICE: (.*?)\]/g;
        const newChoices = [];
        let match;
        while ((match = choiceRegex.exec(text)) !== null) {
            newChoices.push(match[1]);
        }

        const cleanText = text.replace(choiceRegex, '').trim();
        setChoices(newChoices);
        return cleanText;
    };

    const processAndSetMessage = (role: 'model', response: { response: string, audioResponse?: string }) => {
        const cleanText = parseResponse(response.response);
        setMessages(prev => [...prev, { role, content: cleanText, audio: response.audioResponse }]);
    }

    useEffect(() => {
        // Initialize SpeechRecognition only on the client
        if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            const speechWindow = window as typeof window & {
                SpeechRecognition?: new () => any;
                webkitSpeechRecognition?: new () => any;
            };
            const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
            if (!SpeechRecognition) return;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                setInput(input + finalTranscript + interimTranscript);
            };

            recognitionRef.current.onerror = (event: any) => {
                if (event.error !== 'no-speech' && event.error !== 'aborted') {
                    console.error("Speech recognition error", event.error);
                }
                setIsListening(false);
            };
            
            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, [input]);


    const handleToggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };


    useEffect(() => {
        // This effect now only sets the initial greeting in the UI, without calling the AI.
        if (teacherContext) {
            setTutorMode('compass');
            setMessages([{ role: 'model', content: "Welcome, Explorer! Your teacher has charted a learning journey just for your class. What expedition shall we embark on today?" }]);
        } else if (subject.toLowerCase().includes('indigenous') || subject.toLowerCase().includes('kikuyu') || subject.toLowerCase().includes('gikuyu')) {
            setTutorMode('mwalimu'); // Keep same mode but will route to Gikuyu agent
            setMessages([{ role: 'model', content: `**Wĩ mwega!**\n\n*Hello!*\n\nI'm so excited to learn Gikuyu with you! It's such a beautiful language.\n\n*Did you know?* Gikuyu is spoken by the Agĩkũyũ people of Kenya and is one of our precious indigenous languages.\n\nWhat shall we learn today? Just ask me about:\n• Greetings (ũhoro) - Say hello like a local!\n• Numbers (namba) - Count in Gikuyu\n• Animals (nyamũ) - Name your favorite animals\n• Family (bamiri) - Talk about your family\n\nOr just chat with me in Gikuyu if you already know some words!` }]);
        } else {
            setTutorMode('mwalimu');
            setMessages([{ role: 'model', content: `Jambo! I am Mwalimu AI. We can explore ${subject} for ${gradeName} together. What topic are you most curious about?` }]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [grade, subject, teacherContext, gradeName]);
    
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
        
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'model' && lastMessage.audio && audioRef.current) {
             // Only play if the src is different, preventing interruption of the same audio
            if (audioRef.current.src !== lastMessage.audio) {
                audioRef.current.src = lastMessage.audio;
                audioRef.current.play().catch(e => console.error("Audio autoplay failed:", e));
            }
        }

    }, [messages]);

    const handleJoinVideoCall = () => {
        if (roomId) {
            router.push(`/dashboard/learning-lab/${roomId}/meet`);
        }
    };
    
    const handleChoiceClick = (choice: string) => {
        handleSubmit(undefined, choice);
    }

    const handleSocraticPrompt = (prompt: string) => {
        setChoices([]);
        setInput(prompt);
    };
    
    const checkQuizTrigger = async (conversationHistory: Message[], lastMessage: string) => {
        // Skip quiz trigger for Indigenous Language (Gikuyu) - focus on language learning
        if (subject.toLowerCase().includes('indigenous') || 
            subject.toLowerCase().includes('kikuyu') || 
            subject.toLowerCase().includes('gikuyu')) {
            return;
        }
        
        // Skip if in Classroom Compass mode
        if (tutorMode === 'compass') {
            return;
        }
        
        if (!studentId) return;
        
        // Extract current topic from conversation
        const topic = QuizTrigger.extractCurrentTopic(conversationHistory);
        setCurrentTopic(topic);
        
        // Check if quiz should be triggered
        const shouldTrigger = QuizTrigger.shouldTriggerQuiz({
            conversationHistory,
            currentTopic: topic,
            grade,
            subject,
            studentId,
        });
        
        if (shouldTrigger) {
            // Generate quiz
            try {
                const quizParams = QuizTrigger.extractQuizParams({
                    conversationHistory,
                    currentTopic: topic,
                    grade,
                    subject,
                    studentId,
                });
                
                const response = await fetch('/api/v1/quiz/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(quizParams),
                });
                
                if (response.ok) {
                    const { questions } = await response.json();
                    setQuizQuestions(questions);
                    setShowQuizModal(true);
                    QuizTrigger.recordQuizTrigger(studentId);
                    
                    // Add trigger message to chat
                    const triggerMessage = QuizTrigger.generateTriggerMessage(topic);
                    setMessages(prev => [...prev, { role: 'model', content: triggerMessage }]);
                }
            } catch (error) {
                console.error('Error generating quiz:', error);
            }
        }
    };
    
    const handleQuizComplete = (result: QuizCompletionResult) => {
        // Add completion message to chat
        const completionMessage = `Great job! You scored ${Math.round(result.feedback.overallScore)}% (${result.feedback.masteryLevel}). ${result.feedback.feedbackText}`;
        setMessages(prev => [...prev, { role: 'model', content: completionMessage }]);
        
        // Close modal
        setShowQuizModal(false);
    };

    const handleSubmit = async (e?: React.FormEvent, choice?: string) => {
        e?.preventDefault();
        const currentMessage = choice || input;
        if (!currentMessage.trim() || loading) return;

        const userMessage: Message = { role: 'user', content: currentMessage };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages); // Show user message immediately
        setInput('');
        setLoading(true);
        setChoices([]); // Clear choices after user makes one
        setChatTokens(prev => Math.max(0, prev - 1)); // Decrement token

        try {
            let result;
            const historyForAI = newMessages.map(({ role, content }) => ({ role, content }));
            const studentName = localStorage.getItem('studentName') || 'Unknown Student';
            const teacherId = 'usr_3'; // Hardcoded for prototype

            if (tutorMode === 'compass' && teacherContext) {
                 const compassResult = await classroomCompass({
                    teacherContext,
                    history: historyForAI,
                });
                result = {response: compassResult.response, audioResponse: undefined};
            } else if (subject.toLowerCase().includes('indigenous') || subject.toLowerCase().includes('kikuyu') || subject.toLowerCase().includes('gikuyu')) {
                // Route to Gikuyu Language Agent for Indigenous Language
                result = await gikuyuAgent({
                    grade,
                    currentMessage: currentMessage,
                    history: historyForAI
                });
            } else {
                // Streaming path: insert an empty model message and append tokens live.
                const placeholderIndex = newMessages.length;
                setMessages(prev => [...prev, { role: 'model', content: '' }]);

                const appendChunk = (chunk: string) => {
                    setMessages(prev => {
                        const next = [...prev];
                        const target = next[placeholderIndex];
                        if (target && target.role === 'model') {
                            next[placeholderIndex] = { ...target, content: (target.content || '') + chunk };
                        }
                        return next;
                    });
                };
                const replaceContent = (text: string) => {
                    setMessages(prev => {
                        const next = [...prev];
                        const target = next[placeholderIndex];
                        if (target && target.role === 'model') {
                            next[placeholderIndex] = { ...target, content: text };
                        }
                        return next;
                    });
                };

                const streamed = await streamMwalimu({
                    grade,
                    subject,
                    studentName,
                    studentId: studentId ?? undefined,
                    teacherId,
                    currentMessage: currentMessage,
                    history: historyForAI,
                }, { onChunk: appendChunk, onReplace: replaceContent });

                // Run the choice parser against the final aggregated text and clean it up.
                const cleanText = parseResponse(streamed.response);
                replaceContent(cleanText);

                checkQuizTrigger(newMessages, currentMessage);
                return;
            }
            processAndSetMessage('model', result);
            
            // Check if quiz should be triggered
            checkQuizTrigger(newMessages, currentMessage);
        } catch (error) {
            console.error("Error calling AI tutor:", error);
            setMessages([...newMessages, { role: 'model', content: "I'm sorry, I encountered an error. Could you please rephrase your question?" }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-full w-full items-center justify-center bg-transparent">
            <Card className="w-full h-full flex flex-col shadow-none bg-transparent border-none">
                <CardHeader className='border-b border-border'>
                     <StudentHeader 
                        showBackButton={!!onBack} 
                        onBack={onBack!} 
                        showVideoCallButton={tutorMode === 'compass'}
                        onJoinVideoCall={handleJoinVideoCall}
                     />
                     <div className="text-center pt-2">
                        <CardTitle className="font-headline text-2xl text-foreground">
                            {tutorMode === 'compass' ? 'Classroom Compass' : `Mwalimu AI: ${subject}`} ({gradeName})
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full" ref={scrollAreaRef}>
                        <div className="p-6 space-y-4">
                             <SocraticPromptPanel
                                stage={socraticStage}
                                subject={subject}
                                disabled={loading || choices.length > 0 || chatTokens <= 0}
                                onPrompt={handleSocraticPrompt}
                             />
                             {messages.length === 0 && loading && (
                                <div className="flex justify-start">
                                    <div className="max-w-[75%] p-3 rounded-lg bg-muted flex items-center">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    </div>
                                </div>
                            )}
                            {messages.map((message, index) => (
                                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%] p-3 rounded-lg ${message.role === 'user' ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'}`}>
                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                    </div>
                                </div>
                            ))}
                            {loading && messages.length > 0 && (
                                <div className="flex justify-start">
                                    <div className="max-w-[75%] p-3 rounded-lg bg-muted flex items-center">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    </div>
                                </div>
                            )}
                             {choices.length > 0 && !loading && (
                                <div className="flex justify-start">
                                    <div className="flex flex-col items-start gap-2">
                                        {choices.map((choice, index) => (
                                            <Button 
                                                key={index}
                                                variant="outline"
                                                className="bg-background"
                                                onClick={() => handleChoiceClick(choice)}
                                            >
                                                {choice}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="p-4 border-t border-border">
                    <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
                        <div className="flex-1 relative">
                            <Input
                                id="message"
                                placeholder={chatTokens > 0 ? "Ask a question..." : "You are out of tokens."}
                                className="flex-1 bg-background border-input focus:border-primary focus:ring-primary pr-20"
                                autoComplete="off"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={loading || choices.length > 0 || chatTokens <= 0}
                            />
                             <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                                <Bot className="w-4 h-4" />
                                <span>{chatTokens}</span>
                            </div>
                        </div>
                         <Button type="button" size="icon" variant={isListening ? 'destructive' : 'outline'} onClick={handleToggleListening} disabled={loading || chatTokens <= 0}>
                            <Mic className="h-4 w-4" />
                            <span className="sr-only">Toggle Microphone</span>
                        </Button>
                        <Button type="submit" size="icon" disabled={loading || !input.trim() || choices.length > 0 || chatTokens <= 0} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            <Send className="h-4 w-4" />
                            <span className="sr-only">Send</span>
                        </Button>
                    </form>
                </CardFooter>
            </Card>
            <audio ref={audioRef} className="hidden" />
            
            {/* Interactive Quiz Modal */}
            <InteractiveQuizModal
                open={showQuizModal}
                onOpenChange={setShowQuizModal}
                questions={quizQuestions}
                studentId={studentId || ''}
                context={{
                    grade,
                    subject,
                    currentTopic,
                }}
                onComplete={handleQuizComplete}
            />
        </div>
    );
}
