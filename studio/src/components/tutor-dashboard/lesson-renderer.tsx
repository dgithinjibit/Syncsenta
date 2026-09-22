'use client';

/**
 * Lesson Renderer Component
 * 
 * Renders interactive lessons using XState machine and dynamic widget loading.
 * This is the main component that students interact with during lessons.
 */

import { useMachine } from '@xstate/react';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, CheckCircle2, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import { lessonMachine, loadLessonState } from './state-machines/lesson-machine';
import type { LessonScript, LessonNode, TeachingNode, MicroEvalNode, ScaffoldingNode, SummaryNode } from './types/lesson-script';
import { NumberLineWidget } from './widgets/number-line-widget';
import { FractionBuilderWidget } from './widgets/fraction-builder-widget';
import { MicroEvaluation } from './micro-evaluation';
import { Scaffolding } from './scaffolding';

export interface LessonRendererProps {
  lessonScript: LessonScript;
  studentId: string;
  onComplete?: (interactions: any[]) => void;
}

export function LessonRenderer({
  lessonScript,
  studentId,
  onComplete,
}: LessonRendererProps) {
  // Load saved state if exists
  const savedState = loadLessonState(studentId, lessonScript.metadata.id);

  // Initialize state machine
  const [state, send] = useMachine(lessonMachine, {
    input: {
      studentId,
      lessonScript,
      ...savedState,
    },
  });

  // Auto-start lesson
  useEffect(() => {
    if (state.matches('idle')) {
      send({ type: 'START' });
    }
  }, [state, send]);

  // Handle lesson completion
  useEffect(() => {
    if (state.matches('completed')) {
      onComplete?.(state.context.interactions);
    }
  }, [state, onComplete]);

  // Get current node
  const currentNode = lessonScript.nodes.find(n => n.id === state.context.currentNodeId);

  // Calculate progress
  const progress = (state.context.completedNodes.length / lessonScript.nodes.length) * 100;

  if (!currentNode) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Loading lesson...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Lesson Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{lessonScript.metadata.title}</CardTitle>
              <CardDescription>
                {lessonScript.metadata.grade} • {lessonScript.metadata.subject} • {lessonScript.metadata.cbcStrand}
              </CardDescription>
            </div>
            <Badge variant="outline">
              {lessonScript.metadata.estimatedTime} min
            </Badge>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Current Node Content */}
      {state.matches({ active: 'teaching' }) && (
        <TeachingNodeRenderer
          node={currentNode as TeachingNode}
          onNext={() => send({ type: 'NEXT' })}
        />
      )}

      {state.matches({ active: 'microEval' }) && (
        <MicroEvalNodeRenderer
          node={currentNode as MicroEvalNode}
          onCorrect={(data) => send({ type: 'ANSWER_CORRECT', data })}
          onIncorrect={(data) => send({ type: 'ANSWER_INCORRECT', data })}
          onHint={() => send({ type: 'REQUEST_HINT' })}
          hintsUsed={state.context.hintsUsed[currentNode.id] || 0}
        />
      )}

      {state.matches({ active: 'scaffolding' }) && (
        <ScaffoldingNodeRenderer
          node={currentNode as ScaffoldingNode}
          lessonScript={lessonScript}
          onRetry={() => send({ type: 'RETRY' })}
        />
      )}

      {state.matches({ active: 'summary' }) && (
        <SummaryNodeRenderer
          node={currentNode as SummaryNode}
          onComplete={() => send({ type: 'COMPLETE' })}
        />
      )}

      {state.matches('completed') && (
        <LessonCompletedView
          lessonTitle={lessonScript.metadata.title}
          totalTime={Date.now() - state.context.startTime}
          interactions={state.context.interactions}
        />
      )}
    </div>
  );
}

// Teaching Node Renderer
function TeachingNodeRenderer({ node, onNext }: { node: TeachingNode; onNext: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Let's Learn
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Explanation */}
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{node.explanation.text}</ReactMarkdown>
        </div>

        {/* Cultural Context */}
        {node.explanation.culturalContext && (
          <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-primary">
            <p className="text-sm font-medium mb-1">🇰🇪 Kenyan Context</p>
            <p className="text-sm text-muted-foreground">{node.explanation.culturalContext}</p>
          </div>
        )}

        {/* Widget (if present) */}
        {node.widget && (
          <div className="mt-4">
            <WidgetRenderer config={node.widget} disabled />
          </div>
        )}

        {/* Next Button */}
        <Button onClick={onNext} className="w-full" size="lg">
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

// Micro-Evaluation Node Renderer
function MicroEvalNodeRenderer({
  node,
  onCorrect,
  onIncorrect,
  onHint,
  hintsUsed,
}: {
  node: MicroEvalNode;
  onCorrect: (data: any) => void;
  onIncorrect: (data: any) => void;
  onHint: () => void;
  hintsUsed: number;
}) {
  const handleAnswerSubmit = (answer: any, isCorrect: boolean, timeToAnswer: number) => {
    // Record the answer with timing information
    const answerData = {
      answer,
      timeToAnswer,
      timestamp: Date.now(),
    };

    // Emit appropriate state machine event
    if (isCorrect) {
      onCorrect(answerData);
    } else {
      onIncorrect(answerData);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Question</CardTitle>
        <CardDescription>
          Knowledge Component: {node.knowledgeComponent}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MicroEvaluation
          node={node}
          onAnswerSubmit={handleAnswerSubmit}
          onHintRequest={onHint}
          hintsUsed={hintsUsed}
          maxHints={node.question.hints.length}
        />
      </CardContent>
    </Card>
  );
}

// Scaffolding Node Renderer
function ScaffoldingNodeRenderer({ 
  node, 
  lessonScript,
  onRetry 
}: { 
  node: ScaffoldingNode; 
  lessonScript: LessonScript;
  onRetry: () => void;
}) {
  // Find the micro-eval node that led to this scaffolding
  // by looking at the onRetry transition
  const microEvalNodeId = node.transitions.onRetry;
  const microEvalNode = lessonScript.nodes.find(n => n.id === microEvalNodeId) as MicroEvalNode | undefined;
  const hints = microEvalNode?.question.hints || [];

  return (
    <Card className="border-yellow-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
          <Lightbulb className="h-5 w-5" />
          Let's Try a Different Approach
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Scaffolding
          node={node}
          hints={hints}
          onRetry={onRetry}
        />
      </CardContent>
    </Card>
  );
}

// Summary Node Renderer
function SummaryNodeRenderer({ node, onComplete }: { node: SummaryNode; onComplete: () => void }) {
  return (
    <Card className="border-green-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-6 w-6" />
          Lesson Complete!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Text */}
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{node.summary.text}</ReactMarkdown>
        </div>

        {/* Key Takeaways */}
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <p className="font-medium mb-2">🎯 Key Takeaways:</p>
          <ul className="space-y-1">
            {node.summary.keyTakeaways.map((takeaway, index) => (
              <li key={index} className="text-sm flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Mastery Indicators */}
        {node.summary.masteryIndicators && node.summary.masteryIndicators.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="font-medium mb-2">✨ You can now:</p>
            <ul className="space-y-1">
              {node.summary.masteryIndicators.map((indicator, index) => (
                <li key={index} className="text-sm">{indicator}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Complete Button */}
        <Button onClick={onComplete} className="w-full" size="lg">
          Finish Lesson
          <CheckCircle2 className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

// Lesson Completed View
function LessonCompletedView({
  lessonTitle,
  totalTime,
  interactions,
}: {
  lessonTitle: string;
  totalTime: number;
  interactions: any[];
}) {
  const minutes = Math.floor(totalTime / 60000);
  const seconds = Math.floor((totalTime % 60000) / 1000);

  return (
    <Card className="border-green-500">
      <CardContent className="pt-6 text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
        <div>
          <h2 className="text-2xl font-bold">Congratulations! 🎉</h2>
          <p className="text-muted-foreground mt-2">
            You've completed: {lessonTitle}
          </p>
        </div>

        <div className="flex justify-center gap-8 text-sm">
          <div>
            <p className="font-medium">Time Spent</p>
            <p className="text-2xl font-bold text-primary">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </p>
          </div>
          <div>
            <p className="font-medium">Interactions</p>
            <p className="text-2xl font-bold text-primary">{interactions.length}</p>
          </div>
        </div>

        <Button size="lg" className="w-full" onClick={() => window.location.href = '/student/dashboard'}>
          Return to Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}

// Widget Renderer (dynamic widget loading)
function WidgetRenderer({
  config,
  onAnswer,
  disabled = false,
}: {
  config: any;
  onAnswer?: (answer: any) => void;
  disabled?: boolean;
}) {
  switch (config.type) {
    case 'number-line':
      return (
        <NumberLineWidget
          config={config.config}
          onAnswer={onAnswer}
          disabled={disabled}
        />
      );
    case 'fraction-builder':
      return (
        <FractionBuilderWidget
          config={config.config}
          onAnswer={(num, denom) => onAnswer?.({ numerator: num, denominator: denom })}
          disabled={disabled}
        />
      );
    default:
      return (
        <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
          Widget type "{config.type}" not yet implemented
        </div>
      );
  }
}
