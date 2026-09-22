import { useEffect, useRef, useState } from "react";

const PREFIX = "syncsenta:exam:";

interface SavedState {
  answers: Record<number, string>;
  savedAt: number;
}

/**
 * Persists exam answers to localStorage keyed by examId (or a stable fallback).
 * Returns the initial saved state (if any) and a setter to keep storage in sync.
 */
export function useExamAutosave(
  key: string | null,
  answers: Record<number, string>,
  hasResults: boolean,
) {
  const storageKey = key ? `${PREFIX}${key}` : null;
  const [restored, setRestored] = useState<SavedState | null>(() => {
    if (!storageKey) return null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SavedState;
      if (!parsed?.answers || Object.keys(parsed.answers).length === 0) return null;
      return parsed;
    } catch {
      return null;
    }
  });

  // Debounced save
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (!storageKey || hasResults) return;
    if (Object.keys(answers).length === 0) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        const payload: SavedState = { answers, savedAt: Date.now() };
        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {
        /* quota / private mode — ignore */
      }
    }, 400);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [answers, storageKey, hasResults]);

  // Clear once submitted
  useEffect(() => {
    if (hasResults && storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
    }
  }, [hasResults, storageKey]);

  const dismissRestored = () => setRestored(null);
  const clearSaved = () => {
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
    }
    setRestored(null);
  };

  return { restored, dismissRestored, clearSaved };
}
