/**
 * Chat History - Supabase Implementation
 * 
 * Replaces localStorage-based chat history with Supabase database storage.
 * Provides multi-device sync and persistent history.
 */

import { supabase } from '../supabase/client';
import type { Database } from '../supabase/types';

type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];
type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
type ChatSessionInsert = Database['public']['Tables']['chat_sessions']['Insert'];
type ChatMessageInsert = Database['public']['Tables']['chat_messages']['Insert'];

export interface ChatHistoryMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  choices?: string[];
  selectedChoice?: string;
  streaming?: boolean;
}

export interface ChatHistorySession {
  id: string;
  subject: string;
  grade: string;
  mode: 'socratic' | 'compass' | 'homework_help';
  title?: string;
  messages: ChatHistoryMessage[];
  startedAt: string;
  lastMessageAt: string;
}

/**
 * Create a new chat session
 */
export async function createChatSession(
  userId: string,
  subject: string,
  grade: string,
  mode: 'socratic' | 'compass' | 'homework_help' = 'socratic',
  teacherContext?: string
): Promise<string> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: userId,
      subject,
      grade,
      mode,
      teacher_context: teacherContext,
      status: 'active',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating chat session:', error);
    throw error;
  }

  return data.id;
}

/**
 * Get all chat sessions for a user
 */
export async function getChatSessions(
  userId: string,
  subject?: string,
  limit: number = 50
): Promise<ChatHistorySession[]> {
  let query = supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('last_message_at', { ascending: false })
    .limit(limit);

  if (subject) {
    query = query.eq('subject', subject);
  }

  const { data: sessions, error } = await query;

  if (error) {
    console.error('Error fetching chat sessions:', error);
    throw error;
  }

  // Fetch messages for each session
  const sessionsWithMessages = await Promise.all(
    sessions.map(async (session) => {
      const messages = await getChatMessages(session.id);
      return {
        id: session.id,
        subject: session.subject,
        grade: session.grade,
        mode: session.mode,
        title: session.title || undefined,
        messages,
        startedAt: session.started_at,
        lastMessageAt: session.last_message_at,
      };
    })
  );

  return sessionsWithMessages;
}

/**
 * Get a single chat session with messages
 */
export async function getChatSession(sessionId: string): Promise<ChatHistorySession | null> {
  const { data: session, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) {
    console.error('Error fetching chat session:', error);
    return null;
  }

  const messages = await getChatMessages(sessionId);

  return {
    id: session.id,
    subject: session.subject,
    grade: session.grade,
    mode: session.mode,
    title: session.title || undefined,
    messages,
    startedAt: session.started_at,
    lastMessageAt: session.last_message_at,
  };
}

/**
 * Get messages for a chat session
 */
export async function getChatMessages(sessionId: string): Promise<ChatHistoryMessage[]> {
  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching chat messages:', error);
    throw error;
  }

  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    timestamp: msg.created_at,
    choices: msg.choices || undefined,
    selectedChoice: msg.selected_choice || undefined,
  }));
}

/**
 * Add a message to a chat session
 */
export async function addChatMessage(
  sessionId: string,
  userId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata?: {
    choices?: string[];
    selectedChoice?: string;
    tokensUsed?: number;
    model?: string;
    latencyMs?: number;
  }
): Promise<string> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      user_id: userId,
      role,
      content,
      choices: metadata?.choices,
      selected_choice: metadata?.selectedChoice,
      tokens_used: metadata?.tokensUsed,
      model: metadata?.model,
      latency_ms: metadata?.latencyMs,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error adding chat message:', error);
    throw error;
  }

  // Update session's last_message_at. Message count is optional.
  await supabase
    .from('chat_sessions')
    .update({
      last_message_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  return data.id;
}

/**
 * Update a message (e.g., add feedback)
 */
export async function updateChatMessage(
  messageId: string,
  updates: {
    helpful?: boolean;
    feedbackComment?: string;
  }
): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .update({
      helpful: updates.helpful,
      feedback_comment: updates.feedbackComment,
    })
    .eq('id', messageId);

  if (error) {
    console.error('Error updating chat message:', error);
    throw error;
  }
}

/**
 * Archive a chat session
 */
export async function archiveChatSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_sessions')
    .update({
      status: 'archived',
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    console.error('Error archiving chat session:', error);
    throw error;
  }
}

/**
 * Delete a chat session (soft delete)
 */
export async function deleteChatSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_sessions')
    .update({
      status: 'deleted',
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    console.error('Error deleting chat session:', error);
    throw error;
  }
}

/**
 * Update session title
 */
export async function updateSessionTitle(sessionId: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('chat_sessions')
    .update({ title })
    .eq('id', sessionId);

  if (error) {
    console.error('Error updating session title:', error);
    throw error;
  }
}

/**
 * Migrate localStorage history to Supabase
 * 
 * This function helps users migrate their existing localStorage-based
 * chat history to the new Supabase backend.
 */
export async function migrateLocalStorageHistory(
  userId: string,
  grade: string
): Promise<{ migrated: number; failed: number }> {
  let migrated = 0;
  let failed = 0;

  const keys = Object.keys(localStorage).filter((key) =>
    key.startsWith('socraticChat.v1:')
  );

  for (const key of keys) {
    try {
      const [, storedUserId, encodedSubject] = key.split(':');
      if (storedUserId !== userId) continue;

      const subject = decodeURIComponent(encodedSubject || '');
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const envelope = JSON.parse(raw) as { messages?: unknown } | null;
      if (!envelope || !Array.isArray(envelope.messages) || envelope.messages.length === 0) {
        localStorage.removeItem(key);
        continue;
      }

      const messages = envelope.messages.filter(
        (msg): msg is { role: 'user' | 'assistant'; content: string } =>
          typeof msg === 'object' &&
          msg !== null &&
          ['user', 'assistant'].includes(
            (msg as Record<string, unknown>).role as string
          ) &&
          typeof (msg as Record<string, unknown>).content === 'string'
      );

      if (messages.length === 0) {
        localStorage.removeItem(key);
        continue;
      }

      const sessionId = await createChatSession(userId, subject, grade, 'socratic');

      for (const msg of messages) {
        await addChatMessage(sessionId, userId, msg.role, msg.content, {
          choices: undefined,
        });
      }

      localStorage.removeItem(key);
      migrated++;
    } catch (error) {
      console.error(`Failed to migrate ${key}:`, error);
      failed++;
    }
  }

  return { migrated, failed };
}

/**
 * Get chat statistics for a user
 */
export async function getChatStatistics(userId: string): Promise<{
  totalSessions: number;
  totalMessages: number;
  messagesBySubject: Record<string, number>;
  averageMessagesPerSession: number;
}> {
  // Get all sessions
  const { data: sessions, error: sessionsError } = await supabase
    .from('chat_sessions')
    .select('id, subject, message_count')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (sessionsError) {
    console.error('Error fetching chat statistics:', sessionsError);
    throw sessionsError;
  }

  // Get total messages
  const { count: totalMessages, error: messagesError } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'user');

  if (messagesError) {
    console.error('Error counting messages:', messagesError);
    throw messagesError;
  }

  // Calculate messages by subject
  const messagesBySubject: Record<string, number> = {};
  sessions.forEach((session) => {
    messagesBySubject[session.subject] =
      (messagesBySubject[session.subject] || 0) + (session.message_count || 0);
  });

  return {
    totalSessions: sessions.length,
    totalMessages: totalMessages || 0,
    messagesBySubject,
    averageMessagesPerSession:
      sessions.length > 0 ? (totalMessages || 0) / sessions.length : 0,
  };
}
