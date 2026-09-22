

"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { ClassInfo, Student, Communication } from '@/lib/types';
import { PlusCircle, User, Trash2, Save, Send } from 'lucide-react';
import { format } from 'date-fns';
import { CreateReportDialog } from './create-report-dialog';

interface DigitalAttendanceRegisterProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classInfo: ClassInfo;
    onClassNameUpdate: (classId: string, newName: string) => void;
    onUpdateStudents: (classId: string, students: Student[]) => void;
}

type AttendanceStatus = 'present' | 'absent';
type AttendanceRecord = {
    morning?: AttendanceStatus;
    evening?: AttendanceStatus;
};
type AttendanceState = Record<string, Record<string, AttendanceRecord>>; // { [date]: { [studentId]: record } }

export function DigitalAttendanceRegister({ open, onOpenChange, classInfo, onClassNameUpdate, onUpdateStudents }: DigitalAttendanceRegisterProps) {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [attendance, setAttendance] = useState<AttendanceState>({});
    const [students, setStudents] = useState<Student[]>([]);
    const [className, setClassName] = useState('');
    const [newStudentName, setNewStudentName] = useState('');
    const [isReportDialogOpen, setReportDialogOpen] = useState(false);
    const { toast } = useToast();

    // Load data from localStorage when the component mounts or classInfo changes
    useEffect(() => {
        if (open && classInfo) {
            setClassName(classInfo.name);
            setStudents(classInfo.students);
            const storedAttendance = localStorage.getItem(`attendance_${classInfo.id}`);
            setAttendance(storedAttendance ? JSON.parse(storedAttendance) : {});
        }
    }, [classInfo, open]);

    const handleSave = () => {
        localStorage.setItem(`attendance_${classInfo.id}`, JSON.stringify(attendance));
        
        onUpdateStudents(classInfo.id, students);

        if (className !== classInfo.name) {
            onClassNameUpdate(classInfo.id, className);
        }
        
        toast({
            title: "Changes Saved",
            description: "Your attendance records and class details have been updated.",
        });
        onOpenChange(false);
    };

    const handleAttendanceChange = (studentId: string, session: 'morning' | 'evening', checked: boolean) => {
        if (!selectedDate) return;
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        
        setAttendance(prev => {
            const newAttendance = { ...prev };
            if (!newAttendance[dateKey]) newAttendance[dateKey] = {};
            if (!newAttendance[dateKey][studentId]) newAttendance[dateKey][studentId] = {};
            
            newAttendance[dateKey][studentId][session] = checked ? 'present' : 'absent';
            return newAttendance;
        });
    };

    const handleAddStudent = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStudentName.trim()) return;

        const newStudent: Student = {
            id: `stud_${Date.now()}`,
            name: newStudentName.trim(),
            chatTokens: 100,
        };

        setStudents(prev => [...prev, newStudent]);
        setNewStudentName('');
        toast({
            title: 'Student Added',
            description: `${newStudent.name} has been added to ${className}. Remember to save your changes.`,
        });
    };
    
    const handleDeleteStudent = (studentId: string) => {
        setStudents(prev => prev.filter(s => s.id !== studentId));
         toast({
            title: 'Student Removed',
            description: "The student has been removed from the list. Remember to save your changes.",
            variant: 'destructive'
        });
    }

    const handleCreateReport = (report: { title: string, content: string }) => {
        const teacherName = localStorage.getItem('userName') || 'Teacher';

        const newCommunication: Communication = {
            id: `comm_${Date.now()}`,
            ...report,
            recipient: 'School Head',
            date: new Date(),
            acknowledged: false,
            sender: `${teacherName} (${classInfo.name})`,
        };
        
        const existingComms: Communication[] = JSON.parse(localStorage.getItem('mockCommunications') || '[]');
        localStorage.setItem('mockCommunications', JSON.stringify([newCommunication, ...existingComms]));

        toast({
            title: "Report Sent",
            description: "Your report has been sent to the School Head.",
        });
    };

    const dateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
    const dailyAttendance = attendance[dateKey] || {};

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
                    <DialogHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <DialogTitle className="font-headline text-2xl">Digital Attendance Register</DialogTitle>
                                <div className="flex items-center gap-2 pt-2">
                                    <Label htmlFor="className" className="text-sm font-medium">Class Name:</Label>
                                    <Input 
                                        id="className"
                                        value={className}
                                        onChange={(e) => setClassName(e.target.value)}
                                        className="text-lg font-bold h-9"
                                    />
                                </div>
                                <DialogDescription className="mt-2">
                                    Marking attendance for <span className="font-bold text-primary">{format(selectedDate ?? new Date(), 'PPP')}</span>.
                                </DialogDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" onClick={() => setReportDialogOpen(true)}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Report to Head
                                </Button>
                                <Button onClick={handleSave} className="w-full sm:w-auto">
                                    <Save className="mr-2 h-4 w-4" />
                                    Save & Close
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="grid md:grid-cols-3 gap-6 flex-1 min-h-0 pt-4">
                        <div className="md:col-span-1 flex flex-col gap-4">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                className="rounded-md border"
                            />
                            <form onSubmit={handleAddStudent} className="border rounded-lg p-4 space-y-3">
                                <h3 className="font-semibold flex items-center gap-2"><PlusCircle className="w-5 h-5"/> Add New Student</h3>
                                <Input 
                                    placeholder="Enter student's full name"
                                    value={newStudentName}
                                    onChange={(e) => setNewStudentName(e.target.value)}
                                />
                                <Button type="submit" className="w-full">Add to Register</Button>
                            </form>
                        </div>
                        <div className="md:col-span-2 flex flex-col min-h-0">
                            <h3 className="font-semibold mb-2">Student List ({students.length})</h3>
                            <ScrollArea className="flex-1 border rounded-md">
                            <Table>
                                    <TableHeader className="sticky top-0 bg-muted">
                                        <TableRow>
                                            <TableHead>Student Name</TableHead>
                                            <TableHead className="text-center">Morning</TableHead>
                                            <TableHead className="text-center">Evening</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {students.map(student => (
                                            <TableRow key={student.id}>
                                                <TableCell className="font-medium flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground"/> {student.name}</TableCell>
                                                <TableCell className="text-center">
                                                    <Checkbox 
                                                        checked={dailyAttendance[student.id]?.morning === 'present'}
                                                        onCheckedChange={(checked) => handleAttendanceChange(student.id, 'morning', !!checked)}
                                                        disabled={!selectedDate}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Checkbox 
                                                        checked={dailyAttendance[student.id]?.evening === 'present'}
                                                        onCheckedChange={(checked) => handleAttendanceChange(student.id, 'evening', !!checked)}
                                                        disabled={!selectedDate}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteStudent(student.id)}>
                                                        <Trash2 className="w-4 h-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                            </Table>
                            </ScrollArea>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            <CreateReportDialog
                open={isReportDialogOpen}
                onOpenChange={setReportDialogOpen}
                onCreateReport={handleCreateReport}
                className={className}
            />
        </>
    );
}
