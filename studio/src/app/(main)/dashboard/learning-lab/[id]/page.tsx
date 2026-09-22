
"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PlayCircle, Users, BarChart2, Settings, MessageSquare, Search, Video } from "lucide-react";
import type { TeacherResource } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { ShareRoomDialog } from '@/components/share-room-dialog';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from 'next/link';

export default function LearningLabRoomPage() {
    const params = useParams();
    const router = useRouter();
    const { id } = params;
    const [room, setRoom] = useState<TeacherResource | null>(null);
    const [isShareDialogOpen, setShareDialogOpen] = useState(false);

    useEffect(() => {
        if (typeof id !== 'string') return;

        const q = query(collection(db, "teacherResources"), where("joinCode", "==", id));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                setRoom({ id: doc.id, ...doc.data() } as TeacherResource);
            } else {
                setRoom(null);
            }
        });

        return () => unsubscribe();
    }, [id]);

    const handleDialogClose = () => {
        setShareDialogOpen(false);
    }

    if (!room) {
        return <div className="text-center p-8">Loading room details or room not found...</div>;
    }

    return (
        <>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-4">
                                     <Avatar className="h-12 w-12 border-2 border-primary/20">
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                                            {room.title.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle className="font-headline text-3xl">{room.title}</CardTitle>
                                        <p className="text-muted-foreground">Room Details</p>
                                    </div>
                                </div>
                            </div>
                             <div className="flex items-center gap-2">
                                 <Badge variant="secondary" className="gap-2">
                                    <PlayCircle className="w-4 h-4" />
                                    Active
                                </Badge>
                                <Button onClick={() => setShareDialogOpen(true)}>
                                    <Users className="mr-2" />
                                    Invite Students
                                </Button>
                                 <Button asChild>
                                    <Link href={`/dashboard/learning-lab/${id}/meet`}>
                                        <Video className="mr-2" />
                                        Start Video Call
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <Tabs defaultValue="students">
                    <TabsList>
                        <TabsTrigger value="students">
                            <Users className="mr-2" />
                            Students
                        </TabsTrigger>
                        <TabsTrigger value="insights">
                             <BarChart2 className="mr-2" />
                            Insights
                        </TabsTrigger>
                        <TabsTrigger value="manage">
                             <Settings className="mr-2" />
                            Manage Room
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="students">
                        <Card>
                            <CardHeader>
                                <CardTitle>Students in Room</CardTitle>
                                 <CardDescription>
                                    A list of students who have joined this room. (Feature coming soon)
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                 <div className="mb-4">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="Search students..." className="pl-8" />
                                    </div>
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student Name</TableHead>
                                            <TableHead>Last Message</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center h-24">
                                                No student data available yet.
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="insights">
                        <Card>
                             <CardHeader>
                                <CardTitle>Room Insights</CardTitle>
                                <CardDescription>
                                    Analytics on student participation and common questions will be shown here. (Feature coming soon)
                                </CardDescription>
                            </CardHeader>
                             <CardContent>
                                <div className="text-center text-muted-foreground p-8">
                                    <BarChart2 className="mx-auto h-12 w-12" />
                                    <h3 className="mt-4 text-lg font-semibold">No Insights Yet</h3>
                                    <p className="mt-1 text-sm">
                                        Check back after your students have interacted with the Study Bot.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                     <TabsContent value="manage">
                        <Card>
                             <CardHeader>
                                <CardTitle>Manage Room</CardTitle>
                                <CardDescription>
                                    Room settings and management options will be available here. (Feature coming soon)
                                </CardDescription>
                            </CardHeader>
                             <CardContent>
                                <div className="text-center text-muted-foreground p-8">
                                    <Settings className="mx-auto h-12 w-12" />
                                    <h3 className="mt-4 text-lg font-semibold">No Management Options Yet</h3>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
            <ShareRoomDialog 
                open={isShareDialogOpen}
                onOpenChange={setShareDialogOpen}
                joinCode={room.joinCode}
                onDialogClose={handleDialogClose}
            />
        </>
    );
}

    