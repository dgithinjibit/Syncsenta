
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const ChatInterface = dynamic(() => import('../chat-interface'), {
    ssr: false,
    loading: () => <ChatSkeleton />
});

const ChatSkeleton = () => (
    <div className="flex h-full w-full items-center justify-center bg-[#F5F5DC]">
         <div className="w-full h-full flex flex-col shadow-2xl bg-white/50 border-stone-200">
            <Skeleton className="h-32 w-full border-b border-stone-200" />
            <div className="flex-1 p-6 space-y-4">
                <Skeleton className="h-16 w-3/4" />
                <div className="flex justify-end">
                    <Skeleton className="h-12 w-1/2" />
                </div>
                <Skeleton className="h-24 w-4/5" />
            </div>
            <Skeleton className="h-20 w-full border-t border-stone-200" />
        </div>
    </div>
);


export default function StudentChatPage() {
    const router = useRouter();
    const params = useParams();
    
    const [chatParams, setChatParams] = useState<{
        subject: string;
        grade: string;
    } | null>(null);

    useEffect(() => {
        const subject = decodeURIComponent((params.subject as string) || 'General');
        const grade = localStorage.getItem('studentGrade') || 'g4';
        
        setChatParams({
            subject,
            grade,
        });

    }, [params.subject]);

    const handleBack = () => {
        router.push('/student/journey?step=subject');
    };

    if (!chatParams) {
        return <ChatSkeleton />;
    }

    return (
        <div className="flex flex-col w-full h-screen sm:h-[95vh] max-w-4xl mx-auto overflow-hidden">
            <Suspense fallback={<ChatSkeleton />}>
                <ChatInterface 
                    subject={chatParams.subject}
                    grade={chatParams.grade}
                    onBack={handleBack}
                />
            </Suspense>
        </div>
    );
}
