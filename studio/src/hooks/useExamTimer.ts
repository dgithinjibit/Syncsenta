import { useEffect, useRef, useState } from "react";

/**
 * Tracks elapsed seconds for an exam attempt.
 * Pauses (does NOT increment) once `stopped` is true.
 * Returns the final elapsed seconds when stopped.
 */
export function useExamTimer(stopped: boolean) {
  const [seconds, setSeconds] = useState(0);
  const startRef = useRef<number>(Date.now());
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (stopped) {
      if (tickRef.current) window.clearInterval(tickRef.current);
      return;
    }
    tickRef.current = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [stopped]);

  return seconds;
}

export const formatDuration = (s: number) => {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m < 60) return `${m}m ${sec.toString().padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm.toString().padStart(2, "0")}m`;
};
