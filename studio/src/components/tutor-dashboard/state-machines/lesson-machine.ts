/**
 * Lesson State Machine (XState v5)
 * 
 * Manages the flow of an interactive lesson using deterministic state transitions.
 * Inspired by Synthesis Tutor's state machine approach.
 */

import { setup, assign, createActor } from 'xstate';
import type { LessonScript, LessonNode, LessonState, InteractionLog } from '../types/lesson-script';
import { widgetAgentMachine, type WidgetAgentActor } from './widget-agent';

// Events
export type LessonEvent =
  | { type: 'START' }
  | { type: 'NEXT' }
  | { type: 'ANSWER_CORRECT'; data?: any }
  | { type: 'ANSWER_INCORRECT'; data?: any }
  | { type: 'REQUEST_HINT' }
  | { type: 'RETRY' }
  | { type: 'COMPLETE' }
  | { type: 'WIDGET_COMPLETED'; widgetId: string; answer: any }
  | { type: 'WIDGET_ERROR'; widgetId: string; error: string };

// Context
export interface LessonContext {
  studentId: string;
  lessonScript: LessonScript;
  currentNodeId: string;
  completedNodes: string[];
  attempts: Record<string, number>;
  hintsUsed: Record<string, number>;
  startTime: number;
  interactions: InteractionLog[];
  currentAnswer?: any;
  activeWidgets: Record<string, WidgetAgentActor>;
}

// Helper to get current node
function getCurrentNode(context: LessonContext): LessonNode | undefined {
  return context.lessonScript.nodes.find(n => n.id === context.currentNodeId);
}

// Helper to log interaction
function logInteraction(
  context: LessonContext,
  action: InteractionLog['action'],
  data?: any,
  correct?: boolean
): InteractionLog {
  const node = getCurrentNode(context);
  return {
    timestamp: Date.now(),
    nodeId: context.currentNodeId,
    nodeType: node?.type || 'teaching',
    action,
    data,
    correct,
    timeOnTask: Date.now() - context.startTime,
  };
}

/**
 * Lesson State Machine
 */
export const lessonMachine = setup({
  types: {
    context: {} as LessonContext,
    events: {} as LessonEvent,
    input: {} as Partial<LessonContext>,
  },
  actions: {
    // Spawn widget agent for current node
    spawnWidgetAgent: assign(({ context }) => {
      const node = getCurrentNode(context);
      
      // Only spawn widget for micro-eval nodes with widgets
      if (node?.type !== 'micro-eval' || !(node as any).widget) {
        return {};
      }

      const widget = (node as any).widget;
      const widgetId = `${context.currentNodeId}-widget`;

      // Spawn widget agent as child actor with student and node context
      const widgetActor = createActor(widgetAgentMachine, {
        id: widgetId,
        input: {
          widgetId,
          widgetType: widget.type,
          config: widget.config,
          studentId: context.studentId,
          nodeId: context.currentNodeId,
        },
      }).start();

      return {
        activeWidgets: {
          ...context.activeWidgets,
          [widgetId]: widgetActor,
        },
      };
    }),

    // Cleanup widget agents when leaving a node
    cleanupWidgets: assign(({ context }) => {
      const widgetId = `${context.currentNodeId}-widget`;
      const { [widgetId]: removed, ...remainingWidgets } = context.activeWidgets;
      
      // Stop the widget actor if it exists
      if (removed) {
        try {
          removed.stop?.();
        } catch (error) {
          console.error('Error stopping widget actor:', error);
        }
      }

      return {
        activeWidgets: remainingWidgets,
      };
    }),

    // Handle widget completion
    handleWidgetCompletion: assign(({ context, event }) => {
      if (event.type !== 'WIDGET_COMPLETED') return {};
      
      const interaction = logInteraction(context, 'answer', event.answer, true);
      return {
        currentAnswer: event.answer,
        interactions: [...context.interactions, interaction],
      };
    }),

    // Handle widget error
    handleWidgetError: assign(({ context, event }) => {
      if (event.type !== 'WIDGET_ERROR') return {};
      
      const interaction = logInteraction(context, 'error', { error: event.error }, false);
      return {
        interactions: [...context.interactions, interaction],
      };
    }),

    // Navigate to next node
    // Navigate to next node
    navigateToNode: assign(({ context }, params: { nodeId: string }) => {
      const interaction = logInteraction(context, 'view');
      return {
        currentNodeId: params.nodeId,
        interactions: [...context.interactions, interaction],
      };
    }),

    // Mark node as completed
    completeNode: assign(({ context }) => ({
      completedNodes: [...context.completedNodes, context.currentNodeId],
    })),

    // Record correct answer
    recordCorrectAnswer: assign(({ context, event }) => {
      const interaction = logInteraction(context, 'answer', event.type === 'ANSWER_CORRECT' ? event.data : undefined, true);
      return {
        interactions: [...context.interactions, interaction],
        attempts: {
          ...context.attempts,
          [context.currentNodeId]: (context.attempts[context.currentNodeId] || 0) + 1,
        },
      };
    }),

    // Record incorrect answer
    recordIncorrectAnswer: assign(({ context, event }) => {
      const interaction = logInteraction(context, 'answer', event.type === 'ANSWER_INCORRECT' ? event.data : undefined, false);
      return {
        interactions: [...context.interactions, interaction],
        attempts: {
          ...context.attempts,
          [context.currentNodeId]: (context.attempts[context.currentNodeId] || 0) + 1,
        },
      };
    }),

    // Record hint request
    recordHintRequest: assign(({ context }) => {
      const interaction = logInteraction(context, 'hint');
      return {
        interactions: [...context.interactions, interaction],
        hintsUsed: {
          ...context.hintsUsed,
          [context.currentNodeId]: (context.hintsUsed[context.currentNodeId] || 0) + 1,
        },
      };
    }),

    // Save state to localStorage
    persistState: ({ context }) => {
      try {
        const stateToSave = {
          studentId: context.studentId,
          lessonId: context.lessonScript.metadata.id,
          currentNodeId: context.currentNodeId,
          completedNodes: context.completedNodes,
          attempts: context.attempts,
          hintsUsed: context.hintsUsed,
          startTime: context.startTime,
          interactions: context.interactions,
        };
        localStorage.setItem(
          `lesson-state-${context.studentId}-${context.lessonScript.metadata.id}`,
          JSON.stringify(stateToSave)
        );
      } catch (error) {
        console.error('Failed to persist lesson state:', error);
      }
    },
  },
  guards: {
    // Check if we can advance (for teaching nodes)
    canAdvance: ({ context }) => {
      const node = getCurrentNode(context);
      return node?.type === 'teaching';
    },

    // Check if answer is correct (placeholder - actual validation in components)
    isCorrectAnswer: () => true,

    // Check if max hints reached
    maxHintsReached: ({ context }) => {
      const hintsUsed = context.hintsUsed[context.currentNodeId] || 0;
      return hintsUsed >= 3;
    },
  },
}).createMachine({
  id: 'lesson',
  initial: 'idle',
  context: ({ input }) => ({
    studentId: input.studentId || '',
    lessonScript: input.lessonScript!,
    currentNodeId: input.lessonScript?.initialNode || '',
    completedNodes: input.completedNodes || [],
    attempts: input.attempts || {},
    hintsUsed: input.hintsUsed || {},
    startTime: input.startTime || Date.now(),
    interactions: input.interactions || [],
    activeWidgets: {},
  }),
  states: {
    idle: {
      on: {
        START: {
          target: 'active',
          actions: [
            { type: 'navigateToNode', params: ({ context }) => ({ nodeId: context.lessonScript.initialNode }) },
            { type: 'persistState' },
          ],
        },
      },
    },
    active: {
      initial: 'determineNodeType',
      states: {
        determineNodeType: {
          always: [
            {
              guard: ({ context }) => getCurrentNode(context)?.type === 'teaching',
              target: 'teaching',
            },
            {
              guard: ({ context }) => getCurrentNode(context)?.type === 'micro-eval',
              target: 'microEval',
            },
            {
              guard: ({ context }) => getCurrentNode(context)?.type === 'scaffolding',
              target: 'scaffolding',
            },
            {
              guard: ({ context }) => getCurrentNode(context)?.type === 'practice',
              target: 'practice',
            },
            {
              guard: ({ context }) => getCurrentNode(context)?.type === 'summary',
              target: 'summary',
            },
          ],
        },
        teaching: {
          entry: [{ type: 'cleanupWidgets' }],
          on: {
            NEXT: {
              actions: [
                { type: 'completeNode' },
                {
                  type: 'navigateToNode',
                  params: ({ context }) => {
                    const node = getCurrentNode(context);
                    return { nodeId: (node as any)?.transitions?.onNext || context.currentNodeId };
                  },
                },
                { type: 'persistState' },
              ],
              target: 'determineNodeType',
            },
          },
        },
        microEval: {
          entry: [{ type: 'spawnWidgetAgent' }],
          exit: [{ type: 'cleanupWidgets' }],
          on: {
            ANSWER_CORRECT: {
              actions: [
                { type: 'recordCorrectAnswer' },
                { type: 'completeNode' },
                {
                  type: 'navigateToNode',
                  params: ({ context }) => {
                    const node = getCurrentNode(context);
                    return { nodeId: (node as any)?.transitions?.onCorrect || context.currentNodeId };
                  },
                },
                { type: 'persistState' },
              ],
              target: 'determineNodeType',
            },
            ANSWER_INCORRECT: {
              actions: [
                { type: 'recordIncorrectAnswer' },
                {
                  type: 'navigateToNode',
                  params: ({ context }) => {
                    const node = getCurrentNode(context);
                    return { nodeId: (node as any)?.transitions?.onIncorrect || context.currentNodeId };
                  },
                },
                { type: 'persistState' },
              ],
              target: 'determineNodeType',
            },
            WIDGET_COMPLETED: {
              actions: [
                { type: 'handleWidgetCompletion' },
                { type: 'recordCorrectAnswer' },
                { type: 'completeNode' },
                {
                  type: 'navigateToNode',
                  params: ({ context }) => {
                    const node = getCurrentNode(context);
                    return { nodeId: (node as any)?.transitions?.onCorrect || context.currentNodeId };
                  },
                },
                { type: 'persistState' },
              ],
              target: 'determineNodeType',
            },
            WIDGET_ERROR: {
              actions: [
                { type: 'handleWidgetError' },
                { type: 'persistState' },
              ],
            },
            REQUEST_HINT: {
              guard: ({ context }) => (context.hintsUsed[context.currentNodeId] || 0) < 3,
              actions: [{ type: 'recordHintRequest' }, { type: 'persistState' }],
            },
          },
        },
        scaffolding: {
          entry: [{ type: 'cleanupWidgets' }],
          on: {
            RETRY: {
              actions: [
                {
                  type: 'navigateToNode',
                  params: ({ context }) => {
                    const node = getCurrentNode(context);
                    return { nodeId: (node as any)?.transitions?.onRetry || context.currentNodeId };
                  },
                },
                { type: 'persistState' },
              ],
              target: 'determineNodeType',
            },
          },
        },
        practice: {
          entry: [{ type: 'cleanupWidgets' }],
          on: {
            COMPLETE: {
              actions: [
                { type: 'completeNode' },
                {
                  type: 'navigateToNode',
                  params: ({ context }) => {
                    const node = getCurrentNode(context);
                    return { nodeId: (node as any)?.transitions?.onComplete || context.currentNodeId };
                  },
                },
                { type: 'persistState' },
              ],
              target: 'determineNodeType',
            },
          },
        },
        summary: {
          entry: [{ type: 'cleanupWidgets' }],
          on: {
            COMPLETE: {
              actions: [{ type: 'completeNode' }, { type: 'persistState' }],
              target: '#lesson.completed',
            },
          },
        },
      },
    },
    completed: {
      type: 'final',
      entry: ({ context }) => {
        // Mark lesson as completed in localStorage
        try {
          const progress = {
            studentId: context.studentId,
            lessonId: context.lessonScript.metadata.id,
            status: 'completed',
            completedAt: Date.now(),
            totalTime: Date.now() - context.startTime,
          };
          localStorage.setItem(
            `lesson-progress-${context.studentId}-${context.lessonScript.metadata.id}`,
            JSON.stringify(progress)
          );
        } catch (error) {
          console.error('Failed to save lesson completion:', error);
        }
      },
    },
  },
});

/**
 * Load saved lesson state from localStorage
 */
export function loadLessonState(studentId: string, lessonId: string): Partial<LessonContext> | null {
  try {
    const saved = localStorage.getItem(`lesson-state-${studentId}-${lessonId}`);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch (error) {
    console.error('Failed to load lesson state:', error);
    return null;
  }
}

/**
 * Clear lesson state from localStorage
 */
export function clearLessonState(studentId: string, lessonId: string): void {
  try {
    localStorage.removeItem(`lesson-state-${studentId}-${lessonId}`);
    localStorage.removeItem(`lesson-progress-${studentId}-${lessonId}`);
  } catch (error) {
    console.error('Failed to clear lesson state:', error);
  }
}
