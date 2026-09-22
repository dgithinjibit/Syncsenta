/**
 * @fileOverview An AI agent to summarize a student-tutor interaction for a teacher.
 */

import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import type { LearningSummary } from '@/lib/types';


export const SummarizeStudentInteractionInputSchema = z.object({
  studentName: z.string().describe("The student's name."),
  subject: z.string().describe("The subject of the conversation."),
  grade: z.string().describe("The student's grade level."),
  chatHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        content: z.string(),
      })
    )
    .describe('The full history of the conversation between the student and the AI tutor.'),
});
export type SummarizeStudentInteractionInput = z.infer<typeof SummarizeStudentInteractionInputSchema>;


export const SummarizeStudentInteractionOutputSchema = z.object({
  strengths: z.string().describe("A 1-2 sentence summary of what the student understood well or showed strong engagement in. Frame this positively."),
  areasForImprovement: z.string().describe("A 1-2 sentence summary of concepts the student struggled with or areas where they could deepen their understanding. This should be phrased as a constructive suggestion for the teacher."),
});
export type SummarizeStudentInteractionOutput = z.infer<typeof SummarizeStudentInteractionOutputSchema>;


export const summarizeStudentInteractionFlow = ai.defineFlow(
  {
    name: 'summarizeStudentInteractionFlow',
    inputSchema: SummarizeStudentInteractionInputSchema,
    outputSchema: SummarizeStudentInteractionOutputSchema,
  },
  async (input) => {
    const { output } = await summarizeStudentInteractionPrompt(input);
    return output!;
  }
);


export const summarizeStudentInteractionPrompt = ai.definePrompt({
    name: 'summarizeStudentInteractionPrompt',
    input: { schema: SummarizeStudentInteractionInputSchema },
    output: { schema: SummarizeStudentInteractionOutputSchema },
    prompt: `You are an expert AI Instructional Coach. Your task is to analyze a conversation between a student and an AI tutor and provide a concise, actionable summary for their teacher.

    **Student:** {{{studentName}}}
    **Grade:** {{{grade}}}
    **Subject:** {{{subject}}}

    **Conversation History:**
    ---
    {{#each chatHistory}}
      **{{role}}:** {{{content}}}
    {{/each}}
    ---

    **Instructions:**
    1.  **Analyze Strengths:** Review the conversation and identify where the student demonstrated good understanding, asked insightful questions, or was highly engaged. Summarize this in 1-2 positive sentences.
    2.  **Identify Areas for Improvement:** Pinpoint concepts the student found confusing, or where their understanding is still developing. Summarize this as a constructive, 1-2 sentence suggestion for the teacher. Focus on what the teacher can do to help.
    `,
});
