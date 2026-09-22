'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Circle, Lightbulb, LockKeyhole, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ChallengeNode {
  id: string;
  title: string;
  concept: string;
  prompt: string;
  options: string[];
  answer: string;
}

interface InteractiveChallengePathProps {
  grade: string;
}

const omegaClawNodes: ChallengeNode[] = [
  {
    id: 'ai-input-output',
    title: 'Trace an AI decision',
    concept: 'AI basics',
    prompt: 'A phone sorts photos of maize leaves. Which sequence best describes the system?',
    options: ['Input → process → output', 'Output → input → guess', 'Rule → magic → answer'],
    answer: 'Input → process → output',
  },
  {
    id: 'blockchain-consensus',
    title: 'Build a shared record',
    concept: 'Blockchain basics',
    prompt: 'A class keeps matching copies of a transaction record. What makes the record shared?',
    options: ['Several participants keep and check copies', 'One person hides the only copy', 'The record changes without anyone checking'],
    answer: 'Several participants keep and check copies',
  },
  {
    id: 'explain-your-thinking',
    title: 'Teach it back',
    concept: 'Reflection',
    prompt: 'Which next step shows real understanding rather than memorisation?',
    options: ['Explain the idea with a new local example', 'Repeat the definition three times', 'Skip the explanation and copy the answer'],
    answer: 'Explain the idea with a new local example',
  },
];

function isOmegaClawGrade(grade: string): boolean {
  const normalized = grade.toLowerCase().replace(/\s+/g, '');
  return normalized.includes('senior') || normalized === 'grade6' || /grade1[0-2]/.test(normalized);
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

export function InteractiveChallengePath({ grade }: InteractiveChallengePathProps) {
  const [activeId, setActiveId] = useState(omegaClawNodes[0].id);
  const [completed, setCompleted] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hintLevel, setHintLevel] = useState(1);
  const [isChecking, setIsChecking] = useState(false);

  const activeNode = useMemo(
    () => omegaClawNodes.find((node) => node.id === activeId) ?? omegaClawNodes[0],
    [activeId],
  );
  const activeIndex = omegaClawNodes.findIndex((node) => node.id === activeNode.id);
  const progress = Math.round((completed.length / omegaClawNodes.length) * 100);

  if (!isOmegaClawGrade(grade)) return null;

  const handleHint = async () => {
    setIsChecking(true);
    const result = await postOmegaClaw('hint', { hint_level: hintLevel });
    setFeedback(
      typeof result?.hint === 'string'
        ? `Guided hint ${result.hintLevel ?? hintLevel}: ${result.hint}. Look again, then choose an answer.`
        : 'Start by noticing the input, action, or evidence the question is asking you to identify.',
    );
    setHintLevel((level) => Math.min(level + 1, 4));
    setIsChecking(false);
  };

  const handleAnswer = async (option: string) => {
    const correct = option === activeNode.answer;
    setSelected(option);
    setIsChecking(true);
    const result = await postOmegaClaw('progression', {
      outcome: correct ? 'correct' : 'incorrect',
      correct,
      explained: activeNode.id === 'explain-your-thinking' && correct,
    });

    if (correct) {
      setFeedback(
        result?.nextAction === 'celebrate-transfer'
          ? 'Correct. Now transfer the idea to a new example before continuing.'
          : 'Correct. Explain why it works, then continue.',
      );
      if (!completed.includes(activeNode.id)) setCompleted((current) => [...current, activeNode.id]);
    } else {
      setFeedback(
        result?.nextAction === 'scaffold-retry'
          ? 'Not quite yet. The next step is a smaller clue: look for evidence and explainable reasoning.'
          : 'Not quite yet. Look for the step that shows evidence and explainable reasoning.',
      );
    }
    setIsChecking(false);
  };

  const handleContinue = () => {
    const nextNode = omegaClawNodes[activeIndex + 1];
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
            <span>{completed.length} of {omegaClawNodes.length} challenge nodes mastered</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-2 md:grid-cols-3" aria-label="Challenge path">
          {omegaClawNodes.map((node, index) => {
            const isComplete = completed.includes(node.id);
            const isLocked = index > 0 && !completed.includes(omegaClawNodes[index - 1].id);
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
              {activeIndex === omegaClawNodes.length - 1 ? 'Finish path' : 'Continue to next node'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
