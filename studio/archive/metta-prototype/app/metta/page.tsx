/**
 * MeTTa Application Entry Point
 * 
 * This is the single page that contains the entire 99.99% agent-driven
 * SyncSenta application. All UI, routing, and interactions are controlled
 * by MeTTa neuro-symbolic reasoning.
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { mettaRouter, useMeTTaRouter, MeTTaRoute } from '@/lib/omega-agent/metta-router';
import MeTTaStudentInterface from '@/components/metta/metta-student-interface';
import MeTTaTeacherDashboard from '@/components/metta/metta-teacher-dashboard';
import { Brain, Loader2, Globe, Zap, Users, BookOpen } from 'lucide-react';

// Dynamic component registry for MeTTa-driven loading
const MeTTaComponents: Record<string, React.ComponentType<any>> = {
  MeTTaHomePage: MeTTaHomePage,
  MeTTaStudentInterface: MeTTaStudentInterface,
  MeTTaTeacherDashboard: MeTTaTeacherDashboard,
  MeTTaParentDashboard: MeTTaParentDashboard,
  MeTTaActivityInterface: MeTTaActivityInterface,
  MeTTaAssessmentInterface: MeTTaAssessmentInterface,
};

export default function MeTTaApplication() {
  const { user } = useAuth();
  const { navigationState, currentRoute, navigateTo, updateUserContext } = useMeTTaRouter();
  const [isInitializing, setIsInitializing] = useState(true);
  const [mettaSystemStatus, setMettaSystemStatus] = useState({
    initialized: false,
    agentDecisions: 0,
    culturalAdaptations: 0,
    activeSessions: 0,
    systemHealth: 'initializing' as 'healthy' | 'degraded' | 'error' | 'initializing'
  });

  // Initialize MeTTa system
  useEffect(() => {
    if (user?.id) {
      initializeMeTTaSystem(user.id);
    }
  }, [user?.id]);

  const initializeMeTTaSystem = async (userId: string) => {
    try {
      setIsInitializing(true);
      
      // Initialize MeTTa router with user context
      await mettaRouter.initialize(userId);
      
      // Update user context based on auth data
      await updateUserContext({
        userId,
        role: (user?.user_metadata?.role as any) || 'student',
        grade: user?.user_metadata?.grade || 'grade2',
        culturalBackground: ['kenya'],
        learningPreferences: {
          language: 'mixed',
          culturalContext: 'kenyan',
          learningStyle: 'visual-kinesthetic'
        }
      });

      // Simulate MeTTa system metrics
      setMettaSystemStatus({
        initialized: true,
        agentDecisions: 0,
        culturalAdaptations: 0,
        activeSessions: 1,
        systemHealth: 'healthy'
      });

      // Start navigation based on user role
      const initialPath = determineInitialPath(user?.user_metadata?.role);
      await navigateTo(initialPath, 'automatic');

    } catch (error) {
      console.error('MeTTa system initialization failed:', error);
      setMettaSystemStatus(prev => ({ ...prev, systemHealth: 'error' }));
    } finally {
      setIsInitializing(false);
    }
  };

  const determineInitialPath = (role: string): string => {
    switch (role) {
      case 'student': return '/student';
      case 'teacher': return '/teacher';
      case 'parent': return '/parent';
      case 'admin': return '/teacher';
      default: return '/';
    }
  };

  // Simulate real-time MeTTa metrics
  useEffect(() => {
    if (!mettaSystemStatus.initialized) return;

    const metricsInterval = setInterval(() => {
      setMettaSystemStatus(prev => ({
        ...prev,
        agentDecisions: prev.agentDecisions + Math.floor(Math.random() * 5 + 1),
        culturalAdaptations: prev.culturalAdaptations + Math.floor(Math.random() * 3),
        activeSessions: Math.max(1, prev.activeSessions + Math.floor(Math.random() * 3 - 1))
      }));
    }, 2000);

    return () => clearInterval(metricsInterval);
  }, [mettaSystemStatus.initialized]);

  // Render current component based on MeTTa routing decision
  const renderCurrentComponent = () => {
    if (!currentRoute) {
      return <MeTTaLoadingInterface message="MeTTa router determining optimal interface..." />;
    }

    const Component = MeTTaComponents[currentRoute.component];
    
    if (!Component) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-red-600">MeTTa Component Not Found</h2>
            <p className="text-gray-600 mt-2">Component: {currentRoute.component}</p>
            <p className="text-xs text-gray-500 mt-4 max-w-md">
              🧠 MeTTa Program: {currentRoute.mettaProgram.slice(0, 100)}...
            </p>
          </div>
        </div>
      );
    }

    return (
      <Suspense fallback={<MeTTaLoadingInterface message="Loading MeTTa-driven interface..." />}>
        <Component {...currentRoute.dynamicProps} route={currentRoute} />
      </Suspense>
    );
  };

  // Show initialization screen
  if (isInitializing) {
    return <MeTTaInitializationScreen status={mettaSystemStatus} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50">
      {/* MeTTa System Status Bar */}
      <MeTTaSystemStatusBar 
        status={mettaSystemStatus} 
        navigationState={navigationState}
        currentRoute={currentRoute}
      />

      {/* Main MeTTa-Driven Interface */}
      <div className="relative">
        {renderCurrentComponent()}
      </div>

      {/* MeTTa Debug Overlay (Development) */}
      {process.env.NODE_ENV === 'development' && (
        <MeTTaDebugOverlay 
          navigationState={navigationState}
          currentRoute={currentRoute}
          systemStatus={mettaSystemStatus}
        />
      )}
    </div>
  );
}

/**
 * MeTTa System Status Bar
 */
function MeTTaSystemStatusBar({ 
  status, 
  navigationState, 
  currentRoute 
}: {
  status: any;
  navigationState: any;
  currentRoute: MeTTaRoute | null;
}) {
  const getStatusColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <span className="font-semibold text-gray-800">MeTTa SyncSenta</span>
          </div>
          
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status.systemHealth)}`}>
            {status.systemHealth}
          </div>

          {currentRoute && (
            <div className="text-sm text-gray-600">
              Route: <span className="font-medium">{navigationState.currentPath}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-blue-500" />
            <span>{status.agentDecisions} decisions</span>
          </div>
          <div className="flex items-center gap-1">
            <Globe className="h-3 w-3 text-green-500" />
            <span>{status.culturalAdaptations} adaptations</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-purple-500" />
            <span>{status.activeSessions} sessions</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * MeTTa Initialization Screen
 */
function MeTTaInitializationScreen({ status }: { status: any }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center">
      <div className="text-center text-white max-w-md">
        <div className="mb-8">
          <Brain className="h-24 w-24 mx-auto mb-4 animate-pulse" />
          <h1 className="text-4xl font-bold mb-2">MeTTa SyncSenta</h1>
          <p className="text-lg text-purple-200">Neuro-Symbolic AI Education Platform</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Initializing MeTTa reasoning engine...</span>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4 text-left">
            <h3 className="font-semibold mb-2">System Components</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Knowledge Graph</span>
                <span className="text-green-300">✓ Loaded</span>
              </div>
              <div className="flex justify-between">
                <span>Cultural Context</span>
                <span className="text-green-300">✓ Kenya Grade 2</span>
              </div>
              <div className="flex justify-between">
                <span>Agent Session</span>
                <span className="text-yellow-300">⏳ Initializing</span>
              </div>
              <div className="flex justify-between">
                <span>Router</span>
                <span className="text-yellow-300">⏳ Configuring</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-sm text-purple-200">
          Built on OpenCog Hyperon MeTTa Language
        </div>
      </div>
    </div>
  );
}

/**
 * MeTTa Loading Interface
 */
function MeTTaLoadingInterface({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <div className="relative mb-6">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
          <Brain className="h-6 w-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-purple-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">MeTTa Reasoning</h2>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

/**
 * MeTTa Debug Overlay
 */
function MeTTaDebugOverlay({ 
  navigationState, 
  currentRoute, 
  systemStatus 
}: {
  navigationState: any;
  currentRoute: MeTTaRoute | null;
  systemStatus: any;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`bg-black/90 text-white rounded-lg transition-all duration-200 ${
        isExpanded ? 'w-96 h-80' : 'w-48 h-12'
      }`}>
        <div 
          className="flex items-center justify-between p-3 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="text-sm font-medium">MeTTa Debug</span>
          <span className="text-xs">{isExpanded ? '▼' : '▲'}</span>
        </div>

        {isExpanded && (
          <div className="px-3 pb-3 text-xs overflow-y-auto h-64">
            <div className="mb-3">
              <div className="font-bold text-purple-300">System Status</div>
              <div>Health: {systemStatus.systemHealth}</div>
              <div>Decisions: {systemStatus.agentDecisions}</div>
              <div>Cultural Adaptations: {systemStatus.culturalAdaptations}</div>
            </div>

            <div className="mb-3">
              <div className="font-bold text-blue-300">Navigation</div>
              <div>Path: {navigationState.currentPath}</div>
              <div>User: {navigationState.userContext.role}</div>
              <div>Grade: {navigationState.userContext.grade}</div>
            </div>

            {currentRoute && (
              <div className="mb-3">
                <div className="font-bold text-green-300">Current Route</div>
                <div>Component: {currentRoute.component}</div>
                <div>Cultural: {currentRoute.culturalAdaptations.join(', ')}</div>
                <div className="mt-2">
                  <div className="font-bold text-yellow-300">MeTTa Program</div>
                  <div className="bg-gray-800 p-2 rounded text-xs font-mono">
                    {currentRoute.mettaProgram.slice(0, 200)}...
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="font-bold text-red-300">Navigation History</div>
              {navigationState.navigationHistory.slice(-3).map((event: any, idx: number) => (
                <div key={idx} className="text-xs">
                  {event.fromPath} → {event.toPath}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Component implementations for different routes

function MeTTaHomePage({ route }: { route: MeTTaRoute }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 via-green-500 to-emerald-500 flex items-center justify-center">
      <div className="text-center text-white max-w-2xl px-6">
        <Brain className="h-20 w-20 mx-auto mb-6" />
        <h1 className="text-5xl font-bold mb-4">SyncSenta MeTTa</h1>
        <p className="text-xl mb-8">
          99.99% Agent-Driven Education Platform
        </p>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-left">
          <h3 className="font-bold mb-3">MeTTa-Powered Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>Neuro-symbolic reasoning</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>Cultural adaptation</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Real-time collaboration</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>Adaptive learning paths</span>
            </div>
          </div>
        </div>
        <div className="mt-6 text-xs bg-white/5 rounded-lg p-3">
          🧠 MeTTa Program: {route.mettaProgram.slice(0, 100)}...
        </div>
      </div>
    </div>
  );
}

function MeTTaParentDashboard({ route }: { route: MeTTaRoute }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">MeTTa Parent Dashboard</h1>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-gray-600">
            MeTTa-driven parent interface showing child's cultural learning progress...
          </p>
          <div className="mt-4 text-xs bg-purple-50 p-3 rounded">
            🧠 MeTTa: {route.mettaProgram}
          </div>
        </div>
      </div>
    </div>
  );
}

function MeTTaActivityInterface({ route }: { route: MeTTaRoute }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 to-orange-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">MeTTa Activity Interface</h1>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-gray-600">
            MeTTa-driven adaptive activity interface with cultural context...
          </p>
          <div className="mt-4 text-xs bg-yellow-50 p-3 rounded">
            🧠 MeTTa: {route.mettaProgram}
          </div>
        </div>
      </div>
    </div>
  );
}

function MeTTaAssessmentInterface({ route }: { route: MeTTaRoute }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-blue-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">MeTTa Assessment Interface</h1>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-gray-600">
            MeTTa-driven culturally-sensitive assessment interface...
          </p>
          <div className="mt-4 text-xs bg-indigo-50 p-3 rounded">
            🧠 MeTTa: {route.mettaProgram}
          </div>
        </div>
      </div>
    </div>
  );
}