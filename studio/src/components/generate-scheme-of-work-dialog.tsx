
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
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Copy, Calendar, FileDown, Sparkles } from "lucide-react";
import { generateSchemeOfWork, GenerateSchemeOfWorkInput } from "@/ai/flows/generate-scheme-of-work";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { TeacherResource } from "@/lib/types";
import { buildSchemePrintDocument } from "@/lib/print-scheme";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { storage, db, app } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { getAuth } from "firebase/auth";

const grades = [
    "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"
];

interface GenerateSchemeOfWorkDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onResourceSaved: () => void;
}

export default function GenerateSchemeOfWorkDialog({ open, onOpenChange, onResourceSaved }: GenerateSchemeOfWorkDialogProps) {
  const [loading, setLoading] = useState(false);
  const [generatedScheme, setGeneratedScheme] = useState("");
  const { toast } = useToast();
  const [lessonsPerWeek, setLessonsPerWeek] = useState(5);

  const [formData, setFormData] = useState({
    grade: "",
    subject: "",
    strand: "",
    subStrand: "",
    context: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedScheme).then(() => {
        toast({
            title: "Copied to Clipboard",
        });
    });
  };

  const handleExportPDF = () => {
    const printContent = document.getElementById("scheme-print-area");
    if (!printContent) return;

    const windowWin = window.open('', '', 'width=1000,height=800');
    if (!windowWin) {
      toast({
        variant: 'destructive',
        title: 'Pop-up blocked',
        description: 'Allow pop-ups for this site to export the scheme as a PDF.',
      });
      return;
    }

    // DOM calls only: the sub-strand and the model's own table cells are text,
    // never markup, in a window that carries the teacher's session.
    buildSchemePrintDocument(windowWin.document, {
      grade: formData.grade,
      subject: formData.subject,
      strand: formData.strand,
      subStrand: formData.subStrand,
      lessonsPerWeek,
    }, printContent);

    windowWin.focus();
    setTimeout(() => {
      windowWin.print();
      windowWin.close();
    }, 500);
  };

  const handleSave = async () => {
    if (!generatedScheme) return;
    
    const auth = getAuth(app);
    const user = auth.currentUser;

    if (!user) {
        toast({ variant: 'destructive', title: 'Auth Error', description: 'User session not found.' });
        return;
    }

    setLoading(true);

    try {
        const fileName = `schemes_of_work/${Date.now()}_${formData.subStrand.replace(/\s+/g, '_')}.md`;
        const storageRef = ref(storage, fileName);
        
        await uploadString(storageRef, generatedScheme, 'raw', { contentType: 'text/markdown' });
        const downloadURL = await getDownloadURL(storageRef);

        const newResource: Omit<TeacherResource, 'id'> = {
          title: `${formData.subStrand} - Scheme of Work`,
          url: downloadURL,
          createdAt: new Date().toISOString(),
          type: 'Scheme of Work',
          joinCode: '',
          creatorId: user.uid
        };

        await addDoc(collection(db, "teacherResources"), newResource);
        
        toast({
          title: "Scheme of Work Saved!",
          description: `"${newResource.title}" has been added to your library.`,
        });

        onOpenChange(false);
        onResourceSaved();
    } catch (error) {
        console.error("Error saving scheme of work:", error);
        toast({
            variant: "destructive",
            title: "Error Saving Scheme",
            description: "Could not save the scheme of work to the cloud. Please try again."
        });
    } finally {
        setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setGeneratedScheme("");

    const data: GenerateSchemeOfWorkInput = {
      subject: formData.subject,
      grade: formData.grade,
      strand: formData.strand,
      subStrand: formData.subStrand,
      lessonsPerWeek: lessonsPerWeek.toString(),
      schemeOfWorkContext: formData.context, 
    };
    
    try {
        const result = await generateSchemeOfWork(data);
        if (result.schemeOfWork) {
            setGeneratedScheme(result.schemeOfWork);
        }
    } catch (error) {
        console.error(error);
        toast({
            variant: "destructive",
            title: "Error generating scheme of work",
            description: "An unexpected error occurred. Please try again.",
        });
    } finally {
        setLoading(false);
    }
  };
  
  const resetForm = () => {
      setGeneratedScheme('');
      setLoading(false);
      setFormData({
        grade: "",
        subject: "",
        strand: "",
        subStrand: "",
        context: ""
      });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
            resetForm();
        }
    }}>
      <DialogContent className="sm:max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            <Calendar className="text-primary" />
            Schemer: CBC Scheme of Work (Grade 1-12)
          </DialogTitle>
          <DialogDescription>
             Create a detailed, table-formatted Scheme of Work aligned with official curriculum guidelines.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 min-h-0 pt-4">
            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="grade">Grade Level</Label>
                        <Select name="grade" value={formData.grade} onValueChange={v => setFormData(prev => ({...prev, grade: v}))} required>
                            <SelectTrigger><SelectValue placeholder="Select grade..." /></SelectTrigger>
                            <SelectContent>
                                {grades.map(g => (
                                    <SelectItem key={g} value={g}>{g}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input 
                            id="subject" 
                            name="subject" 
                            placeholder="e.g., Science and Technology" 
                            value={formData.subject} 
                            onChange={handleInputChange} 
                            required 
                        />
                    </div>
                </div>

                 <div className="space-y-2">
                    <Label htmlFor="strand">Strand</Label>
                    <Input 
                        id="strand" 
                        name="strand" 
                        placeholder="e.g., 1.0 Living Things" 
                        value={formData.strand} 
                        onChange={handleInputChange} 
                        required 
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="subStrand">Sub-Strand</Label>
                    <Input 
                        id="subStrand" 
                        name="subStrand" 
                        placeholder="e.g., 1.1 Plants" 
                        value={formData.subStrand} 
                        onChange={handleInputChange} 
                        required 
                    />
                </div>
                
                <div className="space-y-4">
                    <Label htmlFor="lessonsPerWeek">Total Lessons for Sub-Strand: {lessonsPerWeek}</Label>
                    <Slider id="lessonsPerWeek" name="lessonsPerWeek" min={1} max={15} step={1} value={[lessonsPerWeek]} onValueChange={(value) => setLessonsPerWeek(value[0])} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="context">Reference Notes / Learning Outcomes (Optional)</Label>
                    <Textarea 
                        id="context" 
                        name="context" 
                        placeholder="Paste specific curriculum details here to ensure perfect alignment..." 
                        value={formData.context} 
                        onChange={handleInputChange} 
                        className="h-32"
                    />
                </div>
                
                <DialogFooter className="pt-4 sticky bottom-0 bg-background pb-2 border-t">
                    <Button type="submit" disabled={loading} className="w-full">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    {loading ? "Generating..." : "Generate Table"}
                    </Button>
                </DialogFooter>
            </form>
             <div className="border-l border-border pl-8 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-2 flex-shrink-0">
                    <h3 className="font-bold">Preview:</h3>
                    {generatedScheme && (
                         <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={handleCopy} title="Copy to clipboard">
                                <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleExportPDF} title="Download as PDF">
                                <FileDown className="h-4 w-4 mr-2" /> PDF
                            </Button>
                             <Button onClick={handleSave} disabled={loading} size="sm">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4 mr-2" />}
                                Save to Library
                            </Button>
                        </div>
                    )}
                </div>
                <div className="flex-grow overflow-auto border rounded-md p-4 bg-muted/30">
                    {loading && (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    )}
                    {generatedScheme && (
                        <div id="scheme-print-area" className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 overflow-auto">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedScheme}</ReactMarkdown>
                        </div>
                    )}
                     {!loading && !generatedScheme && (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-center p-8">
                            <p>Your generated table will appear here. Fill out the form to start.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
