"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";

interface ShareRoomDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    joinCode: string;
    onDialogClose: () => void;
}

export function ShareRoomDialog({ open, onOpenChange, joinCode, onDialogClose }: ShareRoomDialogProps) {
    const { toast } = useToast();

    const handleCopyCode = () => {
        navigator.clipboard.writeText(joinCode).then(() => {
            toast({
                title: "Code Copied!",
                description: "The join code has been copied to your clipboard.",
            });
        });
    };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-center">Share Study Bot Room</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-6 text-center">
            
            <div className="flex flex-col items-center justify-center bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Students can visit the student portal and enter the code below.</p>
                <div className="my-4 flex items-center gap-2">
                    <pre className="text-2xl font-bold text-primary bg-background p-3 rounded-lg">{joinCode}</pre>
                    <Button variant="ghost" size="icon" onClick={handleCopyCode}>
                        <Copy className="h-6 w-6" />
                        <span className="sr-only">Copy Code</span>
                    </Button>
                </div>
            </div>

            <p className="text-xs text-muted-foreground px-4">
                Please be sure to comply with your local school and district policies when using AI with students.
            </p>
        </div>
        <DialogFooter className="sm:justify-center">
          <DialogClose asChild>
            <Button type="button" variant="secondary" onClick={onDialogClose}>
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
