
"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { Communication } from '@/lib/types';
import { Textarea } from './ui/textarea';

interface AddCommunicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCommunication: (communication: Omit<Communication, 'id' | 'date' | 'acknowledged'>) => void;
}

export function AddCommunicationDialog({ open, onOpenChange, onAddCommunication }: AddCommunicationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [recipient, setRecipient] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !recipient.trim()) return;
    
    setLoading(true);
    onAddCommunication({ title, content, recipient });
    setLoading(false);
    onOpenChange(false);
    
    // Reset form
    setTitle('');
    setContent('');
    setRecipient('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Announcement</DialogTitle>
          <DialogDescription>
            Create a new announcement to be sent out. It will appear in the Communications Hub.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input 
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Upcoming Staff Meeting"
                  required
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="e.g., Please be advised of a mandatory meeting..."
                  required
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="recipient">Recipient</Label>
                <Input 
                  id="recipient"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="e.g., All Staff, Grade 5 Teachers"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Announcement
              </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
