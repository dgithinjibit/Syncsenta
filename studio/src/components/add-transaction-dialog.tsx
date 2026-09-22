"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { Transaction } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
}

const categories = ["Instructional Materials", "Transport", "Events", "Salaries", "Utilities", "Maintenance", "Other"];
const statuses = ["Completed", "Pending Approval", "Processing"];

export function AddTransactionDialog({ open, onOpenChange, onAddTransaction }: AddTransactionDialogProps) {
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newTransaction = {
      description: formData.get('description') as string,
      amount: parseFloat(formData.get('amount') as string),
      category: formData.get('category') as string,
      status: formData.get('status') as string,
    };

    if (!newTransaction.description || !newTransaction.amount || !newTransaction.category || !newTransaction.status) return;
    
    setLoading(true);
    // Simulate async operation
    setTimeout(() => {
        onAddTransaction(newTransaction);
        setLoading(false);
        onOpenChange(false);
        e.currentTarget.reset();
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
          <DialogDescription>
            Enter the details for the new financial transaction. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description"
                  name="description"
                  placeholder="e.g., Purchase of new textbooks for Form 2"
                  required
                />
              </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="amount">Amount (KES)</Label>
                    <Input 
                      id="amount"
                      name="amount"
                      type="number"
                      placeholder="e.g., 25000"
                      required
                    />
                  </div>
                 <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                     <Select name="category" required>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </div>
               </div>
                <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                     <Select name="status" required>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                        <SelectContent>
                            {statuses.map(stat => (
                                <SelectItem key={stat} value={stat}>{stat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Transaction
              </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
