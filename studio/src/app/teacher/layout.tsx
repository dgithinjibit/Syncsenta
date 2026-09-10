"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/layout/teacher-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { useTeacherContext } from "@/stores/teacher-context";
import { useAuth } from "@/hooks/use-auth";
import { RoleGate } from "@/components/auth/role-gate";
import Link from "next/link";

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const { setAssignments, setLoading, reset } = useTeacherContext();
  const { user, loading: authLoading } = useAuth();

  // Load the calling teacher's assignments. Identity comes from the
  // session cookie via the API route — we no longer trust a
  // localStorage `teacherId` or fall back to a demo UUID. If the user
  // signs out (or signs in as someone else), we clear the persisted
  // store so the previous teacher's data doesn't leak into the new
  // session via the Zustand `persist` middleware.
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      reset();
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadAssignments() {
      setLoading(true);
      try {
        const response = await fetch('/api/teacher/assignments', {
          // Cookies are same-origin — explicit credentials guards
          // against any future fetch default change.
          credentials: 'same-origin',
        });

        if (response.status === 401) {
          // Session expired between mount and fetch — bail silently
          // and let the sidebar render its empty state.
          if (!cancelled) {
            reset();
            setLoading(false);
          }
          return;
        }

        const data = await response.json();
        if (!cancelled && data.success && data.data?.grouped) {
          setAssignments(data.data.grouped);
        }
      } catch (error) {
        console.error('Failed to load teacher assignments:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAssignments();
    return () => {
      cancelled = true;
    };
    // user.id is the only field we need from `user`; depending on
    // the whole object would re-run on every auth-state refresh
    // (every tab focus, every token refresh).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  return (
    <RoleGate allowedRoles={['teacher']}>
      <SidebarProvider>
        <TeacherSidebar />
        <SidebarInset className="flex flex-col">
          <AppHeader />
          <main className="p-4 md:p-6 flex-grow">
            {children}
          </main>
          <footer className="mt-auto p-4 text-center text-xs text-muted-foreground">
            © 2025 SyncSenta. All rights reserved. | <Link href="/terms" className="hover:underline">Terms & Conditions</Link> | <Link href="https://forms.gle/3vQhgtJbnEaGD6xV8" target="_blank" rel="noopener noreferrer" className="hover:underline">Provide Feedback</Link>
          </footer>
        </SidebarInset>
      </SidebarProvider>
    </RoleGate>
  );
}
