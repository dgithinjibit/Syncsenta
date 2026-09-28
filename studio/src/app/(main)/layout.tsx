import type { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import Link from "next/link";

/**
 * The legacy `/dashboard/**` shell: sidebar, header, footer around the
 * county and school screens that have no equivalent in the role homes yet.
 *
 * This layout used to read a `userRole` cookie and render bare `children` for
 * students. Nothing writes that cookie any more — the Firebase-era
 * `signupUser()` action and `/api/set-auth-cookie` were the only writers and
 * both are deleted — so the read always yielded `undefined` and the student
 * branch was dead code that described a session this app no longer has.
 * Removing it also removes the last `userRole` reference in `src/`, which is
 * what let the blank `/dashboard` bug come back whenever the cookie was
 * mentioned. Learners are kept out of this shell by `/dashboard` itself, which
 * redirects every role to its real home (`getRoleHome()`), and by
 * `middleware.ts`; `AppSidebar` renders no nav for a role whose workspace lives
 * outside the shell.
 */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col">
          <AppHeader />
           <main className="p-4 md:p-6 flex-grow">
              {children}
          </main>
          <footer className="mt-auto p-4 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} SyncSenta. All rights reserved. | <Link href="/terms" className="hover:underline">Terms & Conditions</Link> | <Link href="https://forms.gle/3vQhgtJbnEaGD6xV8" target="_blank" rel="noopener noreferrer" className="hover:underline">Provide Feedback</Link>
          </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}

