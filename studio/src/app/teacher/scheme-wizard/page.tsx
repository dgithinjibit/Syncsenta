'use client';

/**
 * Scheme Wizard Page
 * Teacher-facing page for generating CBC schemes of work
 */

import React from 'react';
import { SchemeWizard } from '@/components/scheme-wizard/scheme-wizard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SchemeWizardPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">CBC Scheme Generator</h1>
            <p className="text-sm text-muted-foreground">
              Create professional, KICD-compliant schemes of work in minutes
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8">
        <SchemeWizard />
      </main>
    </div>
  );
}

