/**
 * Strand Classifier - Identifies CBC curriculum strand from student question
 * 
 * Uses AI to classify student questions into:
 * - Subject
 * - Grade Level
 * - Strand
 * - Sub-Strand
 * 
 * This enables curriculum-aware responses from Mwalimu AI
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const StrandClassificationSchema = z.object({
  subject: z.string().describe("The CBC subject (e.g., Mathematics Activities, English Language Activities)"),
  grade: z.string().describe("The grade level (e.g., Grade 2, Grade 4)"),
  strand: z.string().describe("The main curriculum strand (e.g., Numbers, Listening and Speaking)"),
  subStrand: z.string().optional().describe("The specific sub-strand if identifiable"),
  confidence: z.number().describe("Confidence score 0-1"),
  reasoning: z.string().describe("Why this classification was chosen"),
});

export type StrandClassification = z.infer<typeof StrandClassificationSchema>;

const classifierPrompt = ai.definePrompt({
  name: 'strandClassifierPrompt',
  input: {
    schema: z.object({
      question: z.string(),
      subject: z.string(),
      grade: z.string(),
    }),
  },
  output: { schema: StrandClassificationSchema },
  prompt: `You are a CBC curriculum expert. Analyze the student's question and identify which curriculum strand it belongs to.

Subject: {{subject}}
Grade: {{grade}}
Student Question: "{{question}}"

# CBC CURRICULUM STRANDS:

## Mathematics Activities:
- Numbers (counting, place value, operations)
- Measurement (length, mass, capacity, time, money)
- Geometry (shapes, patterns, spatial sense)
- Data Handling (pictographs, bar graphs)

## English Language Activities:
- Listening and Speaking
- Reading
- Language Use / Grammar in Use
- Writing

## Kiswahili Language Activities:
- Kusikiliza na Kuzungumza (Listening and Speaking)
- Kusoma (Reading)
- Kuandika (Writing)
- Sarufi (Grammar)

## Science Activities:
- Living Things
- Materials and Matter
- Energy
- Earth and Space

Based on the question, identify:
1. The main strand
2. The sub-strand (if clear)
3. Your confidence level
4. Your reasoning

Be specific and use official CBC terminology.`,
});

export async function classifyStrand(
  question: string,
  subject: string,
  grade: string
): Promise<StrandClassification> {
  try {
    const { output } = await classifierPrompt({
      question,
      subject,
      grade,
    });

    if (!output) {
      throw new Error('Failed to classify strand');
    }

    return output;
  } catch (error) {
    console.error('Strand classification failed:', error);
    // Return default classification
    return {
      subject,
      grade,
      strand: 'General',
      confidence: 0.5,
      reasoning: 'Classification failed, using default',
    };
  }
}
