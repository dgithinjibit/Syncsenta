
"use client";

import { useState, useEffect } from 'react';
import type { TeacherResource, Communication } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { FilePen, FileText, Trash2, Copy, Calendar, BrainCircuit, BookCopy, GraduationCap, CopySlash, MoreHorizontal, PlusCircle, Search, PlayCircle, ChevronDown, Megaphone } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { deleteTeacherResource, getTeacherResources } from '@/lib/teacher/resources-client';

const GenerateLessonPlanDialog = dynamic(() => import('@/components/generate-lesson-plan-dialog'), { ssr: false });


export function MyResources() {
    const [allResources, setAllResources] = useState<TeacherResource[]>([]);
    const [isLoadingResources, setIsLoadingResources] = useState(true);
    const [communications, setCommunications] = useState<Communication[]>([]);
    const [isLessonPlanDialogOpen, setLessonPlanDialogOpen] = useState(false);
    const [selectedSchemeContent, setSelectedSchemeContent] = useState<string | undefined>(undefined);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        let cancelled = false;
        const loadResources = async () => {
            if (!cancelled) setIsLoadingResources(true);
            try {
                const resources = await getTeacherResources();
                if (!cancelled) setAllResources(resources);
            } catch (error) {
                console.error('Unable to load teacher resources:', error);
                if (!cancelled) {
                    toast({
                        variant: 'destructive',
                        title: 'Could not load your library',
                        description: error instanceof Error ? error.message : 'Please try again.',
                    });
                }
            } finally {
                if (!cancelled) setIsLoadingResources(false);
            }
        };

        void loadResources();
        const handleResourceUpdate = () => { void loadResources(); };
        window.addEventListener('resource-update', handleResourceUpdate);

        const storedComms = localStorage.getItem('mockCommunications');
        if (storedComms) {
            try {
                setCommunications(JSON.parse(storedComms).map((comm: Communication) => ({
                    ...comm,
                    date: new Date(comm.date),
                })));
            } catch (error) {
                console.error('Unable to parse saved communications:', error);
            }
        }

        return () => {
            cancelled = true;
            window.removeEventListener('resource-update', handleResourceUpdate);
        };
    }, [toast]);
    
    const learningLabs = allResources.filter(r => r.type === 'AI Tutor Context');
    const otherResources = allResources.filter(r => r.type !== 'AI Tutor Context');


    const handleDelete = async (resource: TeacherResource, event: React.MouseEvent) => {
        event.stopPropagation();
        try {
            await deleteTeacherResource(resource.id);
            setAllResources((current) => current.filter((item) => item.id !== resource.id));
            
            toast({
                title: "Item Deleted",
                description: "The item has been removed from your library.",
                variant: "destructive"
            });
        } catch(error) {
            console.error("Error deleting resource: ", error);
             toast({
                title: "Error Deleting",
                 description: error instanceof Error ? error.message : "Could not delete the resource. Please try again.",
                variant: "destructive"
            });
        }
    };
    
    const handleCopy = (content: string | undefined, event: React.MouseEvent) => {
        event.stopPropagation();
        if (!content) return;
        navigator.clipboard.writeText(content).then(() => {
            toast({
                title: "Copied to Clipboard",
            });
        });
    };

    const handleGenerateLessonPlan = (resource: TeacherResource, event: React.MouseEvent) => {
        event.stopPropagation();
        if (!resource.content) {
             toast({
                variant: 'destructive',
                title: 'Error',
                description: 'This resource has no saved content to use as lesson context.',
            });
            return;
        }
        setSelectedSchemeContent(resource.content);
        setLessonPlanDialogOpen(true);
    };

    const onResourceSaved = () => {
        router.push('/dashboard/reports');
    }
    
    const getIcon = (type: TeacherResource['type']) => {
        switch(type) {
            case 'Lesson Plan': return <FileText className="h-5 w-5 text-blue-500" />;
            case 'Scheme of Work': return <Calendar className="h-5 w-5 text-green-500" />;
            case 'Rubric': return <GraduationCap className="h-5 w-5 text-orange-500" />;
            case 'Worksheet': return <BookCopy className="h-5 w-5 text-purple-500" />;
            case 'Differentiated Worksheet': return <CopySlash className="h-5 w-5 text-indigo-500" />;
            case 'AI Tutor Context': return <BrainCircuit className="h-5 w-5 text-pink-500" />;
            default: return <FileText className="h-5 w-5 text-primary" />;
        }
    }
    
     const getBadgeVariant = (type: TeacherResource['type']): "secondary" | "outline" | "default" | "destructive" => {
        switch(type) {
            case 'Lesson Plan': return 'default';
            case 'Scheme of Work': return 'secondary';
            case 'AI Tutor Context': return 'destructive';
            case 'Rubric': return 'default';
            case 'Worksheet': return 'secondary';
            case 'Differentiated Worksheet': return 'outline';
            default: return 'outline';
        }
    }


    if (isLoadingResources && allResources.length === 0 && communications.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">Loading your resources…</div>;
    }

    if (allResources.length === 0 && communications.length === 0) {
        return (
            <div className="text-center text-muted-foreground p-8">
                <FileText className="mx-auto h-12 w-12" />
                <h3 className="mt-4 text-lg font-semibold">No Items Yet</h3>
                <p className="mt-1 text-sm">
                    Use the "Teacher Tools" or "Learning Lab" to generate resources.
                </p>
                 <Button asChild className="mt-4">
                    <Link href="/dashboard/tools">
                        <PlusCircle className="mr-2" />
                        Create a Resource
                    </Link>
                </Button>
            </div>
        );
    }


    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                         <CardTitle className="flex items-center gap-3">
                            <BrainCircuit className="w-6 h-6 text-pink-500" />
                            My Learning Labs
                        </CardTitle>
                        <Button asChild>
                            <Link href="/dashboard/learning-lab">
                                <PlusCircle className="mr-2" />
                                Create Lab
                            </Link>
                        </Button>
                    </div>
                    <CardDescription>
                        Your Learning Labs let you configure AI tools and share them with students so they can explore with purpose and stay on track.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search labs..." className="pl-10" />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    Filter by status: Active
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem>Active</DropdownMenuItem>
                                <DropdownMenuItem>Archived</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>


                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Lab Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Students</TableHead>
                                <TableHead>Join Code</TableHead>
                                <TableHead>Last Modified</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {learningLabs.length > 0 ? learningLabs.map(lab => (
                                <TableRow key={lab.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/learning-lab/${lab.joinCode}`)}>
                                    <TableCell className="font-medium flex items-center gap-3">
                                        <Avatar className="h-8 w-8 border">
                                            <AvatarFallback className="bg-pink-50 text-pink-600 font-bold text-xs">{lab.title.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        {lab.title}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="gap-1.5 pl-1.5">
                                            <PlayCircle className="w-4 h-4 text-green-500" />
                                            Active
                                        </Badge>
                                    </TableCell>
                                    <TableCell>0</TableCell>
                                    <TableCell><Badge variant="outline" className="font-mono">{lab.joinCode}</Badge></TableCell>
                                    <TableCell>{format(new Date(lab.createdAt), 'PP p')}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={(e) => handleDelete(lab, e)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">
                                        You haven't created any Learning Labs yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>


            {otherResources.length > 0 && (
                <div>
                     <h3 className="text-lg font-semibold mb-4 ml-1">Generated Documents</h3>
                     <Accordion type="single" collapsible className="w-full">
                        {otherResources.map((resource) => (
                             <AccordionItem value={resource.id} key={resource.id}>
                                <AccordionTrigger className="hover:no-underline px-4">
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-4">
                                            {getIcon(resource.type)}
                                            <div>
                                                <p className="font-semibold text-left">{resource.title}</p>
                                                <p className="text-xs text-muted-foreground font-normal">
                                                    Saved {format(new Date(resource.createdAt), 'PP p')}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant={getBadgeVariant(resource.type)} className="mr-4">
                                            {resource.type}
                                        </Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="p-4 bg-muted/50 rounded-md">
                                        {!resource.url && resource.content ? (
                                            <>
                                                <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-pre:bg-transparent prose-pre:p-0">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{resource.content}</ReactMarkdown>
                                                </div>
                                                <div className="flex items-center justify-end gap-2 border-t pt-2 mt-2">
                                                    {resource.type === 'Scheme of Work' && (
                                                        <Button variant="default" size="sm" onClick={(e) => handleGenerateLessonPlan(resource, e)}>
                                                            <FilePen className="mr-2 h-4 w-4" />
                                                            Generate Lesson Plan
                                                        </Button>
                                                    )}
                                                    <Button variant="outline" size="sm" onClick={(e) => handleCopy(resource.content, e)}>
                                                        <Copy className="mr-2 h-4 w-4" />
                                                        Copy
                                                    </Button>
                                                    <Button variant="destructive" size="sm" onClick={(e) => handleDelete(resource, e)}>
                                                        <Trash2 className="mr-2 h-4 w-4"/>
                                                        Delete
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-xs text-muted-foreground mb-2">A preview of the document is not available. Download the file to view its content.</p>
                                                <div className="flex items-center justify-end gap-2 border-t pt-2 mt-2">
                                                    {resource.type === 'Scheme of Work' && (
                                                        <Button variant="default" size="sm" onClick={(e) => handleGenerateLessonPlan(resource, e)}>
                                                            <FilePen className="mr-2 h-4 w-4" />
                                                            Generate Lesson Plan
                                                        </Button>
                                                    )}
                                                    <Button variant="destructive" size="sm" onClick={(e) => handleDelete(resource, e)}>
                                                        <Trash2 className="mr-2 h-4 w-4"/>
                                                        Delete
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            )}
             {communications.length > 0 && (
                <div>
                     <h3 className="text-lg font-semibold mb-4 ml-1">Communications Log</h3>
                     <Accordion type="single" collapsible className="w-full">
                        {communications.map((comm) => (
                             <AccordionItem value={comm.id} key={comm.id}>
                                <AccordionTrigger className="hover:no-underline px-4">
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-4">
                                            <Megaphone className="h-5 w-5 text-destructive" />
                                            <div>
                                                <p className="font-semibold text-left">{comm.title}</p>
                                                <p className="text-xs text-muted-foreground font-normal">
                                                    Sent {format(new Date(comm.date), 'PP p')}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant={comm.sender === 'School Head' ? 'destructive' : 'outline'} className="mr-4">
                                            From: {comm.sender}
                                        </Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="p-4 bg-muted/50 rounded-md">
                                        <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-pre:bg-transparent prose-pre:p-0">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{comm.content}</ReactMarkdown>
                                        </div>
                                         <div className="text-xs text-muted-foreground pt-2 mt-2 border-t">Recipient: {comm.recipient}</div>
                                        <div className="flex items-center justify-end gap-2 pt-2 mt-2">
                                            <Button variant="destructive" size="sm" onClick={(e) => {
                                                e.stopPropagation();
                                                const updatedComms = communications.filter(p => p.id !== comm.id);
                                                setCommunications(updatedComms);
                                                localStorage.setItem("mockCommunications", JSON.stringify(updatedComms));
                                                toast({
                                                    title: "Item Deleted",
                                                    description: "The item has been removed from your library.",
                                                    variant: "destructive"
                                                });
                                            }}>
                                                <Trash2 className="mr-2 h-4 w-4"/>
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            )}
             {isLessonPlanDialogOpen && <GenerateLessonPlanDialog 
                open={isLessonPlanDialogOpen} 
                onOpenChange={setLessonPlanDialogOpen} 
                onResourceSaved={onResourceSaved}
                schemeOfWorkContext={selectedSchemeContent}
             />}
        </div>
    );
}
