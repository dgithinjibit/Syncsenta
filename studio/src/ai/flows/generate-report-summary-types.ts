/**
 * @fileOverview Types and schemas for the generateReportSummary flow.
 */
import {z} from 'genkit';

export const GenerateReportSummaryInputSchema = z.object({
  reportText: z
    .string()
    .describe('The complete text of the AI-generated report.'),
});
export type GenerateReportSummaryInput = z.infer<
  typeof GenerateReportSummaryInputSchema
>;

export const GenerateReportSummaryOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise summary of the AI-generated report.'),
});
export type GenerateReportSummaryOutput = z.infer<
  typeof GenerateReportSummaryOutputSchema
>;
