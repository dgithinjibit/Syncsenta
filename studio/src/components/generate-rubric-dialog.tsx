
"use client";

import { useState } from "react";
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Save } from "lucide-react";
import { generateRubric, GenerateRubricInput } from "@/ai/flows/generate-rubric";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { TeacherResource } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { storage, db, app } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { getAuth } from "firebase/auth";

interface GenerateRubricDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onResourceSaved: () => void;
}

export default function GenerateRubricDialog({ open, onOpenChange, onResourceSaved }: GenerateRubricDialogProps) {
  const [loading, setLoading] = useState(false);
  const [generatedRubric, setGeneratedRubric] = useState("");
  const [currentAssignment, setCurrentAssignment] = useState("");
  const { toast } = useToast();
  const [levels, setLevels] = useState(3);
  const [useWebSearch, setUseWebSearch] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedRubric).then(() => {
        toast({
            title: "Copied to Clipboard",
        });
    });
  };

  const handleSave = async () => {
    if (!generatedRubric) return;
    
    const auth = getAuth(app);
    const user = auth.currentUser;

    if (!user) {
        toast({ variant: 'destructive', title: 'Auth Error', description: 'User session not found.' });
        return;
    }

    setLoading(true);
    
    try {
        const fileName = `rubrics/${Date.now()}_${currentAssignment.replace(/\s+/g, '_')}.md`;
        const storageRef = ref(storage, fileName);
        
        await uploadString(storageRef, generatedRubric, 'raw', { contentType: 'text/markdown' });
        const downloadURL = await getDownloadURL(storageRef);

        const newResource: Omit<TeacherResource, 'id'> = {
          title: `${currentAssignment || 'Untitled Rubric'}`,
          url: downloadURL,
          createdAt: new Date().toISOString(),
          type: 'Rubric',
          joinCode: '',
          creatorId: user.uid
        };
        
        await addDoc(collection(db, "teacherResources"), newResource);
        
        toast({
          title: "Rubric Saved!",
          description: `"${newResource.title}" has been added to your library.`,
        });

        onOpenChange(false);
        onResourceSaved();
    } catch (error) {
        console.error("Error saving rubric:", error);
        toast({
            variant: "destructive",
            title: "Error Saving Rubric",
            description: "Could not save the rubric to the cloud. Please try again."
        })
    } finally {
        setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setGeneratedRubric("");

    const formData = new FormData(event.currentTarget);
    const data: GenerateRubricInput = {
      grade: formData.get("grade") as string,
      learningObjective: formData.get("learningObjective") as string,
      assignmentDescription: formData.get("assignmentDescription") as string,
      criteria: formData.get("criteria") as string,
      standards: formData.get("standards") as string,
      levels: levels.toString(),
      webSearch: useWebSearch,
    };
    
    setCurrentAssignment(data.assignmentDescription);

    try {
        const result = await generateRubric(data);
        if (result.rubric) {
            setGeneratedRubric(result.rubric);
        }
    } catch (error) {
        console.error(error);
        toast({
            variant: "destructive",
            title: "Error generating rubric",
            description: "An unexpected error occurred. Please try again.",
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
            setGeneratedRubric("");
            setCurrentAssignment("");
        }
    }}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Rubric Generator</DialogTitle>
          <DialogDescription>
            Generate a custom rubric for any assignment. You can edit the result after generation.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="grade">Grade Level</Label>
                    <Select name="grade" defaultValue="Grade 5">
                        <SelectTrigger>
                            <SelectValue placeholder="Select a grade" />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i + 1} value={`Grade ${i + 1}`}>Grade {i + 1}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="levels">Number of Performance Levels: {levels}</Label>
                    <Slider id="levels" name="levels" min={2} max={5} step={1} value={[levels]} onValueChange={(value) => setLevels(value[0])} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="learningObjective">Learning Objective (SWBAT)</Label>
                    <Textarea id="learningObjective" name="learningObjective" placeholder="e.g., SWBAT write an argumentative essay" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="assignmentDescription">Assignment Description</Label>
                    <Textarea id="assignmentDescription" name="assignmentDescription" placeholder="e.g., Write a persuasive essay that convinces the reader to change a school policy of your choosing" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="criteria">Specific Criteria to Assess</Label>
                    <Textarea id="criteria" name="criteria" placeholder="e.g., Be sure to include supporting arguments as a category assessed" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="standards">Standards</Label>
                    <Input id="standards" name="standards" placeholder="e.g., KICD, CBC" />
                </div>
                <div className="flex items-center space-x-2">
                    <Switch id="web-search" checked={useWebSearch} onCheckedChange={setUseWebSearch} />
                    <Label htmlFor="web-search">Enable Web Search</Label>
                </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Rubric
                </Button>
              </DialogFooter>
            </form>
             <div className="border-l border-border pl-8">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold">Generated Rubric:</h3>
                    {generatedRubric && (
                         <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={handleCopy}>
                                <Copy className="h-4 w-4" />
                            </Button>
                             <Button onClick={handleSave} disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save
                            </Button>
                        </div>
                    )}
                </div>
                {loading && (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                )}
                {generatedRubric && (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 overflow-auto h-[500px] border rounded-md p-2">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedRubric}</ReactMarkdown>
                    </div>
                )}
                 {!loading && !generatedRubric && (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-center p-8 bg-muted/50 rounded-lg">
                        <p>Your generated rubric will appear here.</p>
                    </div>
                )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
