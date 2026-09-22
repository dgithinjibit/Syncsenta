
'use server';

/**
 * @fileOverview Generates a summary of an AI-generated report for a school, for county officers.
 *
 * - generateReportSummary - A function that generates the report summary.
 */

import {ai} from '@/ai/genkit';
import {
    GenerateReportSummaryInput,
    GenerateReportSummaryInputSchema,
    GenerateReportSummaryOutput,
    GenerateReportSummaryOutputSchema
} from './generate-report-summary-types';


export async function generateReportSummary(
  input: GenerateReportSummaryInput
): Promise<GenerateReportSummaryOutput> {
  return generateReportSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateReportSummaryPrompt',
  input: {schema: GenerateReportSummaryInputSchema},
  output: {schema: GenerateReportSummaryOutputSchema},
  prompt: `You are an AI expert in summarizing educational reports for county officers in Kenya.

  Given the following AI-generated report, create a concise summary highlighting key findings and recommendations.

  Report:
  {{reportText}}

  Summary:`,
});

const generateReportSummaryFlow = ai.defineFlow(
  {
    name: 'generateReportSummaryFlow',
    inputSchema: GenerateReportSummaryInputSchema,
    outputSchema: GenerateReportSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
