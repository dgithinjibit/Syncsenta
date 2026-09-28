
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { User, ArrowLeft, LogOut, Settings, Video } from 'lucide-react';
import ProfileDialog from './profile-dialog';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface StudentHeaderProps {
  showBackButton: boolean;
  onBack: () => void;
  showVideoCallButton?: boolean;
  onJoinVideoCall?: () => void;
}

export function StudentHeader({ showBackButton, onBack, showVideoCallButton = false, onJoinVideoCall }: StudentHeaderProps) {
  const [isProfileOpen, setProfileOpen] = useState(false);
  const router = useRouter();
  // The learner's name and avatar come from the Supabase session and its
  // `profiles` row. This used to read `localStorage.studentName` and
  // `localStorage.userAvatar`, which the Supabase sign-in flow never writes, so
  // the menu showed "Student" for a signed-in learner; and "Log out" was
  // `router.push('/login')`, which forwards to the sign-in form while keeping
  // the session alive — the learner was signed in and looking at the sign-in
  // page at the same time.
  const { user, profile, loading, signOut } = useAuth();

  const fullName = profile?.full_name ?? user?.email ?? 'Student';
  const firstName = fullName.split(' ')[0];
  const avatarUrl = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null;

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      router.replace('/auth/signin');
    }
  };

  return (
    <>
        <div className="relative flex items-center justify-between py-4 px-6 text-foreground">
            <div className="z-10">
                {showBackButton && (
                    <Button variant="ghost" size="icon" onClick={onBack} className="text-muted-foreground hover:text-foreground hover:bg-muted">
                        <ArrowLeft />
                        <span className="sr-only">Back</span>
                    </Button>
                )}
            </div>
            
            <div className="absolute inset-x-0 text-center pointer-events-none sm:block hidden">
                <h1 className="font-headline text-4xl font-bold">Karibu!</h1>
                <p className="text-muted-foreground text-lg">
                    I’m Mwalimu AI, your friendly Socratic Mentor.
                </p>
            </div>
            
            <div className="flex items-center gap-2 z-10">
                {showVideoCallButton && (
                    <Button onClick={onJoinVideoCall} className="bg-green-500 hover:bg-green-600">
                        <Video className="mr-2" />
                        Join Video Call
                    </Button>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button
                            variant="outline"
                            className="flex items-center gap-2 rounded-full h-12 px-4 bg-background/80 border-border text-foreground hover:bg-muted hover:border-border/80"
                            disabled={loading}
                          >
                            <Avatar className="h-8 w-8">
                               <AvatarImage src={avatarUrl || undefined} alt="Profile Picture" />
                               <AvatarFallback>{firstName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="hidden sm:inline">Profile</span>
                          </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                         <DropdownMenuLabel>My Account</DropdownMenuLabel>
                         <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Profile Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void handleLogout()}>
                           <LogOut className="mr-2 h-4 w-4" />
                           <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
        <ProfileDialog open={isProfileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}
