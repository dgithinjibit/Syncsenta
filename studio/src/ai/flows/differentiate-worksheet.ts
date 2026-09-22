
'use server';

/**
 * @fileOverview AI agent to differentiate a piece of text for various learning levels.
 *
 * - differentiateWorksheet - A function that handles the worksheet differentiation process.
 */

import {ai} from '@/ai/genkit';
import {
    DifferentiateWorksheetInput,
    DifferentiateWorksheetInputSchema,
    DifferentiateWorksheetOutput,
    DifferentiateWorksheetOutputSchema
} from './differentiate-worksheet-types';

export type { DifferentiateWorksheetInput } from './differentiate-worksheet-types';


export async function differentiateWorksheet(
  input: DifferentiateWorksheetInput
): Promise<DifferentiateWorksheetOutput> {
  return differentiateWorksheetFlow(input);
}

const prompt = ai.definePrompt({
  name: 'differentiateWorksheetPrompt',
  input: {schema: DifferentiateWorksheetInputSchema},
  output: {schema: DifferentiateWorksheetOutputSchema},
  prompt: `You are an expert instructional designer. Your task is to rewrite the provided text for different reading and comprehension levels.

**IMPORTANT RULE:** You must ONLY use the information and concepts present in the original content. Do not introduce any external facts, examples, or information. Your goal is to adapt the existing text, not to add new knowledge.

**Original Content (for {{gradeLevel}} {{subject}}):**
---
{{{originalContent}}}
---

Please generate versions for the following levels:
{{#each levels}}
- {{this}}
{{/each}}

For each level, rewrite the original content to match the target audience's needs. For "Simpler Language," use shorter sentences and more basic vocabulary. For "Advanced Challenge," use more complex sentence structures and vocabulary, and perhaps reframe parts as more analytical questions, but without adding new information.
`,
});

const differentiateWorksheetFlow = ai.defineFlow(
  {
    name: 'differentiateWorksheetFlow',
    inputSchema: DifferentiateWorksheetInputSchema,
    outputSchema: DifferentiateWorksheetOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
