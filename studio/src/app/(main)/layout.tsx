import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import Link from "next/link";
import type { UserRole } from "@/lib/types";

export default function MainLayout({ children }: { children: ReactNode }) {
  const cookieStore = cookies();
  const role = cookieStore.get('userRole')?.value as UserRole | undefined;

  if (role === 'student') {
    // For students, render only the children without the main dashboard layout
    return <>{children}</>;
  }

  // For all other roles, render the full dashboard layout with sidebar and header
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col">
          <AppHeader />
           <main className="p-4 md:p-6 flex-grow">
              {children}
          </main>
          <footer className="mt-auto p-4 text-center text-xs text-muted-foreground">
            © 2025 3D. All rights reserved. | <Link href="/terms" className="hover:underline">Terms & Conditions</Link> | <Link href="https://forms.gle/3vQhgtJbnEaGD6xV8" target="_blank" rel="noopener noreferrer" className="hover:underline">Provide Feedback</Link>
          </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
