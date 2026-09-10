import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "../styles/accessibility.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AccessibilityPanel } from "@/components/accessibility/AccessibilityPanel";
import { ConflictResolver } from '@/components/offline/ConflictResolver';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Syncsenta - Kenyan CBC Learning for Students and Schools',
  description: 'Syncsenta brings CBC-aligned lessons, guided practice, teacher insight, and consent-aware family progress sharing together for Kenyan learners.',
  manifest: '/manifest.json',
  keywords: ['CBC education', 'Kenya education', 'AI tutoring', 'personalized learning', 'online education', 'Kenyan curriculum'],
  authors: [{ name: 'Syncsenta Team' }],
  openGraph: {
    title: 'Syncsenta - Kenyan CBC Learning',
    description: 'CBC-aligned lessons, guided practice, teacher insight, and family progress sharing for Kenyan learners.',
    url: 'https://syncsenta.com',
    siteName: 'Syncsenta',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Syncsenta - AI-Powered Learning Platform',
      },
    ],
    locale: 'en_KE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Syncsenta - Kenyan CBC Learning',
    description: 'CBC-aligned lessons, guided practice, teacher insight, and family progress sharing for Kenyan learners.',
    images: ['/og-image.jpg'],
    creator: '@syncsenta',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
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
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="theme-color" content="#f8f5ec" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <AccessibilityPanel />
          <ConflictResolver />
          <PWAInstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}

// Made with Bob
