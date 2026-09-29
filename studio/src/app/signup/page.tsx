"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { getRoleHome } from '@/lib/auth/role-home';

type Role = 'student' | 'teacher' | 'school_head' | 'county_officer';

const roles = [
    { type: 'student' as Role, title: 'Student', description: 'Join a learning room and work through a subject.' },
    { type: 'teacher' as Role, title: 'Teacher', description: 'Plan lessons, build resources, follow the class.' },
    { type: 'school_head' as Role, title: 'School head', description: 'School-wide progress and staff activity.' },
    { type: 'county_officer' as Role, title: 'County officer', description: 'Compare schools across the county.' },
];

/**
 * Demo workspace entry.
 *
 * This used to be four nested `Card`s in a grid — icon in a coloured circle,
 * heading, paragraph, its own footer button — a lot of chrome around a choice
 * with four answers. It is now one bordered list: role, one line about what it
 * does, one action.
 *
 * It deliberately stays reachable by URL for someone who already has a session,
 * because it is also how a reviewer moves from one role to another. What it adds
 * for that visitor is the truth: opening a demo replaces the current session,
 * and there is a link straight back to their own workspace.
 */
export default function SignupPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user, profile, loading, profileLoading } = useAuth();
    const [isMounted, setIsMounted] = useState(false);
    const [loadingRole, setLoadingRole] = useState<Role | null>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Roles that have a real, provisioned demo identity in
    // /api/auth/demo-login. That endpoint signs the account in against
    // Supabase server-side and redirects to the role home, so the visitor gets
    // the same authenticated session a real user has.
    const DEMO_ROLE_BY_PICKER: Partial<Record<Role, string>> = {
        student: 'student',
        teacher: 'teacher',
        school_head: 'head',
    };

    const handleRoleSelect = (role: Role) => {
        setLoadingRole(role);

        const demoRole = DEMO_ROLE_BY_PICKER[role];

        if (!demoRole) {
            // county_officer has no shared demo account: a county workspace
            // shows real sub-county data, so it must be a provisioned user.
            toast({
                title: "Sign-in required",
                description: "County officer workspaces are invitation-only. Sign in with your credentials.",
            });
            setLoadingRole(null);
            router.push('/auth/signin');
            return;
        }

        // Hard navigation, not router.push: /api/auth/demo-login sets the
        // Supabase session cookies on a 307, and the new document picks them up.
        window.location.assign(`/api/auth/demo-login?role=${demoRole}`);
    };

    if (!isMounted) {
        return null;
    }

    // `useAuth()` reports `user: null` until the session has been read, so
    // "already signed in" is only an answer once both flags have settled.
    const alreadyIn = !loading && !profileLoading && !!user;

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <main className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <h1 className="text-2xl font-bold tracking-tight">Choose a workspace</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Opens a demo workspace with a real sign-in. Have your own account?{' '}
                        <Link href="/auth/signin" className="font-medium text-primary hover:underline">
                            Sign in
                        </Link>
                        .
                    </p>

                    {alreadyIn ? (
                        <div className="mt-4 rounded-md border bg-muted/40 p-3 text-sm">
                            <p className="text-muted-foreground">
                                You are already signed in as{' '}
                                <span className="font-medium text-foreground">
                                    {String(profile?.role ?? 'a new account')}
                                </span>
                                . Opening a demo here replaces that session.
                            </p>
                            <Link
                                href={getRoleHome(profile?.role, '/auth/onboarding')}
                                className="mt-1 inline-block font-medium text-primary hover:underline"
                            >
                                Go to my workspace
                            </Link>
                        </div>
                    ) : null}

                    <ul className="mt-5 divide-y rounded-lg border">
                        {roles.map((role) => {
                            const isLoading = loadingRole === role.type;
                            return (
                                <li key={role.type} className="flex items-center justify-between gap-4 p-4">
                                    <div className="min-w-0">
                                        <p className="font-medium">{role.title}</p>
                                        <p className="text-sm text-muted-foreground">{role.description}</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRoleSelect(role.type)}
                                        disabled={!!loadingRole}
                                    >
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Open
                                    </Button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </main>
            <footer className="p-4 text-center text-xs text-muted-foreground">
                © {new Date().getFullYear()} SyncSenta. All rights reserved. | <Link href="/terms" className="hover:underline">Terms &amp; Conditions</Link> | <Link href="https://forms.gle/3vQhgtJbnEaGD6xV8" target="_blank" rel="noopener noreferrer" className="hover:underline">Provide Feedback</Link>
            </footer>
        </div>
    );
}
