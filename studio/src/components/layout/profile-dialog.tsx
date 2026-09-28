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
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

/**
 * Profile editing, for the legacy shell header and the learner header.
 *
 * This dialog used to read its "current user" from `localStorage.userName` /
 * `userEmail` / `userAvatar`, defaulting to `User / user@example.com /
 * SyncSenta School`, and its Save button wrote those same keys back and reloaded
 * the page. Nothing else in the app read them and Supabase never saw any of it,
 * so a learner could save their name, watch the dialog confirm it, and still be
 * `full_name: null` in the row every API handler reads. It was also the last
 * writer of that local-storage session — the same shape of defect that rendered
 * `/dashboard` blank for everyone.
 *
 * Name and email now come from the Supabase session and its `profiles` row, and
 * Save calls `updateProfile()`, so the change lands in the database. The avatar
 * picker is deleted rather than faked: nothing in this project uses Supabase
 * Storage yet (no bucket, no policies), and a base64 data URL saved into
 * `profiles.avatar_url` would put a multi-megabyte text value in a column every
 * auth path reads. Durable avatars are a storage-bucket migration the account
 * holder owns, not a form change.
 */
export default function ProfileDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const { toast } = useToast();
    const { user, profile, updateProfile } = useAuth();
    const [fullName, setFullName] = useState('');
    const [saving, setSaving] = useState(false);

    const email = profile?.email ?? user?.email ?? '';
    const avatarUrl = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null;

    // Seed the form from the session whenever it opens, so a cancelled edit
    // never survives into the next time the dialog is shown.
    useEffect(() => {
        if (open) {
            setFullName(profile?.full_name ?? user?.email ?? '');
        }
    }, [open, profile?.full_name, user?.email]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const nextName = fullName.trim();
        if (!nextName) {
            toast({
                title: "Name required",
                description: "Enter the name you want shown to your class.",
                variant: "destructive",
            });
            return;
        }
        if (nextName === (profile?.full_name ?? '')) {
            onOpenChange(false);
            return;
        }

        setSaving(true);
        try {
            await updateProfile({ full_name: nextName });
            toast({
                title: "Profile updated",
                description: "Saved to your account.",
            });
            onOpenChange(false);
            // Every component that calls useAuth() keeps its own copy of the
            // profile row — there is no shared provider — so the header that
            // opened this dialog would carry on showing the old name until the
            // next navigation. Reloading is the honest refresh until that state
            // is lifted into context.
            window.location.reload();
        } catch (err) {
            toast({
                title: "Not saved",
                description: err instanceof Error
                    ? err.message
                    : 'The profile update failed. Your name has not changed.',
                variant: "destructive",
            });
        } finally {
            setSaving(false);
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
                        <div className="flex flex-col items-center space-y-3">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                                <AvatarFallback>{(fullName || '?').charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <p className="text-xs text-muted-foreground text-center max-w-xs">
                                Picture changes are not available yet: this deployment has no
                                storage bucket for avatars.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 px-4">
                             <div className="space-y-2">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input
                                    id="fullName"
                                    name="fullName"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" type="email" value={email} disabled />
                            </div>
                              <div className="space-y-2">
                                <Label htmlFor="school">School</Label>
                                <Input id="school" value={profile?.school_name ?? ''} disabled />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" className="w-full" disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
