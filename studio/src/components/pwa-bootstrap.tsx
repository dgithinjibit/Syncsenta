"use client";

import { useEffect } from "react";

export function PWABootstrap() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") {
      return;
    }

    let updateFound = false;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          updateFound = true;
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent("syncsenta-pwa-update"));
            }
          });
        });

        if (updateFound) {
          return;
        }
      })
      .catch((error: unknown) => {
        console.warn("[PWA] Service worker registration failed", error);
      });

    const handleOnline = () => window.dispatchEvent(new CustomEvent("syncsenta-network-online"));
    const handleOffline = () => window.dispatchEvent(new CustomEvent("syncsenta-network-offline"));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return null;
}

export default PWABootstrap;
