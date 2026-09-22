"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Pencil } from "lucide-react";

const defaultUser = {
    fullName: 'User',
    email: 'user@example.com',
    school: 'SyncSenta School',
};

export default function ProfileDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const { toast } = useToast();
    const [userName, setUserName] = useState(defaultUser.fullName);
    const [userEmail, setUserEmail] = useState(defaultUser.email);
    const [userAvatar, setUserAvatar] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            const storedName = localStorage.getItem('userName') || defaultUser.fullName;
            const storedEmail = localStorage.getItem('userEmail') || defaultUser.email;
            const storedAvatar = localStorage.getItem('userAvatar');
            setUserName(storedName);
            setUserEmail(storedEmail);
            setUserAvatar(storedAvatar);
        }
    }, [open]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newFullName = formData.get('fullName') as string;
        
        localStorage.setItem('userName', newFullName);
        if (userAvatar) {
            localStorage.setItem('userAvatar', userAvatar);
        }
        // Also update studentName if it exists, for consistency
        if (localStorage.getItem('studentName')) {
            localStorage.setItem('studentName', newFullName);
        }

        toast({
            title: "Profile Updated",
            description: "Your changes have been saved successfully.",
        });
        onOpenChange(false);
        window.location.reload();
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setUserAvatar(result);
                 toast({
                    title: "Picture Selected",
                    description: `New avatar is ready to be saved.`,
                });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl text-center">Your Profile</DialogTitle>
                    <DialogDescription className="text-center">
                        View and edit your personal information.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-6 py-4">
                        <div className="flex flex-col items-center space-y-4">
                            <div className="relative group">
                                <label htmlFor="picture" className="cursor-pointer">
                                    <Avatar className="h-24 w-24">
                                        <AvatarImage src={userAvatar || undefined} alt={userName} />
                                        <AvatarFallback>{userName.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <Pencil className="h-8 w-8 text-white" />
                                    </div>
                                </label>
                                <Input 
                                    id="picture" 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 px-4">
                             <div className="space-y-2">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input id="fullName" name="fullName" defaultValue={userName} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" type="email" value={userEmail} disabled />
                            </div>
                              <div className="space-y-2">
                                <Label htmlFor="school">School</Label>
                                <Input id="school" defaultValue={defaultUser.school} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" className="w-full">Save Changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
