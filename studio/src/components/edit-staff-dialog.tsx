
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { TeachingStaff, NonTeachingStaff } from '@/lib/types';

interface EditStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffMember: TeachingStaff | NonTeachingStaff;
  onUpdateStaff: (staffMember: TeachingStaff | NonTeachingStaff) => void;
}

export function EditStaffDialog({ open, onOpenChange, staffMember, onUpdateStaff }: EditStaffDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    if (staffMember) {
      setName(staffMember.name);
      setRole(staffMember.role);
    }
  }, [staffMember]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;
    
    setLoading(true);
    onUpdateStaff({
        ...staffMember,
        name,
        role,
    });
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Staff Details</DialogTitle>
          <DialogDescription>
            Update the information for {staffMember.name}.
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
                  required
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="role">Role / Subjects</Label>
                 <Input 
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                />
              </div>
              {'tscNo' in staffMember && (
                <div className="space-y-2">
                    <Label htmlFor="tscNo">TSC No.</Label>
                    <Input id="tscNo" value={staffMember.tscNo} disabled />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
