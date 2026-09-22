/**
 * Personalized Learning System for SyncSenta
 * Creates adaptive, personalized AI tutoring experiences
 */

export interface StudentProfile {
  id: string;
  name: string;
  grade: string;
  preferredLanguage: 'english' | 'kiswahili' | 'mixed';
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading' | 'mixed';
  interests: string[];
  strengths: string[];
  challenges: string[];
  culturalContext: {
    region: string;
    localLanguage?: string;
    culturalReferences: string[];
  };
  createdAt: string;
  lastActive: string;
}

export interface LearningSession {
  id: string;
  studentId: string;
  subject: string;
  topic: string;
  startTime: string;
  endTime?: string;
  interactions: ChatInteraction[];
  performance: {
    questionsAsked: number;
    correctAnswers: number;
    helpRequests: number;
    engagementLevel: 'low' | 'medium' | 'high';
    difficultyLevel: 'easy' | 'medium' | 'hard';
  };
  learningOutcomes: string[];
  nextRecommendations: string[];
}

export interface ChatInteraction {
  timestamp: string;
  userMessage: string;
  aiResponse: string;
  messageType: 'question' | 'explanation' | 'encouragement' | 'correction' | 'hint';
  topicCovered: string;
  difficultyLevel: number; // 1-10
  studentUnderstood: boolean | null;
  responseTime: number; // seconds
}

export interface LearningProgress {
  studentId: string;
  subject: string;
  topics: {
    [topicName: string]: {
      masteryLevel: number; // 0-100
      timeSpent: number; // minutes
      lastPracticed: string;
      conceptsLearned: string[];
      needsReview: boolean;
      difficulty: 'easy' | 'medium' | 'hard';
    };
  };
  overallProgress: number; // 0-100
  streakDays: number;
  totalSessions: number;
  averageSessionTime: number;
}

export class PersonalizedLearningEngine {
  private static instance: PersonalizedLearningEngine;
  private profiles: Map<string, StudentProfile> = new Map();
  private sessions: Map<string, LearningSession[]> = new Map();
  private progress: Map<string, LearningProgress[]> = new Map();

  static getInstance(): PersonalizedLearningEngine {
    if (!PersonalizedLearningEngine.instance) {
      PersonalizedLearningEngine.instance = new PersonalizedLearningEngine();
    }
    return PersonalizedLearningEngine.instance;
  }

  /**
   * Get or create student profile with intelligent defaults
   */
  async getStudentProfile(userId: string = 'user1'): Promise<StudentProfile> {
    if (this.profiles.has(userId)) {
      return this.profiles.get(userId)!;
    }

    // Create intelligent default profile
    const profile: StudentProfile = {
      id: userId,
      name: this.generateFriendlyName(),
      grade: this.detectGradeFromStorage() || 'Grade 4',
      preferredLanguage: 'mixed', // Start with mixed for flexibility
      learningStyle: 'mixed', // Will be detected over time
      interests: this.getDefaultInterests(),
      strengths: [],
      challenges: [],
      culturalContext: {
        region: 'Kenya',
        culturalReferences: ['matatu', 'ugali', 'safari', 'Maasai Mara', 'Mount Kenya']
      },
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };

    this.profiles.set(userId, profile);
    this.saveToLocalStorage();
    return profile;
  }

  /**
   * Update student profile based on interactions
   */
  async updateProfile(userId: string, updates: Partial<StudentProfile>): Promise<void> {
    const profile = await this.getStudentProfile(userId);
    Object.assign(profile, updates, { lastActive: new Date().toISOString() });
    this.profiles.set(userId, profile);
    this.saveToLocalStorage();
  }

  /**
   * Get learning progress for a student
   */
  async getLearningProgress(userId: string, subject: string): Promise<LearningProgress> {
    const userProgress = this.progress.get(userId) || [];
    let subjectProgress = userProgress.find(p => p.subject === subject);

    if (!subjectProgress) {
      subjectProgress = {
        studentId: userId,
        subject,
        topics: {},
        overallProgress: 0,
        streakDays: 0,
        totalSessions: 0,
        averageSessionTime: 0
      };
      userProgress.push(subjectProgress);
      this.progress.set(userId, userProgress);
    }

    return subjectProgress;
  }

  /**
   * Start a new learning session
   */
  async startSession(userId: string, subject: string, topic: string): Promise<LearningSession> {
    const session: LearningSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      studentId: userId,
      subject,
      topic,
      startTime: new Date().toISOString(),
      interactions: [],
      performance: {
        questionsAsked: 0,
        correctAnswers: 0,
        helpRequests: 0,
        engagementLevel: 'medium',
        difficultyLevel: 'medium'
      },
      learningOutcomes: [],
      nextRecommendations: []
    };

    const userSessions = this.sessions.get(userId) || [];
    userSessions.push(session);
    this.sessions.set(userId, userSessions);

    return session;
  }

  /**
   * Add interaction to current session
   */
  async addInteraction(
    userId: string, 
    sessionId: string, 
    interaction: Omit<ChatInteraction, 'timestamp'>
  ): Promise<void> {
    const userSessions = this.sessions.get(userId) || [];
    const session = userSessions.find(s => s.id === sessionId);
    
    if (session) {
      session.interactions.push({
        ...interaction,
        timestamp: new Date().toISOString()
      });

      // Update performance metrics
      if (interaction.messageType === 'question') {
        session.performance.questionsAsked++;
      }
      
      // Analyze engagement based on response time and message length
      if (interaction.responseTime < 5) {
        session.performance.engagementLevel = 'high';
      } else if (interaction.responseTime > 30) {
        session.performance.engagementLevel = 'low';
      }

      this.saveToLocalStorage();
    }
  }

  /**
   * Generate personalized AI prompt based on student profile and history
   */
  async generatePersonalizedPrompt(
    userId: string, 
    subject: string, 
    currentMessage: string
  ): Promise<string> {
    const profile = await this.getStudentProfile(userId);
    const progress = await this.getLearningProgress(userId, subject);
    const recentSessions = this.getRecentSessions(userId, subject, 3);

    // Analyze learning patterns
    const learningInsights = this.analyzeLearningPatterns(profile, progress, recentSessions);

    return `You are Mwalimu, an AI tutor specialized in Kenya's CBC curriculum. You are having a personalized conversation with ${profile.name}.

## STUDENT PROFILE:
- **Name**: ${profile.name}
- **Grade**: ${profile.grade}
- **Preferred Language**: ${profile.preferredLanguage}
- **Learning Style**: ${profile.learningStyle}
- **Interests**: ${profile.interests.join(', ')}
- **Strengths**: ${profile.strengths.join(', ') || 'Still discovering'}
- **Areas for Growth**: ${profile.challenges.join(', ') || 'Still assessing'}
- **Cultural Context**: ${profile.culturalContext.region} (${profile.culturalContext.culturalReferences.join(', ')})

## LEARNING HISTORY & INSIGHTS:
${learningInsights}

## CURRENT SUBJECT: ${subject}
**Overall Progress**: ${progress.overallProgress}%
**Total Sessions**: ${progress.totalSessions}
**Learning Streak**: ${progress.streakDays} days

## PERSONALIZATION GUIDELINES:

### Language & Communication:
${this.getLanguageGuidelines(profile)}

### Learning Style Adaptation:
${this.getLearningStyleGuidelines(profile)}

### Cultural Relevance:
- Use examples from ${profile.culturalContext.region}
- Reference familiar concepts: ${profile.culturalContext.culturalReferences.join(', ')}
- Connect learning to local context and experiences

### Interest-Based Engagement:
- Connect topics to student interests: ${profile.interests.join(', ')}
- Use analogies and examples from their areas of interest
- Make learning relevant to their world

### Adaptive Difficulty:
${this.getDifficultyGuidelines(progress, recentSessions)}

### Encouragement & Motivation:
- Acknowledge ${profile.name} by name regularly
- Celebrate progress and effort, not just correct answers
- Build on their strengths: ${profile.strengths.join(', ') || 'their curiosity and engagement'}
- Provide gentle support for challenges: ${profile.challenges.join(', ') || 'any areas they find difficult'}

## CURRENT CONVERSATION:
Student's message: "${currentMessage}"

Respond as Mwalimu with a personalized, culturally relevant, and pedagogically appropriate response that:
1. Addresses ${profile.name} personally
2. Adapts to their learning style and preferences
3. Uses appropriate language mix (${profile.preferredLanguage})
4. Connects to their interests and cultural context
5. Adjusts difficulty based on their progress
6. Encourages continued learning

Keep your response conversational, encouraging, and focused on guiding ${profile.name} through discovery rather than giving direct answers.`;
  }

  /**
   * Analyze learning patterns to provide insights
   */
  private analyzeLearningPatterns(
    profile: StudentProfile, 
    progress: LearningProgress, 
    recentSessions: LearningSession[]
  ): string {
    const insights: string[] = [];

    // Session frequency analysis
    if (progress.totalSessions > 5) {
      insights.push(`${profile.name} has completed ${progress.totalSessions} learning sessions`);
    }

    // Streak analysis
    if (progress.streakDays > 3) {
      insights.push(`Currently on a ${progress.streakDays}-day learning streak - excellent consistency!`);
    }

    // Topic mastery analysis
    const masteredTopics = Object.entries(progress.topics)
      .filter(([_, topic]) => topic.masteryLevel > 80)
      .map(([name, _]) => name);
    
    if (masteredTopics.length > 0) {
      insights.push(`Strong mastery in: ${masteredTopics.join(', ')}`);
    }

    // Areas needing review
    const reviewTopics = Object.entries(progress.topics)
      .filter(([_, topic]) => topic.needsReview)
      .map(([name, _]) => name);
    
    if (reviewTopics.length > 0) {
      insights.push(`May benefit from reviewing: ${reviewTopics.join(', ')}`);
    }

    // Recent engagement patterns
    if (recentSessions.length > 0) {
      const avgEngagement = recentSessions.reduce((sum, session) => {
        const engagementScore = session.performance.engagementLevel === 'high' ? 3 : 
                              session.performance.engagementLevel === 'medium' ? 2 : 1;
        return sum + engagementScore;
      }, 0) / recentSessions.length;

      if (avgEngagement > 2.5) {
        insights.push(`Recent sessions show high engagement and enthusiasm`);
      } else if (avgEngagement < 1.5) {
        insights.push(`Recent sessions suggest need for more engaging approaches`);
      }
    }

    return insights.length > 0 ? insights.join('\n- ') : 'Building learning profile through interactions';
  }

  /**
   * Get language guidelines based on student preference
   */
  private getLanguageGuidelines(profile: StudentProfile): string {
    switch (profile.preferredLanguage) {
      case 'english':
        return '- Communicate primarily in English\n- Use clear, age-appropriate vocabulary\n- Explain Kiswahili terms when introduced';
      case 'kiswahili':
        return '- Communicate primarily in Kiswahili\n- Use familiar Kiswahili expressions\n- Translate English terms when necessary';
      case 'mixed':
      default:
        return '- Use natural mix of English and Kiswahili\n- Include common Kiswahili greetings (Jambo, Karibu, Hongera)\n- Switch languages based on topic familiarity';
    }
  }

  /**
   * Get learning style guidelines
   */
  private getLearningStyleGuidelines(profile: StudentProfile): string {
    const guidelines: string[] = [];

    if (profile.learningStyle.includes('visual') || profile.learningStyle === 'mixed') {
      guidelines.push('- Use descriptive language and visual metaphors');
      guidelines.push('- Suggest drawing or visualizing concepts');
    }

    if (profile.learningStyle.includes('auditory') || profile.learningStyle === 'mixed') {
      guidelines.push('- Use rhythm, rhymes, and verbal repetition');
      guidelines.push('- Encourage reading aloud or verbal practice');
    }

    if (profile.learningStyle.includes('kinesthetic') || profile.learningStyle === 'mixed') {
      guidelines.push('- Suggest hands-on activities and movement');
      guidelines.push('- Use physical analogies and real-world applications');
    }

    if (profile.learningStyle.includes('reading') || profile.learningStyle === 'mixed') {
      guidelines.push('- Provide written examples and encourage note-taking');
      guidelines.push('- Suggest reading additional materials');
    }

    return guidelines.join('\n');
  }

  /**
   * Get difficulty adjustment guidelines
   */
  private getDifficultyGuidelines(progress: LearningProgress, recentSessions: LearningSession[]): string {
    if (recentSessions.length === 0) {
      return '- Start with medium difficulty and adjust based on responses\n- Provide hints if student struggles\n- Increase complexity if student shows mastery';
    }

    const recentPerformance = recentSessions.slice(-3);
    const avgCorrectAnswers = recentPerformance.reduce((sum, session) => {
      const accuracy = session.performance.questionsAsked > 0 ? 
        session.performance.correctAnswers / session.performance.questionsAsked : 0.5;
      return sum + accuracy;
    }, 0) / recentPerformance.length;

    if (avgCorrectAnswers > 0.8) {
      return '- Student showing strong understanding - can increase difficulty\n- Introduce more complex concepts\n- Challenge with application questions';
    } else if (avgCorrectAnswers < 0.4) {
      return '- Student may be struggling - reduce difficulty\n- Break concepts into smaller steps\n- Provide more scaffolding and encouragement';
    } else {
      return '- Current difficulty level seems appropriate\n- Continue with balanced challenge\n- Adjust based on individual responses';
    }
  }

  /**
   * Get recent sessions for analysis
   */
  private getRecentSessions(userId: string, subject: string, count: number): LearningSession[] {
    const userSessions = this.sessions.get(userId) || [];
    return userSessions
      .filter(session => session.subject === subject)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, count);
  }

  /**
   * Generate friendly name for anonymous users
   */
  private generateFriendlyName(): string {
    const kenyanNames = [
      'Amani', 'Baraka', 'Dalila', 'Farida', 'Habiba', 'Imara', 'Jengo', 
      'Kesi', 'Latifa', 'Mwema', 'Neema', 'Omari', 'Pendo', 'Rafiki', 
      'Salama', 'Tumaini', 'Upendo', 'Wema', 'Zuberi'
    ];
    return kenyanNames[Math.floor(Math.random() * kenyanNames.length)];
  }

  /**
   * Detect grade from localStorage
   */
  private detectGradeFromStorage(): string | null {
    if (typeof window !== 'undefined') {
      const grade = localStorage.getItem('studentGrade');
      if (grade) {
        return `Grade ${grade.replace('g', '')}`;
      }
    }
    return null;
  }

  /**
   * Get default interests based on Kenyan context
   */
  private getDefaultInterests(): string[] {
    return ['animals', 'nature', 'sports', 'music', 'stories'];
  }

  /**
   * Save data to localStorage
   */
  private saveToLocalStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('syncsenta_profiles', JSON.stringify(Array.from(this.profiles.entries())));
        localStorage.setItem('syncsenta_sessions', JSON.stringify(Array.from(this.sessions.entries())));
        localStorage.setItem('syncsenta_progress', JSON.stringify(Array.from(this.progress.entries())));
      } catch (error) {
        console.warn('Failed to save to localStorage:', error);
      }
    }
  }

  /**
   * Load data from localStorage
   */
  private loadFromLocalStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const profiles = localStorage.getItem('syncsenta_profiles');
        if (profiles) {
          this.profiles = new Map(JSON.parse(profiles));
        }

        const sessions = localStorage.getItem('syncsenta_sessions');
        if (sessions) {
          this.sessions = new Map(JSON.parse(sessions));
        }

        const progress = localStorage.getItem('syncsenta_progress');
        if (progress) {
          this.progress = new Map(JSON.parse(progress));
        }
      } catch (error) {
        console.warn('Failed to load from localStorage:', error);
      }
    }
  }

  constructor() {
    this.loadFromLocalStorage();
  }
}

// Export singleton instance
export const personalizedLearning = PersonalizedLearningEngine.getInstance();