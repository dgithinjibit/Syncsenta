/**
 * @fileOverview API endpoint for the Dify Agent
 * 
 * This endpoint exposes the Dify agent flow as a REST API for client-side consumption.
 */

import { NextRequest, NextResponse } from 'next/server';
import { difyAgent, DifyAgentInput } from '@/ai/flows/dify-agent-flow';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json() as DifyAgentInput;

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

    // Call the Dify agent
    const result = await difyAgent(body);

    // Return the response
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Dify agent API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Return API documentation
  return NextResponse.json({
    name: 'Dify Agent API',
    version: '1.0.0',
    description: 'AI-powered educational agent for the Kenyan education sector',
    endpoints: {
      POST: {
        path: '/api/dify-agent',
        description: 'Submit a query to the Dify agent',
        requestBody: {
          query: 'User query or request',
          userId: 'User ID for context',
          userType: 'student | teacher | admin',
          subject: 'Subject area (optional)',
          grade: 'Grade level (optional)',
          language: 'en | sw (optional, default: en)',
          context: 'Additional context (optional)',
        },
        responseBody: {
          response: 'Agent response',
          suggestions: 'Follow-up suggestions',
          resources: 'Related resources',
          metadata: 'Response metadata',
        },
      },
    },
  });
}
