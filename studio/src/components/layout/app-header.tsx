"use client";

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Settings } from "lucide-react";
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/use-auth';

const ProfileDialog = dynamic(() => import('./profile-dialog'), { ssr: false });

const getTitleFromPath = (path: string) => {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return 'Welcome';

  const lastSegment = segments[segments.length - 1];

  if (lastSegment === 'guide') {
    return 'Guide';
  }

  // Capitalize first letter and replace dashes with spaces
  return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, ' ');
};

/**
 * The legacy `/dashboard/**` shell's header.
 *
 * Identity used to come from `localStorage.userName` and `localStorage.userEmail`
 * — keys nothing in the app writes any more, except the profile dialog keeping a
 * local copy for itself — so every signed-in teacher, head and county officer saw
 * "User / user@example.com" in the account menu no matter who had signed in.
 * "Log out" was a link to `/login`, which is an alias forwarding to
 * `/auth/signin` and does not end the Supabase session, so the visitor was bounced
 * back into the workspace they meant to leave.
 *
 * Both come from the session now: `useAuth()` gives the `profiles` row and a real
 * `signOut()`, and there is no local-storage branch left to fall back into.
 */
export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [title, setTitle] = useState('Dashboard');

  const displayName = profile?.full_name ?? user?.email ?? 'Signed out';
  const displayEmail = profile?.email ?? user?.email ?? '';
  const avatarUrl = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null;

  useEffect(() => {
    setTitle(getTitleFromPath(pathname));
  }, [pathname]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      // /auth/signin rather than the /login alias: after an explicit sign-out the
      // alias just forwarded back to the same form, with an extra hop.
      router.replace('/auth/signin');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <SidebarTrigger className="md:hidden" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold md:text-2xl font-headline">{title}</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full"
              disabled={loading}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={avatarUrl || undefined} alt="User Avatar" />
                <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {displayEmail}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setProfileOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleSignOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      {isProfileOpen && <ProfileDialog open={isProfileOpen} onOpenChange={setProfileOpen} />}
    </>
  );
}
