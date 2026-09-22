
"use client";

import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { ArrowRight, BrainCircuit, KeyRound, Link as LinkIcon, Loader2, Award, BookOpen, CheckCircle } from 'lucide-react';
import { StudentHeader } from '@/components/layout/student-header';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { TeacherResource } from '@/lib/types';
import { levels, subLevelsMap, gradesMap, subjectsMap, Step, recommendedSubjects } from '@/lib/journey-data';
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, storage } from '@/lib/firebase';
import { ref, getBytes } from 'firebase/storage';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';


const ChatInterface = dynamic(() => import('../chat/chat-interface'), {
    ssr: false,
    loading: () => <ChatSkeleton />
});

const ChatSkeleton = () => (
    <div className="flex h-full w-full items-center justify-center bg-muted">
         <div className="w-full h-full flex flex-col shadow-2xl bg-card/50 border-border">
            <Skeleton className="h-32 w-full border-b border-border" />
            <div className="flex-1 p-6 space-y-4">
                <Skeleton className="h-16 w-3/4" />
                <div className="flex justify-end">
                    <Skeleton className="h-12 w-1/2" />
                </div>
                <Skeleton className="h-24 w-4/5" />
            </div>
            <Skeleton className="h-20 w-full border-t border-border" />
        </div>
    </div>
);

const journeySteps: { id: Step; name: string }[] = [
    { id: 'level', name: 'Level' },
    { id: 'sub-level', name: 'Sub-Level' },
    { id: 'grade', name: 'Grade' },
    { id: 'subject', name: 'Subject' },
];

const JourneyProgressBar = ({ currentStep }: { currentStep: Step }) => {
    const currentIndex = journeySteps.findIndex(step => step.id === currentStep);

    if (currentStep === 'start' || currentIndex === -1) {
        return null;
    }

    return (
        <div className="w-full px-6 py-3">
            <div className="flex items-center">
                {journeySteps.map((step, index) => (
                    <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center">
                            <div
                                className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                                    index < currentIndex && "bg-green-500 text-white",
                                    index === currentIndex && "bg-primary text-primary-foreground scale-110 ring-4 ring-primary/30",
                                    index > currentIndex && "bg-muted border-2"
                                )}
                            >
                                {index < currentIndex ? <CheckCircle className="w-5 h-5" /> : index + 1}
                            </div>
                            <p className={cn("text-xs mt-2 text-muted-foreground", index <= currentIndex && "font-semibold text-foreground")}>
                                {step.name}
                            </p>
                        </div>
                        {index < journeySteps.length - 1 && (
                            <div className={cn(
                                "flex-1 h-1 transition-colors duration-500 -mt-6",
                                index < currentIndex ? "bg-green-500" : "bg-muted"
                            )} />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};


function StudentJourneyContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
    const [selectedSubLevel, setSelectedSubLevel] = useState<string | null>(null);
    const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
    const [teacherCode, setTeacherCode] = useState('');
    const [isSubmittingCode, setIsSubmittingCode] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    const [tutorContext, setTutorContext] = useState<string | null>(null);
    const [tutorRoomId, setTutorRoomId] = useState<string | null>(null);
    
    const [stepHistory, setStepHistory] = useState<Step[]>(['start']);

    const currentStep = stepHistory[stepHistory.length - 1];

    useEffect(() => {
        setIsMounted(true);
        const initialStepFromParams = (searchParams.get('step') as Step) || 'start';
        const grade = localStorage.getItem('studentGrade');
        
        if (initialStepFromParams === 'subject' && grade) {
            const subLevel = Object.keys(gradesMap).find(key => gradesMap[key].some(g => g.id === grade));
            const level = subLevel ? Object.keys(subLevelsMap).find(key => subLevelsMap[key].some(sl => sl.id === subLevel)) : null;

            if (level && subLevel) {
                 setSelectedLevel(level);
                 setSelectedSubLevel(subLevel);
                 setSelectedGrade(grade);
                 setStepHistory(['start', 'level', 'sub-level', 'grade', 'subject']);
            }
        } else {
             setStepHistory([initialStepFromParams]);
        }
    }, [searchParams]);
    
    const navigateTo = (newStep: Step) => {
        setStepHistory(prev => [...prev, newStep]);
    };

    const handleGoBack = useCallback(() => {
        // If we're on subject selection and came from dashboard, go back to dashboard
        if (currentStep === 'subject' && searchParams.get('step') === 'subject') {
            router.push('/student');
        } else if (stepHistory.length > 1) {
            setStepHistory(prev => prev.slice(0, -1));
        } else {
            router.push('/');
        }
    }, [currentStep, stepHistory.length, router, searchParams]);
    
     const handleCompassBack = () => {
        setTutorContext(null);
        setTutorRoomId(null);
        setStepHistory(['start']);
    };


    const handleLevelSelect = useCallback((levelId: string) => {
        setSelectedLevel(levelId);
        navigateTo(subLevelsMap[levelId]?.length > 0 ? 'sub-level' : 'grade');
    }, []);
    
    const handleSubLevelSelect = useCallback((subLevelId: string) => {
        setSelectedSubLevel(subLevelId);
        navigateTo('grade');
    }, []);

    const handleGradeSelect = useCallback((gradeId: string) => {
        setSelectedGrade(gradeId);
        localStorage.setItem('studentGrade', gradeId);
        // After selecting grade, go to dashboard instead of subject selection
        router.push('/student');
    }, [router]);

    const handleTeacherCodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teacherCode.trim()) return;

        setIsSubmittingCode(true);

        try {
            const q = query(collection(db, "teacherResources"), where("joinCode", "==", teacherCode.trim().toUpperCase()));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                const tutorContextResource = doc.data() as TeacherResource;
                
                if (!tutorContextResource.url) {
                     throw new Error('Resource URL is missing.');
                }

                const storageUrl = new URL(tutorContextResource.url);
                const storagePath = decodeURIComponent(storageUrl.pathname.split('/').slice(3).join('/'));
                const storageRef = ref(storage, storagePath);

                const bytes = await getBytes(storageRef);
                const contextText = new TextDecoder().decode(bytes);
                
                toast({
                    title: "Teacher's Room Found!",
                    description: "Launching the Classroom Compass. Your AI guide is ready.",
                });

                setTutorContext(contextText);
                setTutorRoomId(tutorContextResource.joinCode);
                
            } else {
                toast({
                    variant: 'destructive',
                    title: "Invalid Code",
                    description: "The code you entered does not match any AI Tutor room. Please check the code and try again.",
                });
            }
        } catch (error) {
             toast({
                variant: 'destructive',
                title: "Error Loading Room",
                description: "Could not load the teacher's materials. Please try again.",
            });
            console.error("Error handling teacher code:", error);
        } finally {
            setIsSubmittingCode(false);
        }
    }
    
    if (!isMounted) {
        return <ChatSkeleton />;
    }

    if (tutorContext) {
        return (
             <div className="flex flex-col w-full h-screen sm:h-[90vh] max-w-5xl mx-auto overflow-hidden bg-card sm:rounded-2xl shadow-2xl ring-1 ring-border">
                <Suspense fallback={<ChatSkeleton />}>
                    <ChatInterface 
                        subject="Teacher's Context"
                        grade={localStorage.getItem('studentGrade') || 'g4'}
                        roomId={tutorRoomId!}
                        onBack={handleCompassBack}
                        teacherContext={tutorContext}
                    />
                </Suspense>
             </div>
        )
    }

    const renderContent = () => {
        switch (currentStep) {
            case 'start':
                return (
                     <Card className="w-full bg-transparent border-none shadow-none">
                        <CardHeader className="text-center">
                            <CardTitle className="text-3xl">Welcome, Student!</CardTitle>
                            <CardDescription className="text-lg">How would you like to start your learning journey today?</CardDescription>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                           <Card className="p-8 flex flex-col items-center justify-center text-center hover:shadow-xl transition-all border-2 hover:border-primary">
                                <KeyRound className="w-16 h-16 text-primary mb-4" />
                                <h3 className="font-bold text-2xl mb-3">I Have a Teacher Code</h3>
                                <p className="text-muted-foreground mb-6">Enter a code from your teacher to join their classroom and start a guided lesson with the Classroom Compass.</p>
                                <form onSubmit={handleTeacherCodeSubmit} className="w-full flex items-center gap-2">
                                    <Input 
                                        placeholder="ENTER CODE" 
                                        value={teacherCode} 
                                        onChange={(e) => setTeacherCode(e.target.value.toUpperCase())} 
                                        disabled={isSubmittingCode}
                                        maxLength={7}
                                        className="uppercase tracking-widest font-mono text-center text-lg h-12"
                                    />
                                    <Button type="submit" size="lg" disabled={isSubmittingCode || teacherCode.length < 6} className="h-12">
                                        {isSubmittingCode ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                                    </Button>
                                </form>
                           </Card>
                            <Card className="p-8 flex flex-col items-center justify-center text-center hover:shadow-xl transition-all cursor-pointer border-2 hover:border-accent" onClick={() => navigateTo('level')}>
                                <BrainCircuit className="w-16 h-16 text-accent mb-4" />
                                <h3 className="font-bold text-2xl mb-3">Explore on My Own</h3>
                                <p className="text-muted-foreground mb-6">Choose your grade level and subject to chat with Mwalimu AI, your personal Socratic tutor powered by CBC curriculum.</p>
                                <Button size="lg" className="w-full text-lg h-12">
                                    Start Exploring
                                    <ArrowRight className="ml-2" />
                                </Button>
                           </Card>
                        </CardContent>
                    </Card>
                );
            case 'subject':
                 const coreSubjects = selectedGrade ? (subjectsMap[selectedGrade] || []) : [];
                 const gradeName = selectedGrade ? `Grade ${selectedGrade.replace('g', '')}` : '';
                return (
                    <Card className="w-full bg-transparent border-none shadow-none">
                         <CardHeader>
                            <CardTitle>Choose Your Subject</CardTitle>
                            <CardDescription>What would you like to learn about today in {gradeName}?</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div>
                                <h3 className="text-xl font-semibold mb-4">Core Subjects</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {coreSubjects.map((subject) => (
                                        <Link key={subject.name} href={`/student/chat/${encodeURIComponent(subject.name)}`} passHref>
                                            <Card className="group relative overflow-hidden rounded-lg cursor-pointer transition-all hover:shadow-lg aspect-[4/3]">
                                                <Image 
                                                    src={subject.icon} 
                                                    alt={`${subject.name} icon`} 
                                                    fill
                                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                                                />
                                                <div className="absolute inset-0 flex items-end p-4 bg-gradient-to-t from-black/70 to-transparent">
                                                    <h3 className="font-bold text-white text-lg">{subject.name}</h3>
                                                </div>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-4">Recommended Courses for You</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                     {recommendedSubjects.map((subject) => (
                                        <Link key={subject.name} href={`/student/chat/${encodeURIComponent(subject.name)}`} passHref>
                                            <Card className="group relative overflow-hidden rounded-lg cursor-pointer transition-all hover:shadow-lg aspect-[16/9]">
                                                <Image 
                                                    src={subject.icon} 
                                                    alt={`${subject.name} icon`} 
                                                    fill
                                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/60">
                                                    <h3 className="font-bold text-white text-2xl text-center">{subject.name}</h3>
                                                </div>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            case 'grade':
                const grades = selectedSubLevel ? gradesMap[selectedSubLevel] : [];
                return (
                    <Card className="w-full bg-transparent border-none shadow-none">
                        <CardHeader>
                            <CardTitle>Pick Your Grade</CardTitle>
                            <CardDescription>Almost there! Which grade are you in?</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {grades.map((grade, index) => (
                                <Button 
                                    key={grade.id} 
                                    className={`h-20 text-lg font-bold text-shadow-sm shadow-lg transform transition-transform hover:scale-105 focus:scale-105 bg-blue-500 hover:bg-blue-600 text-white`}
                                    onClick={() => handleGradeSelect(grade.id)}
                                >
                                    {grade.name}
                                </Button>
                            ))}
                        </CardContent>
                    </Card>
                );
            case 'sub-level':
                const subLevels = selectedLevel ? subLevelsMap[selectedLevel] : [];
                return (
                     <Card className="w-full bg-transparent border-none shadow-none">
                        <CardHeader>
                             <CardTitle>Narrow It Down</CardTitle>
                             <CardDescription>Let's get more specific.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {subLevels.map((sub, index) => (
                                <Button 
                                    key={sub.id} 
                                    className={`w-full justify-between h-14 text-lg font-bold shadow-md transform transition-transform hover:scale-105 focus-scale-105 bg-green-500 hover:bg-green-600 text-white`}
                                    onClick={() => handleSubLevelSelect(sub.id)}
                                >
                                    {sub.name}
                                    <ArrowRight />
                                </Button>
                            ))}
                        </CardContent>
                    </Card>
                );
            case 'level':
            default:
                return (
                    <Card className="w-full bg-transparent border-none shadow-none">
                        <CardHeader>
                            <CardTitle>Choose Your Education Level</CardTitle>
                            <CardDescription>Where are you in your learning journey?</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {levels.map((level, index) => (
                                <Button 
                                    key={level.id} 
                                    className={`w-full justify-between h-14 text-lg font-bold shadow-md transform transition-transform hover:scale-105 focus-scale-105 bg-teal-500 hover:bg-teal-600 text-white`}
                                    onClick={() => handleLevelSelect(level.id)}
                                >
                                    {level.name}
                                    <ArrowRight />
                                </Button>
                            ))}
                        </CardContent>
                    </Card>
                );
        }
    };
    
    return (
        <div className="flex flex-col w-full h-screen sm:h-[90vh] max-w-5xl mx-auto overflow-hidden bg-card sm:rounded-2xl shadow-2xl ring-1 ring-border">
             <StudentHeader showBackButton={currentStep !== 'start'} onBack={handleGoBack} />
             {currentStep !== 'start' && <JourneyProgressBar currentStep={currentStep} />}
            <main className="flex-grow overflow-y-auto p-6 flex items-center">
                {renderContent()}
            </main>
        </div>
    );
}

export default function StudentJourneyPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <StudentJourneyContent />
        </Suspense>
    )
}
