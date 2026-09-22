"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import type { UserRole } from '@/lib/types';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { signupUser } from '@/lib/auth';
import { getAuth, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { app, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" {...props}>
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);

function SignupFormComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const role = searchParams.get('role') as UserRole | null;
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [googleLoading, setGoogleLoading] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleGoogleSignUp = async () => {
        if (!role || !termsAccepted) {
            toast({ variant: 'destructive', title: 'Terms Required', description: 'Please accept the terms first.' });
            return;
        }
        setGoogleLoading(true);
        const auth = getAuth(app);
        const provider = new GoogleAuthProvider();

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const name = user.displayName || user.email!.split('@')[0];

            const signupData = new FormData();
            signupData.append('uid', user.uid);
            signupData.append('fullName', name);
            signupData.append('email', user.email!);

            const redirectPath = await signupUser(role, signupData);
            
            localStorage.setItem('userName', name);
            localStorage.setItem('userEmail', user.email!);
            if (role === 'student') localStorage.setItem('studentName', name);

            toast({ title: 'Signup Successful!', description: `Welcome, ${name}!` });
            router.push(redirectPath);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Signup Failed', description: 'Google signup failed.' });
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!role || !termsAccepted) return;

        const formData = new FormData(event.currentTarget);
        const fullName = formData.get('fullName') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        startTransition(async () => {
            try {
                const userCredential = await createUserWithEmailAndPassword(getAuth(app), email, password);
                const user = userCredential.user;

                const signupData = new FormData();
                signupData.append('uid', user.uid);
                signupData.append('fullName', fullName);
                signupData.append('email', email);

                const redirectPath = await signupUser(role, signupData);
                
                localStorage.setItem('userName', fullName);
                localStorage.setItem('userEmail', email);
                if (role === 'student') localStorage.setItem('studentName', fullName);

                toast({ title: 'Signup Successful!', description: 'Redirecting...' });
                router.push(redirectPath);
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'Signup Failed', description: error.message });
            }
        });
    };

    if (!role) return <Card className="p-8 text-center"><CardTitle>Invalid Role</CardTitle><Button asChild className="mt-4"><Link href="/signup">Back</Link></Button></Card>;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <main className="flex-grow flex items-center justify-center p-4">
                <Card className="w-full max-w-lg relative">
                    <Link href="/signup" passHref>
                        <Button variant="ghost" size="icon" className="absolute top-3 left-3"><ArrowLeft className="h-5 w-5" /></Button>
                    </Link>
                    <CardHeader className="text-center pt-12">
                        <CardTitle className="font-headline text-2xl">Create Your {role.replace('_', ' ')} Account</CardTitle>
                        <CardDescription>Join SyncSenta today.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button variant="outline" className="w-full" onClick={handleGoogleSignUp} disabled={isPending || googleLoading}>
                            {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
                            Sign up with Google
                        </Button>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or use email</span></div>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input id="fullName" name="fullName" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" name="email" type="email" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input id="password" name="password" type={showPassword ? "text" : "password"} required />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="terms" onCheckedChange={(checked) => setTermsAccepted(checked as boolean)} checked={termsAccepted} />
                                <Label htmlFor="terms" className="text-xs text-muted-foreground">Agree to <Link href="/terms" className="underline">Terms</Link> and review the <Link href="/privacy" className="underline">Privacy Policy</Link>{role === 'student' && <> and <Link href="/parental-consent" className="underline">parental consent flow</Link></>}</Label>
                            </div>
                            <Button type="submit" className="w-full" disabled={isPending || googleLoading || !termsAccepted}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Account
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </main>
            <footer className="p-4 text-center text-xs text-muted-foreground">© 2025 3D. All rights reserved.</footer>
        </div>
    );
}

export default function SignupFormPage() {
    return <Suspense fallback={<div>Loading...</div>}><SignupFormComponent /></Suspense>;
}
