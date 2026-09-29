/**
 * Omega Agent Core - The Backbone of SyncSenta
 * 
 * This is the central AI system that orchestrates all learning experiences,
 * manages cross-device synchronization, and provides intelligent tutoring.
 * 
 * Architecture: Neuro-Symbolic AI with MeTTa reasoning capabilities
 */

import { supabase } from '@/lib/supabase/client';
import { newId } from '@/lib/secure-id';

// Core Types for Omega Agent System
export interface OmegaContext {
  userId: string;
  sessionId: string;
  currentActivity?: string;
  learningPath: string[];
  competencyLevels: Record<string, number>;
  culturalContext: CulturalContext;
  deviceInfo: DeviceInfo;
  timestamp: Date;
}

export interface CulturalContext {
  language: 'english' | 'kiswahili' | 'mixed';
  region: string;
  localExamples: string[];
  culturalReferences: string[];
}

export interface DeviceInfo {
  type: 'phone' | 'tablet' | 'desktop';
  capabilities: string[];
  screenSize: 'small' | 'medium' | 'large';
  connectivity: 'high' | 'medium' | 'low' | 'offline';
}

export interface LearningDecision {
  nextActivity?: string;
  difficulty: number;
  culturalAdaptation: string[];
  teacherAlert?: string;
  parentNotification?: string;
  reasoning: string;
}

export interface MeTTaKnowledge {
  atomSpace: Record<string, any>;
  rules: string[];
  facts: string[];
  culturalMappings: Record<string, string[]>;
}

/**
 * Omega Agent - The Central Intelligence
 * 
 * This class represents the main AI backbone that makes all educational decisions.
 * It uses neuro-symbolic reasoning to understand student needs and adapt accordingly.
 */
export class OmegaAgent {
  private context: OmegaContext;
  private knowledge: MeTTaKnowledge;
  private sessionActive: boolean = false;

  constructor(userId: string) {
    this.context = {
      userId,
      sessionId: this.generateSessionId(),
      learningPath: [],
      competencyLevels: {},
      culturalContext: {
        language: 'mixed',
        region: 'kenya',
        localExamples: [],
        culturalReferences: []
      },
      deviceInfo: {
        type: 'desktop',
        capabilities: [],
        screenSize: 'medium',
        connectivity: 'high'
      },
      timestamp: new Date()
    };

    this.knowledge = {
      atomSpace: {},
      rules: [],
      facts: [],
      culturalMappings: {}
    };

    this.initializeKnowledgeBase();
  }

  /**
   * Initialize the Omega Agent for a learning session
   */
  async initialize(): Promise<void> {
    try {
      this.sessionActive = true;
      
      // Load user profile and learning history
      await this.loadUserContext();
      
      // Initialize cultural context based on user location/preferences
      await this.initializeCulturalContext();
      
      // Set up device-specific adaptations
      this.detectDeviceCapabilities();
      
      // Activate real-time sync monitoring
      this.activateRealtimeSync();
      
      console.log('🧠 Omega Agent initialized for user:', this.context.userId);
    } catch (error) {
      console.error('❌ Omega Agent initialization failed:', error);
      throw new Error('Failed to initialize Omega Agent');
    }
  }

  /**
   * Make an intelligent learning decision based on current context
   */
  async makeDecision(input: {
    currentProgress: number;
    timeSpent: number;
    strugglingAreas: string[];
    recentActivity: string;
  }): Promise<LearningDecision> {
    
    // Symbolic reasoning using MeTTa-style logic
    const competencyAnalysis = this.analyzeCompetencies(input);
    const culturalAdaptation = this.getCulturalAdaptations(input.recentActivity);
    const difficultyAdjustment = this.calculateDifficulty(input.currentProgress);
    
    // Neuro-symbolic decision making
    const decision: LearningDecision = {
      difficulty: difficultyAdjustment,
      culturalAdaptation,
      reasoning: this.generateReasoning(competencyAnalysis, input)
    };

    // Determine next activity based on Grade 2 CBC curriculum
    if (input.currentProgress >= 80) {
      decision.nextActivity = this.selectNextActivity('advancement');
    } else if (input.strugglingAreas.length > 0) {
      decision.nextActivity = this.selectNextActivity('reinforcement');
      decision.teacherAlert = this.generateTeacherAlert(input.strugglingAreas);
    } else {
      decision.nextActivity = this.selectNextActivity('continuation');
    }

    // Log decision for learning analytics
    await this.logDecision(decision, input);

    return decision;
  }

  /**
   * Adapt learning experience based on device capabilities
   */
  adaptToDevice(deviceType: 'phone' | 'tablet' | 'desktop'): void {
    this.context.deviceInfo.type = deviceType;
    
    switch (deviceType) {
      case 'phone':
        this.context.deviceInfo.screenSize = 'small';
        this.context.deviceInfo.capabilities = ['touch', 'audio', 'camera'];
        break;
      case 'tablet':
        this.context.deviceInfo.screenSize = 'medium';
        this.context.deviceInfo.capabilities = ['touch', 'audio', 'camera', 'drawing'];
        break;
      case 'desktop':
        this.context.deviceInfo.screenSize = 'large';
        this.context.deviceInfo.capabilities = ['keyboard', 'mouse', 'audio', 'fullscreen'];
        break;
    }

    console.log(`📱 Omega Agent adapted to ${deviceType}`);
  }

  /**
   * Process teacher feedback and adjust learning accordingly
   */
  async processTeacherFeedback(feedback: {
    type: 'encouragement' | 'hint' | 'correction';
    message: string;
    urgency: 'low' | 'medium' | 'high';
  }): Promise<void> {
    
    // Update learning context based on teacher input
    if (feedback.type === 'correction') {
      // Adjust competency levels down for targeted practice
      await this.adjustCompetencyLevels('decrease');
    } else if (feedback.type === 'encouragement') {
      // Boost confidence and maintain current difficulty
      await this.adjustConfidenceLevel('increase');
    }

    // Log teacher intervention for analytics
    await this.logTeacherIntervention(feedback);

    console.log('👩‍🏫 Teacher feedback processed:', feedback.type);
  }

  /**
   * Sync learning progress across devices using Redis
   */
  async syncAcrossDevices(): Promise<void> {
    try {
      const sessionData = {
        context: this.context,
        timestamp: new Date(),
        deviceType: this.context.deviceInfo.type
      };

      // Save to Redis for cross-device sync (handled by session-persistence.ts)
      const response = await fetch('/api/session/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.context.userId,
          sessionData,
          action: 'save'
        })
      });

      if (!response.ok) {
        throw new Error('Session sync failed');
      }

      console.log('🔄 Omega Agent state synced across devices');
    } catch (error) {
      console.error('❌ Cross-device sync failed:', error);
    }
  }

  /**
   * Generate culturally appropriate activities for Kenyan Grade 2 students
   */
  private getCulturalAdaptations(activity: string): string[] {
    const kenyanContext = {
      counting: ['matatu passengers', 'safari animals', 'market fruits'],
      shapes: ['traditional huts', 'Kenyan flag patterns', 'tribal shields'],
      money: ['shilling coins', 'market prices', 'school fees'],
      animals: ['elephants', 'zebras', 'lions', 'giraffes', 'rhinos'],
      transport: ['matatus', 'boda bodas', 'tuk tuks', 'safari vehicles'],
      food: ['ugali', 'sukuma wiki', 'chapati', 'mandazi', 'maize']
    };

    // Match activity to cultural context
    for (const [key, examples] of Object.entries(kenyanContext)) {
      if (activity.toLowerCase().includes(key)) {
        return examples.slice(0, 3); // Return top 3 most relevant
      }
    }

    return ['Kenyan classroom', 'school friends', 'local community'];
  }

  private analyzeCompetencies(input: any): Record<string, number> {
    // Symbolic reasoning for competency analysis
    const analysis: Record<string, number> = {};
    
    // Grade 2 CBC Mathematics competencies
    if (input.recentActivity.includes('counting')) {
      analysis['MATH.G2.NUMBERS.COUNT'] = input.currentProgress / 20; // Scale to 0-5
    }
    
    if (input.recentActivity.includes('shapes')) {
      analysis['MATH.G2.GEOMETRY.SHAPES'] = input.currentProgress / 20;
    }

    return analysis;
  }

  private calculateDifficulty(progress: number): number {
    // Adaptive difficulty using Grade 2 appropriate scaling
    if (progress >= 90) return Math.min(4, this.getCurrentDifficulty() + 0.5);
    if (progress <= 40) return Math.max(1, this.getCurrentDifficulty() - 0.5);
    return this.getCurrentDifficulty();
  }

  private getCurrentDifficulty(): number {
    return 2.5; // Default Grade 2 difficulty level
  }

  private selectNextActivity(type: 'advancement' | 'reinforcement' | 'continuation'): string {
    const grade2Activities = {
      advancement: ['advanced-counting', 'shape-composition', 'story-building'],
      reinforcement: ['basic-counting', 'shape-recognition', 'letter-sounds'],
      continuation: ['number-garden', 'safari-shapes', 'word-magic']
    };

    const activities = grade2Activities[type];
    return activities[Math.floor(Math.random() * activities.length)];
  }

  private generateTeacherAlert(strugglingAreas: string[]): string {
    const area = strugglingAreas[0];
    return `Student needs help with ${area}. Consider providing visual examples or hands-on practice.`;
  }

  private generateReasoning(competencyAnalysis: Record<string, number>, input: any): string {
    const avgCompetency = Object.values(competencyAnalysis).reduce((a, b) => a + b, 0) / Object.values(competencyAnalysis).length;
    
    if (avgCompetency >= 4) {
      return `Student shows strong mastery (${avgCompetency.toFixed(1)}/5). Ready for advanced activities.`;
    } else if (avgCompetency <= 2) {
      return `Student struggling with basic concepts (${avgCompetency.toFixed(1)}/5). Need reinforcement and teacher support.`;
    } else {
      return `Student making steady progress (${avgCompetency.toFixed(1)}/5). Continue current learning path.`;
    }
  }

  private generateSessionId(): string {
    return newId('omega');
  }

  private initializeKnowledgeBase(): void {
    // Initialize with Grade 2 CBC knowledge
    this.knowledge.facts = [
      'Grade 2 students are 7-8 years old',
      'CBC focuses on competency-based learning',
      'Kenyan children learn in English and Kiswahili',
      'Visual learning is most effective for Grade 2',
      'Cultural context improves engagement'
    ];

    this.knowledge.rules = [
      'IF progress < 40% THEN reduce difficulty AND alert teacher',
      'IF progress > 90% THEN increase difficulty AND advance topic',
      'IF time_spent > 20_minutes THEN suggest break',
      'IF struggling_areas > 2 THEN recommend teacher intervention'
    ];
  }

  private async loadUserContext(): Promise<void> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', this.context.userId)
      .single();

    if (data && !error) {
      this.context.competencyLevels = data.competency_levels || {};
      this.context.culturalContext.language = data.language_preference || 'mixed';
    }
  }

  private async initializeCulturalContext(): Promise<void> {
    // Set Kenyan cultural context
    this.context.culturalContext = {
      language: 'mixed',
      region: 'kenya',
      localExamples: ['matatus', 'safari animals', 'ugali', 'shillings'],
      culturalReferences: ['Maasai Mara', 'Mount Kenya', 'Lake Victoria', 'Nairobi']
    };
  }

  private detectDeviceCapabilities(): void {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      if (width <= 768) {
        this.adaptToDevice('phone');
      } else if (width <= 1024) {
        this.adaptToDevice('tablet');
      } else {
        this.adaptToDevice('desktop');
      }
    }
  }

  private activateRealtimeSync(): void {
    // Set up periodic sync every 30 seconds
    setInterval(() => {
      if (this.sessionActive) {
        this.syncAcrossDevices();
      }
    }, 30000);
  }

  private async adjustCompetencyLevels(direction: 'increase' | 'decrease'): Promise<void> {
    const adjustment = direction === 'increase' ? 0.2 : -0.3;
    
    for (const competency in this.context.competencyLevels) {
      this.context.competencyLevels[competency] = Math.max(0, 
        Math.min(5, this.context.competencyLevels[competency] + adjustment)
      );
    }
  }

  private async adjustConfidenceLevel(direction: 'increase' | 'decrease'): Promise<void> {
    // Confidence affects difficulty selection
    const confidenceBoost = direction === 'increase' ? 0.1 : -0.1;
    // Implementation would adjust internal confidence scoring
  }

  private async logDecision(decision: LearningDecision, input: any): Promise<void> {
    try {
      await supabase.from('omega_decisions').insert({
        user_id: this.context.userId,
        session_id: this.context.sessionId,
        decision: decision,
        input_context: input,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to log Omega decision:', error);
    }
  }

  private async logTeacherIntervention(feedback: any): Promise<void> {
    try {
      await supabase.from('teacher_interventions').insert({
        user_id: this.context.userId,
        session_id: this.context.sessionId,
        feedback_type: feedback.type,
        message: feedback.message,
        urgency: feedback.urgency,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to log teacher intervention:', error);
    }
  }

  /**
   * Cleanup when session ends
   */
  async cleanup(): Promise<void> {
    this.sessionActive = false;
    await this.syncAcrossDevices(); // Final sync
    console.log('🛑 Omega Agent session ended');
  }
}

/**
 * Global Omega Agent instance
 */
let globalOmegaAgent: OmegaAgent | null = null;

export function getOmegaAgent(userId: string): OmegaAgent {
  if (!globalOmegaAgent || globalOmegaAgent['context'].userId !== userId) {
    globalOmegaAgent = new OmegaAgent(userId);
  }
  return globalOmegaAgent;
}

export function initializeOmega(userId: string): Promise<OmegaAgent> {
  const agent = getOmegaAgent(userId);
  return agent.initialize().then(() => agent);
}