
'use server';

/**
 * @fileOverview AI agent to generate a dashboard summary for a teacher.
 *
 * - generateDashboardSummary - A function that handles the summary generation.
 */

import {ai} from '@/ai/genkit';
import {
    GenerateDashboardSummaryInput,
    GenerateDashboardSummaryInputSchema,
    GenerateDashboardSummaryOutput,
    GenerateDashboardSummaryOutputSchema,
} from './generate-dashboard-summary-types';


export async function generateDashboardSummary(
  input: GenerateDashboardSummaryInput
): Promise<GenerateDashboardSummaryOutput> {
  return generateDashboardSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDashboardSummaryPrompt',
  input: {schema: GenerateDashboardSummaryInputSchema},
  output: {schema: GenerateDashboardSummaryOutputSchema},
  prompt: `You are an AI instructional coach. Your job is to provide a brief, encouraging, and helpful summary for a teacher based on their current classes and the resources they have created.

**Teacher's Classes:**
{{#each classes}}
- {{name}}
{{/each}}

**Teacher's Resources:**
{{#each resources}}
- {{title}} ({{type}})
{{/each}}

Analyze the provided lists. Briefly comment on the resources created. Identify if there seems to be a good number of resources or if some classes might need more materials. Provide one or two clear, actionable suggestions for what the teacher could create next. Keep the entire summary to 2-3 sentences. Be encouraging and supportive.
`,
});

const generateDashboardSummaryFlow = ai.defineFlow(
  {
    name: 'generateDashboardSummaryFlow',
    inputSchema: GenerateDashboardSummaryInputSchema,
    outputSchema: GenerateDashboardSummaryOutputSchema,
  },
  async input => {
    // If there are no resources, return a default encouraging message without calling the AI.
    if (!input.resources || input.resources.length === 0) {
        return {
            summary: "Welcome! You're ready to start creating. Use the Teacher Tools or Learning Lab to build engaging resources for your classes."
        };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
