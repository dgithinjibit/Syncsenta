/**
 * @fileOverview Types and schemas for the generateRubric flow.
 */
import {z} from 'genkit';

export const GenerateRubricInputSchema = z.object({
  grade: z.string().describe("The grade level for the assignment (e.g., '5th Grade')."),
  levels: z.string().describe("The number of performance levels for the rubric (e.g., '3')."),
  learningObjective: z.string().describe("The learning objective or standard (e.g., 'SWBAT write an argumentative essay')."),
  assignmentDescription: z.string().describe("A brief description of the student assignment."),
  criteria: z.string().optional().describe("Specific categories or criteria to include in the rubric (e.g., 'Include supporting arguments')."),
  standards: z.string().optional().describe("Any specific educational standards to align with (e.g., 'CCSS', 'TEKS')."),
  webSearch: z.boolean().optional().describe("Whether to use web search to inform the rubric generation."),
});
export type GenerateRubricInput = z.infer<typeof GenerateRubricInputSchema>;

export const GenerateRubricOutputSchema = z.object({
  rubric: z.string().describe('The generated rubric in a structured Markdown table format.'),
});
export type GenerateRubricOutput = z.infer<typeof GenerateRubricOutputSchema>;
