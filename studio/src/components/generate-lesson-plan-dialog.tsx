
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Save, Sparkles, Send } from "lucide-react";
import { generateLessonPlan, GenerateLessonPlanInput } from "@/ai/flows/generate-lesson-plan";
import { improveLessonPlan } from "@/ai/flows/improve-lesson-plan";
import type { TeacherResource } from "@/lib/types";
import { storage, db, app } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { getAuth } from "firebase/auth";


interface GenerateLessonPlanDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onResourceSaved: () => void;
    schemeOfWorkContext?: string;
}

export default function GenerateLessonPlanDialog({ open, onOpenChange, onResourceSaved, schemeOfWorkContext }: GenerateLessonPlanDialogProps) {
  const [loading, setLoading] = useState(false);
  const [improving, setImproving] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState("");
  const [currentTopic, setCurrentTopic] = useState("");
  const [improvementRequest, setImprovementRequest] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open && schemeOfWorkContext) {
      handleInitialSubmit(undefined, schemeOfWorkContext);
    }
  }, [open, schemeOfWorkContext]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPlan).then(() => {
        toast({
            title: "Copied to Clipboard",
            description: "The lesson plan has been copied.",
        });
    });
  };
  
  const handleSave = async () => {
    if (!generatedPlan) return;
    
    const auth = getAuth(app);
    const user = auth.currentUser;

    if (!user) {
        toast({ variant: 'destructive', title: 'Auth Error', description: 'User session not found.' });
        return;
    }

    setLoading(true);
    try {
        const fileName = `lesson_plans/${Date.now()}_${currentTopic.replace(/\s+/g, '_')}.md`;
        const storageRef = ref(storage, fileName);
        
        await uploadString(storageRef, generatedPlan, 'raw', { contentType: 'text/markdown' });
        const downloadURL = await getDownloadURL(storageRef);

        const newPlan: Omit<TeacherResource, 'id'> = {
            title: currentTopic || "Untitled Lesson Plan",
            url: downloadURL,
            createdAt: new Date().toISOString(),
            type: 'Lesson Plan',
            joinCode: '',
            creatorId: user.uid
        };

        await addDoc(collection(db, "teacherResources"), newPlan);

        toast({
          title: "Lesson Plan Saved!",
          description: `"${newPlan.title}" has been saved to your library.`,
        });

        onOpenChange(false);
        onResourceSaved();
    } catch (error) {
        console.error("Error saving lesson plan:", error);
        toast({
            variant: "destructive",
            title: "Error Saving Plan",
            description: "Could not save the lesson plan to the cloud. Please try again."
        })
    } finally {
        setLoading(false);
    }
  };

  const handleInitialSubmit = async (event?: React.FormEvent<HTMLFormElement>, schemeContext?: string) => {
    event?.preventDefault();
    setLoading(true);
    setGeneratedPlan("");

    let data: GenerateLessonPlanInput;
    const teacherName = localStorage.getItem('userName') || 'Teacher';

    if (schemeContext) {
        data = {
            subject: "Social Studies",
            topic: "Language groups in Eastern Africa",
            gradeLevel: "Grade 5",
            learningObjectives: "a) Describe the classification of communities in Eastern Africa according to language groups... e) appreciate unity of language groups in Eastern Africa.",
            schemeOfWorkContext: schemeContext,
            teacherName,
            school: "Grace View Primary School",
            term: "2",
            year: new Date().getFullYear().toString(),
            roll: "Boys: 20, Girls: 20",
            strand: "2.0 People, Population and Social Organisations",
            subStrand: "2.1 Language groups in Eastern Africa",
        };
        setCurrentTopic("Lesson Plan from Scheme");
    } else if (event) {
        const formData = new FormData(event.currentTarget);
        data = {
            subject: formData.get("subject") as string,
            topic: formData.get("topic") as string,
            gradeLevel: formData.get("gradeLevel") as string,
            learningObjectives: formData.get("learningObjectives") as string,
            strand: formData.get("strand") as string,
            subStrand: formData.get("subStrand") as string,
            teacherName,
            school: "Grace View Primary School",
            term: "2",
            year: new Date().getFullYear().toString(),
            roll: "Boys: 20, Girls: 20",
        };
        setCurrentTopic(data.topic);
    } else {
        setLoading(false);
        return;
    }
    
    try {
        generateLessonPlan(data, (chunk) => {
            setGeneratedPlan(prev => prev + chunk);
        }).catch(error => {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error generating lesson plan",
                description: "An unexpected error occurred. Please try again.",
            });
        }).finally(() => {
            setLoading(false);
        });
    } catch (error) {
        console.error(error);
        toast({
            variant: "destructive",
            title: "Error generating lesson plan",
            description: "An unexpected error occurred. Please try again.",
        });
        setLoading(false);
    }
  };

  const handleImprovementSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!improvementRequest.trim()) return;

    setImproving(true);
    const originalPlan = generatedPlan;
    setGeneratedPlan("");

    try {
      await improveLessonPlan({
        lessonPlan: originalPlan,
        request: improvementRequest,
      }, (chunk) => {
          setGeneratedPlan(prev => prev + chunk);
      });
      setImprovementRequest("");
    } catch (error) {
      console.error(error);
      setGeneratedPlan(originalPlan);
      toast({
        variant: "destructive",
        title: "Error improving lesson plan",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setImproving(false);
    }
  };

  const resetState = () => {
    setLoading(false);
    setImproving(false);
    setGeneratedPlan("");
    setCurrentTopic("");
    setImprovementRequest("");
  }


  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
            resetState();
        }
    }}>
      <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Lesson Plan Generator</DialogTitle>
          <DialogDescription>
            {generatedPlan ? "Review your lesson plan and use the chat to make improvements." : "Use AI to generate a draft lesson plan. You can refine it with AI afterwards."}
          </DialogDescription>
        </DialogHeader>
        {!generatedPlan && !loading && !schemeOfWorkContext ? (
            <form onSubmit={handleInitialSubmit} className="space-y-4 overflow-y-auto pr-2">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="gradeLevel">Grade Level</Label>
                    <Select name="gradeLevel" defaultValue="Grade 5">
                        <SelectTrigger>
                            <SelectValue placeholder="Select a grade" />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i + 1} value={`Grade ${i + 1}`}>
                                    Grade {i + 1}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="subject">Learning Area / Subject</Label>
                  <Input id="subject" name="subject" defaultValue="Social Studies" />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="strand">Strand</Label>
                  <Input id="strand" name="strand" defaultValue="2.0 People, Population and Social Organisations" />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="subStrand">Sub Strand</Label>
                  <Input id="subStrand" name="subStrand" defaultValue="2.1 Language groups in Eastern Africa" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <Input id="topic" name="topic" defaultValue="Migration of Language Groups in Eastern Africa" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="learningObjectives">Learning Objectives</Label>
                <Textarea id="learningObjectives" name="learningObjectives" 
                  placeholder="e.g., a) describe the phases...&#10;b) perform the phases..."
                  defaultValue="a) Describe the classification of communities in Eastern Africa according to language groups,&#10;b) explain the reasons for migration of selected language groups into Eastern Africa,&#10;c) illustrate the movement and settlement of the selected language groups in Eastern Africa on a map&#10;d) describe the effects of the migration and settlement of selected language groups in Eastern Africa.&#10;e) appreciate unity of language groups in Eastern Africa."
                  className="h-36" />
              </div>
              <DialogFooter className="sticky bottom-0 bg-background py-4">
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Sparkles className="mr-2 h-4 w-4" /> Generate
                </Button>
              </DialogFooter>
            </form>
        ) : null}

        {(loading || generatedPlan) && (
             <div className="flex-1 flex flex-col min-h-0 border-t pt-4">
                {loading && !generatedPlan && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                            <p className="mt-2 text-muted-foreground">The AI is generating your lesson plan...</p>
                        </div>
                    </div>
                )}
                
                {generatedPlan && (
                  <>
                     <div className="flex justify-between items-center mb-2 flex-shrink-0">
                        <h3 className="font-bold text-lg">Generated Plan: <span className="text-muted-foreground font-normal">{currentTopic}</span></h3>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={handleCopy} title="Copy plan">
                                <Copy className="h-4 w-4" /> Copy
                            </Button>
                            <Button onClick={handleSave} title="Save to resources" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save & Close
                            </Button>
                        </div>
                    </div>
                    <Textarea 
                        value={generatedPlan}
                        onChange={(e) => setGeneratedPlan(e.target.value)}
                        className="text-sm bg-muted/50 whitespace-pre-wrap font-mono flex-1"
                        readOnly={improving}
                    />

                    <form onSubmit={handleImprovementSubmit} className="mt-4 flex-shrink-0">
                       <Label htmlFor="improvementRequest" className="font-bold text-base flex items-center gap-2 mb-2">
                          <Sparkles className="text-accent h-5 w-5" />
                          Improve Your Lesson Plan
                       </Label>
                       <div className="flex items-center space-x-2">
                           <Input
                              id="improvementRequest"
                              name="improvementRequest"
                              placeholder="e.g., 'Add an activity for visual learners' or 'Make the introduction more engaging...'"
                              value={improvementRequest}
                              onChange={(e) => setImprovementRequest(e.target.value)}
                              disabled={improving}
                              className="flex-1"
                           />
                           <Button type="submit" disabled={improving || !improvementRequest.trim()}>
                             {improving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                             {improving ? 'Improving...' : 'Send'}
                           </Button>
                       </div>
                    </form>
                  </>
                )}
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
