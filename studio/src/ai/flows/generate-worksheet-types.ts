/**
 * @fileOverview Types and schemas for the generateWorksheet flow.
 */
import {z} from 'genkit';

export const GenerateWorksheetInputSchema = z.object({
  grade: z.string().describe("The grade level for the worksheet (e.g., 'Grade 5')."),
  subject: z.string().describe("The subject of the worksheet (e.g., 'Science')."),
  topic: z.string().describe("The topic for the worksheet (e.g., 'The Solar System')."),
  numQuestions: z.string().describe("The number of questions to generate for the worksheet."),
});
export type GenerateWorksheetInput = z.infer<typeof GenerateWorksheetInputSchema>;

export const GenerateWorksheetOutputSchema = z.object({
  worksheet: z.string().describe('The generated worksheet in Markdown format, including a title, instructions, and questions.'),
});
export type GenerateWorksheetOutput = z.infer<typeof GenerateWorksheetOutputSchema>;
