"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '@/lib/firebase';

export default function SignInPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const auth = getAuth(app);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            
            toast({
                title: "Login Successful",
                description: "Welcome back! Redirecting you to your dashboard.",
            });
            
            // This is a placeholder for setting user role in cookies, as it was in signup.
            // In a real app, you would fetch the user's role from your database after login.
            const role = email.includes('teacher') ? 'teacher' : email.includes('head') ? 'school_head' : 'student';

            const response = await fetch('/api/set-auth-cookie', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role, name: userCredential.user.displayName || email.split('@')[0] }),
            });

             if (response.ok) {
                 if (role === 'student') {
                    router.push('/student/journey');
                } else {
                    router.push('/dashboard');
                }
            } else {
                throw new Error("Failed to set authentication session.");
            }

        } catch (error: any) {
            console.error("Firebase Auth Error:", error);
            let description = "An unexpected error occurred. Please try again.";
             if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                description = "Invalid email or password. Please check your credentials and try again.";
            }
            toast({
                variant: "destructive",
                title: "Login Failed",
                description,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <main className="flex-grow flex items-center justify-center">
                <Card className="w-full max-w-sm">
                    <CardHeader className="text-center">
                        <CardTitle className="font-headline text-2xl">Welcome Back to SyncSenta</CardTitle>
                        <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input 
                                    id="email" 
                                    type="email" 
                                    placeholder="m@example.com" 
                                    required 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input 
                                        id="password" 
                                        type={showPassword ? "text" : "password"} 
                                        required 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {loading ? 'Signing In...' : 'Sign In'}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <p className="text-xs text-muted-foreground">
                            Don't have an account?{' '}
                            <Link href="/signup" className="underline font-medium hover:text-primary">
                                Choose a role
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </main>
             <footer className="p-4 text-center text-xs text-muted-foreground">
                © 2024 SyncSenta. All rights reserved. | <Link href="/terms" className="hover:underline">Terms & Conditions</Link>
            </footer>
        </div>
    );
}
