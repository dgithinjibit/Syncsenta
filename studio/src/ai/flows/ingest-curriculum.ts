
'use server';

/**
 * @fileOverview An AI agent to ingest and parse curriculum documents.
 * 
 * This flow takes raw text from a curriculum document and transforms it
 * into a structured JSON object that can be used by other AI agents.
 */

import {ai} from '@/ai/genkit';
import {
    IngestCurriculumInput,
    IngestCurriculumInputSchema,
    IngestCurriculumOutput,
    IngestCurriculumOutputSchema
} from './ingest-curriculum-types';


export async function ingestCurriculum(
  input: IngestCurriculumInput
): Promise<IngestCurriculumOutput> {
  // If there's no document text, we can't parse anything.
  // This will be the case until we add PDF text extraction.
  // Returning immediately makes the upload process much faster for the user.
  if (!input.documentText) {
    return { parsedCurriculum: [] };
  }
  
  return ingestCurriculumFlow(input);
}

const prompt = ai.definePrompt({
  name: 'ingestCurriculumPrompt',
  input: {schema: IngestCurriculumInputSchema},
  output: {schema: IngestCurriculumOutputSchema},
  prompt: `You are an expert at parsing structured documents. Your task is to analyze the provided text from a curriculum document and extract the key information into a structured JSON format.

The document contains tables with columns like: "Strand", "Sub strand", "Specific Learning Outcomes", "Suggested Learning Experiences", and "Key Inquiry Question(s)".

Carefully read the text provided and extract each row of curriculum content into a separate object.

**Document Text:**
---
{{documentText}}
---
`,
});

const ingestCurriculumFlow = ai.defineFlow(
  {
    name: 'ingestCurriculumFlow',
    inputSchema: IngestCurriculumInputSchema,
    outputSchema: IngestCurriculumOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
