

"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, Trash2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClassInfo, Student } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

interface AddClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveClass: (classDetails: { name: string; color: string; students: Student[] }, classId?: string) => void;
  initialData?: ClassInfo | null;
}

const colors = [
  'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500', 
  'bg-red-500', 'bg-yellow-500', 'bg-pink-500', 'bg-teal-500'
];

export function AddClassDialog({ open, onOpenChange, onSaveClass, initialData }: AddClassDialogProps) {
  const [className, setClassName] = useState('');
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
        setClassName(initialData.name);
        setSelectedColor(initialData.color);
        setStudents(initialData.students || []);
    } else {
        setClassName('');
        setSelectedColor(colors[0]);
        setStudents([]);
    }
  }, [initialData, open]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) return;
    
    setLoading(true);
    onSaveClass({ name: className, color: selectedColor, students }, initialData?.id);
    setLoading(false);
    onOpenChange(false);
  };
  
  const handleAddStudent = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newStudentName.trim()) return;
      setStudents(prev => [...prev, {id: `new_${Date.now()}`, name: newStudentName.trim(), chatTokens: 100}]);
      setNewStudentName('');
  }
  
  const handleRemoveStudent = (studentId: string) => {
      setStudents(prev => prev.filter(s => s.id !== studentId));
  }

  const dialogTitle = initialData ? 'Edit Class' : 'Add a New Class';
  const dialogDescription = initialData 
    ? "Update the name, color, and student roster for this class." 
    : "Enter the name for your new class, choose a color, and add your students.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 gap-6 py-4">
                {/* Left side: Class details */}
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="className">Class Name</Label>
                        <Input 
                        id="className"
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                        placeholder="e.g., Form 3 Mathematics"
                        required
                        />
                    </div>
                    <div>
                        <Label>Class Color</Label>
                        <div className="flex flex-wrap gap-2 pt-2">
                        {colors.map(color => (
                            <button
                            type="button"
                            key={color}
                            className={cn(
                                "w-8 h-8 rounded-full border-2 transition-transform transform hover:scale-110",
                                color,
                                selectedColor === color ? 'border-primary ring-2 ring-offset-2 ring-primary' : 'border-transparent'
                            )}
                            onClick={() => setSelectedColor(color)}
                            />
                        ))}
                        </div>
                    </div>
                </div>

                {/* Right side: Student management */}
                <div className="space-y-4 border-l pl-6">
                     <div>
                        <Label htmlFor="studentName">Add Students</Label>
                        <div className="flex items-center gap-2 mt-1">
                            <Input
                                id="studentName"
                                value={newStudentName}
                                onChange={(e) => setNewStudentName(e.target.value)}
                                placeholder="Enter student name..."
                            />
                            <Button type="button" size="icon" onClick={handleAddStudent}>
                                <PlusCircle className="w-4 h-4" />
                            </Button>
                        </div>
                     </div>
                     <Separator />
                     <h4 className="text-sm font-medium">Student Roster ({students.length})</h4>
                     <ScrollArea className="h-48">
                         <div className="space-y-2 pr-4">
                            {students.length > 0 ? students.map(student => (
                                <div key={student.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded-md">
                                    <span className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-muted-foreground" />
                                        {student.name}
                                    </span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveStudent(student.id)}>
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                </div>
                            )) : (
                                <p className="text-xs text-muted-foreground text-center pt-4">No students added yet.</p>
                            )}
                         </div>
                     </ScrollArea>
                </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Class
              </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
