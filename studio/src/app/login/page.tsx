"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to role selection since we've stripped OAuth
        router.replace('/signup');
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-sm text-center p-8">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">SyncSenta</CardTitle>
                    <CardDescription>Redirecting to role selection...</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Loader2 className="animate-spin h-8 w-8 text-primary" />
                </CardContent>
            </Card>
        </div>
    );
}
