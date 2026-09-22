/**
 * @fileOverview Types and schemas for the differentiateWorksheet flow.
 */
import {z} from 'genkit';

const DifferentiatedContentSchema = z.object({
    level: z.string().describe("The differentiation level (e.g., 'Simpler Language')."),
    content: z.string().describe('The rewritten content for that level.'),
});

export const DifferentiateWorksheetInputSchema = z.object({
  originalContent: z.string().describe('The original text content of the worksheet or document.'),
  gradeLevel: z.string().describe('The grade level for which the original content was intended.'),
  subject: z.string().describe('The subject of the content.'),
  levels: z.array(z.string()).describe("The reading levels to generate (e.g., ['Simpler Language', 'Advanced Challenge'])."),
});
export type DifferentiateWorksheetInput = z.infer<typeof DifferentiateWorksheetInputSchema>;

export const DifferentiateWorksheetOutputSchema = z.object({
  differentiatedContent: z.array(DifferentiatedContentSchema).describe('An array of content versions, one for each requested level.'),
});
export type DifferentiateWorksheetOutput = z.infer<typeof DifferentiateWorksheetOutputSchema>;
