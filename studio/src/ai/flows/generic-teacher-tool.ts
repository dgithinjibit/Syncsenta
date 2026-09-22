'use server';

/**
 * @fileOverview A flexible AI agent that powers a wide variety of teacher tools.
 * It uses the tool's context and user inputs to generate highly relevant content
 * grounded in the Kenyan educational system.
 */

import { ai } from '@/ai/genkit';
import {
  GenericTeacherToolInput,
  GenericTeacherToolInputSchema,
  GenericTeacherToolOutput,
  GenericTeacherToolOutputSchema,
} from './generic-teacher-tool-types';

export async function generateGenericToolContent(
  input: GenericTeacherToolInput
): Promise<GenericTeacherToolOutput> {
  return genericTeacherToolFlow(input);
}

const toolPrompt = ai.definePrompt({
  name: 'genericTeacherToolPrompt',
  input: { schema: GenericTeacherToolInputSchema },
  output: { schema: GenericTeacherToolOutputSchema },
  prompt: `You are an expert Kenyan educational consultant and instructional designer specializing in the Competency-Based Curriculum (CBC).

Your task is to generate high-quality content for the tool: "{{toolTitle}}".

**CRITICAL CONTEXT:**
- **System:** Kenyan Competency-Based Curriculum (CBC) / 8-4-4 (where applicable for senior classes).
- **Tone:** Professional, encouraging, and culturally appropriate for Kenya.
- **Language:** English (British/Kenyan standard), with natural use of Swahili educational terms where appropriate (e.g., "Gredi", "Mada").
- **Local Relevance:** Use Kenyan examples, currency (KES), names (e.g., Kamau, Atieno), and scenarios that Kenyan students and teachers relate to.

**USER INPUTS:**
{{#each inputs}}
- **{{@key}}:** {{{this}}}
{{/each}}

**SPECIFIC TOOL GUIDELINES:**
Based on the tool ID "{{toolId}}", ensure you provide:
- If it's a **Lesson Plan/Unit Plan**, include Strands, Sub-strands, and Core Competencies.
- If it's **Feedback/Report Comments**, be constructive and focus on CBC "I Can" statements.
- If it's **Assessment**, align questions to KICD levels of thinking (Knowledge, Understanding, Application).
- If it's **Communication**, sign off professionally (assume name is "Mwalimu").

Generate the content in clear, well-structured Markdown.`,
});

const genericTeacherToolFlow = ai.defineFlow(
  {
    name: 'genericTeacherToolFlow',
    inputSchema: GenericTeacherToolInputSchema,
    outputSchema: GenericTeacherToolOutputSchema,
  },
  async (input) => {
    const { output } = await toolPrompt(input);
    return output!;
  }
);
