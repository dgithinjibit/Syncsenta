
"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';

interface AddStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddStaff: (staff: { name: string; role: string }) => void;
  title: string;
  description: string;
}

export function AddStaffDialog({ open, onOpenChange, onAddStaff, title, description }: AddStaffDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;
    
    setLoading(true);
    onAddStaff({ name, role });
    setLoading(false);
    onOpenChange(false);
    
    // Reset form
    setName('');
    setRole('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Jane Doe"
                  required
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                 <Input 
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g., Bursar, Mathematics Teacher"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Staff Member
              </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    
