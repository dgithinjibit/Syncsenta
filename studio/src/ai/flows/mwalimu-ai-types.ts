

/**
 * @fileOverview Types and schemas for the Mwalimu AI tutor flow.
 */

import {z} from 'genkit';

export const MwalimuAiTutorInputSchema = z.object({
  grade: z
    .string()
    .describe("The student's grade level (e.g., Grade 1, Grade 7)."),
  subject: z
    .string()
    .describe(
      "The subject the student wants to discuss (e.g., Integrated Science)."
    ),
   currentMessage: z.string().optional().describe("The user's most recent message."),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        content: z.string(),
      })
    )
    .optional()
    .describe('The history of the conversation so far.'),
  teacherContext: z.string().optional().describe("Context from teacher's uploaded materials (RAG)."),
  knowledgeBase: z.string().optional().describe("The full curriculum context for the AI."),
  contextStatus: z.enum(['LOADED', 'MISSING']).optional().describe("The status of the RAG data."),
  studentName: z.string().optional().describe("The student's name."),
  studentId: z.string().optional().describe("The student's unique ID."),
  teacherId: z.string().optional().describe("The ID of the student's teacher."),
});
export type MwalimuAiTutorInput = z.infer<typeof MwalimuAiTutorInputSchema>;

export const MwalimuAiTutorOutputSchema = z.object({
  response: z
    .string()
    .describe("Mwalimu AI's Socratic response to the student."),
  audioResponse: z.string().optional().describe("The text-to-speech audio of the response as a data URI.")
});
export type MwalimuAiTutorOutput = z.infer<typeof MwalimuAiTutorOutputSchema>;

      
