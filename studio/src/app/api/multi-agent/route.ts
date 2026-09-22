/**
 * @fileOverview Multi-Agent Orchestrator API Endpoint
 * 
 * This endpoint exposes the multi-agent system for client-side consumption.
 */

import { NextRequest, NextResponse } from 'next/server';
import { multiAgentOrchestrator, OrchestratorInput } from '@/ai/flows/multi-agent-orchestrator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as OrchestratorInput;

    // Validate required fields
    if (!body.query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    if (!body.userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!body.userType) {
      return NextResponse.json(
        { error: 'User type is required' },
        { status: 400 }
      );
    }

    // Call the multi-agent orchestrator
    const result = await multiAgentOrchestrator(body);

    // Return the response
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Multi-agent orchestrator API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Return API documentation
  return NextResponse.json({
    name: 'Multi-Agent Orchestrator API',
    version: '2.0.0',
    description: 'Advanced multi-agent system for Kenyan education sector',
    agents: {
      mwalimu_expert: {
        description: 'CBC curriculum authority',
        specialization: 'General curriculum guidance and lesson planning',
      },
      kikuyu_translator: {
        description: 'Kikuyu-English bilingual assistant',
        specialization: 'Indigenous language learning and translation',
      },
      dify_agent: {
        description: 'Magic School AI + Synthesis Tutor features',
        specialization: 'Advanced content generation and adaptive learning',
      },
    },
    endpoint: {
      POST: {
        path: '/api/multi-agent',
        description: 'Submit a query to the multi-agent system',
        requestBody: {
          query: 'User query or request',
          userId: 'User ID for context',
          userType: 'student | teacher | admin',
          preferredLanguage: 'en | sw | ki (optional, default: en)',
          subject: 'Subject area (optional)',
          grade: 'Grade level (optional)',
          context: 'Additional context (optional)',
        },
        responseBody: {
          response: 'Response from the selected agent',
          agentUsed: 'Which agent processed this request',
          suggestions: 'Follow-up suggestions',
          metadata: 'Processing metadata (language, confidence, time)',
        },
      },
    },
    routing: {
      description: 'Automatic agent selection based on query content',
      rules: [
        'Kikuyu language preference → Kikuyu Translator Agent',
        'Magic School features (lesson plans, worksheets, quizzes) → Dify Agent',
        'General curriculum guidance → Mwalimu Expert Agent',
      ],
    },
  });
}
