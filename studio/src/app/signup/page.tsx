"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Shield, UserCog, Building, ArrowLeft, Loader2 } from "lucide-react";
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

type Role = 'student' | 'teacher' | 'school_head' | 'county_officer';

const roles = [
    { type: 'student' as Role, title: 'I am a Student', icon: User, description: 'Join your teacher’s learning room and start your journey.' },
    { type: 'teacher' as Role, title: 'I am a Teacher', icon: Shield, description: 'Create resources and manage your classes with AI assistance.' },
    { type: 'school_head' as Role, title: 'I am a School Head', icon: UserCog, description: 'Oversee school operations and get strategic insights.' },
    { type: 'county_officer' as Role, title: 'I am a County Officer', icon: Building, description: 'Monitor county-wide educational progress and manage resources.' },
];

export default function SignupPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isMounted, setIsMounted] = useState(false);
    const [loadingRole, setLoadingRole] = useState<Role | null>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleRoleSelect = async (role: Role) => {
        setLoadingRole(role);
        
        // Default names for demo mode
        const names = {
            student: 'Demo Student',
            teacher: 'Mwalimu Demo',
            school_head: 'Headteacher Demo',
            county_officer: 'Officer Demo'
        };

        try {
            const response = await fetch('/api/set-auth-cookie', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role, name: names[role] }),
            });

            if (response.ok) {
                localStorage.setItem('userName', names[role]);
                localStorage.setItem('userRole', role);
                
                toast({
                    title: `Welcome, ${names[role]}`,
                    description: "Redirecting to your dashboard...",
                });

                if (role === 'student') {
                    router.push('/student/journey');
                } else {
                    router.push('/dashboard');
                }
            } else {
                throw new Error("Failed to set session.");
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not start session. Please try again.",
            });
            setLoadingRole(null);
        }
    };

    if (!isMounted) {
        return null;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <main className="flex-grow flex items-center justify-center p-4">
                <Card className="w-full max-w-4xl relative">
                    <Link href="/" passHref>
                        <Button variant="ghost" size="icon" className="absolute top-3 left-3">
                            <ArrowLeft className="h-5 w-5" />
                            <span className="sr-only">Back to Home</span>
                        </Button>
                    </Link>
                    <CardHeader className="text-center pt-12">
                        <CardTitle className="font-headline text-2xl">Choose Your Role</CardTitle>
                        <CardDescription>Select a role to enter the SyncSenta platform immediately.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {roles.map((role) => {
                            const Icon = role.icon;
                            const isLoading = loadingRole === role.type;
                            return (
                                <Card key={role.type} className="flex flex-col items-center text-center p-4 hover:shadow-lg hover:border-primary transition-all">
                                    <CardHeader>
                                        <div className="mx-auto bg-primary/10 p-3 rounded-full">
                                          <Icon className="w-8 h-8 text-primary" />
                                        </div>
                                        <CardTitle className="mt-4 text-lg">{role.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <p className="text-sm text-muted-foreground">{role.description}</p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button 
                                            onClick={() => handleRoleSelect(role.type)} 
                                            className="w-full"
                                            disabled={!!loadingRole}
                                        >
                                            {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                                            Enter as {role.type.split('_').join(' ')}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </CardContent>
                </Card>
            </main>
             <footer className="p-4 text-center text-xs text-muted-foreground">
                © 2025 3D. All rights reserved. | <Link href="/terms" className="hover:underline">Terms & Conditions</Link> | <Link href="https://forms.gle/3vQhgtJbnEaGD6xV8" target="_blank" rel="noopener noreferrer" className="hover:underline">Provide Feedback</Link>
            </footer>
        </div>
    );
}
