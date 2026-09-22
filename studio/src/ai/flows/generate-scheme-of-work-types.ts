/**
 * @fileOverview Types and schemas for the generateSchemeOfWork flow.
 */
import {z} from 'genkit';

export const GenerateSchemeOfWorkInputSchema = z.object({
  subject: z.string().describe('The subject for the scheme of work.'),
  grade: z.string().describe('The grade level for the scheme of work.'),
  strand: z.string().describe('The main curriculum strand. This should be the main title.'),
  subStrand: z.string().describe('The sub-strand or specific topic area.'),
  lessonsPerWeek: z.string().describe('The number of lessons to be taught each week for this sub-strand.'),
  schemeOfWorkContext: z.string().optional().describe('A string containing the Learning Outcomes, Suggested Activities, Key Inquiry Questions, and other curriculum details for the sub-strand.'),
  omegaClawCurriculumContext: z.string().optional().describe('Teacher-approved Grade 6 or Senior School Omega Claw curriculum context when the subject or strand concerns AI or blockchain.')
});
export type GenerateSchemeOfWorkInput = z.infer<typeof GenerateSchemeOfWorkInputSchema>;

export const GenerateSchemeOfWorkOutputSchema = z.object({
  schemeOfWork: z.string().describe('The generated scheme of work in a structured Markdown table format, based on the official curriculum design.'),
});
export type GenerateSchemeOfWorkOutput = z.infer<typeof GenerateSchemeOfWorkOutputSchema>;
