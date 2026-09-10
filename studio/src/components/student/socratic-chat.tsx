'use client';

/**
 * <SocraticChat />
 *
 * The student-facing chat panel for syncsenta. Talks to the local Next.js
 * route handler at POST /api/chat which streams Groq tokens back as SSE.
 *
 * Responsibilities:
 *   - Render conversation history.
 *   - Stream incoming assistant tokens into the last message as they arrive.
 *   - Hide partial [CHOICE: …] tokens while streaming (looks like raw text
 *     until the closing ] arrives — we mask it).
 *   - After streaming completes, parse [CHOICE: …] tokens out of the text
 *     and render them as click-to-send buttons.
 *   - Persist history per (studentId, subject) in localStorage via
 *     lib/socratic-history.ts. Provides a "New conversation" reset.
 *   - Allow the student to STOP a streaming response mid-flight.
 *   - Speak completed assistant turns aloud via Web Speech TTS (toggleable).
 *   - Accept voice input via Web Speech STT (mic button next to Send).
 *   - Surface backend errors visibly (no silent fallbacks).
 *
 * Intentional non-goals:
 *   - No WebSocket / teacher intervention pipe (those live in syncsenta-chat.tsx).
 *   - No multi-device sync. Clearing browser storage wipes history.
 *   - No streaming TTS — we speak the final message, not token-by-token.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Brain,
  Send,
  AlertCircle,
  Square,
  RotateCcw,
  Phone,
  Mic as MicIcon,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  loadHistory,
  saveHistory,
  clearHistory,
  type StoredChatMessage,
} from '@/lib/chat/socratic-history';
import {
  addChatMessage,
  createChatSession,
  getChatSessions,
  migrateLocalStorageHistory,
} from '@/lib/chat/chat-history-supabase';
import { tutorIntroMessage } from '@/lib/curriculum/grade-greetings';
import { useWebSpeech } from '@/hooks/use-web-speech';
import { useAuth } from '@/hooks/use-auth';
import { CallInterface } from '@/components/voice/call-interface';

export type ChatLanguage = 'english' | 'kiswahili' | 'mixed';
export type ChatMode = 'socratic' | 'compass' | 'homework-help';

export interface SocraticChatProps {
  studentId: string;
  studentName: string;
  grade: string;
  subject: string;
  language?: ChatLanguage;
  mode?: ChatMode;
  /** Optional competency code to prime the chat for a specific topic */
  competencyCode?: string;
  /** When provided, switches to Compass mode (teacher-context grounded). */
  teacherContext?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Choices parsed out of [CHOICE: ...] tokens after streaming completes. */
  choices?: string[];
  /** True while this assistant message is still being streamed. */
  streaming?: boolean;
  /** Set to 'voice' when the turn happened inside a call. Optional so old
   *  localStorage payloads without it keep loading cleanly. */
  source?: 'voice' | 'text';
}

const CHOICE_TOKEN = /\[CHOICE:\s*([^\]]+)\]/g;

/**
 * Strip a *trailing* partial [CHOICE: ... opening that hasn't received its
 * closing ] yet. Without this, the raw "[CHOICE: option1" leaks into the
 * rendered bubble until the closing bracket arrives.
 *
 * We only mask the LAST unterminated bracket; complete tokens earlier in the
 * stream are left untouched so the post-stream parser can pick them up.
 */
function maskTrailingPartialChoice(text: string): string {
  const lastOpen = text.lastIndexOf('[');
  if (lastOpen === -1) return text;
  const after = text.slice(lastOpen);
  if (after.includes(']')) return text; // closed already
  // Treat the partial as either an intentional [CHOICE: ... or some other
  // bracket the model is mid-typing. Either way, hide it until closed.
  return text.slice(0, lastOpen);
}

function parseChoices(text: string): { content: string; choices: string[] } {
  const choices: string[] = [];
  let match: RegExpExecArray | null;
  CHOICE_TOKEN.lastIndex = 0;
  while ((match = CHOICE_TOKEN.exec(text)) !== null) {
    const opt = match[1].trim();
    if (opt) choices.push(opt);
  }
  const cleaned = text.replace(CHOICE_TOKEN, '').replace(/\s+$/g, '').trim();
  return { content: cleaned, choices };
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function introMessage(opts: {
  studentName: string;
  subject: string;
  grade?: string;
  teacherContext?: string;
}): ChatMessage {
  return {
    id: 'intro',
    role: 'assistant',
    // Grade-aware: lower-primary learners ("Grade 2 Environmental, what
    // should we learn today?") never see the word "Socratic"; older
    // learners keep the syncsenta / Socratic framing they're used to.
    content: tutorIntroMessage({
      studentName: opts.studentName,
      subject: opts.subject,
      grade: opts.grade,
      teacherContext: opts.teacherContext,
    }),
  };
}

export function SocraticChat({
  studentId,
  studentName,
  grade,
  subject,
  language = 'mixed',
  mode = 'socratic',
  competencyCode,
  teacherContext,
}: SocraticChatProps) {
  // Conversation state. The `intro` message is a *display-only* placeholder
  // and is never written to storage — that way starting a real conversation
  // doesn't pollute history with greetings.
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    introMessage({ studentName, subject, grade, teacherContext }),
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [hasLoadedRemoteHistory, setHasLoadedRemoteHistory] = useState(false);

  const { user } = useAuth();
  const hydratedRef = useRef(false);
  const migratedRef = useRef(false);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeStudentId = user?.id ?? studentId;
  const isAuthenticated = Boolean(user?.id);

  // Did we already attempt a load? Used to gate writes — don't save until
  // we've finished restoring, or we risk overwriting good storage with the
  // placeholder intro.

  // ---- Voice I/O ---------------------------------------------------------
  // The hook is used here ONLY for auto-speak (TTS) of typed-mode replies
  // and to detect STT capability for showing the Call button. The
  // push-to-talk-into-textarea behaviour is gone — the mic button now
  // opens a full-screen call instead. See CallInterface below.
  const speech = useWebSpeech({ language });

  // Open/close state for the call dialog. Hoisted here so we can hand
  // send() into it as the per-turn callback.
  const [callOpen, setCallOpen] = useState(false);

  // Persisted toggle so the student's "speak responses" preference survives
  // page reloads. Defaults OFF — surprise audio is rude.
  const [speakEnabled, setSpeakEnabled] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSpeakEnabled(window.localStorage.getItem('socraticChat.speak') === '1');
  }, []);
  const toggleSpeak = useCallback(() => {
    setSpeakEnabled((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('socraticChat.speak', next ? '1' : '0');
      }
      if (!next) speech.cancelSpeak();
      return next;
    });
  }, [speech]);

  // Track the last message we spoke so we don't re-speak on every render.
  const lastSpokenIdRef = useRef<string | null>(null);

  // (Push-to-talk-into-textarea was removed when the mic button became a
  // "Call" button. The CallInterface owns its own STT loop now.)

  // ---- Hydrate from Supabase / localStorage on mount or when key fields change -------
  useEffect(() => {
    hydratedRef.current = false;
    if (!subject || !activeStudentId) return;

    let cancelled = false;

    async function hydrateHistory() {
      if (user?.id) {
        try {
          const sessions = await getChatSessions(user.id, subject, 1);
          if (cancelled) return;

          if (sessions.length > 0 && sessions[0].messages.length > 0) {
            setMessages(
              sessions[0].messages.map((message) => ({
                id: makeId(),
                role: message.role === 'assistant' ? 'assistant' : 'user',
                content: message.content,
              }))
            );
            setChatSessionId(sessions[0].id);
          } else {
            const stored = loadHistory(studentId, subject);
            if (stored.length > 0) {
              setMessages(
                stored.map((m) => ({
                  id: makeId(),
                  role: m.role,
                  content: m.content,
                }))
              );
            } else {
              setMessages([introMessage({ studentName, subject, grade, teacherContext })]);
            }
          }

          if (!migratedRef.current) {
            migratedRef.current = true;
            migrateLocalStorageHistory(user.id, grade).catch((err) => {
              console.error('Failed to migrate local chat history to Supabase:', err);
            });
          }
        } catch (err) {
          console.error('Error loading chat history from Supabase:', err);
          const stored = loadHistory(studentId, subject);
          if (stored.length > 0) {
            setMessages(
              stored.map((m) => ({
                id: makeId(),
                role: m.role,
                content: m.content,
              }))
            );
          } else {
            setMessages([introMessage({ studentName, subject, grade, teacherContext })]);
          }
        }
      } else {
        const stored = loadHistory(studentId, subject);
        if (stored.length > 0) {
          setMessages(
            stored.map((m) => ({
              id: makeId(),
              role: m.role,
              content: m.content,
            }))
          );
        } else {
          setMessages([introMessage({ studentName, subject, grade, teacherContext })]);
        }
      }

      if (!cancelled) {
        hydratedRef.current = true;
        setHasLoadedRemoteHistory(true);
      }
    }

    hydrateHistory();

    return () => {
      cancelled = true;
    };
  }, [activeStudentId, grade, subject, studentId, studentName, teacherContext, user?.id]);

  // ---- Persist on every committed change ----------------------------------
  // Skip the intro placeholder; only persist real turns.
  useEffect(() => {
    if (!hydratedRef.current || !hasLoadedRemoteHistory) return;
    if (!studentId || !subject) return;
    if (isAuthenticated) return;

    const persistable: StoredChatMessage[] = messages
      .filter((m) => m.id !== 'intro' && !m.streaming && m.content.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.content }));

    saveHistory(studentId, subject, persistable);
  }, [messages, studentId, subject, isAuthenticated]);

  // ---- Auto-speak the latest completed assistant message ------------------
  // Trigger conditions: speakEnabled, TTS supported, message has finished
  // streaming, and we haven't already spoken this exact message id.
  useEffect(() => {
    if (!speakEnabled || !speech.ttsSupported) return;
    const last = messages[messages.length - 1];
    if (!last) return;
    if (last.role !== 'assistant') return;
    if (last.streaming) return;
    if (last.id === 'intro') return; // don't auto-greet aloud
    if (lastSpokenIdRef.current === last.id) return;
    if (!last.content || last.content.startsWith('⚠️')) return;
    lastSpokenIdRef.current = last.id;
    speech.speak(last.content);
  }, [messages, speakEnabled, speech]);

  // ---- Auto-scroll on new content -----------------------------------------
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const viewport = el.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLElement | null;
    const scroller = viewport ?? el;
    scroller.scrollTop = scroller.scrollHeight;
  }, [messages]);

  // ---- Auto-resize textarea ------------------------------------------------
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    // 6 rows ~ 144 px on default line-height. Hard-cap.
    ta.style.height = `${Math.min(ta.scrollHeight, 144)}px`;
  }, [input]);

  // ---- Cancel any in-flight stream on unmount -----------------------------
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // ---- Actions -------------------------------------------------------------

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const newConversation = useCallback(() => {
    abortRef.current?.abort();
    clearHistory(studentId, subject);
    setChatSessionId(null);
    setMessages([introMessage({ studentName, subject, grade, teacherContext })]);
    setInput('');
    setError(null);
    setBusy(false);
  }, [studentId, subject, studentName, grade, teacherContext]);

  const ensureChatSession = useCallback(async (): Promise<string | null> => {
    if (!user?.id) return null;
    if (chatSessionId) return chatSessionId;

    const sessionId = await createChatSession(
      user.id,
      subject,
      grade,
      teacherContext ? 'compass' : 'socratic',
      teacherContext,
    );
    setChatSessionId(sessionId);
    return sessionId;
  }, [chatSessionId, grade, subject, teacherContext, user?.id]);

  const send = useCallback(
    async (rawText: string, source: 'voice' | 'text' = 'text'): Promise<string> => {
      const text = rawText.trim();
      if (!text || busy) return '';

      setError(null);

      const userMessage: ChatMessage = {
        id: makeId(),
        role: 'user',
        content: text,
        source,
      };
      const assistantId = makeId();
      const assistantPlaceholder: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        streaming: true,
        source,
      };

      // History sent to the model: everything currently rendered except
      // the placeholder intro. We snapshot BEFORE the state update so the
      // request reflects what the student actually saw.
      const historyForApi = messages
        .filter((m) => m.id !== 'intro' && m.content.trim().length > 0)
        .map(({ role, content }) => ({ role, content }));

      setMessages((prev) => [
        // Drop the intro placeholder once a real turn happens — it's served
        // its purpose.
        ...prev.filter((m) => m.id !== 'intro'),
        userMessage,
        assistantPlaceholder,
      ]);
      setInput('');
      setBusy(true);

      const controller = new AbortController();
      abortRef.current = controller;

      let sessionId: string | null = null;
      if (user?.id) {
        try {
          sessionId = await ensureChatSession();
          if (sessionId) {
            addChatMessage(sessionId, user.id, 'user', text).catch((err) => {
              console.error('Failed to persist user chat message to Supabase:', err);
            });
          }
        } catch (err) {
          console.error('Failed to ensure chat session:', err);
        }
      }

      let res: Response;
      try {
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            message: text,
            history: historyForApi,
            grade,
            subject,
            language,
            studentName,
            mode,
            teacherContext,
            competencyCode,
            sessionId,
            adaptiveDifficultyEnabled: true,
          }),
        });
      } catch (err) {
        if (controller.signal.aborted) {
          // User pressed Stop before the request even started — silently drop.
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          setBusy(false);
          return '';
        }
        const detail = err instanceof Error ? err.message : 'Network error';
        setError(`Could not reach the mentor: ${detail}`);
        setBusy(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: '⚠️ Connection failed.', streaming: false }
              : m
          )
        );
        // Throw in voice mode so the call UI shows a transient error and
        // reopens the mic; the typed-send path can ignore the rejection.
        if (source === 'voice') throw new Error(detail);
        return '';
      }

      if (!res.ok || !res.body) {
        let errMsg = `Request failed (${res.status}).`;
        try {
          const data = await res.json();
          if (data?.error) {
            errMsg = `${data.error}${data.detail ? ` — ${data.detail}` : ''}`;
          }
        } catch {
          /* response was not JSON */
        }
        // Special-case 429: surface the Retry-After in the error strip.
        if (res.status === 429) {
          const retry = res.headers.get('Retry-After');
          if (retry) errMsg = `Rate-limited. Try again in ${retry}s.`;
        }
        setError(errMsg);
        setBusy(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `⚠️ ${errMsg}`, streaming: false }
              : m
          )
        );
        if (source === 'voice') throw new Error(errMsg);
        return '';
      }

      // Consume SSE: lines of "data: {json}\n\n" or "data: [DONE]\n\n".
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';
      let stoppedByUser = false;

      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let sep: number;
          while ((sep = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            const line = frame.trim();
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') continue;
            try {
              const parsed = JSON.parse(payload) as {
                delta?: string;
                error?: string;
                detail?: string;
              };
              if (parsed.error) {
                throw new Error(parsed.detail || parsed.error);
              }
              if (parsed.delta) {
                accumulated += parsed.delta;
                // Mask trailing partial [CHOICE: tokens during streaming.
                const visible = maskTrailingPartialChoice(accumulated);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: visible } : m
                  )
                );
              }
            } catch (err) {
              const detail =
                err instanceof Error ? err.message : 'Stream parse error';
              throw new Error(detail);
            }
          }
        }
      } catch (err) {
        if (controller.signal.aborted) {
          stoppedByUser = true;
        } else {
          const detail = err instanceof Error ? err.message : 'Stream error';
          setError(detail);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: accumulated || `⚠️ ${detail}`,
                    streaming: false,
                  }
                : m
            )
          );
          setBusy(false);
          if (source === 'voice') throw new Error(detail);
          return '';
        }
      }

      // Post-stream: parse [CHOICE: ...] tokens out of the FULL accumulated
      // text (not the masked view) so any unterminated tail is dropped.
      const { content, choices } = parseChoices(accumulated);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: stoppedByUser
                  ? `${content || maskTrailingPartialChoice(accumulated)}${content || accumulated ? ' …(stopped)' : '(stopped)'}`
                  : content,
                choices: stoppedByUser ? undefined : choices,
                streaming: false,
              }
            : m
        )
      );

      if (!stoppedByUser && sessionId) {
        addChatMessage(sessionId, user?.id ?? activeStudentId, 'assistant', content, {
          model: 'groq',
        }).catch((err) => {
          console.error('Failed to persist assistant chat message to Supabase:', err);
        });
      }

      setBusy(false);
      // Return the speakable content (without [CHOICE: ...] tokens) so the
      // call UI can hand it to TTS. Empty string when stopped early.
      return stoppedByUser ? '' : content;
    },
    [activeStudentId, busy, ensureChatSession, grade, language, messages, studentName, subject, teacherContext, user?.id]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  // Show "New conversation" only when there's actually something to reset.
  const hasRealMessages = useMemo(
    () => messages.some((m) => m.id !== 'intro'),
    [messages]
  );

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-end gap-1 border-b px-3 py-1.5 text-xs">
        {speech.ttsSupported && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSpeak}
            className="gap-1.5 h-7"
            aria-pressed={speakEnabled}
            aria-label={
              speakEnabled
                ? 'Mute syncsenta (currently speaking responses)'
                : 'Have syncsenta speak responses aloud'
            }
            title={speakEnabled ? 'Mute responses' : 'Speak responses aloud'}
          >
            {speakEnabled ? (
              <Volume2 className="h-3.5 w-3.5" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" />
            )}
            {speakEnabled ? 'Speaking' : 'Mute'}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasRealMessages || busy}
          onClick={newConversation}
          className="gap-1.5 h-7"
          aria-label="Start a new conversation"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          New conversation
        </Button>
      </div>

      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-4">
        <div className="space-y-4">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              onChoice={(choice) => send(choice)}
              busy={busy}
            />
          ))}
        </div>
      </ScrollArea>

      {error && (
        <div className="border-t bg-destructive/10 text-destructive px-4 py-2 flex items-start gap-2 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      <div className="border-t bg-background">
        <div className="p-3 flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask syncsenta about ${subject}...`}
            rows={2}
            className="resize-none min-h-[2.5rem]"
            disabled={busy}
          />
          {speech.sttSupported && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCallOpen(true)}
              disabled={busy}
              aria-label="Start voice call with syncsenta"
              title="Call syncsenta — voice chat"
            >
              <Phone className="h-4 w-4" />
            </Button>
          )}
          {busy ? (
            <Button
              onClick={stopStreaming}
              variant="destructive"
              size="icon"
              aria-label="Stop generating"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => send(input)}
              disabled={!input.trim()}
              size="icon"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <CallInterface
        open={callOpen}
        onOpenChange={setCallOpen}
        persona={{
          name: 'syncsenta',
          subtitle: `${subject} · ${grade}`,
          initial: 'M',
        }}
        language={language}
        onUserTurn={(text) => send(text, 'voice')}
      />
    </Card>
  );
}

function MessageBubble({
  message,
  onChoice,
  busy,
}: {
  message: ChatMessage;
  onChoice: (choice: string) => void;
  busy: boolean;
}) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary">
            <Brain className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      <div className={`max-w-[80%] space-y-2 ${isUser ? 'items-end' : ''}`}>
        <div
          className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          }`}
        >
          {message.source === 'voice' && (
            <span
              className="mr-1.5 inline-flex items-center align-middle opacity-70"
              title="Spoken during a voice call"
              aria-label="Voice message"
            >
              <MicIcon className="h-3 w-3" />
            </span>
          )}
          {message.content || (message.streaming ? '' : ' ')}
          {message.streaming && (
            <span
              className="inline-block w-2 h-4 ml-1 bg-current opacity-60 animate-pulse align-middle"
              aria-label="syncsenta is thinking"
            />
          )}
        </div>
        {message.choices && message.choices.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.choices.map((c, i) => (
              <Button
                key={`${message.id}-c${i}`}
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onChoice(c)}
              >
                {c}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
