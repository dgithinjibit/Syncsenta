/**
 * Widget Agent Base Class (XState v5)
 * 
 * Manages the lifecycle of interactive widgets as XState actors.
 * Each widget instance runs as a child actor spawned by the lesson state machine.
 */

import { setup, assign, ActorRefFrom } from 'xstate';

// Widget Events
export type WidgetEvent =
  | { type: 'INTERACT'; data: any }
  | { type: 'SUBMIT'; answer: any }
  | { type: 'VALIDATE'; answer: any }
  | { type: 'RESET' }
  | { type: 'ERROR'; error: string };

// Widget Context
export interface WidgetContext {
  widgetId: string;
  widgetType: string;
  config: Record<string, any>;
  currentValue: any;
  interactions: WidgetInteraction[];
  validationResult?: {
    isCorrect: boolean;
    feedback?: string;
  };
  error?: string;
  startTime: number;
  studentId?: string;
  nodeId?: string;
}

// Widget Interaction Log
export interface WidgetInteraction {
  timestamp: number;
  action: 'interact' | 'submit' | 'reset' | 'validate' | 'error';
  value: any;
  metadata?: Record<string, any>;
}

// Widget Interaction Facts (for database persistence)
export interface WidgetInteractionFacts {
  widgetId: string;
  widgetType: string;
  studentId?: string;
  nodeId?: string;
  action: 'interact' | 'submit' | 'validate' | 'reset' | 'error';
  value: any;
  correctness?: boolean;
  timestamp: number;
  timeOnTask?: number;
  metadata?: Record<string, any>;
}

/**
 * Widget Agent State Machine
 * 
 * States:
 * - idle: Widget is initialized but not yet active
 * - active: Widget is ready for user interaction
 * - validating: Widget is validating the submitted answer
 * - completed: Widget has been successfully completed (correct answer)
 * - error: Widget encountered an error
 */
export const widgetAgentMachine = setup({
  types: {
    context: {} as WidgetContext,
    events: {} as WidgetEvent,
    input: {} as {
      widgetId: string;
      widgetType: string;
      config: Record<string, any>;
      studentId?: string;
      nodeId?: string;
    },
  },
  actions: {
    // Record interaction
    recordInteraction: assign(({ context, event }) => {
      if (event.type !== 'INTERACT') return {};
      
      const interaction: WidgetInteraction = {
        timestamp: Date.now(),
        action: 'interact',
        value: event.data,
        metadata: {
          timeOnTask: Date.now() - context.startTime,
        },
      };

      // Log to console for debugging (will be replaced with database logging)
      console.log('[Widget Interaction]', {
        widgetId: context.widgetId,
        widgetType: context.widgetType,
        studentId: context.studentId,
        nodeId: context.nodeId,
        action: 'interact',
        value: event.data,
        timestamp: interaction.timestamp,
        timeOnTask: interaction.metadata?.timeOnTask,
      });

      return {
        currentValue: event.data,
        interactions: [...context.interactions, interaction],
      };
    }),

    // Record submission
    recordSubmission: assign(({ context, event }) => {
      if (event.type !== 'SUBMIT') return {};

      const interaction: WidgetInteraction = {
        timestamp: Date.now(),
        action: 'submit',
        value: event.answer,
        metadata: {
          timeOnTask: Date.now() - context.startTime,
        },
      };

      // Log to console for debugging (will be replaced with database logging)
      console.log('[Widget Submission]', {
        widgetId: context.widgetId,
        widgetType: context.widgetType,
        studentId: context.studentId,
        nodeId: context.nodeId,
        action: 'submit',
        value: event.answer,
        timestamp: interaction.timestamp,
        timeOnTask: interaction.metadata?.timeOnTask,
      });

      return {
        currentValue: event.answer,
        interactions: [...context.interactions, interaction],
      };
    }),

    // Store validation result
    storeValidationResult: assign(({ context }, params: { isCorrect: boolean; feedback?: string }) => {
      const interaction: WidgetInteraction = {
        timestamp: Date.now(),
        action: 'validate',
        value: context.currentValue,
        metadata: {
          correctness: params.isCorrect,
          feedback: params.feedback,
          timeOnTask: Date.now() - context.startTime,
        },
      };

      // Log validation result
      console.log('[Widget Validation]', {
        widgetId: context.widgetId,
        widgetType: context.widgetType,
        studentId: context.studentId,
        nodeId: context.nodeId,
        action: 'validate',
        value: context.currentValue,
        correctness: params.isCorrect,
        timestamp: interaction.timestamp,
        timeOnTask: interaction.metadata?.timeOnTask,
      });

      return {
        validationResult: {
          isCorrect: params.isCorrect,
          feedback: params.feedback,
        },
        interactions: [...context.interactions, interaction],
      };
    }),

    // Reset widget state
    resetWidget: assign(({ context }) => {
      const interaction: WidgetInteraction = {
        timestamp: Date.now(),
        action: 'reset',
        value: null,
        metadata: {
          timeOnTask: Date.now() - context.startTime,
        },
      };

      // Log reset
      console.log('[Widget Reset]', {
        widgetId: context.widgetId,
        widgetType: context.widgetType,
        studentId: context.studentId,
        nodeId: context.nodeId,
        action: 'reset',
        timestamp: interaction.timestamp,
      });

      return {
        currentValue: undefined,
        interactions: [...context.interactions, interaction],
        validationResult: undefined,
        error: undefined,
        startTime: Date.now(), // Reset timer
      };
    }),

    // Store error
    storeError: assign(({ context, event }) => {
      if (event.type !== 'ERROR') return {};
      
      const interaction: WidgetInteraction = {
        timestamp: Date.now(),
        action: 'error',
        value: null,
        metadata: {
          error: event.error,
          timeOnTask: Date.now() - context.startTime,
        },
      };

      // Log error
      console.error('[Widget Error]', {
        widgetId: context.widgetId,
        widgetType: context.widgetType,
        studentId: context.studentId,
        nodeId: context.nodeId,
        action: 'error',
        error: event.error,
        timestamp: interaction.timestamp,
      });

      return {
        error: event.error,
        interactions: [...context.interactions, interaction],
      };
    }),

    // Emit completion event to parent
    notifyParentComplete: ({ context }) => {
      // This will be handled by the parent lesson machine
      console.log(`Widget ${context.widgetId} completed successfully`);
    },

    // Emit error event to parent
    notifyParentError: ({ context }) => {
      console.error(`Widget ${context.widgetId} encountered error:`, context.error);
    },
  },
  guards: {
    // Check if answer is correct (to be overridden by specific widget implementations)
    isAnswerCorrect: ({ context }) => {
      return context.validationResult?.isCorrect ?? false;
    },
  },
}).createMachine({
  id: 'widgetAgent',
  initial: 'idle',
  context: ({ input }) => ({
    widgetId: input.widgetId,
    widgetType: input.widgetType,
    config: input.config,
    currentValue: undefined,
    interactions: [],
    startTime: Date.now(),
    studentId: input.studentId,
    nodeId: input.nodeId,
  }),
  states: {
    idle: {
      on: {
        INTERACT: {
          target: 'active',
          actions: [{ type: 'recordInteraction' }],
        },
      },
    },
    active: {
      on: {
        INTERACT: {
          actions: [{ type: 'recordInteraction' }],
        },
        SUBMIT: {
          target: 'validating',
          actions: [{ type: 'recordSubmission' }],
        },
        RESET: {
          target: 'idle',
          actions: [{ type: 'resetWidget' }],
        },
      },
    },
    validating: {
      on: {
        VALIDATE: {
          actions: [
            {
              type: 'storeValidationResult',
              params: ({ event }) => {
                if (event.type !== 'VALIDATE') return { isCorrect: false };
                // Validation logic will be provided by the specific widget
                // For now, we just store the result
                return {
                  isCorrect: false, // Placeholder
                  feedback: undefined,
                };
              },
            },
          ],
          target: 'checkResult',
        },
        ERROR: {
          target: 'error',
          actions: [{ type: 'storeError' }, { type: 'notifyParentError' }],
        },
      },
    },
    checkResult: {
      always: [
        {
          guard: { type: 'isAnswerCorrect' },
          target: 'completed',
          actions: [{ type: 'notifyParentComplete' }],
        },
        {
          target: 'active',
        },
      ],
    },
    completed: {
      type: 'final',
    },
    error: {
      on: {
        RESET: {
          target: 'idle',
          actions: [{ type: 'resetWidget' }],
        },
      },
    },
  },
});

/**
 * Widget Agent Actor Type
 */
export type WidgetAgentActor = ActorRefFrom<typeof widgetAgentMachine>;

/**
 * Create a widget agent actor
 */
export function createWidgetAgent(
  widgetId: string,
  widgetType: string,
  config: Record<string, any>
): WidgetAgentActor {
  // This will be used by the lesson machine to spawn widget actors
  // The actual spawning will happen in the lesson machine context
  throw new Error('Use lesson machine to spawn widget agents');
}

/**
 * Widget Validation Function Type
 * 
 * Each widget type should implement this function to validate answers
 */
export type WidgetValidator = (
  answer: any,
  config: Record<string, any>
) => {
  isCorrect: boolean;
  feedback?: string;
};

/**
 * Widget Validators Registry
 * 
 * Maps widget types to their validation functions
 */
export const widgetValidators: Record<string, WidgetValidator> = {
  'number-line': (answer: number, config: Record<string, any>) => {
    const expected = config.expectedValue;
    const tolerance = config.tolerance || 0;
    const isCorrect = Math.abs(answer - expected) <= tolerance;
    return {
      isCorrect,
      feedback: isCorrect
        ? 'Correct! Well done.'
        : `Not quite. The correct answer is ${expected}.`,
    };
  },

  'fraction-builder': (answer: { numerator: number; denominator: number }, config: Record<string, any>) => {
    const expected = config.expectedFraction;
    
    // Check for fraction equivalence
    const answerValue = answer.numerator / answer.denominator;
    const expectedValue = expected.numerator / expected.denominator;
    
    const isCorrect = Math.abs(answerValue - expectedValue) < 0.001;
    
    return {
      isCorrect,
      feedback: isCorrect
        ? 'Correct! Well done.'
        : `Not quite. Try again.`,
    };
  },

  'multiple-choice': (answer: string, config: Record<string, any>) => {
    const expected = config.correctAnswer;
    const isCorrect = answer === expected;
    return {
      isCorrect,
      feedback: isCorrect
        ? 'Correct! Well done.'
        : 'Not quite. Try again.',
    };
  },
};

/**
 * Validate widget answer using the appropriate validator
 */
export function validateWidgetAnswer(
  widgetType: string,
  answer: any,
  config: Record<string, any>
): { isCorrect: boolean; feedback?: string } {
  const validator = widgetValidators[widgetType];
  
  if (!validator) {
    console.warn(`No validator found for widget type: ${widgetType}`);
    return {
      isCorrect: false,
      feedback: 'Unable to validate answer.',
    };
  }

  return validator(answer, config);
}

/**
 * Export widget interactions as interaction facts for database persistence
 * 
 * This function prepares widget interactions for future database logging.
 * In Phase 2, this will be integrated with PostgreSQL.
 */
export function exportWidgetInteractionFacts(
  context: WidgetContext
): WidgetInteractionFacts[] {
  return context.interactions.map((interaction) => ({
    widgetId: context.widgetId,
    widgetType: context.widgetType,
    studentId: context.studentId,
    nodeId: context.nodeId,
    action: interaction.action,
    value: interaction.value,
    correctness: interaction.metadata?.correctness,
    timestamp: interaction.timestamp,
    timeOnTask: interaction.metadata?.timeOnTask,
    metadata: interaction.metadata,
  }));
}

/**
 * Get widget interaction summary for analytics
 */
export function getWidgetInteractionSummary(context: WidgetContext): {
  totalInteractions: number;
  submissionCount: number;
  correctSubmissions: number;
  incorrectSubmissions: number;
  averageTimeOnTask: number;
  errorCount: number;
} {
  const interactions = context.interactions;
  const submissions = interactions.filter((i) => i.action === 'submit');
  const validations = interactions.filter((i) => i.action === 'validate');
  const errors = interactions.filter((i) => i.action === 'error');

  const correctSubmissions = validations.filter(
    (i) => i.metadata?.correctness === true
  ).length;
  const incorrectSubmissions = validations.filter(
    (i) => i.metadata?.correctness === false
  ).length;

  const totalTimeOnTask = interactions.reduce(
    (sum, i) => sum + (i.metadata?.timeOnTask || 0),
    0
  );
  const averageTimeOnTask =
    interactions.length > 0 ? totalTimeOnTask / interactions.length : 0;

  return {
    totalInteractions: interactions.length,
    submissionCount: submissions.length,
    correctSubmissions,
    incorrectSubmissions,
    averageTimeOnTask,
    errorCount: errors.length,
  };
}

