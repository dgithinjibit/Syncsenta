
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Sparkles, Copy, Mail } from "lucide-react";
import { generateFamilyEmail, GenerateFamilyEmailInput } from "@/ai/flows/generate-family-email";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface GenerateFamilyEmailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GenerateFamilyEmailDialog({ open, onOpenChange }: GenerateFamilyEmailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState({ subject: "", body: "" });
  const [formData, setFormData] = useState<GenerateFamilyEmailInput>({
    parentName: "",
    studentName: "",
    topic: "",
  });
  const { toast } = useToast();

  const handleCopy = () => {
    const fullEmail = `Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`;
    navigator.clipboard.writeText(fullEmail).then(() => {
        toast({
            title: "Copied to Clipboard",
            description: "The full email has been copied.",
        });
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setGeneratedEmail({ subject: "", body: "" });

    try {
        const result = await generateFamilyEmail(formData);
        if (result.subject && result.body) {
            setGeneratedEmail(result);
        }
    } catch (error) {
        console.error(error);
        toast({
            variant: "destructive",
            title: "Error Generating Email",
            description: "An unexpected AI error occurred. Please try again.",
        });
    } finally {
        setLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData({...formData, [e.target.name]: e.target.value });
  }

  const resetState = () => {
    setLoading(false);
    setGeneratedEmail({ subject: "", body: "" });
    setFormData({ parentName: "", studentName: "", topic: "" });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
            resetState();
        }
    }}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            <Mail /> Email to Family
          </DialogTitle>
          <DialogDescription>
            Generate a professional email to send to a student's family.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4 pr-4 border-r">
                <div className="space-y-2">
                    <Label htmlFor="parentName">Parent/Guardian Name</Label>
                    <Input id="parentName" name="parentName" value={formData.parentName} onChange={handleInputChange} placeholder="e.g., Mrs. Wanjiku" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="studentName">Student Name</Label>
                    <Input id="studentName" name="studentName" value={formData.studentName} onChange={handleInputChange} placeholder="e.g., Kamau" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="topic">Topic of Email</Label>
                    <Textarea id="topic" name="topic" value={formData.topic} onChange={handleInputChange} placeholder="e.g., Positive update on class participation, concern about late homework, upcoming test reminder..." required />
                </div>
              <DialogFooter className="pt-4 sticky bottom-0 bg-background pb-2">
                <Button type="submit" disabled={loading || !formData.topic} className="w-full">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Generate Email
                </Button>
              </DialogFooter>
            </form>
            
             <div className="flex flex-col">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold">Generated Email:</h3>
                    {generatedEmail.body && (
                         <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={handleCopy}>
                                <Copy className="h-4 w-4 mr-2" /> Copy
                            </Button>
                        </div>
                    )}
                </div>
                {loading && (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                )}
                {generatedEmail.body && (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 overflow-auto flex-grow border rounded-md p-4 bg-muted/50">
                        <h4 className="font-bold">Subject: {generatedEmail.subject}</h4>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedEmail.body}</ReactMarkdown>
                    </div>
                )}
                 {!loading && !generatedEmail.body && (
                    <div className="flex flex-grow items-center justify-center h-full text-muted-foreground text-center p-8 bg-muted/50 rounded-lg">
                        <p>Your generated email will appear here.</p>
                    </div>
                )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
