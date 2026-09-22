/**
 * Quiz Triggering Logic
 * Determines when to trigger quizzes during student chat sessions
 */

import type { QuizGenerationRequest, GradeLevel, Term } from '@/types/curriculum';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export interface QuizTriggerContext {
  conversationHistory: Message[];
  currentTopic: string;
  grade: string;
  subject: string;
  studentId: string;
}

export class QuizTrigger {
  private static readonly MIN_MESSAGES_FOR_QUIZ = 5;
  private static readonly QUIZ_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
  private static lastQuizTime: Record<string, number> = {};

  /**
   * Determine if quiz should be triggered based on conversation
   */
  static shouldTriggerQuiz(context: QuizTriggerContext): boolean {
    // Check cooldown
    if (this.hasRecentQuiz(context.studentId)) {
      return false;
    }

    // Check message count
    const messageCount = this.countTopicMessages(context);
    if (messageCount < this.MIN_MESSAGES_FOR_QUIZ) {
      return false;
    }

    // Check if student shows understanding
    const showsUnderstanding = this.detectUnderstanding(context);
    if (!showsUnderstanding) {
      return false;
    }

    return true;
  }

  /**
   * Count messages related to current topic
   */
  private static countTopicMessages(context: QuizTriggerContext): number {
    const topicKeywords = this.extractKeywords(context.currentTopic);
    
    return context.conversationHistory.filter(msg => {
      const content = msg.content.toLowerCase();
      return topicKeywords.some(keyword => content.includes(keyword));
    }).length;
  }

  /**
   * Detect if student shows understanding
   * Looks for clarifying questions, correct responses, engagement
   */
  private static detectUnderstanding(context: QuizTriggerContext): boolean {
    const recentMessages = context.conversationHistory.slice(-5);
    const userMessages = recentMessages.filter(m => m.role === 'user');

    if (userMessages.length === 0) return false;

    // Check for engagement indicators
    const engagementIndicators = [
      'i understand',
      'i see',
      'that makes sense',
      'i get it',
      'okay',
      'yes',
      'right',
      'correct',
      'can you explain',
      'what about',
      'how do',
      'why',
    ];

    const hasEngagement = userMessages.some(msg => {
      const content = msg.content.toLowerCase();
      return engagementIndicators.some(indicator => content.includes(indicator));
    });

    return hasEngagement;
  }

  /**
   * Check if student had a recent quiz
   */
  private static hasRecentQuiz(studentId: string): boolean {
    const lastTime = this.lastQuizTime[studentId];
    if (!lastTime) return false;

    const timeSince = Date.now() - lastTime;
    return timeSince < this.QUIZ_COOLDOWN_MS;
  }

  /**
   * Record quiz trigger time
   */
  static recordQuizTrigger(studentId: string): void {
    this.lastQuizTime[studentId] = Date.now();
  }

  /**
   * Generate quiz trigger message
   */
  static generateTriggerMessage(topic: string): string {
    return `Great discussion on ${topic}! Ready to test your understanding with a quick quiz? (3-5 questions)`;
  }

  /**
   * Extract quiz parameters from conversation
   */
  static extractQuizParams(context: QuizTriggerContext): QuizGenerationRequest {
    const strand = this.extractStrand(context.currentTopic);
    const subStrand = this.extractSubStrand(context.currentTopic);

    return {
      grade: context.grade as GradeLevel,
      subject: context.subject,
      term: 'Term1' as Term, // Default to Term1, can be made dynamic
      strand,
      subStrand,
      questionCount: 5,
      distribution: {
        mcq: 3,
        short: 2,
        long: 0,
      },
    };
  }

  /**
   * Extract strand from topic
   * This is a simplified version - can be enhanced with NLP
   */
  private static extractStrand(topic: string): string | undefined {
    const topicLower = topic.toLowerCase();

    // Mathematics strands
    if (topicLower.includes('number') || topicLower.includes('count') || 
        topicLower.includes('add') || topicLower.includes('subtract')) {
      return 'Numbers';
    }
    if (topicLower.includes('measure') || topicLower.includes('length') || 
        topicLower.includes('mass') || topicLower.includes('time')) {
      return 'Measurement';
    }
    if (topicLower.includes('shape') || topicLower.includes('geometry')) {
      return 'Geometry';
    }

    // English strands
    if (topicLower.includes('read') || topicLower.includes('comprehension')) {
      return 'Reading';
    }
    if (topicLower.includes('writ') || topicLower.includes('composition')) {
      return 'Writing';
    }
    if (topicLower.includes('listen') || topicLower.includes('speak')) {
      return 'Listening and Speaking';
    }

    return undefined;
  }

  /**
   * Extract sub-strand from topic
   */
  private static extractSubStrand(topic: string): string | undefined {
    const topicLower = topic.toLowerCase();

    // Mathematics sub-strands
    if (topicLower.includes('fraction')) return 'Fractions';
    if (topicLower.includes('decimal')) return 'Decimals';
    if (topicLower.includes('whole number')) return 'Whole Numbers';

    // English sub-strands
    if (topicLower.includes('comprehension')) return 'Reading Comprehension';
    if (topicLower.includes('composition')) return 'Composition';

    return undefined;
  }

  /**
   * Extract keywords from topic
   */
  private static extractKeywords(topic: string): string[] {
    return topic
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3);
  }

  /**
   * Extract current topic from conversation
   */
  static extractCurrentTopic(messages: Message[]): string {
    // Get last few messages
    const recentMessages = messages.slice(-5);
    
    // Look for topic indicators in model responses
    const modelMessages = recentMessages.filter(m => m.role === 'model');
    
    if (modelMessages.length === 0) return 'General';

    // Extract topic from last model message
    const lastModelMessage = modelMessages[modelMessages.length - 1].content;
    
    // Simple topic extraction - can be enhanced
    const topicMatch = lastModelMessage.match(/(?:about|learn|discuss|understand)\s+([^.!?]+)/i);
    if (topicMatch) {
      return topicMatch[1].trim();
    }

    return 'General';
  }
}
