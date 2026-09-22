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
import { Loader2, Copy, Save, Sparkles, Send } from "lucide-react";
import { generateGenericToolContent } from "@/ai/flows/generic-teacher-tool";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { storage, db, app } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { getAuth } from "firebase/auth";

export type ToolField = {
    id: string;
    label: string;
    type: 'text' | 'textarea';
    placeholder?: string;
    defaultValue?: string;
};

interface GenericToolDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    toolId: string;
    title: string;
    description: string;
    fields: ToolField[];
    onResourceSaved: () => void;
}

export default function GenericToolDialog({ 
    open, 
    onOpenChange, 
    toolId, 
    title, 
    description, 
    fields,
    onResourceSaved 
}: GenericToolDialogProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(result).then(() => {
        toast({ title: "Copied to Clipboard" });
    });
  };

  const handleSave = async () => {
    if (!result) return;
    const auth = getAuth(app);
    if (!auth.currentUser) return;

    setLoading(true);
    try {
        const fileName = `resources/${toolId}_${Date.now()}.md`;
        const storageRef = ref(storage, fileName);
        await uploadString(storageRef, result, 'raw', { contentType: 'text/markdown' });
        const downloadURL = await getDownloadURL(storageRef);

        await addDoc(collection(db, "teacherResources"), {
            title: `${title} - ${new Date().toLocaleDateString()}`,
            url: downloadURL,
            createdAt: new Date().toISOString(),
            type: 'Other',
            joinCode: '',
            creatorId: auth.currentUser.uid
        });

        toast({ title: "Resource Saved!", description: "Check your library." });
        onOpenChange(false);
        onResourceSaved();
    } catch (error) {
        toast({ variant: "destructive", title: "Error Saving" });
    } finally {
        setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        const output = await generateGenericToolContent({
            toolId,
            toolTitle: title,
            context: "Kenyan CBC Education System",
            inputs: formData
        });
        setResult(output.result);
    } catch (error) {
        toast({ variant: "destructive", title: "AI Error" });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0 overflow-hidden">
            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2">
                {fields.map(field => (
                    <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id}>{field.label}</Label>
                        {field.type === 'textarea' ? (
                            <Textarea 
                                id={field.id}
                                placeholder={field.placeholder}
                                value={formData[field.id] || ""}
                                onChange={e => setFormData(prev => ({...prev, [field.id]: e.target.value}))}
                                className="h-32"
                                required
                            />
                        ) : (
                            <Input 
                                id={field.id}
                                placeholder={field.placeholder}
                                value={formData[field.id] || ""}
                                onChange={e => setFormData(prev => ({...prev, [field.id]: e.target.value}))}
                                required
                            />
                        )}
                    </div>
                ))}
                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
                    Generate
                </Button>
            </form>

            <div className="border-l pl-6 flex flex-col min-h-0 bg-muted/20 rounded-r-lg">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Preview</h3>
                    {result && (
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={handleCopy}><Copy className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" onClick={handleSave} disabled={loading}><Save className="h-4 w-4" /></Button>
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto prose prose-sm dark:prose-invert">
                    {result ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground italic">
                            Generated content will appear here...
                        </div>
                    )}
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
