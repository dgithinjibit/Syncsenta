"use client";

import { useState, useEffect } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from "@/components/ui/toaster"
import { ThemeToggleButton } from '@/components/ui/theme-toggle-button';
import { AppInstallPrompt } from '@/components/app-install-prompt';

export function ClientProviders({ children }: { children: React.ReactNode }) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <>{children}</>;
    }

    return (
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <ThemeToggleButton />
          <AppInstallPrompt />
        </ThemeProvider>
    );
}
