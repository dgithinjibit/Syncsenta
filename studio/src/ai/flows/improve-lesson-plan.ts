
'use server';

/**
 * @fileOverview AI agent to improve an existing lesson plan based on user feedback.
 *
 * - improveLessonPlan - A function that handles the lesson plan improvement process.
 */

import {ai} from '@/ai/genkit';
import {
  ImproveLessonPlanInput,
  ImproveLessonPlanInputSchema,
  ImproveLessonPlanOutput,
  ImproveLessonPlanOutputSchema,
} from './improve-lesson-plan-types';


export async function improveLessonPlan(
  input: ImproveLessonPlanInput,
  onUpdate: (chunk: string) => void
): Promise<void> {
  const result = await improveLessonPlanFlow(input);
  onUpdate(result);
}

const prompt = ai.definePrompt({
  name: 'improveLessonPlanPrompt',
  input: {schema: ImproveLessonPlanInputSchema},
  output: {schema: ImproveLessonPlanOutputSchema},
  prompt: `You are an expert instructional design assistant. Your task is to revise and improve the provided lesson plan based on the user's specific request.

**Original Lesson Plan:**
---
{{{lessonPlan}}}
---

**User's Improvement Request:**
---
"{{{request}}}"
---

Based on the request, generate a new, complete, and improved version of the lesson plan. Do not just add a section; integrate the feedback into a cohesive, updated document.
`,
});

const improveLessonPlanFlow = ai.defineFlow(
  {
    name: 'improveLessonPlanFlow',
    inputSchema: ImproveLessonPlanInputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output?.revisedLessonPlan ?? '';
  }
);
