
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Save } from "lucide-react";
import { differentiateWorksheet, DifferentiateWorksheetInput } from "@/ai/flows/differentiate-worksheet";
import type { TeacherResource } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { storage, db, app } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { getAuth } from "firebase/auth";


const differentiationLevels = [
    { id: "simpler", label: "Simpler Language" },
    { id: "advanced", label: "Advanced Challenge" },
];

interface DifferentiateWorksheetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onResourceSaved: () => void;
}

type DifferentiatedContent = {
    level: string;
    content: string;
};

export default function DifferentiateWorksheetDialog({ open, onOpenChange, onResourceSaved }: DifferentiateWorksheetDialogProps) {
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<DifferentiatedContent[]>([]);
  const [originalContent, setOriginalContent] = useState("");
  const [currentTopic, setCurrentTopic] = useState("Untitled Worksheet");
  const { toast } = useToast();
  const [selectedLevels, setSelectedLevels] = useState<string[]>(["simpler", "advanced"]);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
        toast({
            title: "Copied to Clipboard",
        });
    });
  };

  const handleSave = async () => {
    if (generatedContent.length === 0) return;
    
    const auth = getAuth(app);
    const user = auth.currentUser;

    if (!user) {
        toast({ variant: 'destructive', title: 'Auth Error', description: 'User session not found.' });
        return;
    }

    setLoading(true);
    
    const contentToSave = [
      { level: "Original", content: originalContent },
      ...generatedContent
    ].map(item => `## ${item.level}\n\n${item.content}`).join("\n\n---\n\n");

    try {
        const fileName = `differentiated_worksheets/${Date.now()}_${currentTopic.replace(/\s+/g, '_')}.md`;
        const storageRef = ref(storage, fileName);
        
        await uploadString(storageRef, contentToSave, 'raw', { contentType: 'text/markdown' });
        const downloadURL = await getDownloadURL(storageRef);

        const newResource: Omit<TeacherResource, 'id'> = {
          title: `Differentiated - ${currentTopic}`,
          url: downloadURL,
          createdAt: new Date().toISOString(),
          type: 'Differentiated Worksheet',
          joinCode: '',
          creatorId: user.uid
        };

        await addDoc(collection(db, "teacherResources"), newResource);
        
        toast({
          title: "Worksheet Saved!",
          description: `"${newResource.title}" has been added to your library.`,
        });

        onOpenChange(false);
        onResourceSaved();
    } catch (error) {
        console.error("Error saving differentiated worksheet:", error);
        toast({
            variant: "destructive",
            title: "Error Saving Worksheet",
            description: "Could not save the worksheet to the cloud. Please try again."
        });
    } finally {
        setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setGeneratedContent([]);

    const formData = new FormData(event.currentTarget);
    const originalText = formData.get("originalContent") as string;
    setOriginalContent(originalText);
    setCurrentTopic(formData.get("topic") as string || "Untitled Worksheet");
    
    const data: DifferentiateWorksheetInput = {
      originalContent: originalText,
      gradeLevel: formData.get("gradeLevel") as string,
      subject: formData.get("subject") as string,
      levels: selectedLevels.map(id => differentiationLevels.find(l => l.id === id)!.label),
    };
    
    try {
        const result = await differentiateWorksheet(data);
        if (result.differentiatedContent) {
            setGeneratedContent(result.differentiatedContent);
        }
    } catch (error) {
        console.error(error);
        toast({
            variant: "destructive",
            title: "Error generating worksheet",
            description: "An unexpected error occurred. Please try again.",
        });
    } finally {
        setLoading(false);
    }
  };
  
  const handleLevelChange = (levelId: string, checked: boolean) => {
      if(checked) {
          setSelectedLevels(prev => [...prev, levelId]);
      } else {
          setSelectedLevels(prev => prev.filter(id => id !== levelId));
      }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
            setGeneratedContent([]);
            setOriginalContent("");
        }
    }}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-headline">Differentiation Station</DialogTitle>
          <DialogDescription>
            Adapt existing materials for different reading levels. The AI will only use the text you provide.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4 pr-4">
                <div className="space-y-2">
                    <Label htmlFor="topic">Topic / Title</Label>
                    <Input id="topic" name="topic" placeholder="e.g., The Water Cycle" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="gradeLevel">Grade Level</Label>
                        <Select name="gradeLevel" defaultValue="Grade 5">
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
                        <Label htmlFor="subject">Subject</Label>
                        <Input id="subject" name="subject" defaultValue="Science" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="originalContent">Original Worksheet Text</Label>
                    <Textarea id="originalContent" name="originalContent" placeholder="Paste your original text here..." className="h-48" />
                </div>
                 <div className="space-y-2">
                    <Label>Select Levels to Generate</Label>
                    <div className="flex flex-col space-y-2">
                        {differentiationLevels.map(level => (
                             <div key={level.id} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={level.id}
                                    checked={selectedLevels.includes(level.id)}
                                    onCheckedChange={(checked) => handleLevelChange(level.id, !!checked)}
                                />
                                <Label htmlFor={level.id} className="font-normal">{level.label}</Label>
                            </div>
                        ))}
                    </div>
                 </div>
              <DialogFooter className="pt-4 sticky bottom-0 bg-background pb-2">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Differentiate Text
                </Button>
              </DialogFooter>
            </form>
            
             <div className="border-l border-border pl-8">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold">Generated Versions:</h3>
                    {generatedContent.length > 0 && (
                        <Button onClick={handleSave} size="sm" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save All
                        </Button>
                    )}
                </div>

                {loading && (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                )}
                
                {generatedContent.length > 0 && (
                    <Tabs defaultValue={generatedContent[0].level} className="w-full">
                        <TabsList>
                            {generatedContent.map(item => (
                                <TabsTrigger key={item.level} value={item.level}>{item.level}</TabsTrigger>
                            ))}
                        </TabsList>
                        {generatedContent.map(item => (
                             <TabsContent key={item.level} value={item.level}>
                                 <div className="relative mt-2">
                                    <Textarea value={item.content} className="h-64" readOnly />
                                    <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => handleCopy(item.content)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                 </div>
                             </TabsContent>
                        ))}
                    </Tabs>
                )}

                 {!loading && generatedContent.length === 0 && (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-center p-8 bg-muted/50 rounded-lg">
                        <p>Your differentiated worksheets will appear here.</p>
                    </div>
                )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
