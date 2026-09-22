
"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Package, University, Trash2 } from 'lucide-react';
import { AddResourceDialog } from '../add-resource-dialog';
import { useToast } from '@/hooks/use-toast';
import type { SchoolResource } from '@/lib/types';
import { format } from 'date-fns';

interface CountyResourceAllocationProps {
  initialResources: SchoolResource[];
}

export function CountyResourceAllocation({ initialResources }: CountyResourceAllocationProps) {
  const [resources, setResources] = useState<SchoolResource[]>(initialResources);
  const [isAddResourceDialogOpen, setAddResourceDialogOpen] = useState(false);
  const { toast } = useToast();

   useEffect(() => {
    setResources(initialResources);
  }, [initialResources]);

  const onResourceUpdated = () => {
    // We need to dispatch a custom event to tell the dashboard component to update
    window.dispatchEvent(new CustomEvent('school-resource-update'));
  }

  const handleAddResource = (newResource: Omit<SchoolResource, 'id' | 'dateAllocated'>) => {
    const resourceToAdd: SchoolResource = {
      ...newResource,
      id: `res_${Date.now()}`,
      dateAllocated: new Date().toISOString(),
    };
    
    const updatedResources = [resourceToAdd, ...resources];
    setResources(updatedResources);
    localStorage.setItem('schoolResources', JSON.stringify(updatedResources));
    onResourceUpdated();
    
    toast({
      title: "Resource Logged",
      description: `${newResource.quantity} of ${newResource.resourceName} allocated to ${newResource.schoolName}.`,
    });
  };

  const handleDeleteResource = (resourceId: string) => {
    const updatedResources = resources.filter(r => r.id !== resourceId);
    setResources(updatedResources);
    localStorage.setItem('schoolResources', JSON.stringify(updatedResources));
    onResourceUpdated();
    toast({
      title: "Resource Removed",
      description: "The resource allocation has been removed from the log.",
      variant: 'destructive',
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 font-headline text-3xl">
              <Package className="w-8 h-8 text-primary" />
              Resource Allocation Log
            </CardTitle>
            <CardDescription>
              Track and manage resources distributed to schools across the county.
            </CardDescription>
          </div>
          <Button onClick={() => setAddResourceDialogOpen(true)}>
            <PlusCircle className="mr-2" />
            Log New Resource
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Allocated To</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.length > 0 ? resources.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    {resource.resourceName}
                  </TableCell>
                  <TableCell className="flex items-center gap-2">
                    <University className="w-4 h-4 text-muted-foreground" />
                    {resource.schoolName}
                  </TableCell>
                  <TableCell>{resource.quantity}</TableCell>
                  <TableCell>{format(new Date(resource.dateAllocated), 'PP')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteResource(resource.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        No resources have been logged yet.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AddResourceDialog 
        open={isAddResourceDialogOpen}
        onOpenChange={setAddResourceDialogOpen}
        onAddResource={handleAddResource}
      />
    </>
  );
}
