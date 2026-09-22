'use client';

/**
 * Fraction Builder Widget
 * 
 * Interactive fraction visualization for learning part-whole relationships.
 * Uses MAFS library for geometric rendering.
 */

import { useState } from 'react';
import { Mafs, Circle, Polygon, Text, vec } from 'mafs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import 'mafs/core.css';

export interface FractionBuilderConfig {
  shape?: 'circle' | 'rectangle';
  maxDenominator?: number;
  targetFraction?: { numerator: number; denominator: number }; // For validation
  allowEquivalent?: boolean; // Accept equivalent fractions
  locked?: boolean;
}

export interface FractionBuilderWidgetProps {
  config: FractionBuilderConfig;
  onAnswer?: (numerator: number, denominator: number) => void;
  onInteraction?: (numerator: number, denominator: number) => void;
  disabled?: boolean;
}

export function FractionBuilderWidget({
  config,
  onAnswer,
  onInteraction,
  disabled = false,
}: FractionBuilderWidgetProps) {
  const {
    shape = 'circle',
    maxDenominator = 12,
    targetFraction,
    allowEquivalent = true,
    locked = false,
  } = config;

  const [denominator, setDenominator] = useState(4);
  const [selectedParts, setSelectedParts] = useState<Set<number>>(new Set());
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const numerator = selectedParts.size;

  // Handle denominator change
  const handleDenominatorChange = (newDenom: number) => {
    if (locked || disabled || isSubmitted) return;
    setDenominator(newDenom);
    setSelectedParts(new Set()); // Reset selection
    onInteraction?.(0, newDenom);
  };

  // Handle part selection
  const handlePartClick = (partIndex: number) => {
    if (locked || disabled || isSubmitted) return;

    const newSelected = new Set(selectedParts);
    if (newSelected.has(partIndex)) {
      newSelected.delete(partIndex);
    } else {
      newSelected.add(partIndex);
    }
    setSelectedParts(newSelected);
    onInteraction?.(newSelected.size, denominator);
  };

  // Check if fractions are equivalent
  const areFractionsEquivalent = (n1: number, d1: number, n2: number, d2: number): boolean => {
    return n1 * d2 === n2 * d1;
  };

  // Handle answer submission
  const handleSubmit = () => {
    if (isSubmitted) return;

    setIsSubmitted(true);

    // Check if answer is correct
    if (targetFraction) {
      const correct = allowEquivalent
        ? areFractionsEquivalent(numerator, denominator, targetFraction.numerator, targetFraction.denominator)
        : numerator === targetFraction.numerator && denominator === targetFraction.denominator;
      setIsCorrect(correct);
    }

    onAnswer?.(numerator, denominator);
  };

  // Reset widget
  const handleReset = () => {
    setSelectedParts(new Set());
    setIsSubmitted(false);
    setIsCorrect(null);
  };

  // Render circle fraction
  const renderCircleFraction = () => {
    const radius = 2;
    const center = vec.of(0, 0);
    const parts = [];

    for (let i = 0; i < denominator; i++) {
      const startAngle = (i * 2 * Math.PI) / denominator - Math.PI / 2;
      const endAngle = ((i + 1) * 2 * Math.PI) / denominator - Math.PI / 2;
      const isSelected = selectedParts.has(i);

      // Create wedge points
      const points: [number, number][] = [
        center,
        [center[0] + radius * Math.cos(startAngle), center[1] + radius * Math.sin(startAngle)],
      ];

      // Add intermediate points for smooth curve
      const steps = 10;
      for (let j = 1; j <= steps; j++) {
        const angle = startAngle + (j * (endAngle - startAngle)) / steps;
        points.push([center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle)]);
      }

      parts.push(
        <Polygon
          key={i}
          points={points}
          color={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
          fillOpacity={isSelected ? 0.7 : 0.3}
          strokeStyle="solid"
          strokeOpacity={1}
          weight={2}
        />
      );
    }

    return parts;
  };

  // Render rectangle fraction
  const renderRectangleFraction = () => {
    const width = 4;
    const height = 2;
    const partWidth = width / denominator;
    const parts = [];

    for (let i = 0; i < denominator; i++) {
      const x = -width / 2 + i * partWidth;
      const isSelected = selectedParts.has(i);

      parts.push(
        <Polygon
          key={i}
          points={[
            [x, -height / 2],
            [x + partWidth, -height / 2],
            [x + partWidth, height / 2],
            [x, height / 2],
          ]}
          color={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
          fillOpacity={isSelected ? 0.7 : 0.3}
          strokeStyle="solid"
          strokeOpacity={1}
          weight={2}
        />
      );
    }

    return parts;
  };

  return (
    <Card className={`${locked ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Denominator Selector */}
          {!isSubmitted && (
            <div className="space-y-2">
              <Label>Divide into how many equal parts?</Label>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: maxDenominator - 1 }, (_, i) => i + 2).map((d) => (
                  <Button
                    key={d}
                    variant={denominator === d ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleDenominatorChange(d)}
                    disabled={locked || disabled}
                  >
                    {d}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Fraction Visualization */}
          <div className="w-full h-64 bg-muted/30 rounded-lg overflow-hidden relative">
            <Mafs
              viewBox={{
                x: [-3, 3],
                y: [-3, 3],
              }}
              preserveAspectRatio
            >
              {shape === 'circle' ? renderCircleFraction() : renderRectangleFraction()}

              {/* Outer circle/rectangle border */}
              {shape === 'circle' && (
                <Circle
                  center={[0, 0]}
                  radius={2}
                  strokeStyle="solid"
                  strokeOpacity={1}
                  weight={3}
                  fillOpacity={0}
                />
              )}
            </Mafs>

            {/* Click instruction overlay */}
            {!locked && !isSubmitted && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-background/80 px-4 py-2 rounded-lg text-sm text-muted-foreground">
                  Click parts to shade them
                </div>
              </div>
            )}

            {/* Clickable overlay for parts */}
            {!locked && !disabled && !isSubmitted && (
              <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${denominator}, 1fr)` }}>
                {Array.from({ length: denominator }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => handlePartClick(i)}
                    className="hover:bg-primary/10 transition-colors cursor-pointer"
                    aria-label={`Part ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Fraction Display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Fraction:</span>
              <Badge variant="default" className="text-2xl px-4 py-2">
                {numerator}/{denominator}
              </Badge>
            </div>

            {/* Feedback */}
            {isSubmitted && isCorrect !== null && (
              <Badge variant={isCorrect ? 'default' : 'destructive'}>
                {isCorrect ? '✓ Correct!' : '✗ Try Again'}
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!isSubmitted ? (
              <Button
                onClick={handleSubmit}
                disabled={numerator === 0 || locked || disabled}
                className="flex-1"
              >
                Submit Answer
              </Button>
            ) : (
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1"
              >
                Try Again
              </Button>
            )}
          </div>

          {/* Instructions */}
          {!locked && !isSubmitted && (
            <p className="text-xs text-muted-foreground text-center">
              Select how many parts to divide, then click parts to shade them
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
