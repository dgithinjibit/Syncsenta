'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Circle, Lightbulb, LockKeyhole, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { answerFeedback, hintFeedback } from '@/lib/omega-claw-copy';
import { showsOmegaClawPath } from '@/lib/omega-claw-path';
import { OMEGA_CLAW_CHALLENGE_NODES } from '@/lib/omega-agent/omega-claw-challenge';

interface InteractiveChallengePathProps {
  grade: string;
}

async function postOmegaClaw(path: string, payload: unknown): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`/api/omega-claw/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/**
 * The nodes this learner already earned, read from `learning_progress`.
 *
 * The card used to answer this from `useState`, so the honest answer after a refresh was "none".
 * An unreadable path is empty rather than an error state: the learner can still answer, and the
 * next save writes what they earn.
 */
async function readSavedPath(): Promise<string[]> {
  try {
    const response = await fetch('/api/omega-claw/challenge', { cache: 'no-store' });
    if (!response.ok) return [];
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object') return [];
    return stringArray((body as { completed?: unknown }).completed);
  } catch {
    return [];
  }
}

export function InteractiveChallengePath({ grade }: InteractiveChallengePathProps) {
  const [activeId, setActiveId] = useState(OMEGA_CLAW_CHALLENGE_NODES[0].id);
  const [completed, setCompleted] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hintLevel, setHintLevel] = useState(1);
  const [isChecking, setIsChecking] = useState(false);

  // A second mount reads back what the first one wrote. Without this the path is React state, which
  // is nothing at all to a learner who closed the tab.
  useEffect(() => {
    if (!showsOmegaClawPath(grade)) return;
    let mounted = true;
    readSavedPath().then((ids) => {
      if (mounted && ids.length > 0) setCompleted(ids);
    });
    return () => {
      mounted = false;
    };
  }, [grade]);

  const activeNode = useMemo(
    () => OMEGA_CLAW_CHALLENGE_NODES.find((node) => node.id === activeId) ?? OMEGA_CLAW_CHALLENGE_NODES[0],
    [activeId],
  );
  const activeIndex = OMEGA_CLAW_CHALLENGE_NODES.findIndex((node) => node.id === activeNode.id);
  const progress = Math.round((completed.length / OMEGA_CLAW_CHALLENGE_NODES.length) * 100);

  if (!showsOmegaClawPath(grade)) return null;

  const handleHint = async () => {
    setIsChecking(true);
    const result = await postOmegaClaw('hint', { hint_level: hintLevel });
    setFeedback(hintFeedback(result));
    setHintLevel((level) => Math.min(level + 1, 4));
    setIsChecking(false);
  };

  const handleAnswer = async (option: string) => {
    setSelected(option);
    setIsChecking(true);

    // The server grades this answer. The card could grade it — it has always known which option is
    // right — but the record that grades it is the one that feeds `learning_progress` and, on a
    // mastery transition, the points ledger, so that judgement cannot come from the browser.
    const saved = await postOmegaClaw('challenge', { nodeId: activeNode.id, answer: option });
    const correct = saved?.correct === true;
    const earned = stringArray(saved?.completed);
    if (saved) setCompleted(earned);

    const result = await postOmegaClaw('progression', {
      outcome: correct ? 'correct' : 'incorrect',
      correct,
      explained: activeNode.id === 'explain-your-thinking' && correct,
    });

    setFeedback(answerFeedback(result, correct));
    setIsChecking(false);
  };

  const handleContinue = () => {
    const nextNode = OMEGA_CLAW_CHALLENGE_NODES[activeIndex + 1];
    if (!nextNode) {
      setFeedback('Challenge path complete. Try the ideas in a new local example.');
      return;
    }
    setActiveId(nextNode.id);
    setSelected(null);
    setFeedback(null);
    setHintLevel(1);
  };

  return (
    <Card className="border-primary/25 bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>Omega Claw challenge path</CardTitle>
              <Badge variant="outline">{grade}</Badge>
            </div>
            <CardDescription className="mt-1">
              Manipulate, explain, retry, and master one idea at a time.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleHint} disabled={isChecking}>
            <Lightbulb className="mr-2 h-4 w-4" />
            Get a guided hint
          </Button>
        </div>
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{completed.length} of {OMEGA_CLAW_CHALLENGE_NODES.length} challenge nodes mastered</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-2 md:grid-cols-3" aria-label="Challenge path">
          {OMEGA_CLAW_CHALLENGE_NODES.map((node, index) => {
            const isComplete = completed.includes(node.id);
            const isLocked = index > 0 && !completed.includes(OMEGA_CLAW_CHALLENGE_NODES[index - 1].id);
            const isActive = node.id === activeNode.id;
            return (
              <button
                type="button"
                key={node.id}
                disabled={isLocked}
                onClick={() => { setActiveId(node.id); setSelected(null); setFeedback(null); }}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  isActive ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'
                } ${isLocked ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <div className="flex items-center gap-2">
                  {isComplete ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : isLocked ? <LockKeyhole className="h-4 w-4" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-xs font-medium">Node {index + 1}</span>
                </div>
                <p className="mt-2 text-sm font-semibold">{node.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{node.concept}</p>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border bg-background p-5">
          <Badge variant="secondary" className="mb-3">{activeNode.concept}</Badge>
          <h3 className="text-lg font-semibold">{activeNode.prompt}</h3>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Lightbulb className="h-4 w-4 text-primary" /> Choose an answer, then explain why it works.
          </p>
          <div className="mt-4 grid gap-2">
            {activeNode.options.map((option) => (
              <Button
                type="button"
                key={option}
                variant={selected === option ? (option === activeNode.answer ? 'default' : 'destructive') : 'outline'}
                className="justify-start whitespace-normal text-left"
                onClick={() => handleAnswer(option)}
                disabled={isChecking || selected === activeNode.answer}
              >
                {option}
              </Button>
            ))}
          </div>
          {feedback && (
            <div className={`mt-4 rounded-lg border p-3 text-sm ${selected === activeNode.answer ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
              {feedback}
            </div>
          )}
          {selected === activeNode.answer && (
            <Button type="button" className="mt-4" onClick={handleContinue} disabled={isChecking}>
              {activeIndex === OMEGA_CLAW_CHALLENGE_NODES.length - 1 ? 'Finish path' : 'Continue to next node'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
