"use client";

import type { ReactNode } from "react";
import Link from 'next/link';
import { AgeThemeProvider } from '@/lib/theme/age-theme-context';
import { RoleGate } from '@/components/auth/role-gate';

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGate allowedRoles={['student']}>
      <AgeThemeProvider>
        <div className="flex min-h-screen flex-col">
          <main className="flex-grow">
            {children}
          </main>
          <footer className="p-4 text-center text-xs text-muted-foreground">
            © 2026 Syncsenta. All rights reserved. | <Link href="/terms" className="hover:underline">Terms</Link> | <Link href="https://forms.gle/3vQhgtJbnEaGD6xV8" target="_blank" rel="noopener noreferrer" className="hover:underline">Feedback</Link>
          </footer>
        </div>
      </AgeThemeProvider>
    </RoleGate>
  );
}
