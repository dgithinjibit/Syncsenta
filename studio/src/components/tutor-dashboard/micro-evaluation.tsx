/**
 * Micro-Evaluation Component
 * 
 * Displays assessment questions with widgets or multiple-choice options.
 * Enforces minimum time-on-task and tracks student responses.
 * Emits state machine events based on answer correctness.
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { MicroEvalNode } from './types/lesson-script';
import { NumberLineWidget } from './widgets/number-line-widget';
import { FractionBuilderWidget } from './widgets/fraction-builder-widget';
import { validateAnswer } from './utils/answer-validator';

interface MicroEvaluationProps {
  node: MicroEvalNode;
  onAnswerSubmit: (answer: any, isCorrect: boolean, timeToAnswer: number) => void;
  onHintRequest?: () => void;
  hintsUsed?: number;
  maxHints?: number;
}

const MIN_TIME_ON_TASK = 5000; // 5 seconds minimum

export function MicroEvaluation({
  node,
  onAnswerSubmit,
  onHintRequest,
  hintsUsed = 0,
  maxHints = 3,
}: MicroEvaluationProps) {
  const [startTime] = useState(Date.now());
  const [canSubmit, setCanSubmit] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Enable submit button after minimum time on task
  useEffect(() => {
    const timer = setTimeout(() => {
      setCanSubmit(true);
    }, MIN_TIME_ON_TASK);

    return () => clearTimeout(timer);
  }, []);

  const handleWidgetAnswer = (answer: any, correct: boolean) => {
    const timeToAnswer = Date.now() - startTime;
    setSelectedAnswer(answer);
    setIsCorrect(correct);
    setShowFeedback(true);

    // Record answer details
    console.log('[Micro-Evaluation] Widget answer submitted:', {
      nodeId: node.id,
      knowledgeComponent: node.knowledgeComponent,
      answer,
      correct,
      timeToAnswer,
    });

    // Delay before calling parent callback to show feedback
    setTimeout(() => {
      onAnswerSubmit(answer, correct, timeToAnswer);
    }, 1500);
  };

  const handleMCQSubmit = () => {
    if (!canSubmit || selectedAnswer === null) return;

    const timeToAnswer = Date.now() - startTime;
    
    // Validate answer
    const validationResult = validateAnswer(
      node.question.type,
      selectedAnswer,
      node.question.correctAnswer
    );

    const correct = validationResult.isCorrect;
    setIsCorrect(correct);
    setShowFeedback(true);

    // Record answer details
    console.log('[Micro-Evaluation] MCQ answer submitted:', {
      nodeId: node.id,
      knowledgeComponent: node.knowledgeComponent,
      answer: selectedAnswer,
      correct,
      timeToAnswer,
      feedback: validationResult.feedback,
    });

    // Delay before calling parent callback to show feedback
    setTimeout(() => {
      onAnswerSubmit(selectedAnswer, correct, timeToAnswer);
    }, 1500);
  };

  const handleNumericSubmit = () => {
    if (!canSubmit || selectedAnswer === null) return;

    const timeToAnswer = Date.now() - startTime;
    
    // Validate answer
    const validationResult = validateAnswer(
      node.question.type,
      selectedAnswer,
      node.question.correctAnswer
    );

    const correct = validationResult.isCorrect;
    setIsCorrect(correct);
    setShowFeedback(true);

    // Record answer details
    console.log('[Micro-Evaluation] Numeric answer submitted:', {
      nodeId: node.id,
      knowledgeComponent: node.knowledgeComponent,
      answer: selectedAnswer,
      correct,
      timeToAnswer,
      feedback: validationResult.feedback,
    });

    // Delay before calling parent callback to show feedback
    setTimeout(() => {
      onAnswerSubmit(selectedAnswer, correct, timeToAnswer);
    }, 1500);
  };

  const renderWidget = () => {
    if (!node.widget) return null;

    const widgetProps = {
      config: node.widget.config,
      onSubmit: handleWidgetAnswer,
      disabled: showFeedback,
    };

    switch (node.widget.type) {
      case 'number-line':
        return <NumberLineWidget {...widgetProps} />;
      case 'fraction-builder':
        return <FractionBuilderWidget {...widgetProps} />;
      default:
        return (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Widget type "{node.widget.type}" not yet implemented
            </p>
          </div>
        );
    }
  };

  const renderMultipleChoice = () => {
    if (node.question.type !== 'mcq' || !node.question.options) return null;

    return (
      <div className="space-y-3">
        {node.question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => setSelectedAnswer(option)}
            disabled={showFeedback}
            className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
              selectedAnswer === option
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 bg-white'
            } ${showFeedback ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className="font-medium">{String.fromCharCode(65 + index)}.</span>{' '}
            {option}
          </button>
        ))}
      </div>
    );
  };

  const renderNumericInput = () => {
    if (node.question.type !== 'numeric') return null;

    return (
      <div className="space-y-4">
        <input
          type="number"
          value={selectedAnswer || ''}
          onChange={(e) => setSelectedAnswer(parseFloat(e.target.value))}
          disabled={showFeedback}
          placeholder="Enter your answer"
          className="w-full p-4 text-lg border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Knowledge Component Tag */}
      <div className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
        {node.knowledgeComponent}
      </div>

      {/* Question */}
      <div className="prose prose-lg max-w-none">
        <p className="text-xl font-medium text-gray-900">{node.question.text}</p>
      </div>

      {/* Answer Input */}
      <div className="space-y-4">
        {node.question.type === 'widget-based' && renderWidget()}
        {node.question.type === 'mcq' && renderMultipleChoice()}
        {node.question.type === 'numeric' && renderNumericInput()}
      </div>

      {/* Feedback */}
      {showFeedback && (
        <div
          className={`p-4 rounded-lg ${
            isCorrect
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <p
            className={`font-medium ${
              isCorrect ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {isCorrect ? '✓ Correct!' : '✗ Not quite right'}
          </p>
          {isCorrect && node.question.explanation && (
            <p className="mt-2 text-sm text-green-700">{node.question.explanation}</p>
          )}
        </div>
      )}

      {/* Actions */}
      {!showFeedback && (
        <div className="flex items-center justify-between gap-4">
          {/* Hint Button */}
          {onHintRequest && hintsUsed < maxHints && (
            <button
              onClick={onHintRequest}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              💡 Request Hint ({hintsUsed}/{maxHints})
            </button>
          )}

          {/* Submit Button (for non-widget questions) */}
          {node.question.type === 'mcq' && (
            <button
              onClick={handleMCQSubmit}
              disabled={!canSubmit || selectedAnswer === null}
              className={`px-6 py-3 font-medium rounded-lg transition-all ${
                canSubmit && selectedAnswer !== null
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {!canSubmit ? 'Please take your time...' : 'Submit Answer'}
            </button>
          )}

          {node.question.type === 'numeric' && (
            <button
              onClick={handleNumericSubmit}
              disabled={!canSubmit || selectedAnswer === null || isNaN(selectedAnswer)}
              className={`px-6 py-3 font-medium rounded-lg transition-all ${
                canSubmit && selectedAnswer !== null && !isNaN(selectedAnswer)
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {!canSubmit ? 'Please take your time...' : 'Submit Answer'}
            </button>
          )}
        </div>
      )}

      {/* Time on Task Indicator */}
      {!canSubmit && (
        <div className="text-sm text-gray-500 text-center">
          Take at least 5 seconds to think about your answer...
        </div>
      )}
    </div>
  );
}
