"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSAL_KEY = "syncsenta-install-prompt-dismissed";

/**
 * Keeps the install invitation out of the page flow and anchors it to the
 * bottom-left corner so it does not compete with bottom navigation or content.
 */
export function AppInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        (navigator as Navigator & { standalone?: boolean }).standalone === true);

    if (isStandalone || window.localStorage.getItem(DISMISSAL_KEY) === "true") {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const dismiss = () => {
    window.localStorage.setItem(DISMISSAL_KEY, "true");
    setIsVisible(false);
    setInstallEvent(null);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") {
      setIsVisible(false);
    }
    setInstallEvent(null);
  };

  if (!isVisible || !installEvent) return null;

  return (
    <aside
      aria-label="Install SyncSenta"
      className="fixed bottom-4 left-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-card p-4 text-card-foreground shadow-2xl sm:bottom-6 sm:left-6"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary" aria-hidden="true">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Install SyncSenta</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep learning tools close at hand, even when connectivity is limited.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={install}>Install app</Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>Not now</Button>
          </div>
        </div>
        <Button
          aria-label="Dismiss install prompt"
          className="h-8 w-8 shrink-0"
          size="icon"
          variant="ghost"
          onClick={dismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  );
}

export default AppInstallPrompt;
