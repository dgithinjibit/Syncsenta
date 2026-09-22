import { useEffect } from "react";

interface Args {
  enabled: boolean;
  questionsCount: number;
  /** Picks an MCQ option (1-based key '1'..'4') for the focused question. */
  onPickOption: (qIndex: number, optionIndex: number) => boolean | void;
  /** Move focus to the next question card. */
  onNext: () => void;
  /** Move focus to the previous question card. */
  onPrev: () => void;
}

const isTextField = (el: EventTarget | null) => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT") {
    const t = (el as HTMLInputElement).type;
    return t === "text" || t === "search" || t === "email" || t === "url" || t === "";
  }
  return tag === "TEXTAREA" || el.isContentEditable;
};

const focusedQuestionIndex = (): number | null => {
  const active = document.activeElement as HTMLElement | null;
  if (!active) return null;
  const card = active.closest<HTMLElement>("[data-question-index]");
  if (!card) return null;
  const v = card.getAttribute("data-question-index");
  return v ? parseInt(v, 10) : null;
};

const focusCard = (index: number) => {
  const el = document.querySelector<HTMLElement>(
    `[data-question-index="${index}"]`,
  );
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  // Try to focus the first interactive child for nicer keyboard flow
  const focusable = el.querySelector<HTMLElement>(
    'button, [role="radio"], input, textarea',
  );
  focusable?.focus({ preventScroll: true });
};

/**
 * Keyboard navigation for the exam runner:
 * - 1..9 — pick MCQ option (only when focus is NOT in a text field)
 * - ArrowDown / J — next question
 * - ArrowUp / K — previous question
 * - Enter on an MCQ row — move to next
 */
export function useExamKeyboardNav({
  enabled,
  questionsCount,
  onPickOption,
  onNext,
  onPrev,
}: Args) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // Don't hijack typing
      if (isTextField(e.target)) return;

      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        onNext();
        return;
      }
      if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        onPrev();
        return;
      }

      // 1..9 to pick MCQ option for focused question
      if (/^[1-9]$/.test(e.key)) {
        const idx = focusedQuestionIndex();
        if (idx === null) return;
        const optionIndex = parseInt(e.key, 10) - 1;
        const handled = onPickOption(idx, optionIndex);
        if (handled !== false) e.preventDefault();
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, questionsCount, onPickOption, onNext, onPrev]);
}

export const focusQuestionCard = focusCard;
