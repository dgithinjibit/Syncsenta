import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
            <Link href="/" className="font-headline text-2xl font-bold text-primary">
                SyncSenta
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                <Link href="/products" className="text-muted-foreground transition-colors hover:text-foreground">Products</Link>
                 <Link href="/#faq" className="text-muted-foreground transition-colors hover:text-foreground">FAQ</Link>
                 <Link href="/#contact" className="text-muted-foreground transition-colors hover:text-foreground">Contact</Link>
            </nav>
            <div className="flex items-center gap-2">
                <Button variant="ghost" asChild>
                    <Link href="/login">
                      Sign In
                    </Link>
                </Button>
                 <Button asChild>
                    <Link href="/signup">Get Started</Link>
                </Button>
            </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center pt-10 pb-10">
        <div className="container px-4 md:px-6">
            {children}
        </div>
      </main>

       <footer className="p-4 text-center text-xs text-muted-foreground">
          © 2025 SyncSenta. All rights reserved. | <Link href="/terms" className="hover:underline">Terms</Link> | <Link href="/privacy" className="hover:underline">Privacy</Link> | <Link href="/child-safety" className="hover:underline">Child Safety</Link> | <Link href="/support" className="hover:underline">Support</Link> | <Link href="https://forms.gle/3vQhgtJbnEaGD6xV8" target="_blank" rel="noopener noreferrer" className="hover:underline">Provide Feedback</Link>
      </footer>
    </div>
  );
}
