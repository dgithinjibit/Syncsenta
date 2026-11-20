import { useEffect, useState } from "react";

type Mode = "light" | "dark";
const KEY = "schemer:theme";

const apply = (m: Mode) => {
  const root = document.documentElement;
  if (m === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
};

const initial = (): Mode => {
  if (typeof window === "undefined") return "light";
  try {
    const saved = localStorage.getItem(KEY) as Mode | null;
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* ignore */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

let initialised = false;
if (typeof window !== "undefined" && !initialised) {
  apply(initial());
  initialised = true;
}

export function useThemeMode() {
  const [mode, setMode] = useState<Mode>(initial);

  useEffect(() => {
    apply(mode);
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  return {
    mode,
    setMode,
    toggle: () => setMode((m) => (m === "dark" ? "light" : "dark")),
  };
}
