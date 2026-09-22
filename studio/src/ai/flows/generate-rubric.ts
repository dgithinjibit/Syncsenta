
'use server';

/**
 * @fileOverview AI agent to generate a custom rubric for an assignment.
 *
 * - generateRubric - A function that handles the rubric generation process.
 */

import {ai} from '@/ai/genkit';
import {
    GenerateRubricInput,
    GenerateRubricInputSchema,
    GenerateRubricOutput,
    GenerateRubricOutputSchema
} from './generate-rubric-types';

export type { GenerateRubricInput } from './generate-rubric-types';


export async function generateRubric(
  input: GenerateRubricInput
): Promise<GenerateRubricOutput> {
  return generateRubricFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateRubricPrompt',
  input: {schema: GenerateRubricInputSchema},
  output: {schema: GenerateRubricOutputSchema},
  prompt: `You are an expert curriculum designer specializing in creating detailed, standards-aligned assessment rubrics.

Generate a comprehensive rubric based on the following assignment details. The rubric must be a Markdown table.

**Grade Level:** {{{grade}}}
**Assignment:** {{{assignmentDescription}}}
**Learning Objective:** {{{learningObjective}}}
**Number of Performance Levels:** {{{levels}}}

{{#if criteria}}
**Required Criteria:** {{{criteria}}}
{{/if}}

{{#if standards}}
**Align to Standards:** {{{standards}}}
{{/if}}

The rubric should have a column for the "Criteria" and then {{{levels}}} columns for the performance levels (e.g., "Beginning", "Developing", "Proficient"). For each criterion, provide a clear description of what is expected at each performance level.

{{#if webSearch}}
You may use your knowledge and web search capabilities to find relevant standards and best practices to make this a high-quality, effective rubric.
{{/if}}
`,
});

const generateRubricFlow = ai.defineFlow(
  {
    name: 'generateRubricFlow',
    inputSchema: GenerateRubricInputSchema,
    outputSchema: GenerateRubricOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
