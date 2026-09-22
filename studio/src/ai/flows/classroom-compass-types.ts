/**
 * @fileOverview Types and schemas for the Classroom Compass AI tutor flow.
 */

import {z} from 'genkit';

export const ClassroomCompassInputSchema = z.object({
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        content: z.string(),
      })
    )
    .optional()
    .describe('The history of the conversation so far.'),
  teacherContext: z.string().describe("Context from the teacher's uploaded, original materials (RAG). This is the ONLY source of truth."),
});
export type ClassroomCompassInput = z.infer<typeof ClassroomCompassInputSchema>;

export const ClassroomCompassOutputSchema = z.object({
  response: z
    .string()
    .describe("Compass's response, grounded in the teacher's materials."),
});
export type ClassroomCompassOutput = z.infer<typeof ClassroomCompassOutputSchema>;
