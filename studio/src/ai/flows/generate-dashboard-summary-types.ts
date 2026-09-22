/**
 * @fileOverview Types for the generate-dashboard-summary flow.
 */
import {z} from 'genkit';

export const GenerateDashboardSummaryInputSchema = z.object({
  classes: z.array(z.object({ name: z.string() })).describe("A list of the teacher's classes."),
  resources: z.array(z.object({ title: z.string(), type: z.string() })).describe("A list of the teacher's generated resources."),
});
export type GenerateDashboardSummaryInput = z.infer<typeof GenerateDashboardSummaryInputSchema>;

export const GenerateDashboardSummaryOutputSchema = z.object({
  summary: z.string().describe('A brief, encouraging summary for the teacher about their resource allocation, with one or two actionable suggestions.'),
});
export type GenerateDashboardSummaryOutput = z.infer<typeof GenerateDashboardSummaryOutputSchema>;
