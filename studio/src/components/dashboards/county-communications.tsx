
"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Megaphone, Trash2, Send } from 'lucide-react';
import { AddCommunicationDialog } from '../add-communication-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Communication } from '@/lib/types';
import { format } from 'date-fns';
import { Badge } from '../ui/badge';

interface CountyCommunicationsProps {
  initialCommunications: Communication[];
}

export function CountyCommunications({ initialCommunications }: CountyCommunicationsProps) {
  const [communications, setCommunications] = useState<Communication[]>(initialCommunications);
  const [isAddCommDialogOpen, setAddCommDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setCommunications(initialCommunications);
  }, [initialCommunications]);

  const onCommunicationUpdated = () => {
    window.dispatchEvent(new CustomEvent('communication-update'));
  };

  const handleAddCommunication = (newComm: Omit<Communication, 'id' | 'date' | 'acknowledged'>) => {
    const countyOfficerName = localStorage.getItem('userName') || 'County Officer';
    const communicationToAdd: Communication = {
      ...newComm,
      id: `comm_${Date.now()}`,
      date: new Date(),
      acknowledged: false,
      sender: countyOfficerName,
    };
    
    const updatedComms = [communicationToAdd, ...communications];
    setCommunications(updatedComms);
    localStorage.setItem('mockCommunications', JSON.stringify(updatedComms));
    onCommunicationUpdated();
    
    toast({
      title: "Announcement Sent",
      description: `Your announcement "${newComm.title}" has been sent to ${newComm.recipient}.`,
    });
  };

  const handleDeleteCommunication = (commId: string) => {
    const updatedComms = communications.filter(c => c.id !== commId);
    setCommunications(updatedComms);
    localStorage.setItem('mockCommunications', JSON.stringify(updatedComms));
    onCommunicationUpdated();
    toast({
      title: "Communication Removed",
      description: "The announcement has been removed from the log.",
      variant: 'destructive',
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 font-headline text-3xl">
              <Megaphone className="w-8 h-8 text-primary" />
              Communications Hub
            </CardTitle>
            <CardDescription>
              Broadcast and track official announcements sent to schools.
            </CardDescription>
          </div>
          <Button onClick={() => setAddCommDialogOpen(true)}>
            <Send className="mr-2" />
            Broadcast New Communication
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Date Sent</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {communications.length > 0 ? communications.map((comm) => (
                <TableRow key={comm.id}>
                  <TableCell className="font-medium">
                    {comm.title}
                  </TableCell>
                   <TableCell>
                      <Badge variant="outline">{comm.recipient}</Badge>
                    </TableCell>
                  <TableCell>{format(new Date(comm.date), 'PPp')}</TableCell>
                   <TableCell>{comm.sender}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteCommunication(comm.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        No communications have been sent yet.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AddCommunicationDialog 
        open={isAddCommDialogOpen}
        onOpenChange={setAddCommDialogOpen}
        onAddCommunication={handleAddCommunication}
      />
    </>
  );
}
