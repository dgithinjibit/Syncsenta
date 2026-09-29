'use client';

import { useEffect, useRef, useState } from 'react';
import { Brain, HelpCircle, Send, Square } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { newId } from '@/lib/secure-id';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  streaming?: boolean;
}

export interface SubjectChatProps {
  subjectSlug: string;
  subjectLabel: string;
  grade: string;
  language: 'english' | 'kiswahili' | 'mixed';
  studentName: string;
  sessionId: string;
  initialHistory: { role: ChatRole; content: string }[];
  /** Task 6: competency currently being practised.
   *  Passed down from the subject page (e.g. "MATH.fractions.grade4").
   *  Sent to /api/chat on every turn so the Omega engine has a real
   *  learning_progress row to read and write. */
  competencyCode?: string;
  /** Human-readable label for the competency, e.g. "Fractions – Grade 4". */
  competencyName?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeId() {
  return newId('msg');
}

function historyToMessages(
  history: { role: ChatRole; content: string }[],
): ChatMessage[] {
  return history.map((h) => ({ id: makeId(), role: h.role, content: h.content }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full-height embedded chat panel for the subject page.
 *
 * Omega wiring (Sept 2, 2026):
 *   Task 6 — sends competencyCode + competencyName on every /api/chat call
 *             so the route can read/write the correct learning_progress row.
 *   Task 8 — tracks hint button presses in local state and sends hintsUsed
 *             count on every turn so evaluateTutoringDecision gets a live
 *             value instead of always 0.
 *             Hint button injects "Can you give me a hint?" as the user turn
 *             so the exchange is visible in the chat history.
 *             hintsUsed resets to 0 when a new subject chat session opens.
 */
export function SubjectChat({
  subjectSlug,
  subjectLabel,
  grade,
  language,
  studentName,
  sessionId,
  initialHistory,
  competencyCode,
  competencyName,
}: SubjectChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    initialHistory.length > 0
      ? historyToMessages(initialHistory)
      : [
          {
            id: 'welcome',
            role: 'assistant',
            content: `Karibu${studentName && studentName !== 'Student' ? `, ${studentName}` : ''}! What would you like to understand about ${subjectLabel}?`,
          },
        ],
  );
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Task 8: track hint presses for this session
  const [hintsUsed, setHintsUsed] = useState(0);

  const abortRef   = useRef<AbortController | null>(null);
  const scrollRef  = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-scroll on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  // ── Core send ─────────────────────────────────────────────────────────────

  const sendMessage = async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || busy) return;

    const userMsgId   = makeId();
    const assistantId = makeId();

    const priorTurns = messages
      .filter((m) => m.id !== 'welcome' && m.content.trim())
      .map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [
      ...prev.filter((m) => m.id !== 'welcome'),
      { id: userMsgId,   role: 'user',      content: message },
      { id: assistantId, role: 'assistant', content: '', streaming: true },
    ]);
    setInput('');
    setError(null);
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message,
          history: priorTurns,
          grade,
          subject: subjectSlug,
          language,
          studentName,
          mode: 'socratic',
          sessionId,
          // Task 6: competency wiring
          ...(competencyCode && { competencyCode }),
          ...(competencyName && { competencyName }),
          // Task 8: hint count wiring
          hintsUsed,
        }),
      });

      if (!res.ok || !res.body) {
        let detail = `syncsenta could not answer right now (${res.status}).`;
        try {
          const b = await res.json();
          detail = b.detail || b.error || detail;
        } catch { /* keep HTTP fallback */ }
        throw new Error(detail);
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let answer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sep = buffer.indexOf('\n\n');
        while (sep !== -1) {
          const frame = buffer.slice(0, sep).trim();
          buffer = buffer.slice(sep + 2);
          sep = buffer.indexOf('\n\n');

          if (!frame.startsWith('data:')) continue;
          const payload = frame.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;

          const event = JSON.parse(payload) as {
            delta?: string;
            error?: string;
            detail?: string;
          };
          if (event.error) throw new Error(event.detail || event.error);
          if (!event.delta) continue;

          answer += event.delta;
          setMessages((prev) =>
            prev.map((m) => m.id === assistantId ? { ...m, content: answer } : m),
          );
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: answer || 'Samahani — I need a moment. Please try that question again.',
                streaming: false,
              }
            : m,
        ),
      );
    } catch (caught) {
      if (controller.signal.aborted) {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } else {
        const detail = caught instanceof Error ? caught.message : 'Connection failed.';
        setError(detail);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: 'I could not connect just now. Please try again in a moment.', streaming: false }
              : m,
          ),
        );
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  // ── Hint button handler ───────────────────────────────────────────────────
  // Task 8: increments the local counter BEFORE sending so the route receives
  // the updated value in this very turn, not the next one.
  const handleHint = () => {
    if (busy) return;
    const next = hintsUsed + 1;
    setHintsUsed(next);
    sendMessage('Can you give me a hint?');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    setBusy(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section
      aria-label={`Chat with syncsenta about ${subjectLabel}`}
      className="flex h-[calc(100vh-12rem)] flex-col overflow-hidden"
    >
      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 sm:px-6"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <Avatar className="h-8 w-8 shrink-0 border border-teal-200 bg-teal-50 mt-0.5">
                <AvatarFallback className="bg-teal-100 text-teal-700">
                  <Brain className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-teal-600 text-white rounded-tr-sm'
                  : 'bg-white border border-teal-100 text-teal-950 rounded-tl-sm shadow-sm'
              } ${msg.streaming ? 'animate-pulse' : ''}`}
            >
              {msg.content}
              {msg.streaming && !msg.content && (
                <span className="inline-block h-3 w-3 rounded-full bg-teal-400 animate-bounce" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <p
          role="alert"
          className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {error}
        </p>
      )}

      {/* Input row */}
      <div className="border-t border-teal-100 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-end gap-2">
          {/* Task 8: hint button with live counter badge */}
          <Button
            type="button"
            onClick={handleHint}
            disabled={busy}
            variant="outline"
            size="icon"
            className="shrink-0 relative border-teal-200 text-teal-600 hover:bg-teal-50"
            aria-label="Ask for a hint"
            title="Get a hint"
          >
            <HelpCircle className="h-4 w-4" />
            {hintsUsed > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-white leading-none">
                {hintsUsed}
              </span>
            )}
          </Button>

          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${subjectLabel}…`}
            rows={1}
            disabled={busy}
            className="flex-1 resize-none rounded-2xl border-teal-200 bg-teal-50 text-sm focus-visible:ring-teal-400 min-h-[2.5rem] max-h-32"
            aria-label="Type your message"
          />

          {busy ? (
            <Button
              type="button"
              onClick={stopStreaming}
              size="icon"
              variant="outline"
              className="shrink-0 border-teal-200 text-teal-700"
              aria-label="Stop response"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              size="icon"
              className="shrink-0 bg-teal-600 hover:bg-teal-700 text-white"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-center text-[10px] text-teal-400">
          Enter to send · Shift+Enter for new line · 💡 for a hint
        </p>
      </div>
    </section>
  );
}
