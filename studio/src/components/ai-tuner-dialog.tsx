
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import type { TeacherResource } from "@/lib/types";

interface AITunerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onResourceSaved: () => void;
}

export function AITunerDialog({ open, onOpenChange, onResourceSaved }: AITunerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const savedContext = localStorage.getItem("ai_tutor_context") || "";
      setContext(savedContext);
    }
  }, [open]);
  
  const handleSave = () => {
    setLoading(true);

    const resourceId = `tutor_ctx_${Date.now()}`;

    const newResource: TeacherResource = {
      id: resourceId,
      title: "AI Tutor Custom Context",
      content: context,
      createdAt: new Date().toISOString(),
      type: 'AI Tutor Context',
      joinCode: `syncsenta-${resourceId}`,
      creatorId: 'teacher_demo',
    };

    const existingResources: TeacherResource[] = JSON.parse(localStorage.getItem("teacherResources") || "[]");
    
    const otherResources = existingResources.filter(r => r.type !== 'AI Tutor Context');
    
    localStorage.setItem("teacherResources", JSON.stringify([newResource, ...otherResources]));
    
    toast({
      title: "AI Tutor Context Saved!",
      description: `Share this code with students: ${resourceId}`,
      duration: 10000, // Make toast persistent
    });

    setLoading(false);
    onOpenChange(false);
    onResourceSaved();
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline">AI Tuner</DialogTitle>
          <DialogDescription>
            Provide specific context, materials, or instructions for your AI tutor. This will be its ONLY source of knowledge. After saving, share the generated code with your students.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <Label htmlFor="tuner-context">Tutor Knowledge Context</Label>
            <Textarea 
                id="tuner-context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Paste your lesson notes, a story, or any text you want the AI to use..."
                className="h-64 mt-2"
            />
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save & Get Code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
