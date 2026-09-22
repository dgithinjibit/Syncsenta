"use client"

import { useState, useMemo } from "react";
import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    FilePen, ClipboardList, CalendarDays, CopySlash, GraduationCap, Mail, 
    Search, BrainCircuit, UserCheck, Bot, Sparkles, BookOpen, Presentation,
    Video, Languages, MessageSquare, History, Trophy, Lightbulb, Music,
    Users, BarChart, Smile, AlertCircle, HelpCircle, GraduationCap as Cap,
    PenTool, MailOpen, FileCheck, TextQuote, Layers, Compass
} from "lucide-react";
import { useRouter } from 'next/navigation';
import type { ToolField } from "@/components/generic-tool-dialog";

const GenericToolDialog = dynamic(() => import('@/components/generic-tool-dialog'), { ssr: false });
const GenerateLessonPlanDialog = dynamic(() => import('@/components/generate-lesson-plan-dialog'), { ssr: false });
const GenerateSchemeOfWorkDialog = dynamic(() => import('@/components/generate-scheme-of-work-dialog'), { ssr: false });
const GenerateRubricDialog = dynamic(() => import('@/components/generate-rubric-dialog'), { ssr: false });
const GenerateWorksheetDialog = dynamic(() => import('@/components/generate-worksheet-dialog'), { ssr: false });
const DifferentiateWorksheetDialog = dynamic(() => import('@/components/differentiate-worksheet-dialog'), { ssr: false });
const GenerateFamilyEmailDialog = dynamic(() => import('@/components/generate-family-email-dialog'), { ssr: false });

type Category = "All" | "Planning" | "Content" | "Assessment" | "Support" | "Communication" | "Productivity" | "Engagement";

const categories: Category[] = ["All", "Planning", "Content", "Assessment", "Support", "Communication", "Productivity", "Engagement"];

const teacherTools = [
    {
        id: "schemeOfWork",
        title: "Schemer: Schemes of Work",
        description: "Create complete CBC-compliant Schemes of Work from curriculum data.",
        icon: CalendarDays,
        category: "Planning",
        customDialog: true
    },
    {
        id: "lessonPlan",
        title: "Lesson Plan Generator",
        description: "Create detailed, CBE-aligned lesson plans for any learning area.",
        icon: FilePen,
        category: "Planning",
        customDialog: true
    },
    {
        id: "worksheet",
        title: "Worksheet Generator",
        description: "Generate printable worksheets with answer keys for your class.",
        icon: ClipboardList,
        category: "Content",
        customDialog: true
    },
    {
        id: "rubric",
        title: "Rubric Generator",
        description: "Create custom assessment rubrics based on KICD criteria.",
        icon: Cap,
        category: "Assessment",
        customDialog: true
    },
    {
        id: "differentiate",
        title: "Differentiation Station",
        description: "Adapt your existing lesson materials for learners with diverse needs.",
        icon: CopySlash,
        category: "Support",
        customDialog: true
    },
    {
        id: "familyEmail",
        title: "Email to Family",
        description: "Generate professional and empathetic communications for parents.",
        icon: Mail,
        category: "Communication",
        customDialog: true
    },
    // New Generic Tools
    {
        id: "writing-feedback",
        title: "Writing Feedback",
        description: "Detailed feedback on student writing based on CBC performance levels.",
        icon: PenTool,
        category: "Assessment",
        fields: [
            { id: "student_work", label: "Student Work", type: "textarea", placeholder: "Paste student text here..." },
            { id: "focus", label: "Feedback Focus", type: "text", placeholder: "e.g., Grammar, Logical flow, Creativity" }
        ]
    },
    {
        id: "iep-generator",
        title: "IEP Generator",
        description: "Draft an Individualized Education Program (IEP) for learners with SNE.",
        icon: UserCheck,
        category: "Support",
        fields: [
            { id: "needs", label: "Learner's Specific Needs", type: "textarea", placeholder: "Describe the learner's challenges and strengths..." },
            { id: "grade", label: "Grade Level", type: "text", placeholder: "e.g., Grade 4" }
        ]
    },
    {
        id: "mcq-quiz",
        title: "MCQ Quiz Generator",
        description: "Create multiple-choice questions for KPSEA or internal assessments.",
        icon: FileCheck,
        category: "Assessment",
        fields: [
            { id: "topic", label: "Topic/Strand", type: "text", placeholder: "e.g., Human Heart, Algebra" },
            { id: "count", label: "Number of Questions", type: "text", placeholder: "5, 10, 20..." }
        ]
    },
    {
        id: "presentation-gen",
        title: "Presentation Slides",
        description: "Generate structured slide content for your next lesson.",
        icon: Presentation,
        category: "Productivity",
        fields: [
            { id: "topic", label: "Lesson Topic", type: "text", placeholder: "e.g., The Green Belt Movement" },
            { id: "slides", label: "Number of Slides", type: "text", placeholder: "e.g., 8" }
        ]
    },
    {
        id: "report-card",
        title: "Report Card Comments",
        description: "Generate meaningful CBC-aligned comments focusing on learner progress.",
        icon: MessageSquare,
        category: "Assessment",
        fields: [
            { id: "strengths", label: "Learner Strengths", type: "textarea", placeholder: "Active participation, strong in math..." },
            { id: "growth", label: "Areas for Growth", type: "textarea", placeholder: "Needs to improve on reading fluency..." }
        ]
    },
    {
        id: "science-lab",
        title: "Science Lab Generator",
        description: "Design safe, practical experiments using locally available materials.",
        icon: BrainCircuit,
        category: "Content",
        fields: [
            { id: "concept", label: "Scientific Concept", type: "text", placeholder: "e.g., Erosion, Evaporation" },
            { id: "grade", label: "Grade", type: "text", placeholder: "Grade 6" }
        ]
    },
    {
        id: "sel-lesson",
        title: "SEL Lesson Plan",
        description: "Social-Emotional Learning plans to support learner well-being.",
        icon: Smile,
        category: "Planning",
        fields: [
            { id: "focus", label: "SEL Focus", type: "text", placeholder: "e.g., Empathy, Conflict Resolution" }
        ]
    },
    {
        id: "tongue-twisters",
        title: "Tongue Twisters",
        description: "Fun pronunciation exercises in English and Swahili.",
        icon: Music,
        category: "Engagement",
        fields: [
            { id: "language", label: "Language", type: "text", placeholder: "English or Swahili" },
            { id: "sounds", label: "Target Sounds", type: "text", placeholder: "e.g., /s/ and /sh/" }
        ]
    },
    {
        id: "real-world",
        title: "Real World Connections",
        description: "Connect abstract concepts to everyday Kenyan life.",
        icon: Compass,
        category: "Engagement",
        fields: [
            { id: "topic", label: "Topic", type: "text", placeholder: "e.g., Percentages, Magnetism" }
        ]
    },
    {
        id: "translator",
        title: "Text Translator",
        description: "Translate content between English and Swahili fluently.",
        icon: Languages,
        category: "Productivity",
        fields: [
            { id: "text", label: "Text to Translate", type: "textarea", placeholder: "Paste text here..." },
            { id: "target", label: "Target Language", type: "text", placeholder: "e.g., Swahili" }
        ]
    },
    {
        id: "professional-email",
        title: "Professional Email",
        description: "Draft emails to the TSC, MoE, or school administration.",
        icon: MailOpen,
        category: "Communication",
        fields: [
            { id: "purpose", label: "Purpose of Email", type: "textarea", placeholder: "Requesting leave, reporting a repair..." }
        ]
    },
    {
        id: "unit-plan",
        title: "Unit Plan Generator",
        description: "Map out a whole month of learning for a specific Strand.",
        icon: Layers,
        category: "Planning",
        fields: [
            { id: "strand", label: "Strand", type: "text", placeholder: "e.g., Nutrition in Humans" },
            { id: "duration", label: "Duration", type: "text", placeholder: "4 weeks" }
        ]
    }
];

export default function TeacherToolsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState<Category>("All");
    const [selectedTool, setSelectedTool] = useState<typeof teacherTools[0] | null>(null);
    
    const [dialogState, setDialogState] = useState({
        lessonPlan: false,
        schemeOfWork: false,
        rubric: false,
        worksheet: false,
        differentiate: false,
        familyEmail: false,
        generic: false
    });
    
    const router = useRouter();

    const filteredTools = useMemo(() => {
        return teacherTools.filter(tool => {
            const matchesSearch = tool.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 tool.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === "All" || tool.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, activeCategory]);

    const handleToolClick = (tool: typeof teacherTools[0]) => {
        if (tool.customDialog) {
            setDialogState(prev => ({ ...prev, [tool.id]: true }));
        } else {
            setSelectedTool(tool);
            setDialogState(prev => ({ ...prev, generic: true }));
        }
    };

    const onResourceSaved = () => {
        window.dispatchEvent(new CustomEvent('resource-update'));
        router.push('/dashboard/reports');
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-2">
                        <Sparkles className="text-accent" />
                        AI Teaching Co-Pilot
                    </h1>
                    <p className="text-muted-foreground">Empowering Kenyan teachers with CBC-aligned intelligence.</p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search tools..." 
                        className="pl-10" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </header>

            <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                    <Badge 
                        key={cat} 
                        variant={activeCategory === cat ? "default" : "outline"}
                        className="cursor-pointer px-4 py-1 text-sm"
                        onClick={() => setActiveCategory(cat)}
                    >
                        {cat}
                    </Badge>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                        <Card key={tool.id} className="flex flex-col group hover:shadow-lg transition-all border-l-4 border-l-transparent hover:border-l-accent cursor-pointer" onClick={() => handleToolClick(tool)}>
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
                                        <Icon className="w-6 h-6 text-primary" />
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-tighter">
                                        {tool.category}
                                    </Badge>
                                </div>
                                <CardTitle className="text-lg group-hover:text-primary transition-colors">{tool.title}</CardTitle>
                                <CardDescription className="line-clamp-2 text-xs">{tool.description}</CardDescription>
                            </CardHeader>
                            <CardFooter className="mt-auto pt-0">
                                <Button variant="ghost" className="w-full justify-between text-xs text-muted-foreground hover:text-primary">
                                    Launch Tool
                                    <Sparkles className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>

            {filteredTools.length === 0 && (
                <div className="text-center py-20 bg-muted/20 rounded-xl border-2 border-dashed">
                    <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-bold">No tools found</h3>
                    <p className="text-muted-foreground">Try adjusting your search or category filter.</p>
                </div>
            )}

            {/* Dialogs */}
            {dialogState.schemeOfWork && <GenerateSchemeOfWorkDialog open={dialogState.schemeOfWork} onOpenChange={(open) => setDialogState(prev => ({...prev, schemeOfWork: open}))} onResourceSaved={onResourceSaved} />}
            {dialogState.lessonPlan && <GenerateLessonPlanDialog open={dialogState.lessonPlan} onOpenChange={(open) => setDialogState(prev => ({...prev, lessonPlan: open}))} onResourceSaved={onResourceSaved} />}
            {dialogState.rubric && <GenerateRubricDialog open={dialogState.rubric} onOpenChange={(open) => setDialogState(prev => ({...prev, rubric: open}))} onResourceSaved={onResourceSaved} />}
            {dialogState.worksheet && <GenerateWorksheetDialog open={dialogState.worksheet} onOpenChange={(open) => setDialogState(prev => ({...prev, worksheet: open}))} onResourceSaved={onResourceSaved} />}
            {dialogState.differentiate && <DifferentiateWorksheetDialog open={dialogState.differentiate} onOpenChange={(open) => setDialogState(prev => ({...prev, differentiate: open}))} onResourceSaved={onResourceSaved} />}
            {dialogState.familyEmail && <GenerateFamilyEmailDialog open={dialogState.familyEmail} onOpenChange={(open) => setDialogState(prev => ({...prev, familyEmail: open}))} />}
            
            {dialogState.generic && selectedTool && (
                <GenericToolDialog 
                    open={dialogState.generic} 
                    onOpenChange={(open) => setDialogState(prev => ({...prev, generic: open}))}
                    toolId={selectedTool.id}
                    title={selectedTool.title}
                    description={selectedTool.description}
                    fields={selectedTool.fields || []}
                    onResourceSaved={onResourceSaved}
                />
            )}
        </div>
    );
}
