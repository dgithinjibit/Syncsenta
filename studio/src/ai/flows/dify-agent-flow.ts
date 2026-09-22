/**
 * @fileOverview Dify Agent Flow Integration
 * 
 * This flow integrates the Dify MCP server with the SyncSenta platform,
 * enabling advanced AI-powered educational features.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { difyAgentConfig } from './dify-agent-config';

// Define input and output schemas
export const DifyAgentInputSchema = z.object({
  query: z.string().describe('User query or request'),
  userId: z.string().describe('User ID for context'),
  userType: z.enum(['student', 'teacher', 'admin']).describe('Type of user'),
  subject: z.string().optional().describe('Subject area if applicable'),
  grade: z.string().optional().describe('Grade level if applicable'),
  language: z.enum(['en', 'sw']).optional().default('en').describe('Language preference'),
  context: z.record(z.any()).optional().describe('Additional context'),
});

export type DifyAgentInput = z.infer<typeof DifyAgentInputSchema>;

export const DifyAgentOutputSchema = z.object({
  response: z.string().describe('Agent response'),
  suggestions: z.array(z.string()).optional().describe('Follow-up suggestions'),
  resources: z.array(z.object({
    title: z.string(),
    url: z.string(),
    type: z.string(),
  })).optional().describe('Related resources'),
  metadata: z.object({
    capability: z.string().optional(),
    datasetUsed: z.string().optional(),
    confidence: z.number().optional(),
  }).optional(),
});

export type DifyAgentOutput = z.infer<typeof DifyAgentOutputSchema>;

// Define the Dify agent prompt
const difyAgentPrompt = ai.definePrompt({
  name: 'difyAgentPrompt',
  input: { schema: DifyAgentInputSchema },
  output: { schema: DifyAgentOutputSchema },
  prompt: `${difyAgentConfig.systemPrompt}

User Type: {{userType}}
Subject: {{subject}}
Grade: {{grade}}
Language: {{language}}

User Query: {{query}}

Based on the user's query and profile, provide a helpful response. Consider:
1. The user's role (student, teacher, or admin)
2. The subject and grade level if applicable
3. The language preference
4. Relevant curriculum content
5. Appropriate resources and follow-up suggestions

Ensure your response is:
- Age-appropriate for the target audience
- Culturally relevant to Kenya
- Aligned with the CBC curriculum
- Encouraging and supportive
- Clear and actionable`,
});

// Define the Dify agent flow
export const difyAgentFlow = ai.defineFlow(
  {
    name: 'difyAgentFlow',
    inputSchema: DifyAgentInputSchema,
    outputSchema: DifyAgentOutputSchema,
  },
  async (input) => {
    try {
      // Call the Dify agent prompt
      const { output } = await difyAgentPrompt(input);

      if (!output?.response) {
        throw new Error('Dify agent failed to generate a response');
      }

      // Prepare the response with metadata
      const response: DifyAgentOutput = {
        response: output.response,
        suggestions: output.suggestions || [],
        resources: output.resources || [],
        metadata: {
          capability: determinateCapability(input),
          datasetUsed: selectRelevantDataset(input),
          confidence: 0.95, // Placeholder confidence score
        },
      };

      return response;
    } catch (error) {
      console.error('Dify agent flow error:', error);
      throw new Error(`Dify agent failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Helper function to determine which capability is being used
function determinateCapability(input: DifyAgentInput): string {
  const query = input.query.toLowerCase();

  if (query.includes('lesson plan')) return 'magicSchool.lessonPlanGeneration';
  if (query.includes('worksheet')) return 'magicSchool.worksheetGeneration';
  if (query.includes('rubric')) return 'magicSchool.rubricGeneration';
  if (query.includes('quiz')) return 'magicSchool.quizGeneration';
  if (query.includes('step by step') || query.includes('how to')) return 'synthesisTutor.stepByStepGuidance';
  if (query.includes('explain') || query.includes('understand')) return 'mwalimuAI.socraticTutoring';

  return 'general';
}

// Helper function to select the most relevant dataset
function selectRelevantDataset(input: DifyAgentInput): string {
  const query = input.query.toLowerCase();

  if (query.includes('swahili') || input.language === 'sw') {
    return 'iamshnoo/alpaca-cleaned-swahili';
  }
  if (query.includes('reasoning') || query.includes('think')) {
    return 'Nadhari/Swahili-Thinking';
  }
  if (query.includes('education') || query.includes('learn')) {
    return 'princeton-nlp/fineweb_edu-swahili-translated';
  }

  return 'Rogendo/English-Swahili-Sentence-Pairs';
}

// Export the main function
export async function difyAgent(input: DifyAgentInput): Promise<DifyAgentOutput> {
  return difyAgentFlow(input);
}
