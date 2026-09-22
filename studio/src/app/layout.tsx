import type { Metadata } from 'next';
import './globals.css';
import { app } from '@/lib/firebase'; // Ensure Firebase is initialized
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import Script from 'next/script';
import { ClientProviders } from '@/components/client-providers';

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: 'SyncSenta',
  description: 'AI-powered Kenyan education ecosystem',
  icons: {
    icon: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Suppress MetaMask errors - we don't use Web3 in MVP */}
        <Script id="suppress-metamask-errors" strategy="beforeInteractive">
          {`
            // Suppress MetaMask connection errors
            if (typeof window !== 'undefined') {
              const originalError = console.error;
              console.error = function(...args) {
                const errorMessage = args.join(' ');
                // Suppress MetaMask and Web3 related errors
                if (errorMessage.includes('MetaMask') || 
                    errorMessage.includes('ethereum') ||
                    errorMessage.includes('chrome-extension://nkbi<REDACTED_SECRET>')) {
                  return;
                }
                originalError.apply(console, args);
              };
            }
          `}
        </Script>
      </head>
      <body className={cn("font-body antialiased", fontSans.variable)}>
        <ClientProviders>
          {children}
        </ClientProviders>
        <Script src='https://meet.jit.si/external_api.js' async />
      </body>
    </html>
  );
}
