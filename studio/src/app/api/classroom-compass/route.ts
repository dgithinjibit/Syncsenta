import { NextRequest, NextResponse } from 'next/server';
import { multiAIClient } from '@/lib/multi-ai-client';
import type { ClassroomCompassInput } from '@/ai/flows/classroom-compass-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const input = (await req.json()) as ClassroomCompassInput;
    
    // Extract grade and subject from context if available
    const context = input.context || 'General teaching assistance';
    const grade = extractGrade(context);
    const subject = extractSubject(context);
    
    // Use multi-provider client for lesson planning
    const aiResponse = await multiAIClient.generateClassroomCompass(
      input.query,
      grade || 'General',
      subject || 'Teaching'
    );

    return NextResponse.json({
      response: aiResponse.content,
      context: input.context,
      timestamp: new Date().toISOString(),
      provider: aiResponse.provider,
      model: aiResponse.model,
      tokensUsed: aiResponse.tokensUsed,
      metadata: {
        grade,
        subject,
        providerStatus: multiAIClient.getProviderStatus()
      }
    });
  } catch (error) {
    console.error('classroom-compass route error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: message,
      providerStatus: multiAIClient.getProviderStatus()
    }, { status: 500 });
  }
}

// Helper functions to extract grade and subject from context
function extractGrade(context: string): string | null {
  const gradeMatch = context.match(/Grade\s*(\d+)/i);
  return gradeMatch ? `Grade ${gradeMatch[1]}` : null;
}

function extractSubject(context: string): string | null {
  const subjects = ['Mathematics', 'English', 'Kiswahili', 'Science', 'Social Studies', 'Creative Arts'];
  for (const subject of subjects) {
    if (context.toLowerCase().includes(subject.toLowerCase())) {
      return subject;
    }
  }
  return null;
}
