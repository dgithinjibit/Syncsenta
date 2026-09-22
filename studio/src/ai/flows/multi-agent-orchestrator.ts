/**
 * @fileOverview Multi-Agent Orchestrator for SyncSenta
 * 
 * This orchestrator manages the flow between specialized agents:
 * - Main Mwalimu AI Expert (CBC curriculum authority)
 * - Kikuyu Translation Agent (Indigenous language learning)
 * - Dify Agent (Magic School AI + Synthesis Tutor features)
 */

import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import { kikuyuAgentConfig } from './kikuyu-agent-config';
import { mwalimuExpertConfig } from './mwalimu-expert-config';

// Define agent types
export enum AgentType {
  MWALIMU_EXPERT = 'mwalimu_expert',
  KIKUYU_TRANSLATOR = 'kikuyu_translator',
  DIFY_AGENT = 'dify_agent',
}

// Define the orchestrator input schema
export const OrchestratorInputSchema = z.object({
  query: z.string().describe('User query'),
  userId: z.string().describe('User ID'),
  userType: z.enum(['student', 'teacher', 'admin']).describe('User type'),
  preferredLanguage: z.enum(['en', 'sw', 'ki']).optional().default('en').describe('Preferred language (en=English, sw=Swahili, ki=Kikuyu)'),
  subject: z.string().optional().describe('Subject area'),
  grade: z.string().optional().describe('Grade level'),
  context: z.record(z.any()).optional().describe('Additional context'),
});

export type OrchestratorInput = z.infer<typeof OrchestratorInputSchema>;

// Define the orchestrator output schema
export const OrchestratorOutputSchema = z.object({
  response: z.string().describe('Response to the user'),
  agentUsed: z.nativeEnum(AgentType).describe('Which agent processed this'),
  suggestions: z.array(z.string()).optional().describe('Follow-up suggestions'),
  metadata: z.object({
    language: z.string(),
    confidence: z.number(),
    processingTime: z.number(),
    difyConversationId: z.string().optional(),
  }).optional(),
});

export type OrchestratorOutput = z.infer<typeof OrchestratorOutputSchema>;

// Agent routing logic
function routeToAgent(input: OrchestratorInput): AgentType {
  const query = input.query.toLowerCase();
  const language = input.preferredLanguage;

  // Route to Kikuyu agent if Kikuyu language is preferred or query mentions indigenous language
  if (language === 'ki' || query.includes('kikuyu') || query.includes('indigenous language')) {
    return AgentType.KIKUYU_TRANSLATOR;
  }

  // Route to Dify agent for Magic School AI features
  if (
    query.includes('lesson plan') ||
    query.includes('worksheet') ||
    query.includes('quiz') ||
    query.includes('rubric') ||
    query.includes('step by step') ||
    query.includes('how to') ||
    query.includes('magic school') ||
    query.includes('synthesis')
  ) {
    return AgentType.DIFY_AGENT;
  }

  // Default to Mwalimu Expert for curriculum guidance
  return AgentType.MWALIMU_EXPERT;
}

// Define individual agent prompts
const mwalimuExpertPrompt = ai.definePrompt({
  name: 'mwalimuExpertPrompt',
  input: { schema: OrchestratorInputSchema },
  output: { schema: OrchestratorOutputSchema },
  prompt: `${mwalimuExpertConfig.systemPrompt}

User Type: {{userType}}
Subject: {{subject}}
Grade: {{grade}}
Language: {{preferredLanguage}}

User Query: {{query}}

Provide a response that:
1. References specific CBC strands if applicable
2. Is age-appropriate for the target audience
3. Incorporates Kenyan cultural context
4. Encourages critical thinking and autonomy`,
});

const kikuyuTranslatorPrompt = ai.definePrompt({
  name: 'kikuyuTranslatorPrompt',
  input: { schema: OrchestratorInputSchema },
  output: { schema: OrchestratorOutputSchema },
  prompt: `${kikuyuAgentConfig.systemPrompt}

User Query: {{query}}

Guidelines:
1. Translate accurately between Kikuyu and English.
2. Explain cultural context and idioms.
3. Reference CBC Indigenous Language curriculum strands.
4. Use the Socratic method for learning.`,
});

/**
 * Call the Dify API for advanced Magic School AI / Synthesis Tutor features
 */
async function callDifyAgent(input: OrchestratorInput): Promise<any> {
  const apiKey = process.env.DIFY_API_KEY;
  const apiUrl = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';

  if (!apiKey) {
    throw new Error('DIFY_API_KEY is not configured');
  }

  const response = await fetch(`${apiUrl}/chat-messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {
        user_type: input.userType,
        subject: input.subject || 'General',
        grade: input.grade || 'N/A',
        language: input.preferredLanguage || 'en',
      },
      query: input.query,
      response_mode: 'blocking',
      user: input.userId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Dify API error: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

// Main orchestrator flow
export const multiAgentOrchestratorFlow = ai.defineFlow(
  {
    name: 'multiAgentOrchestrator',
    inputSchema: OrchestratorInputSchema,
    outputSchema: OrchestratorOutputSchema,
  },
  async (input) => {
    try {
      const startTime = Date.now();
      const agentType = routeToAgent(input);

      let response: OrchestratorOutput;

      if (agentType === AgentType.MWALIMU_EXPERT) {
        const { output } = await mwalimuExpertPrompt(input);
        response = {
          response: output?.response || 'Unable to generate response',
          agentUsed: AgentType.MWALIMU_EXPERT,
          suggestions: output?.suggestions || [],
          metadata: {
            language: input.preferredLanguage || 'en',
            confidence: 0.92,
            processingTime: Date.now() - startTime,
          },
        };
      } else if (agentType === AgentType.KIKUYU_TRANSLATOR) {
        const { output } = await kikuyuTranslatorPrompt(input);
        response = {
          response: output?.response || 'Unable to generate translation',
          agentUsed: AgentType.KIKUYU_TRANSLATOR,
          suggestions: output?.suggestions || [],
          metadata: {
            language: 'ki',
            confidence: 0.88,
            processingTime: Date.now() - startTime,
          },
        };
      } else {
        // DIFY_AGENT - Call the live Dify API
        const difyResult = await callDifyAgent(input);
        response = {
          response: difyResult.answer || 'Dify agent was unable to provide an answer.',
          agentUsed: AgentType.DIFY_AGENT,
          metadata: {
            language: input.preferredLanguage || 'en',
            confidence: 0.95,
            processingTime: Date.now() - startTime,
            difyConversationId: difyResult.conversation_id,
          },
        };
      }

      return response;
    } catch (error) {
      console.error('Orchestrator error:', error);
      throw new Error(`Multi-agent orchestrator failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Export the main function
export async function multiAgentOrchestrator(input: OrchestratorInput): Promise<OrchestratorOutput> {
  return multiAgentOrchestratorFlow(input);
}
