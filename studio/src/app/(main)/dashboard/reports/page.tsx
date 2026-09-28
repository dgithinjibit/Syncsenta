
"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MyResources } from "@/components/my-resources";
import { BarChart2, Megaphone, Send } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Communication } from "@/lib/types";
import { Button } from '@/components/ui/button';
import { AddCommunicationDialog } from '@/components/add-communication-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

function TeacherResourcesView() {
    return (
        <div>
            <div className="mb-6">
                <h1 className="font-headline text-3xl font-bold">My Library</h1>
                <p className="text-muted-foreground">All your saved Learning Labs, generated documents, and communications organized for easy access.</p>
            </div>
            <MyResources />
        </div>
    );
}

function SchoolHeadReportsView() {
    const [isAddCommDialogOpen, setAddCommDialogOpen] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    // Signed announcements carry the head's real name from their `profiles`
    // row; this used to read `localStorage.userName`, which nothing writes.
    const { profile } = useAuth();

    const handleAddCommunication = (comm: Omit<Communication, 'id' | 'date' | 'acknowledged'>) => {
        const schoolHeadName = profile?.full_name ?? 'School Head';
        const newComm: Communication = {
          id: `comm_${Date.now()}`,
          ...comm,
          date: new Date(),
          acknowledged: false,
          sender: schoolHeadName,
        };
        
        let existingComms: Communication[] = [];
        const storedComms = localStorage.getItem('mockCommunications');
        if (storedComms) {
            try {
                existingComms = JSON.parse(storedComms).map((c: any) => ({...c, date: new Date(c.date)}));
            } catch (e) {
                console.error("Error parsing mockCommunications from localStorage", e);
            }
        }
        
        localStorage.setItem('mockCommunications', JSON.stringify([newComm, ...existingComms]));

        toast({
            title: "Announcement Sent",
            description: `Your announcement "${comm.title}" has been sent.`,
        });
        
        setAddCommDialogOpen(false);
        // Dispatch an event to notify other components of the update
        window.dispatchEvent(new CustomEvent('communication-update'));
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <BarChart2 className="w-6 h-6 text-primary" />
                        School-Wide Reports & Announcements
                    </CardTitle>
                    <CardDescription>
                        This dashboard provides aggregated school reports and tools to send announcements to all staff.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Megaphone />
                                Send Announcement
                            </CardTitle>
                            <CardDescription>
                                Broadcast a message to all teachers. It will appear in their communications log.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Button onClick={() => setAddCommDialogOpen(true)}>
                                <Send className="mr-2" />
                                Create New Announcement
                            </Button>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2 text-lg">
                                <BarChart2 />
                                Performance Reports
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center text-muted-foreground p-8">
                                <p>School-wide reporting features are coming soon.</p>
                            </div>
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>
             <AddCommunicationDialog 
                open={isAddCommDialogOpen} 
                onOpenChange={setAddCommDialogOpen} 
                onAddCommunication={handleAddCommunication} 
            />
        </>
    )
}

export default function ReportsPage() {
    // The comment here used to apologize: "In a real app, you'd use a proper
    // client-side auth context." That context exists — `useAuth()` reads the
    // Supabase session and its `profiles` row. Before this, the page called the
    // `getServerUser()` server action, whose `userEmail` cookie is never written
    // under Supabase, so `role` stayed null and a headteacher was silently shown
    // the teacher view.
    const { profile } = useAuth();
    // Widened on purpose. The generated `profiles.role` type allows
    // `student | teacher | parent | admin | head`, but rows written before that
    // type was generated — and the `mock-data.ts` fixtures still imported by the
    // county and school screens — use the wider `UserRole` spellings. Asserting
    // the narrow type here would make the check below a compile error rather
    // than a decision, so the value is read as what the column actually can hold.
    const role = profile?.role as string | undefined;

    // `head` is what the deployed `profiles.role` column stores for a
    // school head — /signup maps the picker's "school_head" onto it — so
    // testing for `school_head` alone meant a headteacher was silently shown
    // the teacher view. Both spellings are accepted, the same way
    // `getRoleHome()` treats them as aliases.
    if (role === 'head' || role === 'school_head' || role === 'school_admin' || role === 'admin' || role === 'national_admin') {
        return <SchoolHeadReportsView />;
    }

    // Teacher view for teachers, and for anything else that reaches this legacy
    // route — including while the profile is still loading. The role homes are
    // the intended destinations; this page is pending the (main)/dashboard audit.
    return <TeacherResourcesView />;
}
