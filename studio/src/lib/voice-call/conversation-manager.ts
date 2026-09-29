/**
 * Context-Aware Conversation Manager (FREE)
 * Manages conversation flow, context, and intelligent topic transitions
 * 
 * Features:
 * - Real-time context tracking
 * - Seamless topic transitions mid-conversation
 * - Intelligent interruption handling
 * - Conversation state persistence
 * - Zero-cost localStorage-based implementation
 */

import { newId } from '@/lib/secure-id';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  audioUrl?: string;
  interrupted?: boolean;
  topic?: string;
  metadata?: Record<string, any>;
}

export interface ConversationContext {
  currentTopic: string;
  previousTopics: string[];
  learnerProfile: {
    grade?: string;
    subject?: string;
    learningStyle?: string;
    knowledgeLevel?: string;
  };
  conversationGoals: string[];
  keyPoints: string[];
  questionsAsked: string[];
  conceptsCovered: string[];
}

export interface TopicTransition {
  from: string;
  to: string;
  reason: 'user_request' | 'natural_flow' | 'clarification_needed' | 'prerequisite';
  timestamp: number;
  seamless: boolean;
}

export interface ConversationState {
  id: string;
  userId: string;
  messages: ConversationMessage[];
  context: ConversationContext;
  transitions: TopicTransition[];
  startTime: number;
  lastUpdateTime: number;
  isActive: boolean;
  interruptionCount: number;
}

/**
 * Conversation Manager for intelligent voice interactions
 */
export class ConversationManager {
  private state: ConversationState;
  private storageKey: string;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private contextUpdateCallbacks: Array<(context: ConversationContext) => void> = [];
  private transitionCallbacks: Array<(transition: TopicTransition) => void> = [];

  constructor(userId: string, conversationId?: string) {
    this.storageKey = `voice_conversation_${userId}_${conversationId || 'current'}`;
    this.state = this.loadState() || this.createNewState(userId, conversationId);
    this.startAutoSave();
  }

  /**
   * Create new conversation state
   */
  private createNewState(userId: string, conversationId?: string): ConversationState {
    return {
      id: conversationId || this.generateId(),
      userId,
      messages: [],
      context: {
        currentTopic: '',
        previousTopics: [],
        learnerProfile: {},
        conversationGoals: [],
        keyPoints: [],
        questionsAsked: [],
        conceptsCovered: [],
      },
      transitions: [],
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      isActive: true,
      interruptionCount: 0,
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return newId('conv');
  }

  /**
   * Add message to conversation
   */
  addMessage(
    role: 'user' | 'assistant',
    content: string,
    metadata?: {
      audioUrl?: string;
      interrupted?: boolean;
      topic?: string;
      [key: string]: any;
    }
  ): ConversationMessage {
    const message: ConversationMessage = {
      id: this.generateId(),
      role,
      content,
      timestamp: Date.now(),
      ...metadata,
    };

    this.state.messages.push(message);
    this.state.lastUpdateTime = Date.now();

    // Update context based on message
    this.updateContextFromMessage(message);

    // Detect topic if not provided
    if (!metadata?.topic && role === 'user') {
      const detectedTopic = this.detectTopic(content);
      if (detectedTopic && detectedTopic !== this.state.context.currentTopic) {
        this.transitionTopic(detectedTopic, 'user_request');
      }
    }

    this.saveState();
    return message;
  }

  /**
   * Handle user interruption
   */
  handleInterruption(userMessage: string): void {
    // Mark last assistant message as interrupted
    const lastAssistantMessage = [...this.state.messages]
      .reverse()
      .find(m => m.role === 'assistant');

    if (lastAssistantMessage) {
      lastAssistantMessage.interrupted = true;
    }

    this.state.interruptionCount++;
    
    // Add user's interruption message
    this.addMessage('user', userMessage, { interrupted: true });

    console.log('⚡ User interrupted - handling gracefully');
  }

  /**
   * Transition to new topic seamlessly
   */
  transitionTopic(
    newTopic: string,
    reason: TopicTransition['reason'] = 'natural_flow',
    seamless: boolean = true
  ): void {
    const previousTopic = this.state.context.currentTopic;
    if (!previousTopic) {
      this.state.context.currentTopic = newTopic;
      this.contextUpdateCallbacks.forEach(cb => cb(this.state.context));
      this.saveState();
      return;
    }

    const transition: TopicTransition = {
      from: previousTopic,
      to: newTopic,
      reason,
      timestamp: Date.now(),
      seamless,
    };

    // Update context only after a real topic change.
    this.state.context.previousTopics.push(previousTopic);
    this.state.context.currentTopic = newTopic;
    this.state.transitions.push(transition);

    // Notify callbacks
    this.transitionCallbacks.forEach(cb => cb(transition));
    this.contextUpdateCallbacks.forEach(cb => cb(this.state.context));

    console.log(`🔄 Topic transition: ${transition.from} → ${transition.to} (${reason})`);
    this.saveState();
  }

  /**
   * Detect topic from user message using keyword matching
   */
  private detectTopic(message: string): string | null {
    const lowerMessage = message.toLowerCase();

    // Educational topics
    const topicKeywords: Record<string, string[]> = {
      'mathematics': ['math', 'algebra', 'geometry', 'calculus', 'equation', 'number', 'fraction', 'decimal', 'addition', 'subtraction'],
      'science': ['science', 'physics', 'chemistry', 'biology', 'experiment', 'plant', 'photosynthesis', 'animal', 'water', 'energy'],
      'english': ['english', 'grammar', 'writing', 'reading', 'literature', 'story', 'essay', 'sentence', 'paragraph'],
      'history': ['history', 'historical', 'past', 'ancient', 'civilization', 'independence', 'kenya', 'africa'],
      'geography': ['geography', 'map', 'country', 'continent', 'location', 'river', 'mountain', 'climate'],
      'kiswahili': ['kiswahili', 'swahili', 'lugha', 'maneno', 'insha'],
      'art': ['art', 'drawing', 'painting', 'color', 'creative', 'design'],
      'music': ['music', 'song', 'instrument', 'rhythm', 'melody'],
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return topic;
      }
    }

    return null;
  }

  /**
   * Update context from message content
   */
  private updateContextFromMessage(message: ConversationMessage): void {
    const content = message.content.toLowerCase();

    // Extract questions
    if (content.includes('?')) {
      this.state.context.questionsAsked.push(message.content);
    }

    // Extract key points (simple heuristic)
    if (message.role === 'assistant' && content.length > 50) {
      const sentences = message.content.split(/[.!?]+/).filter(s => s.trim().length > 20);
      this.state.context.keyPoints.push(...sentences.slice(0, 2));
    }

    // Keep only recent items
    this.state.context.questionsAsked = this.state.context.questionsAsked.slice(-10);
    this.state.context.keyPoints = this.state.context.keyPoints.slice(-20);
  }

  /**
   * Get conversation summary for context
   */
  getConversationSummary(): string {
    const recentMessages = this.state.messages.slice(-10);
    const summary = recentMessages
      .map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`)
      .join('\n');

    return summary;
  }

  /**
   * Get context for AI prompt
   */
  getContextForPrompt(): string {
    const { context } = this.state;
    
    let prompt = 'Learning context initialized. Use the learner\'s current message to guide the next step.\n';
    
    if (context.currentTopic) {
      prompt += `Current Topic: ${context.currentTopic}\n`;
    }

    if (context.previousTopics.length > 0) {
      prompt += `Previous Topics: ${context.previousTopics.slice(-3).join(', ')}\n`;
    }

    if (context.learnerProfile.grade) {
      prompt += `Student Grade: ${context.learnerProfile.grade}\n`;
    }

    if (context.conceptsCovered.length > 0) {
      prompt += `Concepts Covered: ${context.conceptsCovered.slice(-5).join(', ')}\n`;
    }

    if (context.keyPoints.length > 0) {
      prompt += `Key Points Discussed:\n${context.keyPoints.slice(-5).join('\n')}\n`;
    }

    return prompt;
  }

  /**
   * Update learner profile
   */
  updateLearnerProfile(profile: Partial<ConversationContext['learnerProfile']>): void {
    this.state.context.learnerProfile = {
      ...this.state.context.learnerProfile,
      ...profile,
    };
    this.saveState();
  }

  /**
   * Add conversation goal
   */
  addGoal(goal: string): void {
    if (!this.state.context.conversationGoals.includes(goal)) {
      this.state.context.conversationGoals.push(goal);
      this.saveState();
    }
  }

  /**
   * Mark concept as covered
   */
  markConceptCovered(concept: string): void {
    if (!this.state.context.conceptsCovered.includes(concept)) {
      this.state.context.conceptsCovered.push(concept);
      this.saveState();
    }
  }

  /**
   * Get conversation statistics
   */
  getStats(): {
    messageCount: number;
    duration: number;
    topicCount: number;
    interruptionCount: number;
    averageResponseTime: number;
  } {
    const duration = Math.max(1, Date.now() - this.state.startTime);
    const userMessages = this.state.messages.filter(m => m.role === 'user');
    const assistantMessages = this.state.messages.filter(m => m.role === 'assistant');

    // Calculate average response time
    let totalResponseTime = 0;
    let responseCount = 0;

    for (let i = 1; i < this.state.messages.length; i++) {
      if (this.state.messages[i].role === 'assistant' && 
          this.state.messages[i - 1].role === 'user') {
        totalResponseTime += this.state.messages[i].timestamp - this.state.messages[i - 1].timestamp;
        responseCount++;
      }
    }

    return {
      messageCount: this.state.messages.length,
      duration,
      topicCount: this.state.transitions.length + 1,
      interruptionCount: this.state.interruptionCount,
      averageResponseTime: responseCount > 0 ? totalResponseTime / responseCount : 0,
    };
  }

  /**
   * Subscribe to context updates
   */
  onContextUpdate(callback: (context: ConversationContext) => void): () => void {
    this.contextUpdateCallbacks.push(callback);
    return () => {
      this.contextUpdateCallbacks = this.contextUpdateCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to topic transitions
   */
  onTopicTransition(callback: (transition: TopicTransition) => void): () => void {
    this.transitionCallbacks.push(callback);
    return () => {
      this.transitionCallbacks = this.transitionCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Get current state
   */
  getState(): ConversationState {
    return { ...this.state };
  }

  /**
   * Get recent messages
   */
  getRecentMessages(count: number = 10): ConversationMessage[] {
    return this.state.messages.slice(-count);
  }

  /**
   * Clear conversation
   */
  clear(): void {
    this.state = this.createNewState(this.state.userId);
    this.saveState();
  }

  /**
   * End conversation
   */
  endConversation(): void {
    this.state.isActive = false;
    this.state.lastUpdateTime = Date.now();
    this.saveState();
    this.stopAutoSave();
  }

  /**
   * Save state to localStorage
   */
  private saveState(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to save conversation state:', error);
    }
  }

  /**
   * Load state from localStorage
   */
  private loadState(): ConversationState | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load conversation state:', error);
      return null;
    }
  }

  /**
   * Start auto-save interval
   */
  private startAutoSave(): void {
    this.autoSaveInterval = setInterval(() => {
      this.saveState();
    }, 5000); // Save every 5 seconds
  }

  /**
   * Stop auto-save interval
   */
  private stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopAutoSave();
    this.saveState();
    this.contextUpdateCallbacks = [];
    this.transitionCallbacks = [];
  }
}

/**
 * Export conversation to Supabase
 */
export async function exportConversationToSupabase(
  conversation: ConversationState,
  supabaseClient: any
): Promise<void> {
  try {
    const { error } = await supabaseClient
      .from('voice_conversations')
      .insert({
        id: conversation.id,
        user_id: conversation.userId,
        messages: conversation.messages,
        context: conversation.context,
        transitions: conversation.transitions,
        start_time: new Date(conversation.startTime).toISOString(),
        end_time: new Date(conversation.lastUpdateTime).toISOString(),
        stats: {
          message_count: conversation.messages.length,
          interruption_count: conversation.interruptionCount,
          topic_count: conversation.transitions.length + 1,
        },
      });

    if (error) throw error;
    console.log('✅ Conversation exported to Supabase');
  } catch (error) {
    console.error('Failed to export conversation:', error);
    throw error;
  }
}

// Made with Bob
