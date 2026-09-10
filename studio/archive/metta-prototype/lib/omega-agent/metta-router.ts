/**
 * MeTTa Router - 99.99% Agent-Driven Application Routing
 * 
 * All routing decisions, page layouts, component loading, and navigation
 * are determined by MeTTa neuro-symbolic reasoning rather than traditional routing.
 * 
 * The entire SyncSenta application becomes a single MeTTa program that
 * dynamically generates and modifies the user interface based on:
 * - User context and learning state
 * - Educational objectives and competency levels  
 * - Cultural preferences and regional adaptations
 * - Real-time classroom dynamics
 * - Teacher interventions and feedback
 */

import { useEffect, useState } from 'react';
import { mettaEducationSystem, MeTTaSession } from './metta-core';

export interface MeTTaRoute {
  path: string;
  component: string;
  mettaProgram: string;
  culturalAdaptations: string[];
  userTypes: string[];
  competencyRequirements: Record<string, number>;
  dynamicProps: Record<string, any>;
}

export interface MeTTaNavigationState {
  currentPath: string;
  userContext: MeTTaUserContext;
  availableRoutes: MeTTaRoute[];
  navigationHistory: MeTTaNavigationEvent[];
  culturalPreferences: Record<string, any>;
}

export interface MeTTaUserContext {
  userId: string;
  role: 'student' | 'teacher' | 'parent' | 'admin';
  grade: string;
  competencyLevels: Record<string, number>;
  culturalBackground: string[];
  learningPreferences: Record<string, any>;
  deviceContext: {
    type: 'phone' | 'tablet' | 'desktop';
    screenSize: { width: number; height: number };
    capabilities: string[];
  };
}

export interface MeTTaNavigationEvent {
  timestamp: number;
  fromPath: string;
  toPath: string;
  mettaReasoning: string;
  userAction: string;
  automaticNavigation: boolean;
}

/**
 * MeTTa Router Class - Replaces traditional React Router
 */
export class MeTTaRouter {
  private session: MeTTaSession | null = null;
  private navigationState: MeTTaNavigationState;
  private routeChangeListeners: ((state: MeTTaNavigationState) => void)[] = [];
  private mettaPrograms: Map<string, string> = new Map();

  constructor() {
    this.navigationState = {
      currentPath: '/',
      userContext: {
        userId: '',
        role: 'student',
        grade: 'grade2',
        competencyLevels: {},
        culturalBackground: ['kenya'],
        learningPreferences: {},
        deviceContext: {
          type: 'desktop',
          screenSize: { width: 1024, height: 768 },
          capabilities: ['keyboard', 'mouse', 'audio']
        }
      },
      availableRoutes: [],
      navigationHistory: [],
      culturalPreferences: {}
    };

    this.initializeMeTTaRoutes();
  }

  /**
   * Initialize all possible routes as MeTTa programs
   */
  private initializeMeTTaRoutes(): void {
    // Define core application routes as MeTTa expressions
    const routes: MeTTaRoute[] = [
      {
        path: '/',
        component: 'MeTTaHomePage',
        mettaProgram: `
          (route-decision home
            (if (user-authenticated $user)
              (redirect-based-on-role $user)
              (show-welcome-interface (cultural-context kenya))))
        `,
        culturalAdaptations: ['kenyan-welcome', 'multilingual-greeting'],
        userTypes: ['any'],
        competencyRequirements: {},
        dynamicProps: {}
      },
      {
        path: '/student',
        component: 'MeTTaStudentInterface',
        mettaProgram: `
          (student-interface
            (grade $grade)
            (competencies $competencies)
            (cultural-context kenya)
            (activities (generate-age-appropriate $grade $competencies))
            (ui-adaptation (device-type $device) (cultural-preferences $culture)))
        `,
        culturalAdaptations: ['grade2-appropriate', 'kenyan-examples', 'kiswahili-integration'],
        userTypes: ['student'],
        competencyRequirements: {},
        dynamicProps: { interactive: true, gamified: true }
      },
      {
        path: '/teacher',
        component: 'MeTTaTeacherDashboard', 
        mettaProgram: `
          (teacher-dashboard
            (classroom-students $students)
            (monitoring-mode real-time)
            (intervention-suggestions automatic)
            (cultural-analytics enabled)
            (cbc-alignment grade2)
            (metta-insights continuous))
        `,
        culturalAdaptations: ['cbc-curriculum', 'kenyan-classroom', 'teacher-resources'],
        userTypes: ['teacher', 'admin'],
        competencyRequirements: {},
        dynamicProps: { realTimeMonitoring: true, autoInterventions: true }
      },
      {
        path: '/parent',
        component: 'MeTTaParentDashboard',
        mettaProgram: `
          (parent-dashboard
            (child-progress $child)
            (cultural-connection family-heritage)
            (communication-with-teacher enabled)
            (home-learning-suggestions cultural-context)
            (privacy-controls child-data-protection))
        `,
        culturalAdaptations: ['family-engagement', 'cultural-values', 'home-support'],
        userTypes: ['parent'],
        competencyRequirements: {},
        dynamicProps: { childFocused: true, culturallyRelevant: true }
      },
      {
        path: '/activity/:activityId',
        component: 'MeTTaActivityInterface',
        mettaProgram: `
          (activity-interface
            (activity-id $activityId)
            (student-level (get-competency $student $subject))
            (cultural-examples (select-kenyan-context $activityId))
            (difficulty-adaptation automatic)
            (progress-tracking real-time)
            (teacher-notifications (if struggling)))
        `,
        culturalAdaptations: ['activity-specific', 'local-examples', 'visual-audio-support'],
        userTypes: ['student'],
        competencyRequirements: {},
        dynamicProps: { adaptive: true, culturallyContextualized: true }
      },
      {
        path: '/assessment',
        component: 'MeTTaAssessmentInterface',
        mettaProgram: `
          (assessment-interface
            (competency-focus $subjects)
            (cultural-sensitivity high)
            (assessment-method (mix visual auditory kinesthetic))
            (real-time-feedback enabled)
            (teacher-dashboard-integration live))
        `,
        culturalAdaptations: ['culturally-unbiased', 'multiple-intelligences', 'local-context'],
        userTypes: ['student', 'teacher'],
        competencyRequirements: {},
        dynamicProps: { adaptive: true, comprehensive: true }
      }
    ];

    this.navigationState.availableRoutes = routes;

    // Store MeTTa programs for each route
    routes.forEach(route => {
      this.mettaPrograms.set(route.path, route.mettaProgram);
    });
  }

  /**
   * Initialize MeTTa session for routing decisions
   */
  async initialize(userId: string): Promise<void> {
    this.session = mettaEducationSystem.createSession(userId, 'router');
    
    // Add routing-specific knowledge to MeTTa session
    this.session.addSessionFact('(router-mode metta-driven)');
    this.session.addSessionFact('(navigation-style adaptive)');
    this.session.addSessionFact('(cultural-routing kenya-primary-education)');
    this.session.addSessionFact('(user-experience personalized)');

    // Load user context
    await this.loadUserContext(userId);
  }

  /**
   * Load user context from various sources into MeTTa knowledge
   */
  private async loadUserContext(userId: string): Promise<void> {
    if (!this.session) return;

    // Query user profile and learning state
    const userQuery = `
      (get-user-context
        (user-id ${userId})
        (include profile competencies preferences cultural-background)
        (device-detection automatic))
    `;

    const response = await this.session.processInteraction({
      type: 'user_context_load',
      query: userQuery,
      userId
    });

    // Update navigation state based on MeTTa response
    this.navigationState.userContext = {
      ...this.navigationState.userContext,
      userId,
      // Additional context would be loaded from response in real implementation
    };

    // Detect device capabilities
    this.detectDeviceContext();
  }

  /**
   * Detect device context for responsive MeTTa routing
   */
  private detectDeviceContext(): void {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      let deviceType: 'phone' | 'tablet' | 'desktop' = 'desktop';
      if (width <= 768) {
        deviceType = 'phone';
      } else if (width <= 1024) {
        deviceType = 'tablet'; 
      }

      this.navigationState.userContext.deviceContext = {
        type: deviceType,
        screenSize: { width, height },
        capabilities: this.detectDeviceCapabilities(deviceType)
      };

      // Update MeTTa session with device context
      if (this.session) {
        this.session.addSessionFact(`(device-type ${deviceType})`);
        this.session.addSessionFact(`(screen-size ${width}x${height})`);
      }
    }
  }

  private detectDeviceCapabilities(deviceType: string): string[] {
    switch (deviceType) {
      case 'phone':
        return ['touch', 'camera', 'microphone', 'gps', 'accelerometer'];
      case 'tablet':  
        return ['touch', 'camera', 'microphone', 'drawing', 'rotation'];
      case 'desktop':
        return ['keyboard', 'mouse', 'webcam', 'fullscreen', 'multi-window'];
      default:
        return ['basic'];
    }
  }

  /**
   * Navigate to a path using MeTTa reasoning
   */
  async navigateTo(path: string, userAction: string = 'manual'): Promise<boolean> {
    if (!this.session) {
      console.error('MeTTa Router not initialized');
      return false;
    }

    // Query MeTTa for navigation decision
    const navigationQuery = `
      (navigation-decision
        (target-path ${path})
        (current-path ${this.navigationState.currentPath})
        (user-context ${JSON.stringify(this.navigationState.userContext)})
        (user-action ${userAction})
        (validate-permissions true)
        (check-competency-requirements true))
    `;

    const response = await this.session.processInteraction({
      type: 'navigation_request',
      query: navigationQuery,
      targetPath: path,
      userAction
    });

    // Process MeTTa navigation decision
    if (response.data?.navigationAllowed) {
      const previousPath = this.navigationState.currentPath;
      
      // Update navigation state
      this.navigationState.currentPath = response.data.resolvedPath || path;
      
      // Add to navigation history
      this.navigationState.navigationHistory.push({
        timestamp: Date.now(),
        fromPath: previousPath,
        toPath: this.navigationState.currentPath,
        mettaReasoning: response.data.reasoning || 'Navigation approved by MeTTa',
        userAction,
        automaticNavigation: userAction === 'automatic'
      });

      // Notify listeners
      this.notifyRouteChange();
      
      return true;
    } else {
      console.log('Navigation blocked by MeTTa:', response.data?.reason);
      
      // Handle navigation blocking (e.g., redirect to appropriate page)
      if (response.data?.redirectTo) {
        return this.navigateTo(response.data.redirectTo, 'automatic');
      }
      
      return false;
    }
  }

  /**
   * Get current route with MeTTa-generated dynamic properties
   */
  async getCurrentRoute(): Promise<MeTTaRoute | null> {
    const route = this.navigationState.availableRoutes.find(
      r => this.matchPath(r.path, this.navigationState.currentPath)
    );

    if (!route || !this.session) {
      return route || null;
    }

    // Generate dynamic props using MeTTa
    const propsQuery = `
      (generate-route-props
        (path ${this.navigationState.currentPath})
        (user-context ${JSON.stringify(this.navigationState.userContext)})
        (cultural-preferences ${JSON.stringify(this.navigationState.culturalPreferences)})
        (real-time-adaptation true))
    `;

    const response = await this.session.processInteraction({
      type: 'route_props_generation',
      query: propsQuery,
      route
    });

    // Return route with MeTTa-generated dynamic properties
    return {
      ...route,
      dynamicProps: {
        ...route.dynamicProps,
        ...(response.data?.dynamicProps || {}),
        mettaGenerated: true,
        generatedAt: Date.now()
      }
    };
  }

  /**
   * Check if a path pattern matches current path
   */
  private matchPath(pattern: string, path: string): boolean {
    // Simple pattern matching - in production would use full route matching
    if (pattern === path) return true;
    
    // Handle dynamic segments like /activity/:activityId
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');
    
    if (patternParts.length !== pathParts.length) return false;
    
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        // Dynamic segment, matches anything
        continue;
      }
      if (patternParts[i] !== pathParts[i]) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Add route change listener
   */
  onRouteChange(listener: (state: MeTTaNavigationState) => void): () => void {
    this.routeChangeListeners.push(listener);
    
    return () => {
      const index = this.routeChangeListeners.indexOf(listener);
      if (index > -1) {
        this.routeChangeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of route change
   */
  private notifyRouteChange(): void {
    this.routeChangeListeners.forEach(listener => {
      listener(this.navigationState);
    });
  }

  /**
   * Get navigation state
   */
  getNavigationState(): MeTTaNavigationState {
    return this.navigationState;
  }

  /**
   * Update user context (triggers route re-evaluation)
   */
  async updateUserContext(updates: Partial<MeTTaUserContext>): Promise<void> {
    this.navigationState.userContext = {
      ...this.navigationState.userContext,
      ...updates
    };

    if (this.session) {
      // Update MeTTa session with new context
      const updateQuery = `
        (update-user-context
          (user-id ${this.navigationState.userContext.userId})
          (updates ${JSON.stringify(updates)})
          (trigger-route-reevaluation true))
      `;

      await this.session.processInteraction({
        type: 'context_update',
        query: updateQuery,
        updates
      });
    }

    // Re-evaluate current route
    this.notifyRouteChange();
  }

  /**
   * Suggest next navigation based on learning progress
   */
  async suggestNextNavigation(): Promise<string | null> {
    if (!this.session) return null;

    const suggestionQuery = `
      (suggest-navigation
        (current-path ${this.navigationState.currentPath})
        (user-progress ${JSON.stringify(this.navigationState.userContext.competencyLevels)})
        (learning-objectives grade2-cbc)
        (cultural-continuity true)
        (engagement-optimization true))
    `;

    const response = await this.session.processInteraction({
      type: 'navigation_suggestion',
      query: suggestionQuery
    });

    return response.data?.suggestedPath || null;
  }

  /**
   * Get MeTTa program for current route
   */
  getCurrentMeTTaProgram(): string | null {
    return this.mettaPrograms.get(this.navigationState.currentPath) || null;
  }
}

// Global MeTTa Router instance
export const mettaRouter = new MeTTaRouter();

/**
 * React Hook for MeTTa Router
 */
export function useMeTTaRouter() {
  const [navigationState, setNavigationState] = useState<MeTTaNavigationState>(
    mettaRouter.getNavigationState()
  );
  const [currentRoute, setCurrentRoute] = useState<MeTTaRoute | null>(null);

  useEffect(() => {
    // Listen for route changes
    const unsubscribe = mettaRouter.onRouteChange((state) => {
      setNavigationState(state);
    });

    // Load current route
    mettaRouter.getCurrentRoute().then(setCurrentRoute);

    return unsubscribe;
  }, []);

  // Update current route when navigation state changes
  useEffect(() => {
    mettaRouter.getCurrentRoute().then(setCurrentRoute);
  }, [navigationState.currentPath]);

  return {
    navigationState,
    currentRoute,
    navigateTo: mettaRouter.navigateTo.bind(mettaRouter),
    updateUserContext: mettaRouter.updateUserContext.bind(mettaRouter),
    suggestNextNavigation: mettaRouter.suggestNextNavigation.bind(mettaRouter),
    getCurrentMeTTaProgram: mettaRouter.getCurrentMeTTaProgram.bind(mettaRouter)
  };
}

export default mettaRouter;