"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from "next/link";
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

export function AppHeader() {
  const pathname = usePathname();
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('user@example.com');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [title, setTitle] = useState('Dashboard');

  useEffect(() => {
    const storedName = localStorage.getItem('userName');
    const storedEmail = localStorage.getItem('userEmail');
    const storedAvatar = localStorage.getItem('userAvatar');
    if (storedName) setUserName(storedName);
    if (storedEmail) setUserEmail(storedEmail);
    if (storedAvatar) setUserAvatar(storedAvatar);
  }, []);
  
  useEffect(() => {
      setTitle(getTitleFromPath(pathname));
  }, [pathname]);

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
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={userAvatar || undefined} alt="User Avatar" />
                <AvatarFallback>{userName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {userEmail}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setProfileOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/login">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      {isProfileOpen && <ProfileDialog open={isProfileOpen} onOpenChange={setProfileOpen} />}
    </>
  );
}
