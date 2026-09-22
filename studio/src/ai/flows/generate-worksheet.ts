
'use server';

/**
 * @fileOverview AI agent to generate a draft worksheet.
 *
 * - generateWorksheet - A function that handles the worksheet generation process.
 */

import {ai} from '@/ai/genkit';
import {
    GenerateWorksheetInput,
    GenerateWorksheetInputSchema,
    GenerateWorksheetOutput,
    GenerateWorksheetOutputSchema
} from './generate-worksheet-types';

export type { GenerateWorksheetInput } from './generate-worksheet-types';


export async function generateWorksheet(
  input: GenerateWorksheetInput
): Promise<GenerateWorksheetOutput> {
  return generateWorksheetFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWorksheetPrompt',
  input: {schema: GenerateWorksheetInputSchema},
  output: {schema: GenerateWorksheetOutputSchema},
  prompt: `You are an expert teacher's assistant. Your task is to create a well-structured worksheet based on the provided details.

**Grade Level:** {{{grade}}}
**Subject:** {{{subject}}}
**Topic:** {{{topic}}}
**Number of Questions:** {{{numQuestions}}}

Please generate a worksheet that includes:
1. A clear title.
2. Simple instructions for the student.
3. {{{numQuestions}}} questions that are appropriate for the specified grade level and topic.
4. An answer key at the end.

The entire output should be in Markdown format.
`,
});

const generateWorksheetFlow = ai.defineFlow(
  {
    name: 'generateWorksheetFlow',
    inputSchema: GenerateWorksheetInputSchema,
    outputSchema: GenerateWorksheetOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
