
"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { SchoolResource } from '@/lib/types';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { mockSchools } from '@/lib/mock-data';

interface AddResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddResource: (resource: Omit<SchoolResource, 'id' | 'dateAllocated'>) => void;
}

export function AddResourceDialog({ open, onOpenChange, onAddResource }: AddResourceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [resourceName, setResourceName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [quantity, setQuantity] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceName.trim() || !schoolName || quantity < 1) return;
    
    setLoading(true);
    onAddResource({ resourceName, schoolName, quantity });
    setLoading(false);
    onOpenChange(false);
    
    // Reset form
    setResourceName('');
    setSchoolName('');
    setQuantity(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log New Resource Allocation</DialogTitle>
          <DialogDescription>
            Record a new resource that has been distributed to a school.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resourceName">Resource Name</Label>
                <Input 
                  id="resourceName"
                  value={resourceName}
                  onChange={(e) => setResourceName(e.target.value)}
                  placeholder="e.g., Grade 6 Science Textbooks, Laptops"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schoolName">School</Label>
                <Select value={schoolName} onValueChange={setSchoolName} required>
                    <SelectTrigger id="schoolName">
                        <SelectValue placeholder="Select a school" />
                    </SelectTrigger>
                    <SelectContent>
                        {mockSchools.map(school => (
                            <SelectItem key={school.id} value={school.name}>{school.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input 
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                  required
                  min="1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log Resource
              </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
