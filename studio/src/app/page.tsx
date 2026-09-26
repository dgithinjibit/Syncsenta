"use client";

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from 'next/image';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="absolute top-0 left-0 right-0 p-4">
        <div className="container mx-auto flex justify-end items-center">
             <Button variant="ghost" asChild>
                <Link href="/login">
                  Sign In
                </Link>
            </Button>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center">
        <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center text-center space-y-8">
                
                <div className="w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
                    <Image
                      src="/assets/LOGO.png"
                      alt="SyncSenta Logo"
                      width={160}
                      height={160}
                      className="rounded-full"
                    />
                </div>
                
                <div className="max-w-3xl space-y-5">
                    <p className="text-sm md:text-base font-semibold uppercase tracking-wide text-primary">
                        Not another AI tutor. A CBC teaching workspace.
                    </p>
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
                        Plan, revise, and share better lessons—even with limited internet.
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground">
                        Built for Kenyan teachers and schools that need practical AI-assisted lesson planning, revision tools, and teacher review grounded in the Competency-Based Curriculum (CBC).
                    </p>
                    <div className="grid gap-3 text-left sm:grid-cols-2">
                        <div className="rounded-lg border bg-card p-4">
                            <p className="font-semibold text-foreground">For teachers and schools</p>
                            <p className="mt-1 text-sm text-muted-foreground">Create CBC-aligned schemes, lesson plans, quizzes, and printable revision resources.</p>
                        </div>
                        <div className="rounded-lg border bg-card p-4">
                            <p className="font-semibold text-foreground">For parents</p>
                            <p className="mt-1 text-sm text-muted-foreground">Built for parents who want daily visibility into their child&apos;s learning.</p>
                        </div>
                        <div className="rounded-lg border bg-card p-4">
                            <p className="font-semibold text-foreground">CBC scope</p>
                            <p className="mt-1 text-sm text-muted-foreground">Supports the school journey from PP1 through Grade 12, with Grade 6 AI/blockchain introduction and deeper Senior School study.</p>
                        </div>
                        <div className="rounded-lg border bg-card p-4">
                            <p className="font-semibold text-foreground">What makes it different</p>
                            <p className="mt-1 text-sm text-muted-foreground">Teacher-reviewed workflows, low-bandwidth outputs, and clear curriculum context—not unsupervised answers for children.</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                    <Button onClick={() => router.push('/signup')} size="lg" className="w-full sm:w-auto">
                        Start the teacher workspace
                        <ArrowRight className="ml-2" />
                    </Button>
                    <Button variant="outline" size="lg" asChild>
                        <Link href="/products">
                            View Products
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
      </main>
       <footer className="p-4 text-center text-xs text-muted-foreground">
          © 2025 SyncSenta. All rights reserved. | <Link href="/terms" className="hover:underline">Terms & Conditions</Link> | <Link href="https://forms.gle/3vQhgtJbnEaGD6xV8" target="_blank" rel="noopener noreferrer" className="hover:underline">Provide Feedback</Link>
      </footer>
    </div>
  );
}
