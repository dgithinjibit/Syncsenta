/**
 * @fileOverview Types and schemas for the generic teacher tool AI flow.
 */
import { z } from 'genkit';

export const GenericTeacherToolInputSchema = z.object({
  toolId: z.string().describe("The unique ID of the tool being used."),
  toolTitle: z.string().describe("The name of the tool."),
  context: z.string().describe("The Kenyan educational context (e.g., CBC, Grade level, Subject)."),
  inputs: z.record(z.string()).describe("A map of field IDs to user-provided values."),
});
export type GenericTeacherToolInput = z.infer<typeof GenericTeacherToolInputSchema>;

export const GenericTeacherToolOutputSchema = z.object({
  result: z.string().describe("The AI-generated content in Markdown format."),
});
export type GenericTeacherToolOutput = z.infer<typeof GenericTeacherToolOutputSchema>;
