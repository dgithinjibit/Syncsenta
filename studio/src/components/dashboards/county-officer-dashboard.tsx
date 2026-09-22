
"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, MapPin, Bell, Megaphone, Search, Send } from 'lucide-react';
import type { Communication, School } from '@/lib/types';
import { mockSchools } from '@/lib/mock-data';
import { generateCountySummary } from '@/ai/flows/generate-county-summary';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { AddCommunicationDialog } from '../add-communication-dialog';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const SchoolMap = dynamic(() => import('../school-map'), {
  ssr: false,
  loading: () => <div className="h-full bg-muted rounded-lg flex items-center justify-center"><Loader2 className="animate-spin" /></div>
});

export function CountyOfficerDashboard() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [hoveredSchool, setHoveredSchool] = useState<School | null>(null);
  const [clickedSchool, setClickedSchool] = useState<School | null>(null);
  const [isAddCommDialogOpen, setAddCommDialogOpen] = useState(false);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setSchools(mockSchools);
    const storedComms = localStorage.getItem('mockCommunications');
     if (storedComms) {
        try {
            const parsedComms = JSON.parse(storedComms);
            if (Array.isArray(parsedComms)) {
                setCommunications(parsedComms.map((c: any) => ({...c, date: new Date(c.date)})));
            }
        } catch(e) {
            console.error("Error parsing comms from localStorage", e);
        }
    }
  }, []);

  const handleGenerateSummary = async () => {
    setLoading(true);
    setSummary('');

    try {
        const result = await generateCountySummary({
            schoolCount: schools.length,
            studentCount: 45000,
            teacherCount: 1200,
            averagePerformance: 72.5,
            topPerformingSchool: 'Nyeri High School',
            lowestPerformingSchool: 'Kimathi Primary School',
            resources: [],
        });
        setSummary(`${result.summary}\n\n**Suggestion:** ${result.suggestion}`);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error Generating Summary",
        description: "An AI error occurred. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const onCommunicationUpdated = () => {
    window.dispatchEvent(new CustomEvent('communication-update'));
    router.push('/dashboard/county-comms');
  }

  const handleAddCommunication = (comm: Omit<Communication, 'id' | 'date' | 'acknowledged'>) => {
    const countyOfficerName = localStorage.getItem('userName') || 'County Officer';
    const newComm: Communication = {
      id: `comm_${Date.now()}`,
      ...comm,
      date: new Date(),
      acknowledged: false,
      sender: countyOfficerName,
    };
    
    const updatedComms = [newComm, ...communications];
    setCommunications(updatedComms);
    localStorage.setItem('mockCommunications', JSON.stringify(updatedComms));
    onCommunicationUpdated();
    toast({
        title: "Announcement Sent",
        description: `Your announcement "${comm.title}" has been sent to ${comm.recipient}.`,
    });
  };

  return (
    <>
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="font-headline text-3xl font-bold">County Administrator Dashboard</h1>
                <p className="text-muted-foreground">Strategic overview and management tools for your county.</p>
            </div>
             <Button onClick={handleGenerateSummary} disabled={loading}>
                {loading ? <Loader2 className="mr-2 animate-spin"/> : <Sparkles className="mr-2" />}
                {loading ? "Generating..." : "Generate County Summary"}
            </Button>
        </div>

        {summary && (
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Sparkles className="text-accent" /> AI Strategic Briefing</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="prose prose-sm max-w-none">
                        <p>{summary}</p>
                    </div>
                </CardContent>
            </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Bell className="text-primary" /> Alerts & Notifications</CardTitle>
                    <CardDescription>Critical alerts from schools requiring your attention.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-3">
                    <div className="text-sm p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="font-bold text-destructive">Critically Low Attendance at Kimathi Primary</p>
                        <p className="text-muted-foreground text-xs">Weekly attendance has dropped below 70%.</p>
                    </div>
                     <div className="text-sm p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                        <p className="font-bold text-orange-600">Overdue Financial Report: Gachugu Academy</p>
                        <p className="text-muted-foreground text-xs">Q3 financial report is 2 weeks late.</p>
                    </div>
                 </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Megaphone className="text-primary" /> Communications Hub</CardTitle>
                    <CardDescription>Send announcements to all school administrators.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <Button className="w-full" onClick={() => setAddCommDialogOpen(true)}>
                        <Send className="mr-2"/>
                        Broadcast New Communication
                    </Button>
                 </CardContent>
            </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
                <CardHeader>
                    <CardTitle>Schools Management</CardTitle>
                    <CardDescription>Overview of all schools in the county. Click a school to fly to its location.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search schools..." className="pl-8" />
                        </div>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-card">
                                <TableRow>
                                    <TableHead>School Name</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {schools.map(school => (
                                    <TableRow 
                                        key={school.id}
                                        onMouseEnter={() => setHoveredSchool(school)}
                                        onMouseLeave={() => setHoveredSchool(null)}
                                        onClick={() => setClickedSchool(school)}
                                        className={cn("transition-colors cursor-pointer", hoveredSchool?.id === school.id ? "bg-muted/80" : "")}
                                    >
                                        <TableCell className="font-medium">{school.name}</TableCell>
                                        <TableCell><Badge variant="outline">Active</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm">View</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <div className="lg:col-span-2 h-[560px] bg-muted rounded-lg p-2">
                 <SchoolMap 
                    schools={schools} 
                    selectedSchool={hoveredSchool} 
                    onSchoolSelect={setHoveredSchool}
                    clickedSchool={clickedSchool} 
                 />
            </div>
        </div>
    </div>
    <AddCommunicationDialog open={isAddCommDialogOpen} onOpenChange={setAddCommDialogOpen} onAddCommunication={handleAddCommunication} />
    </>
  );
}
