
"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Textarea } from './ui/textarea';

interface CreateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateReport: (report: { title: string; content: string }) => void;
  className: string;
}

export function CreateReportDialog({ open, onOpenChange, onCreateReport, className }: CreateReportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    
    setLoading(true);
    onCreateReport({ title, content });
    setLoading(false);
    onOpenChange(false);
    
    // Reset form
    setTitle('');
    setContent('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Report for School Head</DialogTitle>
          <DialogDescription>
            Write a report regarding the class: <span className="font-bold">{className}</span>. This will be sent to the School Head.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Report Title</Label>
                <Input 
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Incident in Morning Assembly"
                  required
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="content">Report Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="e.g., Detail the issue or observation here..."
                  required
                  className="h-32"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Report
              </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
