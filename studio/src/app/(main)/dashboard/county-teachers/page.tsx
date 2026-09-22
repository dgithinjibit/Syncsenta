
"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { AddStaffDialog } from '@/components/add-staff-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import type { TeachingStaff } from '@/lib/types';
import { initialTeachingStaff } from '@/lib/mock-data';

export default function CountyTeachersPage() {
    const [teachingStaff, setTeachingStaff] = useState<TeachingStaff[]>([]);
    const [isAddTeacherDialogOpen, setAddTeacherDialogOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // In a real app, this would fetch all teachers in the county.
        const storedTeaching = localStorage.getItem('mockTeachingStaff');
        if (storedTeaching) {
            setTeachingStaff(JSON.parse(storedTeaching));
        } else {
            setTeachingStaff(initialTeachingStaff);
            localStorage.setItem('mockTeachingStaff', JSON.stringify(initialTeachingStaff));
        }
    }, []);

    const handleAddTeacher = (teacher: { name: string; role: string }) => {
        const newTeacher: TeachingStaff = { 
            ...teacher, 
            id: `t-${Date.now()}`, 
            tscNo: `TSC-${Math.floor(10000 + Math.random() * 90000)}`,
            category: 'Teaching'
        };
        const updatedStaff = [...teachingStaff, newTeacher];
        setTeachingStaff(updatedStaff);
        localStorage.setItem('mockTeachingStaff', JSON.stringify(updatedStaff));
        toast({
            title: "Teacher Added",
            description: `${teacher.name} has been added to the county teaching staff list.`
        });
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>County Teacher Management</CardTitle>
                        <CardDescription>
                            A master list of all teachers in the county, their qualifications, and deployment status.
                        </CardDescription>
                    </div>
                     <Button onClick={() => setAddTeacherDialogOpen(true)}>
                        <PlusCircle className="mr-2" />
                        Add New Teacher
                    </Button>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>TSC No.</TableHead>
                                <TableHead>Current School</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {teachingStaff.map((staff) => (
                                <TableRow key={staff.id}>
                                    <TableCell className="font-medium">{staff.name}</TableCell>
                                    <TableCell>{staff.tscNo}</TableCell>
                                    <TableCell><Badge variant="outline">Grace View Primary</Badge></TableCell>
                                    <TableCell className="text-right">
                                         <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                                <DropdownMenuItem>Initiate Transfer</DropdownMenuItem>
                                                 <DropdownMenuItem className="text-destructive">Remove from Roster</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
             <AddStaffDialog 
                open={isAddTeacherDialogOpen}
                onOpenChange={setAddTeacherDialogOpen}
                onAddStaff={handleAddTeacher}
                title="Add New Teacher to County"
                description="Enter the details for the new teaching staff member."
            />
        </>
    );
}
