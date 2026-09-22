/**
 * Scaffolding Component
 * 
 * Provides progressive hints and support when students struggle with questions.
 * Implements hint progression with a maximum of 3 hints before revealing the answer.
 */

'use client';

import React, { useState } from 'react';
import type { ScaffoldingNode } from './types/lesson-script';
import ReactMarkdown from 'react-markdown';

interface ScaffoldingProps {
  node: ScaffoldingNode;
  hints: string[]; // Hints from the micro-eval node
  onRetry: () => void;
  onRevealAnswer?: () => void;
}

const MAX_HINTS = 3;

export function Scaffolding({
  node,
  hints,
  onRetry,
  onRevealAnswer,
}: ScaffoldingProps) {
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const handleRequestHint = () => {
    if (hintsRevealed < Math.min(hints.length, MAX_HINTS)) {
      setHintsRevealed(hintsRevealed + 1);
      
      // Log hint request
      console.log('[Scaffolding] Hint requested:', {
        nodeId: node.id,
        hintNumber: hintsRevealed + 1,
        timestamp: Date.now(),
      });
    }
  };

  const handleRevealAnswer = () => {
    setShowAnswer(true);
    onRevealAnswer?.();
    
    // Log answer reveal
    console.log('[Scaffolding] Answer revealed:', {
      nodeId: node.id,
      hintsUsed: hintsRevealed,
      timestamp: Date.now(),
    });
  };

  const allHintsExhausted = hintsRevealed >= Math.min(hints.length, MAX_HINTS);

  return (
    <div className="space-y-6">
      {/* Scaffolding Message */}
      {node.scaffolding.message && (
        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
          <p className="text-sm font-medium text-yellow-800">
            💡 {node.scaffolding.message}
          </p>
        </div>
      )}

      {/* Explanation */}
      <div className="prose prose-lg max-w-none">
        <ReactMarkdown>{node.explanation.text}</ReactMarkdown>
      </div>

      {/* Cultural Context */}
      {node.explanation.culturalContext && (
        <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
          <p className="text-sm font-medium text-blue-800 mb-1">
            🇰🇪 Kenyan Context
          </p>
          <p className="text-sm text-blue-700">
            {node.explanation.culturalContext}
          </p>
        </div>
      )}

      {/* Progressive Hints */}
      {hints.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">
            Need more help?
          </h3>
          
          {/* Revealed Hints */}
          {hints.slice(0, hintsRevealed).map((hint, index) => (
            <div
              key={index}
              className="p-4 bg-purple-50 border border-purple-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <p className="text-sm font-medium text-purple-900">
                💡 Hint {index + 1}: {hint}
              </p>
            </div>
          ))}

          {/* Request Hint Button */}
          {!allHintsExhausted && !showAnswer && (
            <button
              onClick={handleRequestHint}
              className="w-full px-4 py-3 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
            >
              💡 Request Hint ({hintsRevealed}/{Math.min(hints.length, MAX_HINTS)})
            </button>
          )}

          {/* Reveal Answer Button */}
          {allHintsExhausted && !showAnswer && (
            <button
              onClick={handleRevealAnswer}
              className="w-full px-4 py-3 text-sm font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors"
            >
              🔓 Reveal Answer
            </button>
          )}

          {/* Revealed Answer */}
          {showAnswer && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-sm font-medium text-green-900 mb-2">
                ✓ Answer Revealed
              </p>
              <p className="text-sm text-green-800">
                The answer has been revealed. Take your time to understand it, then try again!
              </p>
            </div>
          )}
        </div>
      )}

      {/* UI Element Highlighting (if configured) */}
      {node.scaffolding.highlightElements && node.scaffolding.highlightElements.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900 mb-2">
            👀 Focus on these elements:
          </p>
          <ul className="text-sm text-blue-800 space-y-1">
            {node.scaffolding.highlightElements.map((element, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>{element}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Simplified Widget Notice */}
      {node.scaffolding.simplifyWidget && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <p className="text-sm text-indigo-800">
            ℹ️ The question has been simplified to help you focus on the key concept.
          </p>
        </div>
      )}

      {/* Try Again Button */}
      <button
        onClick={onRetry}
        className="w-full px-6 py-3 text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
      >
        Try Again
      </button>

      {/* Hint Counter Summary */}
      <div className="text-center text-sm text-gray-500">
        {hintsRevealed > 0 && (
          <p>
            You've used {hintsRevealed} hint{hintsRevealed > 1 ? 's' : ''}.
            {!allHintsExhausted && ` ${Math.min(hints.length, MAX_HINTS) - hintsRevealed} remaining.`}
          </p>
        )}
      </div>
    </div>
  );
}
