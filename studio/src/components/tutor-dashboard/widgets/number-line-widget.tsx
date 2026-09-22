'use client';

/**
 * Number Line Widget
 * 
 * Interactive number line for learning number concepts, fractions, and decimals.
 * Uses MAFS library for visualization.
 */

import { useState, useCallback } from 'react';
import { Mafs, Coordinates, Point, Line, Text, useMovablePoint, vec } from 'mafs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import 'mafs/core.css';

export interface NumberLineConfig {
  min: number;
  max: number;
  step: number;
  targetValue?: number; // For validation
  showLabels?: boolean;
  allowMultipleMarkers?: boolean;
  locked?: boolean; // For scaffolding
}

export interface NumberLineWidgetProps {
  config: NumberLineConfig;
  onAnswer?: (value: number) => void;
  onInteraction?: (value: number) => void;
  disabled?: boolean;
}

export function NumberLineWidget({
  config,
  onAnswer,
  onInteraction,
  disabled = false,
}: NumberLineWidgetProps) {
  const { min, max, step, targetValue, showLabels = true, locked = false } = config;
  
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Calculate snap positions
  const snapPositions = [];
  for (let i = min; i <= max; i += step) {
    snapPositions.push(i);
  }

  // Movable point with snapping
  const markerPoint = useMovablePoint([min, 0], {
    constrain: ([x]) => {
      // Snap to nearest valid position
      const snapped = snapPositions.reduce((prev, curr) => 
        Math.abs(curr - x) < Math.abs(prev - x) ? curr : prev
      );
      return [snapped, 0];
    },
  });

  // Handle marker movement
  const handleMarkerMove = useCallback((newValue: number) => {
    if (locked || disabled || isSubmitted) return;
    
    setSelectedValue(newValue);
    onInteraction?.(newValue);
  }, [locked, disabled, isSubmitted, onInteraction]);

  // Watch for marker position changes
  const currentX = markerPoint.point[0];
  if (currentX !== selectedValue && !isSubmitted) {
    handleMarkerMove(currentX);
  }

  // Handle answer submission
  const handleSubmit = () => {
    if (selectedValue === null || isSubmitted) return;

    setIsSubmitted(true);

    // Check if answer is correct (if targetValue provided)
    if (targetValue !== undefined) {
      const correct = Math.abs(selectedValue - targetValue) < step / 2;
      setIsCorrect(correct);
    }

    onAnswer?.(selectedValue);
  };

  // Reset widget
  const handleReset = () => {
    setSelectedValue(null);
    setIsSubmitted(false);
    setIsCorrect(null);
    markerPoint.setPoint([min, 0]);
  };

  return (
    <Card className={`${locked ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Number Line Visualization */}
          <div className="w-full h-32 bg-muted/30 rounded-lg overflow-hidden">
            <Mafs
              viewBox={{
                x: [min - 1, max + 1],
                y: [-1, 1],
              }}
              preserveAspectRatio={false}
            >
              {/* Coordinate system */}
              <Coordinates.Cartesian
                xAxis={{
                  lines: step,
                  labels: showLabels ? (n) => (Number.isInteger(n / step) ? n.toString() : '') : false,
                }}
                yAxis={false}
              />

              {/* Number line */}
              <Line.Segment
                point1={[min, 0]}
                point2={[max, 0]}
                color="hsl(var(--primary))"
                weight={3}
              />

              {/* Tick marks */}
              {snapPositions.map((pos) => (
                <Line.Segment
                  key={pos}
                  point1={[pos, -0.2]}
                  point2={[pos, 0.2]}
                  color="hsl(var(--primary))"
                  weight={2}
                />
              ))}

              {/* Movable marker */}
              {!locked && !disabled && !isSubmitted && (
                <Point
                  x={markerPoint.point[0]}
                  y={0}
                  color={selectedValue !== null ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                  opacity={0.8}
                />
              )}

              {/* Fixed marker after submission */}
              {isSubmitted && selectedValue !== null && (
                <Point
                  x={selectedValue}
                  y={0}
                  color={isCorrect === true ? 'green' : isCorrect === false ? 'red' : 'hsl(var(--primary))'}
                  opacity={1}
                />
              )}

              {/* Target indicator (for debugging/teacher view) */}
              {targetValue !== undefined && isSubmitted && (
                <Point
                  x={targetValue}
                  y={0.5}
                  color="green"
                  opacity={0.5}
                />
              )}

              {/* Draggable point component */}
              {!locked && !disabled && !isSubmitted && markerPoint.element}
            </Mafs>
          </div>

          {/* Selected Value Display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Selected Value:</span>
              {selectedValue !== null ? (
                <Badge variant="default" className="text-lg">
                  {selectedValue}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-sm">
                  Drag the marker
                </Badge>
              )}
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
                disabled={selectedValue === null || locked || disabled}
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
              Drag the blue marker to select a value on the number line
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
