'use client';

import { Lightbulb, MessageCircleQuestion, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { SocraticGuidanceStage } from '@/lib/socratic-guidance';

interface SocraticPromptPanelProps {
  stage: SocraticGuidanceStage;
  subject: string;
  disabled?: boolean;
  onPrompt: (prompt: string) => void;
}

const stageCopy: Record<SocraticGuidanceStage, string> = {
  orient: 'Start by noticing what you already know.',
  probe: 'Explain your thinking before we add another step.',
  hint: 'Try a smaller example before seeing a worked answer.',
  reflect: 'Connect your answer to evidence or a new example.',
  mastery: 'Transfer the idea and teach it back in your own words.',
};

export function SocraticPromptPanel({
  stage,
  subject,
  disabled = false,
  onPrompt,
}: SocraticPromptPanelProps) {
  const prompts = [
    'Give me one small example to try.',
    'I am unsure. Ask me a guiding question.',
    'Help me check my answer without giving it away.',
  ];

  return (
    <Card className="mb-4 border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageCircleQuestion className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Think it through with Mwalimu</CardTitle>
          </div>
          <Badge variant="outline" className="capitalize">{stage}</Badge>
        </div>
        <CardDescription>{stageCopy[stage]} Topic: {subject}.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 pt-0">
        {prompts.map((prompt, index) => (
          <Button
            key={prompt}
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => onPrompt(prompt)}
          >
            {index === 0 ? <Lightbulb className="mr-2 h-3.5 w-3.5" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
            {prompt}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
