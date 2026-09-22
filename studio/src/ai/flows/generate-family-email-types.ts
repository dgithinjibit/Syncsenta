/**
 * @fileOverview Types and schemas for the generateFamilyEmail flow.
 */
import {z} from 'genkit';

export const GenerateFamilyEmailInputSchema = z.object({
  parentName: z.string().describe("The name of the parent or guardian."),
  studentName: z.string().describe("The name of the student."),
  topic: z.string().describe("The teacher's notes about the reason for the email (e.g., 'Kamau has been doing excellent work in group discussions', 'Concerned about last two maths assignments being late')."),
});
export type GenerateFamilyEmailInput = z.infer<typeof GenerateFamilyEmailInputSchema>;

export const GenerateFamilyEmailOutputSchema = z.object({
  subject: z.string().describe("A clear and concise subject line for the email."),
  body: z.string().describe("The generated email body in Markdown format. It should be professional, empathetic, and clear. Start with a polite greeting and end with the teacher's name."),
});
export type GenerateFamilyEmailOutput = z.infer<typeof GenerateFamilyEmailOutputSchema>;
