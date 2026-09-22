import { NextRequest, NextResponse } from 'next/server';
import { GikuyuLanguageAgent } from '@/ai/flows/gikuyu-language-agent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { grade, currentMessage, history } = body;

    if (!currentMessage) {
      return NextResponse.json(
        { error: 'currentMessage is required' },
        { status: 400 }
      );
    }

    const agent = new GikuyuLanguageAgent();
    
    // Convert history to the format expected by the agent
    const conversationHistory = (history || []).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content
    }));
    
    // Generate Gikuyu response with conversation context
    const gikuyuResponse = await agent.generateResponse({
      grade: grade || 'g4',
      userMessage: currentMessage,
      conversationHistory,
    });

    // Format the response for the chat interface (already plain text)
    const formattedResponse = agent.formatForChat(gikuyuResponse);

    return NextResponse.json({
      response: formattedResponse,
      audioResponse: undefined, // TTS for Kikuyu can be added later
    });
  } catch (error) {
    console.error('Gikuyu Agent API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate Gikuyu response' },
      { status: 500 }
    );
  }
}
