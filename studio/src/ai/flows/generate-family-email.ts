
'use server';

/**
 * @fileOverview AI agent to generate professional emails to a student's family.
 *
 * - generateFamilyEmail - A function that handles the email generation process.
 */

import {ai} from '@/ai/genkit';
import {
    GenerateFamilyEmailInput,
    GenerateFamilyEmailInputSchema,
    GenerateFamilyEmailOutput,
    GenerateFamilyEmailOutputSchema
} from './generate-family-email-types';

export type { GenerateFamilyEmailInput } from './generate-family-email-types';


export async function generateFamilyEmail(
  input: GenerateFamilyEmailInput
): Promise<GenerateFamilyEmailOutput> {
  return generateFamilyEmailFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFamilyEmailPrompt',
  input: {schema: GenerateFamilyEmailInputSchema},
  output: {schema: GenerateFamilyEmailOutputSchema},
  prompt: `You are an experienced and empathetic Kenyan teacher's assistant, skilled in communicating with parents. Your task is to draft a professional email to a parent or guardian based on the teacher's notes.

**Instructions:**
1.  Read the teacher's notes carefully to understand the tone (is it positive, a concern, or a simple reminder?).
2.  Generate a clear, professional subject line.
3.  Write a draft of the email body in Markdown format.
4.  Start with a polite and culturally appropriate greeting (e.g., "Dear Mrs. Wanjiku,").
5.  Clearly and kindly state the reason for the email, using the teacher's notes as the primary information source.
6.  If it's a concern, frame it collaboratively, suggesting a partnership to help the student.
7.  If it's positive, be specific about what the student did well.
8.  End with a polite closing and sign off with the teacher's name, which you should assume is "Daniel".

**Teacher's Notes:**
---
- **Parent/Guardian Name:** {{{parentName}}}
- **Student Name:** {{{studentName}}}
- **Topic:** {{{topic}}}
---

Generate the subject line and email body now.
`,
});

const generateFamilyEmailFlow = ai.defineFlow(
  {
    name: 'generateFamilyEmailFlow',
    inputSchema: GenerateFamilyEmailInputSchema,
    outputSchema: GenerateFamilyEmailOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
