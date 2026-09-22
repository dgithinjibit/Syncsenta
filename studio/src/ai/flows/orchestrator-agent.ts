/**
 * Orchestrator Agent - The Maestro
 * Coordinates all other agents, breaks down complex requests, and synthesizes responses
 */

import { CBCCurriculumAgent } from './cbc-curriculum-agent';
import { mwalimuAiTutor } from './mwalimu-ai-flow';
import { generateLessonPlan } from './generate-lesson-plan';
import { personalizedLearning } from '../../lib/personalized-learning';

interface OrchestratorRequest {
  message: string;
  context: {
    userId: string;
    grade?: string;
    subject?: string;
    role?: 'student' | 'teacher' | 'parent' | 'admin';
    type?: 'tutoring' | 'curriculum' | 'lesson_planning' | 'assessment';
    priority?: 'low' | 'medium' | 'high';
    sessionId?: string;
  };
}

interface OrchestratorResponse {
  success: boolean;
  response: string;
  primaryAgent: string;
  agentsUsed: string[];
  responseTime: number;
  cached: boolean;
  contextAware: boolean;
  subjectSwitch?: boolean;
  previousContext?: string;
  coordination?: AgentCoordination;
  curriculumValidation?: {
    isAligned: boolean;
    confidence: number;
    reason?: string;
  };
  fallbackUsed?: boolean;
  priority?: string;
  error?: string;
  suggestions?: string[];
}

interface AgentCoordination {
  sequence: string[];
  dependencies: Record<string, string[]>;
  synthesis: string;
}

interface ConversationContext {
  userId: string;
  lastSubject?: string;
  lastGrade?: string;
  conversationHistory: Array<{
    message: string;
    response: string;
    agent: string;
    timestamp: string;
  }>;
}

export class OrchestratorAgent {
  private cbcAgent: CBCCurriculumAgent;
  private responseCache: Map<string, { response: OrchestratorResponse; timestamp: number }>;
  private conversationContexts: Map<string, ConversationContext>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.cbcAgent = new CBCCurriculumAgent();
    this.responseCache = new Map();
    this.conversationContexts = new Map();
  }

  /**
   * Main entry point - processes any request and coordinates appropriate agents
   */
  async processRequest(request: OrchestratorRequest): Promise<OrchestratorResponse> {
    const startTime = Date.now();
    
    try {
      // Validate request
      const validation = this.validateRequest(request);
      if (!validation.isValid) {
        return this.createErrorResponse(validation.error!, startTime);
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cached = this.getCachedResponse(cacheKey);
      if (cached) {
        return { ...cached, responseTime: Date.now() - startTime, cached: true };
      }

      // Get or create conversation context
      const context = this.getConversationContext(request.context.userId);
      const contextAware = this.updateConversationContext(context, request);

      // Determine request type and route to appropriate agents
      const requestAnalysis = this.analyzeRequest(request);
      
      // Check for subject switching
      const subjectSwitch = context.lastSubject && 
                           request.context.subject && 
                           context.lastSubject !== request.context.subject;

      let response: OrchestratorResponse;

      if (requestAnalysis.requiresMultipleAgents) {
        response = await this.coordinateMultipleAgents(request, requestAnalysis);
      } else {
        response = await this.routeToSingleAgent(request, requestAnalysis);
      }

      // Add context information
      response.contextAware = contextAware;
      response.subjectSwitch = subjectSwitch;
      response.previousContext = context.conversationHistory.length > 0 ? 
        context.conversationHistory[context.conversationHistory.length - 1].message : undefined;
      response.responseTime = Date.now() - startTime;
      response.cached = false;
      response.priority = request.context.priority;

      // Update conversation context AFTER processing
      context.conversationHistory.push({
        message: request.message,
        response: response.response,
        agent: response.primaryAgent,
        timestamp: new Date().toISOString()
      });

      // Update last subject and grade AFTER processing
      context.lastSubject = request.context.subject;
      context.lastGrade = request.context.grade;

      // Cache successful responses
      if (response.success && requestAnalysis.cacheable) {
        this.cacheResponse(cacheKey, response);
      }

      return response;

    } catch (error) {
      return this.createErrorResponse(
        `Orchestrator error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        startTime,
        true // fallback used
      );
    }
  }

  /**
   * Validate incoming request
   */
  private validateRequest(request: OrchestratorRequest): { isValid: boolean; error?: string } {
    if (!request.message || request.message.trim().length === 0) {
      return {
        isValid: false,
        error: 'Invalid request: Message cannot be empty'
      };
    }

    if (!request.context.userId) {
      return {
        isValid: false,
        error: 'Invalid request: User ID is required'
      };
    }

    return { isValid: true };
  }

  /**
   * Analyze request to determine routing strategy
   */
  private analyzeRequest(request: OrchestratorRequest): {
    primaryAgent: string;
    requiresMultipleAgents: boolean;
    cacheable: boolean;
    urgency: 'low' | 'medium' | 'high';
  } {
    const message = request.message.toLowerCase();
    const context = request.context;

    // Complex requests requiring multiple agents - CHECK FIRST!
    if ((message.includes('create') && (message.includes('teach') || message.includes('lesson'))) ||
        (message.includes('lesson') && message.includes('explain')) ||
        (message.toLowerCase().includes('cbc') && message.includes('lesson') && message.includes('explain')) ||
        (message.includes('aligned') && message.includes('lesson'))) {
      return {
        primaryAgent: 'LESSON_ARCHITECT',
        requiresMultipleAgents: true,
        cacheable: false,
        urgency: 'medium'
      };
    }

    // Curriculum-specific queries - more comprehensive detection
    if (message.includes('learning outcomes') || 
        message.includes('curriculum') || 
        message.includes('cbc') ||
        message.includes('competencies') ||
        message.includes('grade 4 mathematics') ||
        message.includes('what are the') && (message.includes('grade') || message.includes('math'))) {
      return {
        primaryAgent: 'CBC_CURRICULUM',
        requiresMultipleAgents: false,
        cacheable: true,
        urgency: 'low'
      };
    }

    // Lesson planning requests - improved detection
    if ((message.includes('lesson plan') || 
         message.includes('create a lesson') ||
         message.includes('scheme of work') || 
         message.includes('worksheet')) && 
        (context.role === 'teacher' || message.includes('lesson'))) {
      return {
        primaryAgent: 'LESSON_ARCHITECT',
        requiresMultipleAgents: message.includes('cbc') || message.includes('aligned'),
        cacheable: true,
        urgency: 'medium'
      };
    }

    // Student tutoring (default)
    return {
      primaryAgent: 'SOCRATIC_TUTOR',
      requiresMultipleAgents: false,
      cacheable: false,
      urgency: context.priority === 'high' ? 'high' : 'medium'
    };
  }

  /**
   * Route request to single agent
   */
  private async routeToSingleAgent(
    request: OrchestratorRequest, 
    analysis: any
  ): Promise<OrchestratorResponse> {
    
    switch (analysis.primaryAgent) {
      case 'CBC_CURRICULUM':
        return await this.handleCurriculumQuery(request);
      
      case 'SOCRATIC_TUTOR':
        return await this.handleTutoringRequest(request);
      
      case 'LESSON_ARCHITECT':
        return await this.handleLessonPlanningRequest(request);
      
      default:
        return await this.handleTutoringRequest(request); // Fallback to tutoring
    }
  }

  /**
   * Coordinate multiple agents for complex requests
   */
  private async coordinateMultipleAgents(
    request: OrchestratorRequest,
    analysis: any
  ): Promise<OrchestratorResponse> {
    
    const coordination: AgentCoordination = {
      sequence: [],
      dependencies: {},
      synthesis: ''
    };

    try {
      // Step 1: Validate curriculum alignment
      coordination.sequence.push('CBC_CURRICULUM');
      const curriculumValidation = await this.cbcAgent.validateCurriculumAlignment(
        request.message,
        {
          grade: request.context.grade || 'g4',
          subject: request.context.subject || 'Mathematics'
        }
      );

      if (!curriculumValidation.isAligned) {
        return {
          success: false,
          response: `This request is not aligned with CBC curriculum: ${curriculumValidation.reason}`,
          primaryAgent: 'CBC_CURRICULUM',
          agentsUsed: ['CBC_CURRICULUM'],
          responseTime: 0,
          cached: false,
          contextAware: false,
          curriculumValidation,
          error: curriculumValidation.reason,
          suggestions: curriculumValidation.suggestions || []
        };
      }

      // Step 2: Generate lesson content if needed
      let lessonContent = '';
      if (request.message.includes('lesson') || request.message.includes('plan')) {
        coordination.sequence.push('LESSON_ARCHITECT');
        coordination.dependencies['LESSON_ARCHITECT'] = ['CBC_CURRICULUM'];
        
        const lessonResponse = await this.handleLessonPlanningRequest(request);
        lessonContent = lessonResponse.response;
      }

      // Step 3: Generate tutoring explanation
      coordination.sequence.push('SOCRATIC_TUTOR');
      coordination.dependencies['SOCRATIC_TUTOR'] = ['CBC_CURRICULUM'];
      
      const tutoringResponse = await this.handleTutoringRequest(request);

      // Step 4: Synthesize responses
      coordination.synthesis = this.synthesizeResponses([
        { agent: 'CBC_CURRICULUM', content: 'Curriculum validated' },
        { agent: 'LESSON_ARCHITECT', content: lessonContent },
        { agent: 'SOCRATIC_TUTOR', content: tutoringResponse.response }
      ]);

      return {
        success: true,
        response: coordination.synthesis,
        primaryAgent: analysis.primaryAgent,
        agentsUsed: coordination.sequence,
        responseTime: 0,
        cached: false,
        contextAware: false,
        coordination,
        curriculumValidation
      };

    } catch (error) {
      return {
        success: false,
        response: 'Failed to coordinate multiple agents',
        primaryAgent: 'ORCHESTRATOR',
        agentsUsed: coordination.sequence,
        responseTime: 0,
        cached: false,
        contextAware: false,
        error: error instanceof Error ? error.message : 'Unknown coordination error',
        fallbackUsed: true
      };
    }
  }

  /**
   * Handle curriculum-specific queries
   */
  private async handleCurriculumQuery(request: OrchestratorRequest): Promise<OrchestratorResponse> {
    try {
      const response = await this.cbcAgent.query(request.message, {
        grade: request.context.grade || 'g4',
        subject: request.context.subject || 'Mathematics',
        language: 'english'
      });

      return {
        success: response.isAccurate,
        response: response.content || response.error || 'No curriculum information found',
        primaryAgent: 'CBC_CURRICULUM',
        agentsUsed: ['CBC_CURRICULUM'],
        responseTime: 0,
        cached: false,
        contextAware: false,
        curriculumValidation: {
          isAligned: response.isAccurate,
          confidence: response.confidence
        },
        error: response.error,
        suggestions: response.suggestions
      };
    } catch (error) {
      // Return curriculum error instead of falling back
      return {
        success: false,
        response: 'I apologize, but I encountered an issue accessing curriculum information.',
        primaryAgent: 'CBC_CURRICULUM',
        agentsUsed: ['CBC_CURRICULUM'],
        responseTime: 0,
        cached: false,
        contextAware: false,
        error: error instanceof Error ? error.message : 'Curriculum agent error',
        fallbackUsed: false,
        suggestions: [
          'Try rephrasing your curriculum question',
          'Check if the grade and subject are correct',
          'Ask about specific learning outcomes'
        ]
      };
    }
  }

  /**
   * Handle tutoring requests
   */
  private async handleTutoringRequest(request: OrchestratorRequest): Promise<OrchestratorResponse> {
    try {
      // Get personalized prompt
      const profile = await personalizedLearning.getStudentProfile(request.context.userId);
      
      const tutoringResponse = await mwalimuAiTutor({
        currentMessage: request.message,
        grade: request.context.grade || profile.grade.replace('Grade ', 'g'),
        subject: request.context.subject || 'General',
        history: [],
        conversationId: request.context.sessionId || 'default',
        studentId: request.context.userId,
        studentName: profile.name
      });

      return {
        success: true,
        response: tutoringResponse.response,
        primaryAgent: 'SOCRATIC_TUTOR',
        agentsUsed: ['SOCRATIC_TUTOR'],
        responseTime: 0,
        cached: false,
        contextAware: false
      };
    } catch (error) {
      return {
        success: false,
        response: 'I apologize, but I encountered an issue. Could you please rephrase your question?',
        primaryAgent: 'SOCRATIC_TUTOR',
        agentsUsed: ['SOCRATIC_TUTOR'],
        responseTime: 0,
        cached: false,
        contextAware: false,
        error: error instanceof Error ? error.message : 'Tutoring agent error',
        fallbackUsed: true,
        suggestions: [
          'Try asking about a specific topic',
          'Include your grade level in the question',
          'Ask for help with a particular subject'
        ]
      };
    }
  }

  /**
   * Handle lesson planning requests
   */
  private async handleLessonPlanningRequest(request: OrchestratorRequest): Promise<OrchestratorResponse> {
    try {
      const lessonResponse = await generateLessonPlan({
        subject: request.context.subject || 'Mathematics',
        grade: request.context.grade || 'g4',
        topic: this.extractTopicFromMessage(request.message),
        duration: '40 minutes',
        learningObjectives: []
      });

      return {
        success: true,
        response: lessonResponse.lessonPlan,
        primaryAgent: 'LESSON_ARCHITECT',
        agentsUsed: ['LESSON_ARCHITECT'],
        responseTime: 0,
        cached: false,
        contextAware: false
      };
    } catch (error) {
      return await this.handleTutoringRequest(request); // Fallback to tutoring
    }
  }

  /**
   * Synthesize responses from multiple agents
   */
  private synthesizeResponses(responses: Array<{ agent: string; content: string }>): string {
    let synthesis = '';
    
    for (const response of responses) {
      if (response.content && response.content.trim()) {
        synthesis += `${response.content}\n\n`;
      }
    }

    return synthesis.trim() || 'I was able to coordinate multiple agents but couldn\'t generate a complete response.';
  }

  /**
   * Get or create conversation context
   */
  private getConversationContext(userId: string): ConversationContext {
    if (!this.conversationContexts.has(userId)) {
      this.conversationContexts.set(userId, {
        userId,
        conversationHistory: []
      });
    }
    return this.conversationContexts.get(userId)!;
  }

  /**
   * Update conversation context with new request
   */
  private updateConversationContext(context: ConversationContext, request: OrchestratorRequest): boolean {
    const hasContext = context.conversationHistory.length > 0;
    
    // Don't update context here - do it after processing
    // This method just returns whether we have existing context
    
    return hasContext;
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: OrchestratorRequest): string {
    return `${request.message}-${request.context.grade}-${request.context.subject}`.toLowerCase();
  }

  /**
   * Get cached response if available and not expired
   */
  private getCachedResponse(cacheKey: string): OrchestratorResponse | null {
    const cached = this.responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.response;
    }
    return null;
  }

  /**
   * Cache response for future use
   */
  private cacheResponse(cacheKey: string, response: OrchestratorResponse): void {
    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
  }

  /**
   * Extract topic from message
   */
  private extractTopicFromMessage(message: string): string {
    const topicKeywords = ['fractions', 'addition', 'subtraction', 'multiplication', 'division', 'geometry', 'measurement'];
    const messageLower = message.toLowerCase();
    
    for (const keyword of topicKeywords) {
      if (messageLower.includes(keyword)) {
        return keyword;
      }
    }
    
    return 'general topic';
  }

  /**
   * Create error response
   */
  private createErrorResponse(error: string, startTime: number, fallbackUsed = false): OrchestratorResponse {
    return {
      success: false,
      response: 'I apologize, but I encountered an issue processing your request.',
      primaryAgent: 'ORCHESTRATOR',
      agentsUsed: ['ORCHESTRATOR'],
      responseTime: Date.now() - startTime,
      cached: false,
      contextAware: false,
      error,
      fallbackUsed,
      suggestions: [
        'Please check your message and try again',
        'Make sure to include grade and subject information',
        'Try asking a more specific question'
      ]
    };
  }
}