
'use server';

/**
 * @fileOverview AI agent to generate a high-level summary for a County Director.
 *
 * - generateCountySummary - A function that handles the summary generation.
 */

import {ai} from '@/ai/genkit';
import {
    GenerateCountySummaryInput,
    GenerateCountySummaryInputSchema,
    GenerateCountySummaryOutput,
    GenerateCountySummaryOutputSchema,
} from './generate-county-summary-types';


export async function generateCountySummary(
  input: GenerateCountySummaryInput
): Promise<GenerateCountySummaryOutput> {
  return generateCountySummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCountySummaryPrompt',
  input: {schema: GenerateCountySummaryInputSchema},
  output: {schema: GenerateCountySummaryOutputSchema},
  prompt: `You are an expert AI Educational Analyst for a County Director in Kenya. Your role is to synthesize high-level data into a concise summary and provide one strategic suggestion.

**County-Wide Data:**
---
- **Number of Schools:** {{schoolCount}}
- **Total Students:** {{studentCount}}
- **Total Teachers:** {{teacherCount}}
- **Average Performance Score:** {{averagePerformance}}%
- **Top Performing School:** {{topPerformingSchool}}
- **Lowest Performing School:** {{lowestPerformingSchool}}
---

{{#if resources}}
**Allocated Resources:**
---
{{#each resources}}
- **Resource:** {{resourceName}} | **School:** {{schoolName}} | **Quantity:** {{quantity}}
{{/each}}
---
{{/if}}

**Instructions:**
1.  **Generate a Summary:** Write a 2-sentence summary of the county's current educational status based on all the data. Be objective and data-focused.
2.  **Provide a Suggestion:** Based on all the data, provide one clear, strategic, and actionable suggestion for the County Director to consider. This could involve resource allocation, teacher training, or an intervention for the lowest-performing school. If resource data is available, try to connect it to school performance in your suggestion.
`,
});

const generateCountySummaryFlow = ai.defineFlow(
  {
    name: 'generateCountySummaryFlow',
    inputSchema: GenerateCountySummaryInputSchema,
    outputSchema: GenerateCountySummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
